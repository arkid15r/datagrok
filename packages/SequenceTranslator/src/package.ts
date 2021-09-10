/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from "cash-dom";

import {defineAxolabsPattern} from "./defineAxolabsPattern";

export let _package = new DG.Package();

const undefinedInputSequence: string = "Type of input sequence is undefined";
const smallNumberOfCharacters: string = "Length of input sequence should be at least 10 characters";
const defaultNucleotidesInput: string = "AGGTCCTCTTGACTTAGGCC";
const noTranslationTableAvailable: string = "No translation table available";
const sequenceWasCopied: string = 'Copied!';
const tooltipSequence: string = 'Copy sequence';

//name: Sequence Translator
//tags: app
export function sequenceTranslator(): void {

  let windows = grok.shell.windows;
  windows.showProperties = false;
  windows.showToolbox = false;
  windows.showHelp = false;

  let appMainDescription = ui.info(
    [
      ui.divText('\n How to convert one sequence:',{style:{'font-weight':'bolder'}}),
      ui.divText("Paste sequence into the text field below"),
      ui.divText('\n How to convert many sequences:',{style:{'font-weight':'bolder'}}),
      ui.divText("1. Drag & drop an Excel or CSV file with sequences into Datagrok. The platform will automatically detect columns with sequences"),
      ui.divText('2. Right-click on the column header, then see the \'Convert\' menu'),
      ui.divText("This will add the result column to the right of the table"),
    ], 'Convert oligonucleotide sequences between Nucleotides, BioSpring, Axolabs, and GCRS representations.'
  );

  let inputSequenceField = ui.textInput("", defaultNucleotidesInput, async (seq: string) => {
    moleculeSvg.innerHTML = "";
    let outputSequencesObj = convertSequence(seq);

    let tableRows = [];
    for (let key of Object.keys(outputSequencesObj).slice(1)) {
      // @ts-ignore
      tableRows.push({'key': key, 'value': ui.link(outputSequencesObj[key], () => navigator.clipboard.writeText(outputSequencesObj[key]).then(() => grok.shell.info(sequenceWasCopied)), tooltipSequence, '')})
    }

    outputTableDiv.innerHTML = "";

    outputTableDiv.append(
      ui.div([
        DG.HtmlTable.create(
          tableRows,
          (item: {key: string; value: string;}) => [item.key, item.value],
          ['Code', 'Sequence']
        ).root
      ], 'table')
    );
    grok.shell.v
    semTypeOfInputSequence.textContent = 'Detected input type: ' + outputSequencesObj.type;

    if (!(outputSequencesObj.type == undefinedInputSequence || outputSequencesObj.type == smallNumberOfCharacters)) {
      let pi = DG.TaskBarProgressIndicator.create('Rendering molecule...');
      try {
        let flavor: string = (outputSequencesObj.Nucleotides.includes('U')) ? "RNA_both_caps" : "DNA_both_caps";
        let mol = grok.chem.svgMol(<string> await nucleotidesToSmiles(outputSequencesObj.Nucleotides, flavor), 900, 300);
        moleculeSvg.append(mol);
      } finally {
        pi.close();
      }
    }
  });
  let semTypeOfInputSequence = ui.divText('Detected input type: DNA Nucleotides Code');

  let outputTableDiv = ui.div([
    DG.HtmlTable.create([
      {key: 'Nucleotides', value: ui.link(defaultNucleotidesInput, () => navigator.clipboard.writeText(defaultNucleotidesInput).then(() => grok.shell.info(sequenceWasCopied)), tooltipSequence, '')},
      {key: 'BioSpring', value: ui.link(asoGapmersNucleotidesToBioSpring(defaultNucleotidesInput), () => navigator.clipboard.writeText(asoGapmersNucleotidesToBioSpring(defaultNucleotidesInput)).then(() => grok.shell.info(sequenceWasCopied)), tooltipSequence, '')},
      {key: 'Axolabs', value: ui.link(noTranslationTableAvailable, () => navigator.clipboard.writeText(defaultNucleotidesInput).then(() => grok.shell.info(sequenceWasCopied)), tooltipSequence, '')},
      {key: 'GCRS', value: ui.link(asoGapmersNucleotidesToGcrs(defaultNucleotidesInput), () => navigator.clipboard.writeText(asoGapmersNucleotidesToGcrs(defaultNucleotidesInput)).then(() => grok.shell.info(sequenceWasCopied)), tooltipSequence, '')}
    ], (item: {key: string; value: string;}) => [item.key, item.value], ['Code', 'Sequence']).root
  ], 'table');

  let accordionWithCmoCodes = ui.accordion();
  accordionWithCmoCodes.addPane('CMO Codes', () =>
    ui.divH([
      DG.HtmlTable.create(
        [
          {name: "2'MOE-5Me-rU", bioSpring: '5', gcrs: 'moeT'},
          {name: "2'MOE-rA", bioSpring: '6', gcrs: 'moeA'},
          {name: "2'MOE-5Me-rC", bioSpring: '7', gcrs: 'moe5mC'},
          {name: "2'MOE-rG", bioSpring: '8', gcrs: 'moeG'},
          {name: "5-Methyl-dC", bioSpring: '9', gcrs: '5mC'},
          {name: "ps linkage", bioSpring: '*', gcrs: 'ps'},
          {name: "dA", bioSpring: 'A', gcrs: 'A'},
          {name: "dC", bioSpring: 'C', gcrs: 'C'},
          {name: "dT", bioSpring: 'T', gcrs: 'T'},
          {name: "dG", bioSpring: 'G', gcrs: 'G'}
        ],
        (item: {name: string; bioSpring: string; gcrs: string}) => [item.name, item.bioSpring, item.gcrs],
        ['For ASO Gapmers', 'BioSpring', 'GCRS']
      ).root,
      ui.div([], {style: {width: '50px'}}),
      DG.HtmlTable.create(
        [
          {name: "2'-fluoro-U", axolabs: '1', bioSpring: 'Uf', gcrs: 'fU'},
          {name: "2'-fluoro-A", axolabs: '2', bioSpring: 'Af', gcrs: 'fA'},
          {name: "2'-fluoro-C", axolabs: '3', bioSpring: 'Cf', gcrs: 'fC'},
          {name: "2'-fluoro-G", axolabs: '4', bioSpring: 'Gf', gcrs: 'fG'},
          {name: "OMe-rU", axolabs: '5', bioSpring: 'u', gcrs: 'mU'},
          {name: "OMe-rA", axolabs: '6', bioSpring: 'a', gcrs: 'mA'},
          {name: "OMe-rC", axolabs: '7', bioSpring: 'c', gcrs: 'mC'},
          {name: "OMe-rG", axolabs: '8', bioSpring: 'g', gcrs: 'mG'},
          {name: "ps linkage", axolabs: '*', bioSpring: 's', gcrs: 'ps'}
        ],
        (item: {name: string; axolabs: string, bioSpring: string; gcrs: string}) => [item.name, item.bioSpring, item.axolabs, item.gcrs],
        ["For 2\'-OMe and 2\'-F modified siRNA", 'BioSpring', 'Axolabs', 'GCRS']
      ).root
    ]), false
  );

  let moleculeSvg = ui.block([
    grok.chem.svgMol('Cc1cn([C@H]2C[C@H](OP(=O)(O)OC[C@H]3O[C@@H](n4ccc(N)nc4=O)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n' +
      '4cc(C)c(=O)[nH]c4=O)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cc(C)c(=O)[nH]c4=O)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5' +
      'c(=O)[nH]c(N)nc54)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4ccc(N)nc4=O)' +
      'C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cc(C)c(=O)[nH]c4=O)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cc(C)c(=O)[nH]c4=O)C[C@@H]3OP(=O)(O)' +
      'OC[C@H]3O[C@@H](n4cnc5c(N)ncnc54)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4cnc5c(=O)[nH]c(N)nc54)C[C@@H]3OP(=O)(O)OC[C@H]' +
      '3O[C@@H](n4cnc5c(=O)[nH]c(N)nc54)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H](n4ccc(N)nc4=O)C[C@@H]3OP(=O)(O)OC[C@H]3O[C@@H]' +
      '(n4ccc(N)nc4=O)C[C@@H]3OP(=O)(O)O)[C@@H](COP(=O)(O)O[C@H]3C[C@H](n4ccc(N)nc4=O)O[C@@H]3COP(=O)(O)O[C@H]3C[C@H]' +
      '(n4ccc(N)nc4=O)O[C@@H]3COP(=O)(O)O[C@H]3C[C@H](n4cc(C)c(=O)[nH]c4=O)O[C@@H]3COP(=O)(O)O[C@H]3C[C@H](n4cnc5c(=O)' +
      '[nH]c(N)nc54)O[C@@H]3COP(=O)(O)O[C@H]3C[C@H](n4cnc5c(=O)[nH]c(N)nc54)O[C@@H]3COP(=O)(O)O[C@H]3C[C@H](n4cnc5c(N)' +
      'ncnc54)O[C@@H]3COP(=O)(O)O)O2)c(=O)[nH]c1=O', 900, 300
    )
  ]);

  let tab = ui.tabControl({
    'MAIN': ui.div([
      appMainDescription,
      ui.panel([
        ui.div([
          ui.h1('Input sequence'),
          ui.div([
            inputSequenceField.root
          ],'input-base')
        ], 'sequenceInput'),
        semTypeOfInputSequence,
        ui.block([
          ui.h1('Output'),
          ui.h1('Output'),
          outputTableDiv
        ]),
        accordionWithCmoCodes.root,
        moleculeSvg,
        ui.button('SAVE SD FILE', async() => {
          let outputSequenceObj = convertSequence(inputSequenceField.value);
          let flavor: string = outputSequenceObj.Nucleotides.includes('U') ? "RNA_both_caps" : "DNA_both_caps";
          let smiles = await nucleotidesToSmiles(outputSequenceObj.Nucleotides, flavor);
          //@ts-ignore
          let mol = new OCL.Molecule.fromSmiles(smiles);
          let result = `\n${mol.toMolfile()}\n` + '$$$$';
          var element = document.createElement('a');
          element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(result));
          element.setAttribute('download', outputSequenceObj.Nucleotides + '.sdf');
          element.click();
        })
      ], 'sequence')!
    ]),
    'AXOLABS': _defineAxolabsPattern()
  }).root;
  tab.style.height = '100%';
  tab.style.width = '100%';

  let v = grok.shell.newView('Sequence Translator', [
     tab
  ]);
  v.box = true;

  $('.sequence')
    .children().css('padding','5px 0');
  $('.sequenceInput .input-base').css('margin','0');
  $('.sequenceInput textarea')
    .css('resize','none')
    .css('min-height','50px')
    .css('width','100%');
  $('.sequenceInput select')
    .css('width','100%');
}

