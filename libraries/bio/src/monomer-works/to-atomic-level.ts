/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {
  HELM_FIELDS, HELM_CORE_FIELDS, HELM_POLYMER_TYPE, HELM_MONOMER_TYPE, HELM_RGROUP_FIELDS,
} from '../utils/const';
import {ALPHABET, NOTATION, TAGS} from '../utils/macromolecule/consts';
import {SplitterFunc} from '../utils/macromolecule/types';
import {getSplitter} from '../utils/macromolecule/utils';
import {NotationConverter} from '../utils/notation-converter';
import {IMonomerLib, Monomer} from '../types';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';
import {UnitsHandler} from '../utils/units-handler';

// interface for typed arrays, like Float32Array and Uint32Array
interface ITypedArray {
  length: number;
  [key: number]: any;
}

// constants for parsing molfile V2000
const V2K_RGP_SHIFT = 8;
const V2K_RGP_LINE = 'M  RGP';
const V2K_A_LINE = 'A  ';

// constants for parsing/reconstruction of molfile V3000
const V3K_COUNTS_SHIFT = 14;
const V3K_IDX_SHIFT = 7;
const V3K_HEADER_FIRST_LINE = '\nDatagrok macromolecule handler\n\n';
const V3K_HEADER_SECOND_LINE = '  0  0  0  0  0  0            999 V3000\n';
const V3K_BEGIN_CTAB_BLOCK = 'M  V30 BEGIN CTAB\n';
const V3K_END_CTAB_BLOCK = 'M  V30 END CTAB\n';
const V3K_BEGIN_COUNTS_LINE = 'M  V30 COUNTS ';
const V3K_COUNTS_LINE_ENDING = ' 0 0 0\n';
const V3K_BEGIN_ATOM_BLOCK = 'M  V30 BEGIN ATOM\n';
const V3K_END_ATOM_BLOCK = 'M  V30 END ATOM\n';
const V3K_BEGIN_BOND_BLOCK = 'M  V30 BEGIN BOND\n';
const V3K_END_BOND_BLOCK = 'M  V30 END BOND\n';
const V3K_BOND_CONFIG = ' CFG=';
const V3K_BEGIN_DATA_LINE = 'M  V30 ';
const V3K_END = 'M  END';

const PRECISION_FACTOR = 10_000; // HELMCoreLibrary has 4 significant digits after decimal point in atom coordinates

// symbols for the corresponding monomers in HELM library
const DEOXYRIBOSE = 'd';
const RIBOSE = 'r';
const PHOSPHATE = 'p';

const OXYGEN = 'O';
const HYDROGEN = 'H';

/** Stores necessary data about atoms of a monomer parsed from Molfile */
type Atoms = {
  /** Element symbols for monomer's atoms */
  atomTypes: string[],
  /** Cartesian coordiantes of monomer's atoms */
  x: Float32Array,
  y: Float32Array,
  /** V3K atom line may contain keyword args */
  kwargs: string[],
}

/** Stores necessary data about bonds of a monomer parsed from Molfile */
type Bonds = {
  /** bond types for all lines of Molfile bond block */
  bondTypes: Uint32Array,
  /** Indices of all atom pairs, indexing starting from 1  */
  atomPairs: number[][],
  /** If a bond has CFG=... keyword argument, it is parsed and sotred as a
   * value of the map, with the key being the bond's index  */
  bondConfiguration: Map<number, number>,
  /** V3K bond line may contain keyword args */
  kwargs: Map<number, string>,
}

/** Metadata associated with the monomer necessary to restore the resulting molfile */
type MonomerMetadata = {
  /** terminal nodes: 0-th corresponds to the "leftmost" one, 1st, to the "rightmost",
   * e.g. N-terminus and C-terminus in peptides */
  terminalNodes: number[],
  /** r-group nodes: 0-th corresponds to the "leftmost" one, 1st, to the "rightmost" */
  rNodes: number[],
  /** shift from the origin to the next backbone, null for branch monomers */
  backboneShift: number[] | null,
  /** shift from the origin to the next branch, null for branch monomers */
  branchShift: number[] | null
}

type MolGraph = {
  atoms: Atoms,
  bonds: Bonds,
  meta: MonomerMetadata,
}

type Point = {
  x: number,
  y: number
}

/** Helper structure wrapping common arguments to several functions */
type LoopVariables = {
  i: number,
  nodeShift: number,
  bondShift: number,
  backbonePositionShift: number[],
  backboneAttachNode: number; // node to which the next backbone is attached
  branchPositionShift: number[],
  branchAttachNode: number,
  flipFactor: number,
  // todo: should we consider representations other than planar?
}

/** Helper structure wrapping common arguments to several functions */
type LoopConstants = {
  sugar: MolGraph | null,
  phosphate: MolGraph | null,
  seqLength: number,
  atomCount: number,
  bondCount: number,
}

/** Helper structure to simulate pointer to number  */
type NumberWrapper = {
  value: number | null // null if there is no branch attach node
}

// todo: verify that all functions have return types

/** Convert Macromolecule column into Molecule column storing molfile V3000 with the help of a monomer library  */
export async function _toAtomicLevel(
  df: DG.DataFrame, seqCol: DG.Column<string>, monomerLib: IMonomerLib
): Promise<{ col: DG.Column | null, warnings: string [] }> {
  // todo: remove this from the library
  if (DG.Func.find({package: 'Chem', name: 'getRdKitModule'}).length === 0) {
    const msg: string = 'Transformation to atomic level requires the package "Chem" installed.';
    return {col: null, warnings: [msg]};
  }

  if (seqCol.semType !== DG.SEMTYPE.MACROMOLECULE) {
    const msg: string = `Only the ${DG.SEMTYPE.MACROMOLECULE} columns can be converted to atomic level, ` +
      `the chosen column has semType '${seqCol.semType}'`;
    return {col: null, warnings: [msg]};
  }

  let srcCol: DG.Column<string> = seqCol;
  const seqUh = new UnitsHandler(seqCol);

  // convert 'helm' to 'separator' units
  if (seqUh.isHelm()) {
    const converter = new NotationConverter(seqCol);
    srcCol = converter.convert(NOTATION.SEPARATOR, '.');
    srcCol.name = seqCol.name; // Replace converted col name 'separator(<original>)' to '<original>';
  }

  const srcUh = new UnitsHandler(srcCol);
  const alphabet = srcUh.alphabet;

  // determine the polymer type according to HELM specifications
  let polymerType: HELM_POLYMER_TYPE;
  // todo: an exception from dart comes before this check if the alphabet is UN
  if (alphabet === ALPHABET.PT || alphabet === ALPHABET.UN) {
    polymerType = HELM_POLYMER_TYPE.PEPTIDE;
  } else if (alphabet === ALPHABET.RNA || alphabet === ALPHABET.DNA) {
    polymerType = HELM_POLYMER_TYPE.RNA;
  } else {
    const msg: string = `Unexpected column's '${srcCol.name}' alphabet '${alphabet}'.`;
    return {col: null, warnings: [msg]};
  }

  const monomerSequencesArray: string[][] = getMonomerSequencesArray(srcCol);
  const monomersDict = await getMonomersDictFromLib(monomerSequencesArray, monomerLib, polymerType, alphabet);
  const srcColLength = srcCol.length;

  const molfileList: string[] = new Array<string>(srcColLength);
  const molfileWarningList = new Array<string>(0);
  for (let rowI = 0; rowI < srcColLength; ++rowI) {
    try {
      const monomerSeq = monomerSequencesArray[rowI];
      molfileList[rowI] = monomerSeqToMolfile(monomerSeq, monomersDict, alphabet, polymerType);
    } catch (err: any) {
      const errMsg: string = err instanceof Error ? err.message : err.toString();
      const msg: string = `Cannot get molfile of row #${rowI}: ${errMsg}.`;
      molfileWarningList.push(msg);
    }
  }

  if (molfileWarningList.length > 0.05 * srcColLength)
    throw new Error('Too many errors getting molfiles.');

  // exclude name collisions
  const name = `molfile(${srcCol.name})`;
  const resColName = df.columns.getUnusedName(name);
  const resCol = DG.Column.fromStrings(resColName, molfileList);
  resCol.semType = DG.SEMTYPE.MOLECULE;
  resCol.setTag(DG.TAGS.UNITS, DG.UNITS.Molecule.MOLBLOCK);

  return {col: resCol, warnings: molfileWarningList};
}