export async function nucleotidesToSmiles(nucleotides: string, flavor: string) {
  return await grok.functions.call('SequenceTranslator:convertFastaToSmiles', {
    'sequence_in_fasta_format': nucleotides,
    'flavor': flavor
  });
}

export function isDnaNucleotidesCode(sequence: string): boolean {return /^[ATGC]{10,}$/.test(sequence);}

export function isRnaNucleotidesCode(sequence: string): boolean {return /^[AUGC]{10,}$/.test(sequence);}

export function isAbiCode(sequence: string): boolean {return /^[5678ATGC]{10,}$/.test(sequence);}

export function isAsoGapmerBioSpringCode(sequence: string): boolean {return /^[*56789ATGC]{30,}$/.test(sequence);}

export function isAsoGapmerGcrsCode(sequence: string): boolean {return /^(?=.*moe)(?=.*5mC)(?=.*ps){30,}/.test(sequence);}

export function isSiRnaBioSpringCode(sequence: string): boolean {return /^[*1-8]{30,}$/.test(sequence);}

export function isSiRnaAxolabsCode(sequence: string): boolean {return /^[fsACGUacgu]{20,}$/.test(sequence);}

export function isSiRnaGcrsCode(sequence: string): boolean {return (sequence.slice(0, 3) == 'moe' && /^[fmpsACGU]{30,}$/.test(sequence));}