/** Get a mapping of peptide symbols to HELM monomer library
 * objects with selected fields.
 */
function getFormattedMonomerLib(
  monomerLib: IMonomerLib, polymerType: HELM_POLYMER_TYPE, alphabet: ALPHABET
): Map<string, any> {
  const map = new Map<string, any>();
  for (const monomerSymbol of monomerLib.getMonomerSymbolsByType(polymerType)) {
    const it: Monomer = monomerLib.getMonomer(polymerType, monomerSymbol)!;
    if (
      polymerType === HELM_POLYMER_TYPE.RNA &&
      (it[HELM_FIELDS.MONOMER_TYPE] === HELM_MONOMER_TYPE.BRANCH ||
        alphabet === ALPHABET.DNA && it[HELM_FIELDS.SYMBOL] === DEOXYRIBOSE ||
        alphabet === ALPHABET.RNA && it[HELM_FIELDS.SYMBOL] === RIBOSE ||
        it[HELM_FIELDS.SYMBOL] === PHOSPHATE) ||
      polymerType === HELM_POLYMER_TYPE.PEPTIDE &&
      it[HELM_FIELDS.MONOMER_TYPE] !== HELM_MONOMER_TYPE.BRANCH
    ) {
      const monomerObject: { [key: string]: any } = {};
      HELM_CORE_FIELDS.forEach((field) => {
        //@ts-ignore
        monomerObject[field] = it[field];
      });
      map.set(it[HELM_FIELDS.SYMBOL], monomerObject);
    }
  }
  return map;
}

/** Get jagged array of monomer symbols for the dataframe  */
function getMonomerSequencesArray(macroMolCol: DG.Column<string>): string[][] {
  const columnLength = macroMolCol.length;
  const result: string[][] = new Array(columnLength);

  // split the string into monomers
  const colUnits = macroMolCol.getTag(DG.TAGS.UNITS);
  const separator = macroMolCol.getTag(TAGS.separator);
  const splitterFunc: SplitterFunc = getSplitter(colUnits, separator);

  for (let row = 0; row < columnLength; ++row) {
    const macroMolecule = macroMolCol.get(row);
    // todo: handle the exception case when macroMolecule is null
    result[row] = macroMolecule ? splitterFunc(macroMolecule).filter((monomerCode) => monomerCode !== '') : [];
  }
  return result;
}

/** Get a mapping of monomer symbols to MolGraph objects. Notice, the
 * transformation from molfile V2000 to V3000 takes place,
 * with the help of async function call from Chem (RdKit module) */
async function getMonomersDictFromLib(
  monomerSequencesArray: string[][], monomerLib: IMonomerLib, polymerType: HELM_POLYMER_TYPE, alphabet: ALPHABET
): Promise<Map<string, MolGraph>> {
  // todo: exception - no gaps, no empty string monomers
  const formattedMonomerLib = getFormattedMonomerLib(monomerLib, polymerType, alphabet);
  const monomersDict = new Map<string, MolGraph>();

  const moduleRdkit = await grok.functions.call('Chem:getRdKitModule');

  const pointerToBranchAngle: NumberWrapper = {
    value: null
  };

  // this must NOT be placed after translating monomer sequences
  // because adding branch monomers for nucleobases relies on these data
  if (polymerType === HELM_POLYMER_TYPE.RNA) {
    const symbols = (alphabet === ALPHABET.RNA) ?
      [RIBOSE, PHOSPHATE] : [DEOXYRIBOSE, PHOSPHATE];
    for (const sym of symbols)
      addMonomerToDict(monomersDict, sym, formattedMonomerLib, moduleRdkit, polymerType, pointerToBranchAngle);
  }

  for (let rowI = 0; rowI < monomerSequencesArray.length; ++rowI) {
    const monomerSeq: string[] = monomerSequencesArray[rowI];
    for (const sym of monomerSeq) {
      if (sym === '') continue; // Skip gap/empty monomer for MSA
      try {
        addMonomerToDict(monomersDict, sym, formattedMonomerLib,
          moduleRdkit, polymerType, pointerToBranchAngle);
      } catch (err: any) {
        const errTxt = errorToConsole(err);
        console.error(`bio lib: getMonomersDictFromLib() sym='${sym}', error:\n` + errTxt);
        const errMsg = `Сan't get monomer '${sym}' from library: ${errTxt}`; // Text for Datagrok error baloon
        throw new Error(errMsg);
      }
    }
  }

  return monomersDict;
}

function getAngleBetweenSugarBranchAndOY(molGraph: MolGraph): number {
  const x = molGraph.atoms.x;
  const y = molGraph.atoms.y;
  const rNode = molGraph.meta.rNodes[2] - 1;
  const terminalNode = molGraph.meta.terminalNodes[2] - 1;

  const xShift = x[rNode] - x[terminalNode];
  const yShift = y[rNode] - y[terminalNode];

  return Math.atan(yShift / xShift) + Math.PI / 2;
}

/** Adds MolGraph object for 'sym' to the monomers dict when necessary  */
function addMonomerToDict(
  monomersDict: Map<string, MolGraph>, sym: string,
  formattedMonomerLib: Map<string, any>, moduleRdkit: any,
  polymerType: HELM_POLYMER_TYPE, pointerToBranchAngle: NumberWrapper
): void {
  if (!monomersDict.has(sym)) {
    const monomerData: MolGraph | null =
      getMolGraph(sym, formattedMonomerLib, moduleRdkit, polymerType, pointerToBranchAngle);
    if (monomerData)
      monomersDict.set(sym, monomerData);
    else
      throw new Error(`Monomer with symbol '${sym}' is absent the monomer library`);
    // todo: handle exception
  }
}

/** Construct the MolGraph object for specified monomerSymbol: the associated
 * graph is adjusted in XY plane and filled with default R-groups */
function getMolGraph(
  monomerSymbol: string, formattedMonomerLib: Map<string, any>,
  moduleRdkit: any, polymerType: HELM_POLYMER_TYPE,
  pointerToBranchAngle: NumberWrapper
): MolGraph | null {
  if (!formattedMonomerLib.has(monomerSymbol)) {
    return null;
  } else {
    const libObject = formattedMonomerLib.get(monomerSymbol);
    const capGroups = parseCapGroups(libObject[HELM_FIELDS.RGROUPS]);
    const capGroupIdxMap = parseCapGroupIdxMap(libObject[HELM_FIELDS.MOLFILE]);
    const molfileV3K = convertMolfileToV3K(removeRGroupLines(libObject[HELM_FIELDS.MOLFILE]), moduleRdkit);
    const counts = parseAtomAndBondCounts(molfileV3K);

    const atoms = parseAtomBlock(molfileV3K, counts.atomCount);
    const bonds = parseBondBlock(molfileV3K, counts.bondCount);
    const meta = getMonomerMetadata(atoms, bonds, capGroups, capGroupIdxMap);

    const monomerGraph: MolGraph = {atoms: atoms, bonds: bonds, meta: meta};

    if (polymerType === HELM_POLYMER_TYPE.PEPTIDE) {
      adjustPeptideMonomerGraph(monomerGraph);
    } else { // nucleotides
      if (monomerSymbol === RIBOSE || monomerSymbol === DEOXYRIBOSE)
        adjustSugarMonomerGraph(monomerGraph, pointerToBranchAngle);
      else if (monomerSymbol === PHOSPHATE)
        adjustPhosphateMonomerGraph(monomerGraph);
      else
        adjustBaseMonomerGraph(monomerGraph, pointerToBranchAngle);
    }

    setShiftsAndTerminalNodes(polymerType, monomerGraph, monomerSymbol);
    // todo: restore after debugging
    removeHydrogen(monomerGraph);

    return monomerGraph;
  }
}