export function isGcrsCode(sequence: string): boolean {return /^[fmpsACGU]{30,}$/.test(sequence);}

export function isOP100Code(sequence: string): boolean {return /^[acgu*]{10,}$/.test(sequence);}

export function isMM12Code(sequence: string): boolean {return /^[IiJjKkLlEeFfGgHhQq]{10,}$/.test(sequence);}

function convertSequence(seq: string) {
  seq = seq.replace(/\s/g, '');
  if (seq.length < 10)
    return {
      type: smallNumberOfCharacters,
      Nucleotides: smallNumberOfCharacters,
      BioSpring: smallNumberOfCharacters,
      Axolabs: smallNumberOfCharacters,
      GCRS: smallNumberOfCharacters
    };
  if (isDnaNucleotidesCode(seq))
    return {
      type: "DNA Nucleotides Code",
      Nucleotides: seq,
      BioSpring: asoGapmersNucleotidesToBioSpring(seq),
      Axolabs: noTranslationTableAvailable,
      GCRS: asoGapmersNucleotidesToGcrs(seq)
    };
  if (isAbiCode(seq))
    return {
      type: "ABI Code",
      Nucleotides: noTranslationTableAvailable,
      GCRS: noTranslationTableAvailable,
      MM12: noTranslationTableAvailable,
      OP100: noTranslationTableAvailable,
      ABI: seq
    };
  if (isAsoGapmerBioSpringCode(seq))
    return {
      type: "ASO Gapmers / BioSpring Code",
      Nucleotides: asoGapmersBioSpringToNucleotides(seq),
      BioSpring: seq,
      Axolabs: noTranslationTableAvailable,
      GCRS: asoGapmersBioSpringToGcrs(seq)
    };
  if (isAsoGapmerGcrsCode(seq))
    return {
      type: "ASO Gapmers / GCRS Code",
      Nucleotides: asoGapmersGcrsToNucleotides(seq),
      BioSpring: asoGapmersGcrsToBioSpring(seq),
      Axolabs: noTranslationTableAvailable,
      GCRS: seq
    };
  if (isRnaNucleotidesCode(seq))
    return {
      type: "RNA Nucleotides Code",
      Nucleotides: seq,
      BioSpring: siRnaNucleotideToBioSpringSenseStrand(seq),
      Axolabs: siRnaNucleotideToAxolabsSenseStrand(seq),
      GCRS: siRnaNucleotidesToGcrs(seq)
    };
  if (isSiRnaBioSpringCode(seq))
    return {
      type: "siRNA / bioSpring Code",
      Nucleotides: siRnaBioSpringToNucleotides(seq),
      BioSpring: seq,
      Axolabs: siRnaBioSpringToAxolabs(seq),
      GCRS: siRnaBioSpringToGcrs(seq)
    };
  if (isSiRnaAxolabsCode(seq))
    return {
      type: "siRNA / Axolabs Code",
      Nucleotides: siRnaAxolabsToNucleotides(seq),
      BioSpring: siRnaAxolabsToBioSpring(seq),
      Axolabs: seq,
      GCRS: siRnaAxolabsToGcrs(seq)
    };
  if (isSiRnaGcrsCode(seq))
    return {
      type: "siRNA / GCRS Code",
      Nucleotides: siRnaGcrsToNucleotides(seq),
      BioSpring: siRnaGcrsToBioSpring(seq),
      Axolabs: siRnaGcrsToAxolabs(seq),
      GCRS: seq
    };
  if (isGcrsCode(seq))
    return {
      type: "GCRS Code",
      Nucleotides: gcrsToNucleotides(seq),
      GCRS: seq,
      MM12: gcrsToMM12(seq),
      OP100: gcrsToOP100(seq),
      ABI: gcrsToABI(seq)
    }
  if (isMM12Code(seq))
    return {
      type: "MM12 Code",
      Nucleotides: noTranslationTableAvailable,
      GCRS: noTranslationTableAvailable,
      MM12: seq,
      OP100: noTranslationTableAvailable,
      ABI: noTranslationTableAvailable
    };
  if (isOP100Code(seq))
    return {
      type: "OP100 Code",
      Nucleotides: noTranslationTableAvailable,
      GCRS: noTranslationTableAvailable,
      MM12: noTranslationTableAvailable,
      OP100: seq,
      ABI: noTranslationTableAvailable
    };
  return {
    type: undefinedInputSequence,
    Nucleotides: undefinedInputSequence
  };
}