function setShiftsAndTerminalNodes(
  polymerType: HELM_POLYMER_TYPE, monomerGraph: MolGraph, monomerSymbol: string
): void {
  // remove the 'rightmost' chain-extending r-group node in the backbone
  if (polymerType === HELM_POLYMER_TYPE.PEPTIDE) {
    setShifts(monomerGraph, polymerType);
    removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[1]);
  } else { // nucleotides
    if (monomerSymbol === RIBOSE || monomerSymbol === DEOXYRIBOSE) {
      // remove R2
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[1]);
      // set terminalNode2 (oxygen) as new R2
      monomerGraph.meta.rNodes[1] = monomerGraph.meta.terminalNodes[1];
      setTerminalNodes(monomerGraph.bonds, monomerGraph.meta); // set terminal nodes anew
      setShifts(monomerGraph, polymerType);
      // remove 'new' R2 (oxygen)
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[1]);
      // remove R1
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[0]);
      // remove the branching r-group
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[2]);
    } else if (monomerSymbol === PHOSPHATE) {
      monomerGraph.meta.terminalNodes[0] = monomerGraph.meta.rNodes[0];
      shiftCoordinates(
        monomerGraph,
        -monomerGraph.atoms.x[monomerGraph.meta.terminalNodes[0] - 1],
        -monomerGraph.atoms.y[monomerGraph.meta.terminalNodes[0] - 1]
      );
      setShifts(monomerGraph, polymerType);
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[1]);
    } else { // nucleobases
      // removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[0]);
    }
  }
}

// todo: sdoc
function getMonomerMetadata(atoms: Atoms, bonds: Bonds, capGroups?: string[], capGroupIdxMap?: Map<number, number>
): MonomerMetadata {
  const meta: MonomerMetadata = {
    backboneShift: null,
    branchShift: null,
    terminalNodes: [],
    rNodes: [],
  };

  substituteCapGroups(atoms, capGroups!, capGroupIdxMap!);
  setRNodes(capGroupIdxMap!, meta);

  setTerminalNodes(bonds, meta);
  return meta;
}

/** Parse element symbols for R-groups from the HELM monomer library R-groups
 * field  */
export function parseCapGroups(rGroupObjList: any[]): string[] {
  // specifically for HELMCoreLibrary
  // considered only monoatomic rgroups
  // supposing that elements in rGroupObjList are sorted w.r.t. the rgroups idx
  const capGroupsArray: string[] = [];
  for (const obj of rGroupObjList) {
    let capGroup: string = obj[HELM_RGROUP_FIELDS.CAP_GROUP_SMILES];

    // in some cases the smiles field is written with uppercase
    if (!capGroup)
      capGroup = obj[HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE];
    capGroup = capGroup.replace(/(\[|\]|\*|:|\d)/g, '');
    capGroupsArray.push(capGroup);
  }
  return capGroupsArray;
}

/** Substitute the cap group elements instead of R# */
function substituteCapGroups(
  atoms: Atoms, capGroups: string[], capGroupIdxMap: Map<number, number>
): void {
  for (const [node, capIdx] of capGroupIdxMap)
    atoms.atomTypes[node - 1] = capGroups[capIdx - 1]; // -1 because molfile indexing starts from 1
}

function setRNodes(capGroupIdxMap: Map<number, number>, meta: MonomerMetadata): void {
  meta.rNodes = Array.from(capGroupIdxMap.keys());
  for (let i = 0; i < meta.rNodes.length; i++) {
    for (const j of [1, 2]) { // 1 and 2 by def. correspond to 'left/rightmost' r-nodes
      // swap the values if necessary, so that the "leftmost" r-node is at 0,
      // and the 'rightmost', at 1
      if (capGroupIdxMap.get(meta.rNodes[i]) === j) {
        const tmp = meta.rNodes[j - 1];
        meta.rNodes[j - 1] = meta.rNodes[i];
        meta.rNodes[i] = tmp;
      }
    }
  }
}

function setTerminalNodes(bonds: Bonds, meta: MonomerMetadata): void {
  const rNodes = meta.rNodes;
  meta.terminalNodes = new Array<number>(rNodes.length).fill(0);
  const terminalNodes = meta.terminalNodes;
  const atomPairs = bonds.atomPairs;
  let i = 0;
  let j = 0;
  while ((i < atomPairs.length) && j < terminalNodes.length) {
    // rNodes array is sorted so that its 0th and 1st elements (if both
    // present) correspond to the chain extending (i.e. not branching) r-groups
    for (let k = 0; k < terminalNodes.length; ++k) {
      for (let l = 0; l < 2; ++l) {
        if (atomPairs[i][l] === rNodes[k]) {
          terminalNodes[k] = atomPairs[i][(l + 1) % 2];
          if (rNodes.length > 2) {
          }
          ++j;
        }
      }
    }
    ++i;
  }
}

/** Sets shifts in 'meta' attribute of MolGraph  */
function setShifts(molGraph: MolGraph, polymerType: HELM_POLYMER_TYPE): void {
  if (molGraph.meta.rNodes.length > 1) {
    molGraph.meta.backboneShift = getShiftBetweenNodes(
      molGraph, molGraph.meta.rNodes[1] - 1,
      molGraph.meta.terminalNodes[0] - 1
    );
  }

  if (polymerType === HELM_POLYMER_TYPE.RNA && molGraph.meta.rNodes.length > 2) {
    molGraph.meta.branchShift = getShiftBetweenNodes(
      molGraph, molGraph.meta.rNodes[2] - 1,
      molGraph.meta.terminalNodes[0] - 1
    );
  }
}

/** Returns the pair [xShift, yShift] for specified node indices */
function getShiftBetweenNodes(
  molGraph: MolGraph, rightNodeIdx: number, leftNodeIdx: number
): number[] {
  return [
    keepPrecision(
      molGraph.atoms.x[rightNodeIdx] -
      molGraph.atoms.x[leftNodeIdx]
    ),
    keepPrecision(
      molGraph.atoms.y[rightNodeIdx] -
      molGraph.atoms.y[leftNodeIdx]
    ),
  ];
}

/** Helper function necessary to build a correct V3000 molfile out of V2000 with
 * specified r-groups*/
function removeRGroupLines(molfileV2K: string): string {
  let begin = molfileV2K.indexOf(V2K_A_LINE, 0);
  if (begin === -1)
    begin = molfileV2K.indexOf(V2K_RGP_LINE);
  const end = molfileV2K.indexOf(V3K_END, begin);
  return molfileV2K.substring(0, begin) + molfileV2K.substring(end);
}

/** V2000 to V3000 converter  */
function convertMolfileToV3K(molfileV2K: string, moduleRdkit: any): string {
  // The standard Chem converter is not used here because it relies on creation of moduleRdkit on each iteration
  const molObj = moduleRdkit.get_mol(molfileV2K);
  const molfileV3K = molObj.get_v3Kmolblock();
  molObj.delete();
  return molfileV3K;
}

/** Parse V3000 bond block and construct the Bonds object */
function parseBondBlock(molfileV3K: string, bondCount: number): Bonds {
  const bondTypes: Uint32Array = new Uint32Array(bondCount);
  const atomPairs: number[][] = new Array(bondCount);
  const bondConfiguration = new Map<number, number>();
  const kwargs = new Map<number, string>();

  let begin = molfileV3K.indexOf(V3K_BEGIN_BOND_BLOCK);
  begin = molfileV3K.indexOf('\n', begin);
  let end = begin;
  for (let i = 0; i < bondCount; ++i) {
    // parse bond type and atom pair
    const parsedValues: number[] = new Array(3);
    begin = molfileV3K.indexOf(V3K_BEGIN_DATA_LINE, end) + V3K_IDX_SHIFT;
    end = molfileV3K.indexOf(' ', begin);
    for (let k = 0; k < 3; ++k) {
      begin = end + 1;
      end = Math.min(molfileV3K.indexOf('\n', begin), molfileV3K.indexOf(' ', begin));
      parsedValues[k] = parseInt(molfileV3K.slice(begin, end));
    }
    bondTypes[i] = parsedValues[0];
    atomPairs[i] = parsedValues.slice(1);

    // parse keyword arguments
    const endOfLine = molfileV3K.indexOf('\n', begin);
    let lineRemainder = molfileV3K.slice(end, endOfLine);
    let beginCfg = lineRemainder.indexOf(V3K_BOND_CONFIG);
    if (beginCfg !== -1) {
      beginCfg = lineRemainder.indexOf('=', beginCfg) + 1;
      let endCfg = lineRemainder.indexOf(' ', beginCfg);
      if (endCfg === -1)
        endCfg = lineRemainder.length;
      const bondConfig = parseInt(lineRemainder.slice(beginCfg, endCfg));
      bondConfiguration.set(i, bondConfig);
      const removedSubstring = V3K_BOND_CONFIG + bondConfig.toString();
      lineRemainder = lineRemainder.replace(removedSubstring, '');
    }
    if (!lineRemainder)
      kwargs.set(i, lineRemainder);
  }

  return {
    bondTypes: bondTypes,
    atomPairs: atomPairs,
    bondConfiguration: bondConfiguration,
    kwargs: kwargs,
  };
}

/** Constructs mapping of r-group nodes to default capGroups, all numeration starting from 1.
 * According to https://pubs.acs.org/doi/10.1021/ci3001925, R1 and R2 are the chain extending attachment points,
 * while R3 is the branching attachment point. */
function parseCapGroupIdxMap(molfileV2K: string): Map<number, number> {
  const capGroupIdxMap = new Map<number, number>();

  // parse A-lines (RNA)
  let begin = molfileV2K.indexOf(V2K_A_LINE, 0);
  let end = begin;
  while (begin !== -1) {
    // parse the rNode to which the cap group is attached
    end = molfileV2K.indexOf('\n', begin);
    const rNode = parseInt(molfileV2K.substring(begin, end).replace(/^A\s+/, ''));

    // parse the capGroup index
    begin = molfileV2K.indexOf('R', end);
    end = molfileV2K.indexOf('\n', begin);
    const capGroup = parseInt(molfileV2K.substring(begin, end).replace(/^R/, ''));
    capGroupIdxMap.set(rNode, capGroup);

    begin = molfileV2K.indexOf(V2K_A_LINE, end);
  }

  // parse RGP lines (may be more than one in RNA monomers)
  begin = molfileV2K.indexOf(V2K_RGP_LINE, 0);
  end = molfileV2K.indexOf('\n', begin);
  while (begin !== -1) {
    begin += V2K_RGP_SHIFT;
    end = molfileV2K.indexOf('\n', begin);
    const rgpStringParsed = molfileV2K.substring(begin, end)
      .replaceAll(/\s+/g, ' ')
      .split(' ');
    const rgpIndicesArray = rgpStringParsed.map((el) => parseInt(el))
      .slice(1); // slice from 1 because the 1st value is the number of pairs in the line
    for (let i = 0; i < rgpIndicesArray.length; i += 2) {
      // there may be conflicting cap group definitions, like 3-O-Methylribose (2,5 connectivity) in HELMCoreLibrary
      if (capGroupIdxMap.has(rgpIndicesArray[i]) && capGroupIdxMap.get(rgpIndicesArray[i]) !== rgpIndicesArray[i + 1])
        throw new Error(`r-group index ${rgpIndicesArray[i]} has already been added with a different value`);
      else
        capGroupIdxMap.set(rgpIndicesArray[i], rgpIndicesArray[i + 1]);
    }
    begin = molfileV2K.indexOf(V2K_RGP_LINE, end);
  }
  return capGroupIdxMap;
}

function parseAtomAndBondCounts(molfileV3K: string): { atomCount: number, bondCount: number } {
  molfileV3K = molfileV3K.replaceAll('\r', ''); // to handle old and new sdf standards

  // parse atom count
  let begin = molfileV3K.indexOf(V3K_BEGIN_COUNTS_LINE) + V3K_COUNTS_SHIFT;
  let end = molfileV3K.indexOf(' ', begin + 1);
  const numOfAtoms = parseInt(molfileV3K.substring(begin, end));

  // parse bond count
  begin = end + 1;
  end = molfileV3K.indexOf(' ', begin + 1);
  const numOfBonds = parseInt(molfileV3K.substring(begin, end));

  return {atomCount: numOfAtoms, bondCount: numOfBonds};
}

/** Parse V3000 atom block and return Atoms object. NOTICE: only atomTypes, x, y
 * and kwargs fields are set in the return value, with other fields dummy */
function parseAtomBlock(molfileV3K: string, atomCount: number): Atoms {
  const atomTypes: string[] = new Array(atomCount);
  const x: Float32Array = new Float32Array(atomCount);
  const y: Float32Array = new Float32Array(atomCount);
  const kwargs: string[] = new Array(atomCount);

  let begin = molfileV3K.indexOf(V3K_BEGIN_ATOM_BLOCK); // V3000 atoms block
  begin = molfileV3K.indexOf('\n', begin);
  let end = begin;

  for (let i = 0; i < atomCount; i++) {
    begin = molfileV3K.indexOf(V3K_BEGIN_DATA_LINE, begin) + V3K_IDX_SHIFT;
    end = molfileV3K.indexOf(' ', begin); // skip the idx row

    // parse atom type
    begin = end + 1;
    end = molfileV3K.indexOf(' ', begin);
    atomTypes[i] = molfileV3K.substring(begin, end);

    // parse X and Y coordinates of the atom
    const coordinate: number[] = new Array(2);
    for (let k = 0; k < 2; ++k) {
      begin = end + 1;
      end = molfileV3K.indexOf(' ', begin);
      coordinate[k] = parseFloat(molfileV3K.substring(begin, end));
    }
    x[i] = coordinate[0];
    y[i] = coordinate[1];

    // parse the remaining possible keyword arguments
    begin = end;
    end = molfileV3K.indexOf('\n', begin) + 1;
    kwargs[i] = molfileV3K.slice(begin, end);

    begin = end;
  }

  return {
    atomTypes: atomTypes,
    x: x,
    y: y,
    kwargs: kwargs,
  };
}

/** Remove hydrogen nodes */
function removeHydrogen(monomerGraph: MolGraph): void {
  let i = 0;
  while (i < monomerGraph.atoms.atomTypes.length) {
    if (monomerGraph.atoms.atomTypes[i] === HYDROGEN) {
      removeNodeAndBonds(monomerGraph, i + 1); // i + 1 because molfile node indexing starts from 1
      --i;
      // monomerGraph.atoms.atomTypes[i] = 'Li';
    }
    ++i;
  }
}

/** Remove node 'removedNode' and the associated bonds. Notice, numeration of
 * nodes in molfiles starts from 1, not 0 */