//name: asoGapmersNucleotidesToBioSpring
//input: string nucleotides {semType: DNA nucleotides}
//output: string result {semType: BioSpring / Gapmers}
export function asoGapmersNucleotidesToBioSpring(nucleotides: string) {
  let count: number = -1;
  const objForEdges: {[index: string]: string} = {"T": "5*", "A": "6*", "C": "7*", "G": "8*"};
  const objForCenter: {[index: string]: string} = {"C": "9*", "A": "A*", "T": "T*", "G": "G*"};
  return nucleotides.replace(/[ATCG]/g, function (x: string) {
    count++;
    return (count > 4 && count < 15) ? objForCenter[x] : objForEdges[x];
  }).slice(0, 2 * count + 1);
}

//name: asoGapmersNucleotidesToGcrs
//input: string nucleotides {semType: DNA nucleotides}
//output: string result {semType: GCRS / Gapmers}
export function asoGapmersNucleotidesToGcrs(nucleotides: string) {
  let count: number = -1;
  const objForEdges: {[index: string]: string} = {"T": "moeUnps", "A": "moeAnps", "C": "moe5mCnps", "G": "moeGnps"};
  const objForCenter: {[index: string]: string} = {"C": "5mCps", "A": "Aps", "T": "Tps", "G": "Gps"};
  return nucleotides.replace(/[ATCG]/g, function (x: string) {
    count++;
    if (count < 5) return (count == 4) ? objForEdges[x].slice(0, -3) + 'ps' : objForEdges[x];
    if (count < 15) return (count == 14) ? objForCenter[x].slice(0, -2) + 'nps' : objForCenter[x];
    return objForEdges[x];
  }).slice(0, -3);
}