function removeNodeAndBonds(monomerGraph: MolGraph, removedNode?: number): void {
  if (typeof removedNode !== 'undefined') {
    const removedNodeIdx = removedNode - 1;
    const atoms = monomerGraph.atoms;
    const bonds = monomerGraph.bonds;
    const meta = monomerGraph.meta;

    // remove the node from atoms
    atoms.atomTypes.splice(removedNodeIdx, 1);
    atoms.x = spliceTypedArray<Float32Array>(Float32Array, atoms.x, removedNodeIdx, 1);
    atoms.y = spliceTypedArray<Float32Array>(Float32Array, atoms.y, removedNodeIdx, 1);
    atoms.kwargs.splice(removedNodeIdx, 1);

    // update the values of terminal and r-group nodes if necessary
    for (let i = 0; i < meta.terminalNodes.length; ++i) {
      if (meta.terminalNodes[i] > removedNode)
        --meta.terminalNodes[i];
      else if (meta.terminalNodes[i] === removedNode)
        meta.terminalNodes[i] = -1; // sentinel to mark the value as removed
    }
    for (let i = 0; i < meta.rNodes.length; ++i) {
      if (meta.rNodes[i] > removedNode)
        --meta.rNodes[i];
      else if (meta.rNodes[i] === removedNode)
        meta.rNodes[i] = -1; // sentinel to mark the value as removed
    }

    // update indices of atoms in bonds
    let i = 0;
    while (i < bonds.atomPairs.length) {
      const firstAtom = bonds.atomPairs[i][0];
      const secondAtom = bonds.atomPairs[i][1];
      if (firstAtom === removedNode || secondAtom === removedNode) {
        bonds.atomPairs.splice(i, 1);
        bonds.bondTypes = spliceTypedArray<Uint32Array>(Uint32Array, bonds.bondTypes, i, 1);
        if (bonds.bondConfiguration.has(i))
          bonds.bondConfiguration.delete(i);
        if (bonds.kwargs.has(i))
          bonds.kwargs.delete(i);
        --i;
      } else {
        bonds.atomPairs[i][0] = (firstAtom > removedNode) ? firstAtom - 1 : firstAtom;
        bonds.atomPairs[i][1] = (secondAtom > removedNode) ? secondAtom - 1 : secondAtom;
      }
      ++i;
    }

    // update bondConfiguration and kwargs keys
    let keys = Array.from(bonds.bondConfiguration.keys());
    keys.forEach((key) => {
      if (bonds.bondConfiguration.has(key) && key > removedNodeIdx) {
        const value = bonds.bondConfiguration.get(key)!;
        bonds.bondConfiguration.delete(key);
        bonds.bondConfiguration.set(key - 1, value);
      }
    });
    keys = Array.from(bonds.kwargs.keys());
    keys.forEach((key) => {
      if (bonds.kwargs.has(key) && key > removedNodeIdx) {
        const value = bonds.kwargs.get(key)!;
        bonds.kwargs.delete(key);
        bonds.kwargs.set(key - 1, value);
      }
    });
  }
}

// todo: rewrite the following two functions using templates,
function spliceTypedArray<T extends ITypedArray>(
  TConstructor: { new(length: number): T; }, typedArray: T, start: number, count: number
) {
  const result = new TConstructor(typedArray.length - count);
  let i = 0;
  let k = 0;
  while (i < typedArray.length) {
    if (i === start)
      i += count;
    result[k] = typedArray[i];
    ++k;
    ++i;
  }
  return result;
}

/** Adjust the peptide MolGraph to default/standardized position  */
function adjustPeptideMonomerGraph(monomer: MolGraph): void {
  const centeredNode = monomer.meta.terminalNodes[0] - 1; // node indexing in molfiles starts from 1
  const rotatedNode = monomer.meta.rNodes[0] - 1;
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;

  // place nodeOne at origin
  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);

  // angle is measured between OY and the rotated node
  const angle = findAngleWithOY(x[rotatedNode], y[rotatedNode]);

  // rotate the centered graph, so that 'nodeTwo' ends up on the positive ray of OY
  rotateCenteredGraph(monomer.atoms, -angle);

  if (x[monomer.meta.rNodes[1] - 1] < 0)
    flipMonomerAroundOY(monomer);

  const doubleBondedOxygen = findDoubleBondedCarbonylOxygen(monomer);

  // flip carboxyl and R if necessary
  flipCarboxylAndRadical(monomer, doubleBondedOxygen);

  // flip hydroxyl group with double-bound O inside carboxyl group if necessary
  flipHydroxilGroup(monomer, doubleBondedOxygen);
}

function adjustPhosphateMonomerGraph(monomer: MolGraph): void {
  const centeredNode = monomer.meta.terminalNodes[0] - 1; // Phosphorus
  const rotatedNode = monomer.meta.rNodes[0] - 1; // Oxygen
  // const nodeTwoIdx = monomer.meta.rNodes[0] - 1;
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;

  // place nodeOne at origin
  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);

  // angle is measured between OY and the rotated node
  const angle = findAngleWithOY(x[rotatedNode], y[rotatedNode]);

  // rotate the centered graph so that P-O is on OX
  rotateCenteredGraph(monomer.atoms, Math.PI / 2 - angle);
}

function adjustSugarMonomerGraph(monomer: MolGraph, pointerToBranchAngle: NumberWrapper): void {
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;

  let centeredNode = monomer.meta.terminalNodes[0] - 1;
  const rotatedNode = monomer.meta.rNodes[1] - 1;

  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);

  // angle is measured between OX and the rotated node
  const angle = findAngleWithOY(x[rotatedNode], y[rotatedNode]);

  // rotate the centered graph so that the rotated node in on OX
  rotateCenteredGraph(monomer.atoms, 3 * Math.PI / 2 - angle);

  pointerToBranchAngle.value = getAngleBetweenSugarBranchAndOY(monomer);

  centeredNode = monomer.meta.terminalNodes[0] - 1;
  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);
}

function adjustBaseMonomerGraph(monomer: MolGraph, pointerToBranchAngle: NumberWrapper): void {
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;

  const centeredNode = monomer.meta.terminalNodes[0] - 1; // node indexing in molfiles starts from 1
  const rotatedNode = monomer.meta.rNodes[0] - 1;

  // center graph at centeredNode
  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);

  // rotate so that the branch bond is aligned with that in sugar
  const baseBranchToOYAngle = findAngleWithOY(x[rotatedNode], y[rotatedNode]);
  const sugarBranchToOYAngle = pointerToBranchAngle.value;
  if (sugarBranchToOYAngle) {
    rotateCenteredGraph(monomer.atoms,
      Math.PI - baseBranchToOYAngle + sugarBranchToOYAngle);
  } else {
    throw new Error('The value of sugarBranchToOYAngle is null');
  }

  // scale graph in case its size does not fit the scale of phosphate and sugar
  // todo: consider extending to other monomer types
  const p1 = {
    x: x[monomer.meta.rNodes[0] - 1],
    y: y[monomer.meta.rNodes[0] - 1],
  };
  const p2 = {
    x: x[monomer.meta.terminalNodes[0] - 1],
    y: y[monomer.meta.terminalNodes[0] - 1],
  };
  const bondLength = getEuclideanDistance(p1, p2);
  if (bondLength != 1) {
    for (let i = 0; i < x.length; ++i) {
      x[i] = keepPrecision(x[i] / bondLength);
      y[i] = keepPrecision(y[i] / bondLength);
    }
  }
}

function getEuclideanDistance(p1: Point, p2: Point): number {
  return keepPrecision(Math.sqrt(
    (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2
  ));
}

/** Flip carboxyl group with the radical in a peptide monomer in case the
 * carboxyl group is in the lower half-plane */
function flipCarboxylAndRadical(monomer: MolGraph, doubleBondedOxygen: number): void {
  // verify that the carboxyl group is in the lower half-plane
  if (monomer.atoms.y[monomer.meta.rNodes[1] - 1] < 0 &&
    monomer.atoms.y[doubleBondedOxygen - 1] < 0) {
    flipMonomerAroundOX(monomer);

    rotateCenteredGraph(monomer.atoms,
      -findAngleWithOX(
        monomer.atoms.x[monomer.meta.terminalNodes[1] - 1],
        monomer.atoms.y[monomer.meta.terminalNodes[1] - 1]
      )
    );
  }
}

/** Finds angle between OY and the ray joining origin with (x, y) */
function findAngleWithOY(x: number, y: number): number {
  let angle;
  if (x === 0) {
    angle = y > 0 ? 0 : Math.PI;
  } else if (y === 0) {
    angle = x > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    const tan = y / x;
    const atan = Math.atan(tan);
    angle = (x < 0) ? Math.PI / 2 + atan : -Math.PI / 2 + atan;
  }
  return angle;
}

/** Finds angle between OX and the ray joining origin with (x, y) */
function findAngleWithOX(x: number, y: number): number {
  return findAngleWithOY(x, y) + Math.PI / 2;
}

/**  Rotate the graph around the origin by 'angle' */
function rotateCenteredGraph(atoms: Atoms, angle: number): void {
  if (angle !== 0) {
    const x = atoms.x;
    const y = atoms.y;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let i = 0; i < x.length; ++i) {
      const tmp = x[i];
      x[i] = keepPrecision(tmp * cos - y[i] * sin);
      y[i] = keepPrecision(tmp * sin + y[i] * cos);
    }
  }
}