//name: asoGapmersBioSpringToNucleotides
//input: string nucleotides {semType: BioSpring / Gapmers}
//output: string result {semType: DNA nucleotides}
export function asoGapmersBioSpringToNucleotides(nucleotides: string) {
  const obj: {[index: string]: string} = {"*": "", "5": "T", "6": "A", "7": "C", "8": "G", "9": "C"};
  return nucleotides.replace(/[*56789]/g, function (x: string) {return obj[x];});
}

//name: asoGapmersBioSpringToGcrs
//input: string nucleotides {semType: BioSpring / Gapmers}
//output: string result {semType: GCRS / Gapmers}
export function asoGapmersBioSpringToGcrs(nucleotides: string) {
  let count: number = -1;
  const obj: {[index: string]: string} = {
    "5*": "moeUnps", "6*": "moeAnps", "7*": "moe5mCnps", "8*": "moeGnps", "9*": "5mCps", "A*": "Aps", "T*": "Tps",
    "G*": "Gps", "C*": "Cps", "5": "moeU", "6": "moeA", "7": "moe5mC", "8": "moeG"
  };
  return nucleotides.replace(/(5\*|6\*|7\*|8\*|9\*|A\*|T\*|G\*|C\*|5|6|7|8)/g, function (x: string) {
    count++;
    return (count == 4) ? obj[x].slice(0, -3) + 'ps' : (count == 14) ? obj[x].slice(0, -2) + 'nps' : obj[x];
  });
}

//name: asoGapmersGcrsToBioSpring
//input: string nucleotides {semType: GCRS / Gapmers}
//output: string result {semType: BioSpring / Gapmers}
export function asoGapmersGcrsToBioSpring(nucleotides: string) {
  const obj: {[index: string]: string} = {
    "moeT": "5", "moeA": "6", "moe5mC": "7", "moeG": "8", "moeU": "5", "5mC": "9", "nps": "*", "ps": "*", "U": "T"
  };
  return nucleotides.replace(/(moeT|moeA|moe5mC|moeG|moeU|5mC|nps|ps|U)/g, function (x: string) {return obj[x];});
}

//name: asoGapmersGcrsToNucleotides
//input: string nucleotides {semType: GCRS / Gapmers}
//output: string result {semType: DNA nucleotides}
export function asoGapmersGcrsToNucleotides(nucleotides: string) {
  const obj: {[index: string]: string} = {"moe": "", "5m": "", "n": "", "ps": "", "U": "T"};
  return nucleotides.replace(/(moe|5m|n|ps|U)/g, function (x: string) {return obj[x];});
}

//name: siRnaBioSpringToNucleotides
//input: string nucleotides {semType: BioSpring / siRNA}
//output: string result {semType: RNA nucleotides}
export function siRnaBioSpringToNucleotides(nucleotides: string) {
  const obj: {[index: string]: string} = {"1": "U", "2": "A", "3": "C", "4": "G", "5": "U", "6": "A", "7": "C", "8": "G", "*": ""};
  return nucleotides.replace(/[12345678*]/g, function (x: string) {return obj[x];});
}

//name: siRnaBioSpringToAxolabs
//input: string nucleotides {semType: BioSpring / siRNA}
//output: string result {semType: Axolabs / siRNA}
export function siRnaBioSpringToAxolabs(nucleotides: string) {
  const obj: {[index: string]: string} = {"1": "Uf", "2": "Af", "3": "Cf", "4": "Gf", "5": "u", "6": "a", "7": "c", "8": "g", "*": "s"};
  return nucleotides.replace(/[12345678*]/g, function (x: string) {return obj[x];});
}