/** Flip monomer graph around OX axis preserving stereometry */
function flipMonomerAroundOX(monomer: MolGraph): void {
  flipMolGraph(monomer, true);
}

/** Flip monomer graph around OY axis preserving stereometry */
function flipMonomerAroundOY(monomer: MolGraph): void {
  flipMolGraph(monomer, false);
}

/** Flip graph around a specified axis: 'true' corresponds to OX, 'false' to OY */
function flipMolGraph(molGraph: MolGraph, axis: boolean): void {
  if (axis) { // flipping around OX
    const y = molGraph.atoms.y;
    for (let i = 0; i < y.length; i++)
      y[i] = -y[i];
  } else { // flipping around OY
    const x = molGraph.atoms.x;
    for (let i = 0; i < x.length; i++)
      x[i] = -x[i];
  }

  // preserve the stereometry
  const orientation = molGraph.bonds.bondConfiguration;
  for (const [key, value] of orientation) {
    const newValue = value === 1 ? 3 : 1;
    orientation.set(key, newValue);
  }
}

/** Flips double-bonded 'O' in carbonyl group with 'OH' in order for the monomers
 * to have standard representation simplifying their concatenation. The
 * monomer must already be adjusted with adjustPeptideMonomerGraph in order for this function to be implemented  */
function flipHydroxilGroup(monomer: MolGraph, doubleBondedOxygen: number): void {
  const x = monomer.atoms.x;
  // -1 below because indexing of nodes in molfiles starts from 1, unlike arrays
  if (x[monomer.meta.rNodes[1] - 1] > x[doubleBondedOxygen - 1])
    swapNodes(monomer, doubleBondedOxygen, monomer.meta.rNodes[1]);
}

/** Determine the number of node (starting from 1) corresponding to the
 * double-bonded oxygen of the carbonyl group  */
function findDoubleBondedCarbonylOxygen(monomer: MolGraph): number {
  const bondsMap = constructBondsMap(monomer);
  let doubleBondedOxygen = 0;
  let i = 0;
  // iterate over the nodes bonded to the carbon and find the double one
  while (doubleBondedOxygen === 0) {
    const node = bondsMap.get(monomer.meta.terminalNodes[1])![i];
    if (monomer.atoms.atomTypes[node - 1] === OXYGEN && node !== monomer.meta.rNodes[1])
      doubleBondedOxygen = node;
    i++;
  }
  return doubleBondedOxygen;
}

/** Swap the Cartesian coordinates of the two specified nodes in MolGraph  */
function swapNodes(monomer: MolGraph, nodeOne: number, nodeTwo: number): void {
  const nodeOneIdx = nodeOne - 1;
  const nodeTwoIdx = nodeTwo - 1;
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;
  const tmpX = x[nodeOneIdx];
  const tmpY = y[nodeOneIdx];
  x[nodeOneIdx] = x[nodeTwoIdx];
  y[nodeOneIdx] = y[nodeTwoIdx];
  x[nodeTwoIdx] = tmpX;
  y[nodeTwoIdx] = tmpY;
}

/** Maps a node to the list of nodes bound to it */
function constructBondsMap(monomer: MolGraph): Map<number, Array<number>> {
  const map = new Map<number, Array<number>>();
  for (const atomPairs of monomer.bonds.atomPairs) {
    for (let i = 0; i < 2; i++) {
      const key = atomPairs[i];
      const value = atomPairs[(i + 1) % 2];
      if (map.has(key))
        map.get(key)?.push(value);
      else
        map.set(key, new Array<number>(1).fill(value));
    }
  }
  return map;
}

/** Shift molGraph in the XOY plane  */
function shiftCoordinates(molGraph: MolGraph, xShift: number, yShift?: number): void {
  const x = molGraph.atoms.x;
  const y = molGraph.atoms.y;
  for (let i = 0; i < x.length; ++i) {
    x[i] = keepPrecision(x[i] + xShift);
    if (typeof yShift !== 'undefined')
      y[i] = keepPrecision(y[i] + yShift);
  }
}

/** Translate a sequence of monomer symbols into Molfile V3000 */
function monomerSeqToMolfile(
  monomerSeq: string[], monomersDict: Map<string, MolGraph>,
  alphabet: ALPHABET, polymerType: HELM_POLYMER_TYPE
): string {
  if (monomerSeq.length === 0) {
    // throw new Error('monomerSeq is empty');
    return '';
  }

  // define atom and bond counts, taking into account the bond type
  const getAtomAndBondCounts = getResultingAtomBondCounts;
  const {atomCount, bondCount} = getAtomAndBondCounts(monomerSeq, monomersDict, alphabet, polymerType);

  // create arrays to store lines of the resulting molfile
  const molfileAtomBlock = new Array<string>(atomCount);
  const molfileBondBlock = new Array<string>(bondCount);

  let addMonomerToMolblock; // todo: types?

  let sugar = null;
  let phosphate = null;

  if (polymerType === HELM_POLYMER_TYPE.PEPTIDE) {
    addMonomerToMolblock = addAminoAcidToMolblock;
  } else { // nucleotides
    addMonomerToMolblock = addNucleotideToMolblock;
    sugar = (alphabet === ALPHABET.DNA) ? monomersDict.get(DEOXYRIBOSE) : monomersDict.get(RIBOSE);
    phosphate = monomersDict.get(PHOSPHATE);
  }
  const v: LoopVariables = {
    i: 0,
    nodeShift: 0,
    bondShift: 0,
    backbonePositionShift: new Array<number>(2).fill(0),
    branchPositionShift: new Array<number>(2).fill(0),
    backboneAttachNode: 0,
    branchAttachNode: 0,
    flipFactor: 1,
  };

  const C: LoopConstants = {
    sugar: sugar!,
    phosphate: phosphate!,
    seqLength: monomerSeq.length,
    atomCount: atomCount,
    bondCount: bondCount,
  };

  for (v.i = 0; v.i < C.seqLength; ++v.i) {
    const monomer = monomersDict.get(monomerSeq[v.i])!;
    addMonomerToMolblock(monomer, molfileAtomBlock, molfileBondBlock, v, C);
  }

  capResultingMolblock(molfileAtomBlock, molfileBondBlock, v, C);

  const molfileCountsLine = V3K_BEGIN_COUNTS_LINE + atomCount + ' ' + bondCount + V3K_COUNTS_LINE_ENDING;

  // todo: possible optimization may be achieved by replacing .join('') with +=
  // since counterintuitively joining an array into a new string is reportedly
  // slower than using += as below

  let result = '';
  result += V3K_HEADER_FIRST_LINE;
  result += V3K_HEADER_SECOND_LINE;
  result += V3K_BEGIN_CTAB_BLOCK;
  result += molfileCountsLine;
  result += V3K_BEGIN_ATOM_BLOCK;
  result += molfileAtomBlock.join('');
  result += V3K_END_ATOM_BLOCK;
  result += V3K_BEGIN_BOND_BLOCK;
  result += molfileBondBlock.join('');
  result += V3K_END_BOND_BLOCK;
  result += V3K_END_CTAB_BLOCK;
  result += V3K_END;

  // return molfileParts.join('');
  return result;
}

/** Cap the resulting (after sewing up all the monomers) molfile with 'O' */
function capResultingMolblock(
  molfileAtomBlock: string[], molfileBondBlock: string[],
  v: LoopVariables, C: LoopConstants
): void {
  // add terminal oxygen
  const atomIdx = v.nodeShift + 1;
  molfileAtomBlock[C.atomCount] = V3K_BEGIN_DATA_LINE + atomIdx + ' ' +
  OXYGEN + ' ' + keepPrecision(v.backbonePositionShift[0]) + ' ' +
  v.flipFactor * keepPrecision(v.backbonePositionShift[1]) + ' ' + '0.000000 0' + '\n';

  // add terminal bond
  const firstAtom = v.backboneAttachNode;
  const secondAtom = atomIdx;
  molfileBondBlock[C.bondCount] = V3K_BEGIN_DATA_LINE + v.bondShift + ' ' +
  1 + ' ' + firstAtom + ' ' + secondAtom + '\n';
}

function addAminoAcidToMolblock(monomer: MolGraph, molfileAtomBlock: string[],
  molfileBondBlock: string[], v: LoopVariables
): void {
  v.flipFactor = (-1) ** (v.i % 2); // to flip every even monomer over OX
  addBackboneMonomerToMolblock(monomer, molfileAtomBlock, molfileBondBlock, v);
}

function addBackboneMonomerToMolblock(
  monomer: MolGraph, molfileAtomBlock: string[], molfileBondBlock: string[], v: LoopVariables
): void {
  // todo: remove these comments to the docstrings of the corr. functions
  // construnct the lines of V3K molfile atom block
  fillAtomLines(monomer, molfileAtomBlock, v);

  // construct the lines of V3K molfile bond block
  fillBondLines(monomer, molfileBondBlock, v);

  // peptide bond
  fillChainExtendingBond(monomer, molfileBondBlock, v);

  // update branch variables if necessary
  if (monomer.meta.branchShift !== null && monomer.meta.terminalNodes.length > 2)
    updateBranchVariables(monomer, v);

  // update loop variables
  updateChainExtendingVariables(monomer, v);
}

function addNucleotideToMolblock(
  nucleobase: MolGraph, molfileAtomBlock: string[], molfileBondBlock: string[], v: LoopVariables, C: LoopConstants
): void {
  // construnct the lines of V3K molfile atom block corresponding to phosphate
  // and sugar
  if (v.i === 0) {
    addBackboneMonomerToMolblock(C.sugar!, molfileAtomBlock, molfileBondBlock, v);
  } else {
    for (const monomer of [C.phosphate, C.sugar])
      addBackboneMonomerToMolblock(monomer!, molfileAtomBlock, molfileBondBlock, v);
  }

  addBranchMonomerToMolblock(nucleobase, molfileAtomBlock, molfileBondBlock, v);
}

function addBranchMonomerToMolblock(
  monomer: MolGraph, molfileAtomBlock: string[], molfileBondBlock: string[], v: LoopVariables
): void {
  fillBranchAtomLines(monomer, molfileAtomBlock, v);
  fillBondLines(monomer, molfileBondBlock, v);
  fillBackboneToBranchBond(monomer, molfileBondBlock, v);

  // C-N bond
  const bondIdx = v.bondShift;
  const firstAtom = v.branchAttachNode;
  const secondAtom = monomer.meta.terminalNodes[0] + v.nodeShift;
  molfileBondBlock[bondIdx - 1] = V3K_BEGIN_DATA_LINE + bondIdx + ' ' +
    1 + ' ' + firstAtom + ' ' + secondAtom + '\n';

  // update loop variables
  v.bondShift += monomer.bonds.atomPairs.length + 1;
  v.nodeShift += monomer.atoms.atomTypes.length;
}

function updateChainExtendingVariables(monomer: MolGraph, v: LoopVariables): void {
  v.backboneAttachNode = v.nodeShift + monomer.meta.terminalNodes[1];
  v.bondShift += monomer.bonds.atomPairs.length + 1;

  v.nodeShift += monomer.atoms.atomTypes.length;
  v.backbonePositionShift[0] += monomer.meta.backboneShift![0]; // todo: non-null check
  v.backbonePositionShift[1] += v.flipFactor * monomer.meta.backboneShift![1];
}

function updateBranchVariables(monomer: MolGraph, v: LoopVariables): void {
  v.branchAttachNode = v.nodeShift + monomer.meta.terminalNodes[2];
  for (let i = 0; i < 2; ++i)
    v.branchPositionShift[i] = v.backbonePositionShift[i] + monomer.meta.branchShift![i];
}

function fillAtomLines(monomer: MolGraph, molfileAtomBlock: string[], v: LoopVariables): void {
  for (let j = 0; j < monomer.atoms.atomTypes.length; ++j) {
    const atomIdx = v.nodeShift + j + 1;
    molfileAtomBlock[v.nodeShift + j] = V3K_BEGIN_DATA_LINE + atomIdx + ' ' +
      monomer.atoms.atomTypes[j] + ' ' +
      keepPrecision(v.backbonePositionShift[0] + monomer.atoms.x[j]) + ' ' +
      keepPrecision(v.backbonePositionShift[1] + v.flipFactor * monomer.atoms.y[j]) +
      ' ' + monomer.atoms.kwargs[j];
  }
}

// todo: remove as quickfix
function fillBranchAtomLines(monomer: MolGraph, molfileAtomBlock: string[], v: LoopVariables): void {
  for (let j = 0; j < monomer.atoms.atomTypes.length; ++j) {
    const atomIdx = v.nodeShift + j + 1;
    molfileAtomBlock[v.nodeShift + j] = V3K_BEGIN_DATA_LINE + atomIdx + ' ' +
      monomer.atoms.atomTypes[j] + ' ' +
      keepPrecision(v.branchPositionShift[0] + monomer.atoms.x[j]) + ' ' +
      keepPrecision(v.branchPositionShift[1] + v.flipFactor * monomer.atoms.y[j]) +
      ' ' + monomer.atoms.kwargs[j];
  }
}

function fillBondLines(monomer: MolGraph, molfileBondBlock: string[], v: LoopVariables): void {
  // construct the lines of V3K molfile bond block
  for (let j = 0; j < monomer.bonds.atomPairs.length; ++j) {
    const bondIdx = v.bondShift + j + 1;
    const firstAtom = monomer.bonds.atomPairs[j][0] + v.nodeShift;
    const secondAtom = monomer.bonds.atomPairs[j][1] + v.nodeShift;
    let bondCfg = '';
    if (monomer.bonds.bondConfiguration.has(j)) {
      // flip orientation when necessary
      let orientation = monomer.bonds.bondConfiguration.get(j);
      if (v.flipFactor < 0)
        orientation = (orientation === 1) ? 3 : 1;
      bondCfg = ' CFG=' + orientation;
    }
    const kwargs = monomer.bonds.kwargs.has(j) ?
      ' ' + monomer.bonds.kwargs.get(j) : '';
    molfileBondBlock[v.bondShift + j] = V3K_BEGIN_DATA_LINE + bondIdx + ' ' +
      monomer.bonds.bondTypes[j] + ' ' +
      firstAtom + ' ' + secondAtom + bondCfg + kwargs + '\n';
  }
}

function fillChainExtendingBond(monomer: MolGraph, molfileBondBlock: string[], v: LoopVariables): void {
  if (v.backboneAttachNode !== 0) {
    const bondIdx = v.bondShift;
    const firstAtom = v.backboneAttachNode;
    const secondAtom = monomer.meta.terminalNodes[0] + v.nodeShift;
    molfileBondBlock[v.bondShift - 1] = V3K_BEGIN_DATA_LINE + bondIdx + ' ' +
      1 + ' ' + firstAtom + ' ' + secondAtom + '\n';
  }
}

// todo: remove
function fillBackboneToBranchBond(branchMonomer: MolGraph, molfileBondBlock: string[], v: LoopVariables): void {
  const bondIdx = v.bondShift;
  const firstAtom = v.branchAttachNode;
  const secondAtom = branchMonomer.meta.terminalNodes[0] + v.nodeShift;
  molfileBondBlock[bondIdx - 1] = V3K_BEGIN_DATA_LINE + bondIdx + ' ' +
    1 + ' ' + firstAtom + ' ' + secondAtom + '\n';
}

/** Compute the atom/bond counts for the resulting molfile, depending on the
 * type of polymer (peptide/nucleotide) */