//name: siRnaBioSpringToGcrs
//input: string nucleotides {semType: BioSpring / siRNA}
//output: string result {semType: GCRS}
export function siRnaBioSpringToGcrs(nucleotides: string) {
  const obj: {[index: string]: string} = {"1": "fU", "2": "fA", "3": "fC", "4": "fG", "5": "mU", "6": "mA", "7": "mC", "8": "mG", "*": "ps"};
  return nucleotides.replace(/[12345678*]/g, function (x: string) {return obj[x];});
}

//name: siRnaAxolabsToGcrs
//input: string nucleotides {semType: Axolabs / siRNA}
//output: string result {semType: GCRS}
export function siRnaAxolabsToGcrs(nucleotides: string) {
  const obj: {[index: string]: string} = {
    "Uf": "fU", "Af": "fA", "Cf": "fC", "Gf": "fG", "u": "mU", "a": "mA", "c": "mC", "g": "mG", "s": "ps"
  };
  return nucleotides.replace(/(Uf|Af|Cf|Gf|u|a|c|g|s)/g, function (x: string) {return obj[x];});
}

//name: siRnaAxolabsToBioSpring
//input: string nucleotides {semType: Axolabs / siRNA}
//output: string result {semType: BioSpring / siRNA}
export function siRnaAxolabsToBioSpring(nucleotides: string) {
  const obj: {[index: string]: string} = {
    "Uf": "1", "Af": "2", "Cf": "3", "Gf": "4", "u": "5", "a": "6", "c": "7", "g": "8", "s": "*"
  };
  return nucleotides.replace(/(Uf|Af|Cf|Gf|u|a|c|g|s)/g, function (x: string) {return obj[x];});
}

//name: siRnaAxolabsToNucleotides
//input: string nucleotides {semType: Axolabs / siRNA}
//output: string result {semType: RNA nucleotides}
export function siRnaAxolabsToNucleotides(nucleotides: string) {
  const obj: {[index: string]: string} = {
    "Uf": "U", "Af": "A", "Cf": "C", "Gf": "G", "u": "U", "a": "A", "c": "C", "g": "G", "s": ""
  };
  return nucleotides.replace(/(Uf|Af|Cf|Gf|u|a|c|g|s)/g, function (x: string) {return obj[x];});
}

//name: siRnaGcrsToNucleotides
//input: string nucleotides {semType: GCRS}
//output: string result {semType: RNA nucleotides}
export function siRnaGcrsToNucleotides(nucleotides: string) {
  const obj: {[index: string]: string} = {
    "fU": "U", "fA": "A", "fC": "C", "fG": "G", "mU": "U", "mA": "A", "mC": "C", "mG": "G", "ps": "", "s": ""
  };
  return nucleotides.replace(/(fU|fA|fC|fG|mU|mA|mC|mG|ps|s)/g, function (x: string) {return obj[x];});
}

//name: siRnaGcrsToBioSpring
//input: string nucleotides {semType: GCRS}
//output: string result {semType: BioSpring / siRNA}
export function siRnaGcrsToBioSpring(nucleotides: string) {
  const obj: {[index: string]: string} = {
    "fU": "1", "fA": "2", "fC": "3", "fG": "4", "mU": "5", "mA": "6", "mC": "7", "mG": "8", "ps": "*"
  };
  return nucleotides.replace(/(fU|fA|fC|fG|mU|mA|mC|mG|ps)/g, function (x: string) {return obj[x];});
}

//name: siRnaGcrsToAxolabs
//input: string nucleotides {semType: GCRS}
//output: string result {semType: Axolabs / siRNA}
export function siRnaGcrsToAxolabs(nucleotides: string) {
  const obj: {[index: string]: string} = {
    "fU": "Uf", "fA": "Af", "fC": "Cf", "fG": "Gf", "mU": "u", "mA": "a", "mC": "c", "mG": "g", "ps": "s"
  };
  return nucleotides.replace(/(fU|fA|fC|fG|mU|mA|mC|mG|ps)/g, function (x: string) {return obj[x];});
}

//name: siRnaNucleotideToBioSpringSenseStrand
//input: string nucleotides {semType: RNA nucleotides}
//output: string result {semType: BioSpring / siRNA}
export function siRnaNucleotideToBioSpringSenseStrand(nucleotides: string) {
  let count: number = -1;
  const objForLeftEdge: {[index: string]: string} = {"A": "6*", "U": "5*", "G": "8*", "C": "7*"};
  const objForRightEdge: {[index: string]: string} = {"A": "*6", "U": "*5", "G": "*8", "C": "*7"};
  const objForOddIndices: {[index: string]: string} = {"A": "6", "U": "5", "G": "8", "C": "7"};
  const objForEvenIndices: {[index: string]: string} = {"A": "2", "U": "1", "G": "4", "C": "3"};
  return nucleotides.replace(/[AUGC]/g, function (x: string) {
    count++;
    if (count < 2) return objForLeftEdge[x];
    if (count > nucleotides.length - 3) return objForRightEdge[x];
    return (count % 2 == 0) ? objForEvenIndices[x] : objForOddIndices[x];
  });
}

//name: siRnaNucleotidesToGcrs
//input: string nucleotides {semType: RNA nucleotides}
//output: string result {semType: GCRS}
export function siRnaNucleotidesToGcrs(nucleotides: string) {
  let count: number = -1;
  const objForLeftEdge: {[index: string]: string} = {"A": "mAps", "U": "mUps", "G": "mGps", "C": "mCps"};
  const objForRightEdge: {[index: string]: string} = {"A": "psmA", "U": "psmU", "G": "psmG", "C": "psmC"};
  const objForEvenIndices: {[index: string]: string} = {"A": "fA", "U": "fU", "G": "fG", "C": "fC"};
  const objForOddIndices: {[index: string]: string} = {"A": "mA", "U": "mU", "G": "mG", "C": "mC"};
  return nucleotides.replace(/[AUGC]/g, function (x: string) {
    count++;
    if (count < 2) return objForLeftEdge[x];
    if (count > nucleotides.length - 3) return objForRightEdge[x];
    return (count % 2 == 0) ? objForEvenIndices[x] : objForOddIndices[x];
  });
}

//name: siRnaNucleotideToAxolabsSenseStrand
//input: string nucleotides {semType: RNA nucleotides}
//output: string result {semType: Axolabs}
export function siRnaNucleotideToAxolabsSenseStrand(nucleotides: string) {
  let count: number = -1;
  const objForLeftEdge: {[index: string]: string} = {"A": "as", "U": "us", "G": "gs", "C": "cs"};
  const objForSomeIndices: {[index: string]: string} = {"A": "Af", "U": "Uf", "G": "Gf", "C": "Cf"};
  const obj: {[index: string]: string} = {"A": "a", "U": "u", "G": "g", "C": "c"};
  return nucleotides.replace(/[AUGC]/g, function (x: string) {
    count++;
    if (count < 2) return objForLeftEdge[x];
    if (count == 6 || (count > 7 && count < 11)) return objForSomeIndices[x]
    if (count == nucleotides.length - 1) return 'a';
    return obj[x];
  });
}

//name: siRnaNucleotideToAxolabsAntisenseStrand
//input: string nucleotides {semType: RNA nucleotides}
//output: string result {semType: Axolabs}
export function siRnaNucleotideToAxolabsAntisenseStrand(nucleotides: string) {
  let count: number = -1;
  const objForSmallLinkages: {[index: string]: string} = {"A": "as", "U": "us", "G": "gs", "C": "cs"};
  const objForBigLinkages: {[index: string]: string} = {"A": "Afs", "U": "Ufs", "G": "Gfs", "C": "Cfs"};
  const objForSomeIndices: {[index: string]: string} = {"A": "Af", "U": "Uf", "G": "Gf", "C": "Cf"};
  const obj: {[index: string]: string} = {"A": "a", "U": "u", "G": "g", "C": "c"};
  return nucleotides.replace(/[AUGC]/g, function (x: string) {
    count++;
    if (count > 19 && count < 22) return objForSmallLinkages[x];
    if (count == 0) return 'us';
    if (count == 1) return objForBigLinkages[x];
    return (count == 5 || count == 7 || count == 8 || count == 13 || count == 15) ? objForSomeIndices[x] : obj[x];
  });
}