function getResultingAtomBondCounts(
  monomerSeq: string[], monomersDict: Map<string, MolGraph>,
  alphabet: ALPHABET, polymerType: HELM_POLYMER_TYPE
): { atomCount: number, bondCount: number } {
  let atomCount = 0;
  let bondCount = 0;

  // sum up all the atoms/nodes provided by the sequence
  for (const monomerSymbol of monomerSeq) {
    if (monomerSymbol === '') continue; // Skip for gap/empty monomer in MSA
    const monomer = monomersDict.get(monomerSymbol)!;
    atomCount += monomer.atoms.x.length;
    bondCount += monomer.bonds.bondTypes.length;
  }

  // add extra values depending on the polymer type
  if (polymerType === HELM_POLYMER_TYPE.PEPTIDE) {
    // add the rightmost/terminating cap group 'OH' (i.e. 'O')
    atomCount += 1;
    // add chain-extending bonds (C-NH per each monomer pair and terminal C-OH)
    bondCount += monomerSeq.length;
  } else { // nucleotides
    const sugar = (alphabet === ALPHABET.DNA) ?
      monomersDict.get(DEOXYRIBOSE)! : monomersDict.get(RIBOSE)!;
    const phosphate = monomersDict.get(PHOSPHATE)!;

    // add phosphate per each pair of nucleobase symbols
    atomCount += (monomerSeq.length - 1) * phosphate.atoms.x.length;

    // add sugar per each nucleobase symbol
    atomCount += monomerSeq.length * sugar.atoms.x.length;

    // add the leftmost cap group 'OH' (i.e. 'O')
    atomCount += 1;

    // add bonds from phosphate monomers
    bondCount += (monomerSeq.length - 1) * phosphate.bonds.bondTypes.length;

    // add bonds from sugar monomers
    bondCount += monomerSeq.length * sugar.bonds.bondTypes.length;

    // exclude the first chain-extending bond O-P (absent, no 'leftmost' phosphate)
    bondCount -= 1;

    // add chain-extending and branch bonds (O-P, C-O and C-N per each nucleotide)
    bondCount += monomerSeq.length * 3;
  }

  return {atomCount, bondCount};
}

/** Keep precision upon floating point operations over atom coordinates */
function keepPrecision(x: number): number {
  return Math.round(PRECISION_FACTOR * x) / PRECISION_FACTOR;
}

function convertMolGraphToMolfileV3K(molGraph: MolGraph): string {
  // counts line
  const atomType = molGraph.atoms.atomTypes;
  const x = molGraph.atoms.x;
  const y = molGraph.atoms.y;
  const atomKwargs = molGraph.atoms.kwargs;
  const bondType = molGraph.bonds.bondTypes;
  const atomPair = molGraph.bonds.atomPairs;
  const bondKwargs = molGraph.bonds.kwargs;
  const bondConfig = molGraph.bonds.bondConfiguration;
  const atomCount = atomType.length;
  const bondCount = molGraph.bonds.bondTypes.length;

  // todo rewrite using constants
  const molfileCountsLine = V3K_BEGIN_COUNTS_LINE + atomCount + ' ' + bondCount + V3K_COUNTS_LINE_ENDING;

  // atom block
  let molfileAtomBlock = '';
  for (let i = 0; i < atomCount; ++i) {
    const atomIdx = i + 1;
    const coordinate = [x[i].toString(), y[i].toString()];

    // format coordinates so that they have 6 digits after decimal point
    // for (let k = 0; k < 2; ++k) {
    //   const formatted = coordinate[k].toString().split('.');
    //   if (formatted.length === 1)
    //     formatted.push('0');
    //   formatted[1] = formatted[1].padEnd(V3K_ATOM_COORDINATE_PRECISION, '0');
    //   coordinate[k] = formatted.join('.');
    // }

    const atomLine = V3K_BEGIN_DATA_LINE + atomIdx + ' ' + atomType[i] + ' ' +
      coordinate[0] + ' ' + coordinate[1] + ' ' + atomKwargs[i];
    molfileAtomBlock += atomLine;
  }

  // bond block
  let molfileBondBlock = '';
  for (let i = 0; i < bondCount; ++i) {
    const bondIdx = i + 1;
    const firstAtom = atomPair[i][0];
    const secondAtom = atomPair[i][1];
    const kwargs = bondKwargs.has(i) ? ' ' + bondKwargs.get(i) : '';
    const bondCfg = bondConfig.has(i) ? ' CFG=' + bondConfig.get(i) : '';
    const bondLine = V3K_BEGIN_DATA_LINE + bondIdx + ' ' + bondType[i] + ' ' +
      firstAtom + ' ' + secondAtom + bondCfg + kwargs + '\n';
    molfileBondBlock += bondLine;
  }

  const molfileParts = [
    V3K_HEADER_FIRST_LINE,
    V3K_HEADER_SECOND_LINE,
    V3K_BEGIN_CTAB_BLOCK,
    molfileCountsLine,
    V3K_BEGIN_ATOM_BLOCK,
    molfileAtomBlock,
    V3K_END_ATOM_BLOCK,
    V3K_BEGIN_BOND_BLOCK,
    molfileBondBlock,
    V3K_END_BOND_BLOCK,
    V3K_END_CTAB_BLOCK,
    V3K_END,
  ];
  const resultingMolfile = molfileParts.join('');
  // console.log(resultingMolfile);

  return resultingMolfile;
}

export async function getSymbolToCappedMolfileMap(monomersLibList: any[]): Promise<Map<string, string> | undefined> {
  if (DG.Func.find({package: 'Chem', name: 'getRdKitModule'}).length === 0) {
    grok.shell.warning('Transformation to atomic level requires package "Chem" installed.');
    return;
  }

  const symbolToCappedMolfileMap = new Map<string, string>();
  const moduleRdkit = await grok.functions.call('Chem:getRdKitModule');

  for (const monomerLibObject of monomersLibList) {
    const monomerSymbol = monomerLibObject[HELM_FIELDS.SYMBOL];
    const capGroups = parseCapGroups(monomerLibObject[HELM_FIELDS.RGROUPS]);
    const capGroupIdxMap = parseCapGroupIdxMap(monomerLibObject[HELM_FIELDS.MOLFILE]);

    const molfileV3K = convertMolfileToV3K(removeRGroupLines(monomerLibObject[HELM_FIELDS.MOLFILE]), moduleRdkit);
    const counts = parseAtomAndBondCounts(molfileV3K);

    const atoms = parseAtomBlock(molfileV3K, counts.atomCount);
    const bonds = parseBondBlock(molfileV3K, counts.bondCount);
    const meta = getMonomerMetadata(atoms, bonds, capGroups, capGroupIdxMap);

    const monomerGraph: MolGraph = {atoms: atoms, bonds: bonds, meta: meta};

    removeHydrogen(monomerGraph);

    const molfile = convertMolGraphToMolfileV3K(monomerGraph);
    symbolToCappedMolfileMap.set(monomerSymbol, molfile);
  }
  return symbolToCappedMolfileMap;
}

/** Get the V3K molfile corresponding to the capped Monomer (default cap groups)  */
export function capPeptideMonomer(monomer: Monomer): string {
  const funcList: DG.Func[] = DG.Func.find({package: 'Chem', name: 'getRdKitModule'});
  const moduleRdkit = funcList[0].apply();

  const capGroups = parseCapGroups(monomer[HELM_FIELDS.RGROUPS]);
  const capGroupIdxMap = parseCapGroupIdxMap(monomer[HELM_FIELDS.MOLFILE]);
  const molfileV3K = convertMolfileToV3K(removeRGroupLines(monomer[HELM_FIELDS.MOLFILE]), moduleRdkit);
  const counts = parseAtomAndBondCounts(molfileV3K);

  const atoms = parseAtomBlock(molfileV3K, counts.atomCount);
  const bonds = parseBondBlock(molfileV3K, counts.bondCount);
  const meta = getMonomerMetadata(atoms, bonds, capGroups, capGroupIdxMap);

  const monomerGraph: MolGraph = {atoms: atoms, bonds: bonds, meta: meta};

  adjustPeptideMonomerGraph(monomerGraph);

  const molfile = convertMolGraphToMolfileV3K(monomerGraph);
  return molfile;
}