//name: gcrsToNucleotides
//input: string nucleotides {semType: GCRS}
//output: string result {semType: RNA nucleotides}
export function gcrsToNucleotides(nucleotides: string) {
  const obj: {[index: string]: string} = {
    "mAps": "A", "mUps": "U", "mGps": "G", "mCps": "C", "fAps": "A", "fUps": "U", "fGps": "G", "fCps": "C",
    "fU": "U", "fA": "A", "fC": "C", "fG": "G", "mU": "U", "mA": "A", "mC": "C", "mG": "G"
  };
  return nucleotides.replace(/(mAps|mUps|mGps|mCps|fAps|fUps|fGps|fCps|fU|fA|fC|fG|mU|mA|mC|mG)/g, function (x: string) {return obj[x];});
}

//name: gcrsToOP100
//input: string nucleotides {semType: GCRS}
//output: string result {semType: OP100}
export function gcrsToOP100(nucleotides: string) {
  let count: number = -1;
  const objForEvenIndicesAtLeftEdge: {[index: string]: string} = {
    "mAps": "a", "mUps": "u", "mGps": "g", "mCps": "c", "fAps": "a", "fUps": "u", "fGps": "g", "fCps": "c"
  };
  const objForOddIndicesAtLeftEdge: {[index: string]: string} = {
    "mAps": "a*", "mUps": "u*", "mGps": "g*", "mCps": "c*", "fAps": "a*", "fUps": "u*", "fGps": "g*", "fCps": "c*"
  };
  // const objForEvenIndicesAtRightEdge: {[index: string]: string} = {
  //   "fU": "u*", "fA": "a*", "fC": "c*", "fG": "g*", "mU": "u*", "mA": "a*", "mC": "c*", "mG": "g*"
  // };
  const objForOddIndicesAtRightEdge: {[index: string]: string} = {
    "mAps": "a", "mUps": "u", "mGps": "g", "mCps": "c", "fAps": "a", "fUps": "u", "fGps": "g", "fCps": "c"
  };
  const objForEvenIndicesAtCenter: {[index: string]: string} = {
    "fU": "u*", "fA": "a*", "fC": "c*", "fG": "g*", "mU": "u*", "mA": "a*", "mC": "c*", "mG": "g*"
  };
  const objForOddIndicesAtCenter: {[index: string]: string} = {
    "fU": "u", "fA": "a", "fC": "c", "fG": "g", "mU": "u", "mA": "a", "mC": "c", "mG": "g"
  };
  return nucleotides.replace(/(mAps|mUps|mGps|mCps|fAps|fUps|fGps|fCps|fU|fA|fC|fG|mU|mA|mC|mG)/g, function (x: string) {
    count++;
    if (count < 3) return (count % 2 == 0) ? objForEvenIndicesAtLeftEdge[x] : objForOddIndicesAtLeftEdge[x];
    if (count == 19) return objForOddIndicesAtRightEdge[x];
    return (count % 2 == 1) ? objForEvenIndicesAtCenter[x] : objForOddIndicesAtCenter[x];
  });
}

//name: gcrsToMM12
//input: string nucleotides {semType: GCRS}
//output: string result {semType: MM12}
export function gcrsToMM12(nucleotides: string) {
  const obj: {[index: string]: string} = {
    "mAps": "e", "mUps": "h", "mGps": "g", "mCps": "f", "fAps": "i", "fUps": "l", "fGps": "k", "fCps": "j", "fU": "L",
    "fA": "I", "fC": "J", "fG": "K", "mU": "H", "mA": "E", "mC": "F", "mG": "G"
  };
  return nucleotides.replace(/(mAps|mUps|mGps|mCps|fAps|fUps|fGps|fCps|fU|fA|fC|fG|mU|mA|mC|mG)/g, function (x: string) {return obj[x]});
}

//name: gcrsToABI
//input: string nucleotides {semType: GCRS}
//output: string result {semType: ABI}
export function gcrsToABI(nucleotides: string) {
  let count: number = -1;
  const objForEdges: {[index: string]: string} = {"moeA": "5", "(5m)moeC": "6", "moeG": "7", "moeT": "8"};
  const objForCenter: {[index: string]: string} = {"A": "A", "T": "T", "(5m)C": "C", "G": "G"};
  return nucleotides.replace(/(moeA|\(5m\)moeC|moeG|moeT|A|T|\(5m\)C|G)/g, function (x: string) {
    count++;
    return (5 < count || count < 15) ? objForCenter[x] : objForEdges[x];
  });
}

//name: defineAxolabsPattern
export function _defineAxolabsPattern() {
  return defineAxolabsPattern();
}