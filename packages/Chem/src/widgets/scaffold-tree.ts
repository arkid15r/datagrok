import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import $ from 'cash-dom';
import {_rdKitModule, drawRdKitMoleculeToOffscreenCanvas} from '../utils/chem-common-rdkit';
import {getMolSafe} from '../utils/mol-creation_rdkit';
import {chem} from 'datagrok-api/grok';
import {InputBase, SemanticValue, SEMTYPE, toJs, TreeViewGroup, TreeViewNode, UNITS} from 'datagrok-api/dg';
import Sketcher = chem.Sketcher;
import {chemSubstructureSearchLibrary} from "../chem-searches";
import {_package, getScaffoldTree} from "../package";
import {RDMol} from "@datagrok-libraries/chem-meta/src/rdkit-api";

let attached = false;

enum BitwiseOp {
  AND = 'AND',
  OR = 'OR'
}

interface INode {
  scaffold?: string;
  child_nodes?: INode[];
}

interface ITreeNode {
  smiles: string;
  autocreated: boolean;
  bitset: DG.BitSet | null;
  bitwiseNot: boolean;
  orphansBitset: DG.BitSet | null;
  init: boolean;
  orphans: boolean;
  labelDiv: HTMLDivElement;
  canvas: Element;
}

interface Size {
  height: number;
  width: number;
}

interface SizesMap {
  [key: string]: Size;
}

function value(node: TreeViewNode): ITreeNode {
  return node.value as ITreeNode;
}

function getMol(molString : string) : RDMol | null {
  return getMolSafe(molString, {mergeQueryHs:true, kekulize: true}, _rdKitModule, true, false).mol;
}

function processUnits(molPBlok : string): string {
  let curPos = 0;
  curPos = molPBlok.indexOf('\n', curPos) + 1;
  curPos = molPBlok.indexOf('\n', curPos) + 1;
  curPos = molPBlok.indexOf('\n', curPos) + 1;
  const atomCount = parseInt(molPBlok.substring(curPos, curPos + 3));
  const bondCount = parseInt(molPBlok.substring(curPos + 3, curPos + 6));
  curPos = molPBlok.indexOf('\n', curPos) + 1;

  //32 33 34 N O S -> 55-57
  const aromaticAtoms = [];
  for (let atomIdx = 0; atomIdx < atomCount; ++atomIdx) {
    const idxElem = curPos + 31;
    const str = molPBlok.substring(idxElem, idxElem + 3);
    if (str === 'N  ' || str === 'O  ' || str === 'S  ') {
      const idxMark = curPos + 55;
      const strTmp = molPBlok.substring(idxMark +1, idxMark + 2);
      const numTmp = parseInt(strTmp);
      if (numTmp === 1) {
        if (str === 'O  ' || str === 'S  ')
          aromaticAtoms.unshift({elem: str, atomIndex: atomIdx + 1});

        else
          aromaticAtoms.push({elem: str, atomIndex: atomIdx + 1});
      }
    }
    curPos = molPBlok.indexOf('\n', curPos) + 1;
  }

  let curPosAdd = curPos;
  for (let bondIdx =0; bondIdx < bondCount; ++bondIdx) {
    let s = '';
    if ((s = molPBlok.substring(curPosAdd + 8, curPosAdd + 9)) === '4') {
      const endStr = molPBlok.substring(curPosAdd + 9);
      molPBlok = molPBlok.substring(0, curPosAdd + 6) + '  6' + endStr;
    }
    curPosAdd = molPBlok.indexOf('\n', curPosAdd) + 1;
  }
  return molPBlok;
}

function enableNodeExtendArrow(group: TreeViewGroup, enable: boolean): void {
  const c = group.root.getElementsByClassName('d4-tree-view-tri');
  if (c.length > 0)
    (c[0] as HTMLElement).style.visibility = enable ? 'visible' : 'hidden';
}

function filterNodesIter(rootGroup: TreeViewGroup, recordCount : number, hitsThresh: number) {
  if (hitsThresh < 0)
    hitsThresh = 0;
  if (hitsThresh > 1)
    hitsThresh = 1;

  if (rootGroup.parent !== null) {
    const trues = value(rootGroup).bitset!.trueCount;
    const ratio = trues / recordCount;
    rootGroup.root.style.display = (trues > 0 && ratio < hitsThresh ? 'none' : '');
  }

  for (let n = 0; n < rootGroup.children.length; ++n) {
    if (isOrphans(rootGroup.children[n]))
      throw new Error('There should not be any orphans');

    filterNodesIter(rootGroup.children[n] as TreeViewGroup, recordCount, hitsThresh);
  }
}

function isNodeFiltered(node: TreeViewNode): boolean {
  return node.root.style.display === 'none';
}

function isOrphans(node: TreeViewNode): boolean {
  return node.value !== null && value(node).orphans;
}

function buildOrphans(rootGroup: TreeViewGroup) {
  if (rootGroup.parent !== null && rootGroup.children.length > 0) {
    //folder groups don't have children, will skip

    const v = value(rootGroup);
    v.orphansBitset = null;
    const bitsetThis = v.bitset!;
    let bitsetOrphans = bitsetThis.clone();
    let bitsetChildrenTmp = DG.BitSet.create(bitsetThis.length);
    let bitsetChild = null;
    for (let n = 0; n < rootGroup.children.length; ++n) {
      if (isOrphans(rootGroup.children[n]) || isNodeFiltered(rootGroup.children[n]))
        continue;

      bitsetChild = value(rootGroup.children[n]).bitset!;
      bitsetChildrenTmp = bitsetChildrenTmp.or(bitsetChild, false);
    }
    if (bitsetChildrenTmp.trueCount > 0)
      bitsetOrphans = bitsetOrphans.xor(bitsetChildrenTmp, false);
    else
      bitsetOrphans = bitsetChildrenTmp;

    v.orphansBitset = bitsetOrphans;
  }

  for (let n = 0; n < rootGroup.children.length; ++n) {
    if (isOrphans(rootGroup.children[n]) || isNodeFiltered(rootGroup.children[n]))
      continue;

    buildOrphans(rootGroup.children[n] as TreeViewGroup);
  }
}

function fillVisibleNodes(rootGroup: TreeViewGroup, visibleNodes: Array<TreeViewGroup>) : void {
  if (rootGroup.parent !== null) {
    visibleNodes.push(rootGroup);
    if (!rootGroup.expanded) return;
  }

  for (let n = 0; n < rootGroup.children.length; ++n)
    fillVisibleNodes(rootGroup.children[n] as TreeViewGroup, visibleNodes);
}

function updateNodeHitsLabel(group : TreeViewNode, text : string) : void {
  const labelDiv = value(group).labelDiv;
  labelDiv!.innerHTML = text;
}

async function updateAllNodesHits(thisViewer: ScaffoldTreeViewer, onDone : Function | null = null) {
  const items = thisViewer.tree.items;
  if (items.length > 0) {
    await updateNodesHitsImpl(thisViewer, items, 0, items.length - 1);
    thisViewer.filterTree(thisViewer.threshold);
    thisViewer.updateSizes();

    if (onDone !== null)
      onDone();
  }
}

async function updateVisibleNodesHits(thisViewer: ScaffoldTreeViewer) {
  const visibleNodes : Array<TreeViewGroup> = [];
  fillVisibleNodes(thisViewer.tree, visibleNodes);

  const start = Math.floor(thisViewer.tree.root.scrollTop / thisViewer.sizesMap[thisViewer.size].height);
  let end = start + Math.ceil(thisViewer.root.offsetHeight / thisViewer.sizesMap[thisViewer.size].height);
  if (end >= visibleNodes.length)
    end = visibleNodes.length - 1;

  await updateNodesHitsImpl(thisViewer, visibleNodes, start, end);
}

async function updateNodesHitsImpl(thisViewer: ScaffoldTreeViewer, visibleNodes : Array<TreeViewNode>,
  start: number, end: number) {
  for (let n = start; n <= end; ++n) {
    if (thisViewer.cancelled) {
      return;
    }

    const group = visibleNodes[n];
    const v = value(group);
    if (v.init || v.orphans)
      continue;

    const bitset = thisViewer.molColumn === null ?
      null :
      await chemSubstructureSearchLibrary(thisViewer.molColumn, v.smiles, '');

    v.bitset = bitset;
    v.init = true;
    updateNodeHitsLabel(group, bitset!.trueCount.toString());
  }
}

async function _initWorkers(molColumn: DG.Column) : Promise<DG.BitSet> {
  const molStr = molColumn.length === 0 ? '' : molColumn.get(molColumn.length -1);
  return await chemSubstructureSearchLibrary(molColumn, molStr, '');
}

let offscreen : OffscreenCanvas | null = null;
let gOffscreen : OffscreenCanvasRenderingContext2D | null = null;


function renderMolecule(molStr: string, width: number, height: number, skipDraw: boolean = false): HTMLDivElement {
  const r = window.devicePixelRatio;
  if (offscreen === null || offscreen.width !== Math.floor(width*r) || offscreen.height !== Math.floor(height*r)) {
    offscreen = new OffscreenCanvas(Math.floor(width*r), Math.floor(height*r));
    gOffscreen = offscreen.getContext('2d', {willReadFrequently: true});
  }

  const g = gOffscreen;
  g!.imageSmoothingEnabled = true;
  g!.imageSmoothingQuality = 'high';
  if (skipDraw) {
    g!.font = '18px Roboto, Roboto Local';
    const text = 'Loading...';
    const tm = g!.measureText(text);
    const fontHeight = Math.abs(tm.actualBoundingBoxAscent) + tm.actualBoundingBoxDescent;
    const lineWidth = tm.width;
    g!.fillText(text, Math.floor((width - lineWidth) / 2), Math.floor((height - fontHeight) / 2));
  } else {
    molStr = processUnits(molStr);
    const molCtx = getMolSafe(molStr, {}, _rdKitModule);
    const mol = molCtx.mol;
    if (mol !== null) {
      drawRdKitMoleculeToOffscreenCanvas(molCtx, offscreen.width, offscreen.height, offscreen, null);
      mol.delete();
    }
  }

  const bitmap : ImageBitmap = offscreen.transferToImageBitmap();
  const moleculeHost = ui.canvas(width, height);
  $(moleculeHost).addClass('chem-canvas');
  moleculeHost.width = width * r;
  moleculeHost.height = height * r;
  moleculeHost.style.width = width.toString() + 'px';
  moleculeHost.style.height = height.toString() + 'px';
  moleculeHost.getContext('2d')!.drawImage(bitmap, 0, 0, moleculeHost.width, moleculeHost.height);

  return ui.divH([moleculeHost], 'chem-mol-box');
}

function getMoleculePropertyDiv() : HTMLDivElement | null {
  const c = document.getElementsByClassName('property-grid-item-view-label');
  let name = null;
  for (let n = 0; n< c.length; ++n) {
    name = c[n].getAttribute('name');
    if (name !== null && name === 'prop-view-molecule-column')
      return c[n] as HTMLDivElement;
  }
  return null;
}

function getFlagIcon(group: TreeViewGroup) : HTMLElement | null {
  const molHost: HTMLElement = group.captionLabel;
  const c = molHost.getElementsByClassName('icon-fill');
  return c.length === 0 ? null : c[0] as HTMLElement;
}

function getNotIcon(group: TreeViewGroup) : HTMLElement | null {
  const molHost: HTMLElement = group.captionLabel;
  let c = molHost.getElementsByClassName('fa-equals');//'fa-not-equal');
  if (c.length === 0)
    c = molHost.getElementsByClassName('fa-not-equal');

  return c.length === 0 ? null : c[0] as HTMLElement;
}

function isNotBitOperation(group: TreeViewGroup) : boolean {
  const isNot = (group.value as ITreeNode).bitwiseNot;
  return isNot;
}

const GENERATE_ERROR_MSG = 'Generating tree failed...Please check the dataset';
const NO_MOL_COL_ERROR_MSG = 'There is no molecule column available';

export class ScaffoldTreeViewer extends DG.JsViewer {
  static TYPE: string = 'Scaffold Tree';

  tree: DG.TreeViewGroup;
  bitset: DG.BitSet | null = null;
  wrapper: SketcherDialogWrapper | null = null;
  molColumns: Array<DG.Column[]> = [];
  molColumnIdx: number = -1;
  tableIdx: number = -1;
  threshold: number;
  bitOperation: string;
  ringCutoff: number = 10;
  dischargeAndDeradicalize: boolean = false;
  cancelled: boolean = false;
  treeBuildCount: number = -1;
  checkBoxesUpdateInProgress: boolean = false;
  treeEncodeUpdateInProgress: boolean = false;
  dataFrameSwitchgInProgress: boolean = false;
  allowGenerate: boolean = true;
  addOrphanFolders: boolean = true;

  _generateLink?: HTMLElement;
  _message?: HTMLElement | null = null;
  _iconAdd: HTMLElement | null = null;
  _iconDelete: HTMLElement | null = null;
  _bitOpInput: InputBase | null = null;
  skipAutoGenerate: boolean = false;
  workersInit: boolean = false;
  progressBar: DG.TaskBarProgressIndicator | null = null;
  MoleculeColumn: string;
  molColPropObserver: MutationObserver | null = null;
  Table: string;
  treeEncode: string;
  sizesMap: SizesMap = {
    'small': { height: 70, width: 80 },
    'normal': { height: 90, width: 120 },
    'large': { height: 100, width: 180 }
  };
  size: string;

  constructor() {
    super();

    this.tree = ui.tree();
    // this.tree.root.classList.add('d4-tree-view-lines');

    this.size = this.string('size', Object.keys(this.sizesMap)[2], {choices: Object.keys(this.sizesMap)});
    this.tree.root.classList.add('scaffold-tree-viewer');
    this.tree.root.classList.add(`scaffold-tree-${this.size}`);
    this.helpUrl = '/help/visualize/viewers/scaffold-tree.md';

    const dataFrames = grok.shell.tables;
    for (let n = 0; n < dataFrames.length; ++n) {
      const molCols = dataFrames[n].columns.bySemTypeAll(DG.SEMTYPE.MOLECULE);
      if (molCols.length > 0)
        this.molColumns.push(molCols);
    }

    const tableNames = new Array(this.molColumns.length);
    for (let n = 0; n < tableNames.length; ++n)
      tableNames[n] =this.molColumns[n][0].dataFrame.name;

    this.tableIdx = this.molColumns.length > 0 ? 0 : -1;
    this.Table = this.addProperty('Table', DG.TYPE.DATA_FRAME, grok.shell.tv.dataFrame.name, {editor: 'table', category: 'Data'});

    const molColNames = new Array(this.molColumns[this.tableIdx].length);
    for (let n = 0; n < molColNames.length; ++n)
      molColNames[n] = this.molColumns[this.tableIdx][n].name;

    this.molColumnIdx = this.molColumns[this.tableIdx].length > 0 ? 0 : -1;

    this.MoleculeColumn = this.string('MoleculeColumn', molColNames.length === 0 ? null : molColNames[0], {
      choices: molColNames,
      category: 'Data',
      userEditable: this.molColumns.length > 0,
    });

    this.threshold = this.float('threshold', 0, {
      min: 0,
      max: 20,
      description: 'Hide scaffolds that match less then the specified percentage of molecules',
    });

    this.bitOperation = this.string('bitOperation', BitwiseOp.OR, {
      choices: Object.values(BitwiseOp),
      category: 'Misc',
      description: 'AND: all selected substructures match\n OR: any selected substructures match',
    });

    this.ringCutoff = this.int('ringCutoff', 10, {
      category: 'Scaffold Generation',
      description: 'Ignore molecules with # rings > N',
    });

    this.dischargeAndDeradicalize = this.bool('dischargeAndDeradicalize', false, {
      category: 'Scaffold Generation',
      description: 'Remove charges and radicals from scaffolds',
    });

    this.treeEncode = this.string('treeEncode', '[]', {userEditable: false});
    this.molColPropObserver = this.registerPropertySelectListener(document.body);
    this._initMenu();
  }

  registerPropertySelectListener(parent: HTMLElement) : MutationObserver {
    const thisViewer = this;
    const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
      for (const mutation of mutationsList) {
        if (mutation.type == 'childList') {
          for (let n = 0; n < mutation.addedNodes.length; ++n) {
            const node : any = mutation.addedNodes[n];
            if (node.className === 'property-grid-item-editor-spinner') {
              const c = (node.parentElement as HTMLElement).children;
              for (let i = 0; i < c.length; ++i) {
                if (c[n].className === 'property-grid-item-view-label' &&
                    c[n].getAttribute('name') === 'prop-view-molecule-column') {
                  const select : HTMLSelectElement = node;
                  while (select.firstChild != null)
                    select.removeChild(select.firstChild);


                  let option: HTMLOptionElement | null = null;
                  for (let i = 0; i < thisViewer.molColumns[thisViewer.tableIdx].length; ++i) {
                    option = document.createElement('OPTION') as HTMLOptionElement;
                    option.value = thisViewer.molColumns[thisViewer.tableIdx][i].name;
                    option.label = thisViewer.molColumns[thisViewer.tableIdx][i].name;
                    option.selected = i === thisViewer.molColumnIdx;
                    select.appendChild(option);
                  }
                  return;
                }
              }
            }
          }
        }
      }
    });
    observer.observe(parent, {childList: true, subtree: true});
    return observer;
  }


  get treeRoot(): DG.TreeViewGroup {return this.tree;}

  get message(): string {
    return this._message?.innerHTML as string;
  }

  set message(msg: string | null) {
    if (this._message === undefined || this._message === null)
      return;

    this._message.style.visibility = msg === null ? 'hidden' : 'visible';
    // @ts-ignore
    this._message.innerHTML = msg ?? '';
  }

  _initMenu(): void {
    this.root.oncontextmenu = (e) => {
      DG.Menu.popup()
        .item('Save tree', () => this.saveTree())
        .item('Load tree', () => this.loadTree())
        .show();
      e.preventDefault();
    };
  }

  /** Saves sketched tree to disk (under Downloads) */
  saveTree(): void {
    const s = JSON.stringify(ScaffoldTreeViewer.serializeTrees(this.tree));
    DG.Utils.download('scaffold-tree.tree', s);
  }

  /** Loads previously saved tree. See also {@link saveTree} */
  loadTree(): void {
    const thisViewer = this;
    DG.Utils.openFile({
      accept: '.tree',
      open: async (file) => {
        thisViewer.cancelled = false;
        await this.loadTreeStr(await file.text());
      },
    });
  }

  async generateTree() {
    if (this.molColumn === null)
      return;

    if (this.skipAutoGenerate) {
      this.skipAutoGenerate = false;
      return;
    }
    ++this.treeBuildCount;
    this.cancelled = false;
    this.message = null;
    this.clear();
    let currentCancelled = false;

    //this.root.style.visibility = 'hidden';
    ui.setUpdateIndicator(this.root, true);
    this.progressBar = DG.TaskBarProgressIndicator.create('Generating Scaffold Tree...');
    this.progressBar.update(0, 'Installing ScaffoldGraph..: 0% completed');

    const c = this.root.getElementsByClassName('d4-update-shadow');
    if (c.length > 0) {
      const eProgress = c[0];
      const eCancel : HTMLAnchorElement = ui.link('Cancel', () => {
        this.cancelled = true;
        currentCancelled = true;
        eCancel.innerHTML = 'Cancelling... Please Wait...';
        eCancel.style.pointerEvents = 'none';
        eCancel.style.color = 'gray';
        eCancel.style.opacity = '90%';

        ui.setUpdateIndicator(this.root, false);
        this.progressBar!.update(100, 'Build Cancelled');
        this.progressBar!.close();
        this.progressBar = null;
      }, 'Cancel Tree build', 'chem-scaffold-tree-cancel-hint');
      eProgress.appendChild(eCancel);
    }

    if (currentCancelled)
      return;

    if (!this.workersInit) {
      await _initWorkers(this.molColumn);
      this.workersInit = true;
    }

    if (currentCancelled)
      return;

    this.progressBar!.update(30, 'Generating tree..: 30% completed');
    const maxMolCount = 750;

    let length = this.molColumn.length;
    let step = 1;
    if (this.molColumn.length > maxMolCount) {
      step = Math.floor(this.molColumn.length / maxMolCount);
      if (step === 0) step = 1;
      length = maxMolCount;
    }

    let molStr = null;
    let mTmp = null;
    const ar = new Array(length);
    for (let n = 0, m = 0; n < length; ++n, m += step) {
      molStr = this.molColumn.get(m);
      if (molStr.includes('V3000')) {
        mTmp = null;
        try {
          mTmp = _rdKitModule.get_mol(molStr);
        } catch (e) {
          try {
            mTmp = _rdKitModule.get_qmol(molStr);
          } catch (e) {
            ar[n] = molStr;
          }
        }
        if (mTmp !== null) {
          ar[n] = mTmp.get_smiles();
          mTmp.delete();
        }
        continue;
      } else ar[n] = molStr;
    }

    if (currentCancelled)
      return;

    const molCol: DG.Column = DG.Column.fromStrings('smiles', ar);
    molCol.semType = DG.SEMTYPE.MOLECULE;
    molCol.setTag(DG.TAGS.UNITS, this.molColumn.getTag(DG.TAGS.UNITS));
    const dataFrame = DG.DataFrame.fromColumns([molCol]);

    if (currentCancelled)
      return;

    this.finishGenerateTree(dataFrame);
  }

  async finishGenerateTree(dataFrame: DG.DataFrame) : Promise<void> {
    const runNum = this.treeBuildCount;

    let jsonStr = null;
    try {
      jsonStr = await getScaffoldTree(dataFrame, this.ringCutoff, this.dischargeAndDeradicalize);
    } catch (e: any) {
      _package.logger.error(e.toString());
      ui.setUpdateIndicator(this.root, false);
      this.progressBar!.update(50, 'Build failed');
      this.progressBar!.close();
      this.message = 'Tree build failed...Please ensure that python package ScaffoldGraph is installed';
      return;
    }

    if (this.treeBuildCount > runNum || this.cancelled)
      return;

    if (jsonStr != null)
      await this.loadTreeStr(jsonStr);

    if (this.cancelled) {
      this.clear();
      ui.setUpdateIndicator(this.root, false);
      this.progressBar!.update(100, 'Build Cancelled');
      this.progressBar!.close();
      this.progressBar = null;
      return;
    }

    //this.root.style.visibility = 'visible';
    this.treeEncodeUpdateInProgress = true;
    this.treeEncode = JSON.stringify(ScaffoldTreeViewer.serializeTrees(this.tree));
    this.treeEncodeUpdateInProgress = false;

    this.progressBar!.close();
    this.progressBar = null;
  }

  async loadTreeStr(jsonStr: string) {
    this.clear();
    const json = JSON.parse(jsonStr);

    if (this.progressBar !== null)
      this.progressBar.update(50, 'Initializing Tree..: 50% completed');

    const thisViewer = this;
    ScaffoldTreeViewer.deserializeTrees(json, this.tree, (molStr: string, rootGroup: TreeViewGroup) => {
      return thisViewer.createGroup(molStr, rootGroup, false);
    });

    await updateVisibleNodesHits(this); //first visible N nodes
    ui.setUpdateIndicator(this.root, false);
    if (this.progressBar !== null)
      this.progressBar!.update(100, 'Tree is ready');

    this.updateSizes();
    this.updateUI();

    if (this.tree.children.length > 1) {
      for (let n = 0; n < this.tree.children.length; ++n)
        (this.tree.children[n] as TreeViewGroup).expanded = false;
    }

    updateAllNodesHits(this, () => thisViewer.filterTree(thisViewer.threshold)); //this will run asynchronously
  }

  get molColumn(): DG.Column | null {
    return this.molColumns.length === 0 ? null : this.molColumns[this.tableIdx][this.molColumnIdx];
  }

  private openEditSketcher(group: TreeViewGroup) {
    if (this.wrapper !== null) {
      this.wrapper.node = group;
      return;
    }

    const thisViewer = this;
    this.wrapper = SketcherDialogWrapper.create('Edit Scaffold...', 'Save', group,
      async (molStrSketcher: string, node: TreeViewGroup, errorMsg: string | null) => {
        ui.empty(node.captionLabel);
        const bitset = thisViewer.molColumn === null ? null :
          await chemSubstructureSearchLibrary(thisViewer.molColumn, molStrSketcher, '');
        const molHost = renderMolecule(molStrSketcher, this.sizesMap[this.size].width, this.sizesMap[this.size].height);
        this.addIcons(molHost, bitset!.trueCount.toString(), group);
        node.captionLabel.appendChild(molHost);
        const iconRoot = getFlagIcon(node);
        const valid = errorMsg === null;
        const color = valid ? 'lightgreen !important' : 'hotpink !important';

      iconRoot!.style.cssText = iconRoot!.style.cssText += ('color: ' + color);

      const autocreated = value(node).autocreated;
      if (autocreated !== undefined && autocreated)
        iconRoot!.style.visibility = 'visible';

      if (!valid)
        iconRoot!.setAttribute('tooltip', errorMsg);
      node.value = {smiles: molStrSketcher, bitset: bitset};

      thisViewer.filterTree(thisViewer.threshold);
      thisViewer.wrapper?.close();
      thisViewer.wrapper = null;
      thisViewer.updateSizes();
      thisViewer.updateUI();
      thisViewer.updateFilters();
      thisViewer.treeEncodeUpdateInProgress = true;
      thisViewer.treeEncode = JSON.stringify(ScaffoldTreeViewer.serializeTrees(thisViewer.tree));
      thisViewer.treeEncodeUpdateInProgress = false;
      }, (smilesSketcher: string, node: TreeViewGroup) => {
        if (node.parent === null)
          return null;

        let success = true;
        if (toJs(node.parent).value !== null) {
          const smilesParent = (toJs(node.parent).value as ITreeNode).smiles;
          success = ScaffoldTreeViewer.validateNodes(smilesSketcher, smilesParent);
          if (!success)
            return SketcherDialogWrapper.validationMessage(false, true);
        }
        const children = node.items;
        for (let n = 0; n < children.length; ++n) {
          if (isOrphans(children[n]))
            continue;
          success = ScaffoldTreeViewer.validateNodes((children[n].value as ITreeNode).smiles, smilesSketcher);
          if (!success)
            return SketcherDialogWrapper.validationMessage(false, false);
        }
        return null;
      }, () => {
        if (thisViewer.wrapper != null) {
          thisViewer.clearFilters();
          thisViewer.wrapper?.close();
          thisViewer.wrapper = null;
        }
      }, () => {
        if (thisViewer.wrapper != null) {
          thisViewer.clearFilters();
          thisViewer.wrapper?.close();
          thisViewer.wrapper = null;
        }
      }, async (strMolSketch: string) => {
        await thisViewer.filterByStruct(strMolSketch);
      });

    this.wrapper.show();
  }

  openAddSketcher(group: TreeViewGroup) {
    const v = value(group);
    const molStr = v === null ? '' : v.smiles;
    if (this.wrapper !== null) {
      this.wrapper.node = group;
      return;
    }

    ++this.treeBuildCount;
    this.cancelled = false;
    const thisViewer = this;
    this.wrapper = SketcherDialogWrapper.create('Add new scaffold...', 'Add', group,
      async (molStrSketcher: string, parent: TreeViewGroup, errorMsg: string | null) => {
        const child = thisViewer.createGroup(molStrSketcher, parent);
        if (child !== null) {
          enableNodeExtendArrow(child, false);
          enableNodeExtendArrow(parent, true);
          const v = value(child);
          const bitset = thisViewer.molColumn === null ?
            null :
            await chemSubstructureSearchLibrary(thisViewer.molColumn, v.smiles, '');
          v.bitset = bitset;
          v.init = true;
          updateNodeHitsLabel(child, bitset!.trueCount.toString());
        }

        //orphans
        //buildOrphans(thisViewer.tree);
        //thisViewer.clearOrphanFolders(thisViewer.tree);
        //thisViewer.appendOrphanFolders(thisViewer.tree);
        thisViewer.filterTree(thisViewer.threshold);
        thisViewer.updateSizes();
        thisViewer.updateUI();
        thisViewer.updateFilters();
        thisViewer.wrapper?.close();
        thisViewer.wrapper = null;
        thisViewer.treeEncodeUpdateInProgress = true;
        thisViewer.treeEncode = JSON.stringify(ScaffoldTreeViewer.serializeTrees(thisViewer.tree));
        thisViewer.treeEncodeUpdateInProgress = false;
      }, (smilesSketcher: string, nodeSketcher: TreeViewGroup) => {
        const success = nodeSketcher === thisViewer.tree || ScaffoldTreeViewer.validateNodes(smilesSketcher, molStr);
        return success ? null : SketcherDialogWrapper.validationMessage(false, true);
      }, () => {
        if (thisViewer.wrapper != null) {
          thisViewer.clearFilters();
          thisViewer.wrapper?.close();
          thisViewer.wrapper = null;
        }
      }, () => {
        if (thisViewer.wrapper != null) {
          thisViewer.clearFilters();
          thisViewer.wrapper?.close();
          thisViewer.wrapper = null;
        }
      }, async (strMolSketch: string) => {
        await this.filterByStruct(strMolSketch);
      });
    this.wrapper.show();
  }

  clear() {
    this.clearFilters();
    while (this.tree.children.length > 0)
      this.tree.children[0].remove();


    this.treeEncodeUpdateInProgress = true;
    this.treeEncode = JSON.stringify(ScaffoldTreeViewer.serializeTrees(this.tree));
    this.treeEncodeUpdateInProgress = false;

    this.updateUI();
  }

  clearFilters(): void {
    if (this.bitset === null)
      return;

    this.bitset = null;
    if (this.molColumn !== null)
      delete this.molColumn.temp['chem-scaffold-filter'];

    this.checkBoxesUpdateInProgress = true;
    const checkedNodes = this.tree.items.filter((v) => v.checked);
    for (let n = 0; n < checkedNodes.length; ++n)
      checkedNodes[n].checked = false;
    this.checkBoxesUpdateInProgress = false;
    
    this.dataFrame.rows.requestFilter();
    this.updateUI();
  }

  resetFilters(): void {
    if (this.molColumn === null)
      return;

    if (this.bitset === null)
      this.bitset = DG.BitSet.create(this.molColumn.length);

    delete this.molColumn.temp['chem-scaffold-filter'];
    this.bitset!.setAll(false, false);
    this.dataFrame.rows.requestFilter();
    this.updateUI();
  }

  selectTableRows(group: TreeViewGroup, flag: boolean): void {
    const bitset = value(group).bitset!;
    if (flag)
      this.molColumn?.dataFrame.selection.or(bitset);
    else
      this.molColumn?.dataFrame.selection.andNot(bitset);
  }

  updateFilters(isFiltering = true): void {
    if (this.molColumn === null) 
      return;

    if (!isFiltering) {
      this.bitset = null;
      this.dataFrame.rows.requestFilter();
    }

    const checkedNodes = this.tree.items.filter((v) => v.checked);
    if (checkedNodes.length === 0) {
      this.clearFilters();
      return;
    }

    if (checkedNodes.length === 1) {
      const molStr = value(checkedNodes[0]).smiles;
      if (molStr !== undefined) {
        let molArom;
        try {
          molArom = _rdKitModule.get_qmol(molStr);
          molArom.set_aromatic_form();
          this.molColumn.temp['chem-scaffold-filter'] = molArom.get_molblock();
        } catch (e) {
        } finally {
          molArom?.delete();
        }
      }
    } else delete this.molColumn.temp['chem-scaffold-filter'];

    if (this.bitset === null)
      this.bitset = DG.BitSet.create(this.molColumn.length);

    this.bitset.setAll(this.bitOperation === BitwiseOp.AND, false);

    let tmpBitset = DG.BitSet.create(this.molColumn.length);

    let isNot = false;
    for (let n = 0; n < checkedNodes.length; ++n) {
      const nodeBitset = value(checkedNodes[n]).bitset;
      if (nodeBitset === null)
        continue;

      tmpBitset = tmpBitset.copyFrom(nodeBitset, false);
      isNot = value(checkedNodes[n]).bitwiseNot;
      if (isNot)
        tmpBitset = tmpBitset.invert(false);

      this.bitset = this.bitOperation === BitwiseOp.AND ? this.bitset.and(tmpBitset) : this.bitset.or(tmpBitset);
    }

    this.dataFrame.rows.requestFilter();
    this.updateUI();
  }

  private async filterByStruct(strMol: string) {
    if (this.molColumn != null && strMol !== null) {
      const mol = getMol(strMol);
      if (mol !== null) {
        const molFile = mol.get_molblock();
        mol.delete();
        this.molColumn.temp['chem-scaffold-filter'] = molFile;
      }
      const bitset = await chemSubstructureSearchLibrary(this.molColumn, strMol, '');
      if (this.bitset === null)
        this.bitset = bitset;
      else {
        this.bitset.setAll(false, false);
        this.bitset = this.bitset.or(bitset);
      }

      this.dataFrame.rows.requestFilter();
      this.updateUI();
    }
  }

  setNotBitOperation(group: TreeViewGroup, isNot: boolean) : void {
    if ((group.value as ITreeNode).bitwiseNot === isNot)
      return;

    (group.value as ITreeNode).bitwiseNot = isNot;
    this.updateFilters();

    // update ui
    const notIcon = getNotIcon(group);
    const color = isNot ? 'red !important' : 'var(--blue-1) !important';
    notIcon!.style.cssText += ('color: ' + color);

    if (isNot) {
      notIcon!.classList.remove('fa-equals');//'fal');
      notIcon!.classList.add('fa-not-equal');//'fas');//, 'icon-fill');
      notIcon!.style.visibility = 'visible';
    } else {
      notIcon!.classList.remove('fa-not-equal');//'fas');
      notIcon!.classList.add('fa-equals');//'fal');//, 'icon-fill');
      notIcon!.style.removeProperty('visibility');
    }
  }

  addIcons(molHost: HTMLDivElement, label: string, group: TreeViewGroup): void {
    const thisViewer = this;
    const notIcon = ui.iconFA('equals',
      () => thisViewer.setNotBitOperation(group, !(group.value as ITreeNode).bitwiseNot),
      'Exclude structures containing this scaffold');
    //notIcon.onclick = (e) => e.stopImmediatePropagation();
    //changes notIcon.onmousedown = (e) => e.stopImmediatePropagation();

    const zoomIcon = ui.iconFA('search-plus');
    zoomIcon.onclick = (e) => e.stopImmediatePropagation();
    zoomIcon.onmousedown = (e) => e.stopImmediatePropagation();
    zoomIcon.onmouseenter = (e) => ui.tooltip.show(renderMolecule(value(group).smiles, 300, 200), e.clientX, e.clientY);
    zoomIcon.onmouseleave = (e) => ui.tooltip.hide();

    const iconsDivLeft = ui.divV([notIcon, zoomIcon], 'chem-mol-box-info-buttons');

    const iconsDiv = ui.divV([
      ui.iconFA('plus', () => this.openAddSketcher(group), 'Add new scaffold'),
      ui.iconFA('pencil', () => this.openEditSketcher(group), 'Edit scaffold'),
      ui.divText(''),
      ui.iconFA('check-square', () => this.selectTableRows(group, true), 'Select rows'),
      ui.iconFA('square', () => this.selectTableRows(group, false), 'Deselect rows'),
    ], 'chem-mol-box-info-buttons');
    iconsDiv.onclick = (e) => e.stopImmediatePropagation();
    iconsDiv.onmousedown = (e) => e.stopImmediatePropagation();

    const flagIcon = ui.iconFA('circle', () => this.openEditSketcher(group), 'The scaffold was edited');
    flagIcon.style.fontSize = '8px';
    //flagIcon.style.color = 'hotpink !important';
    flagIcon.style.visibility = 'hidden';
    flagIcon.classList.remove('fal');
    flagIcon.classList.add('fas', 'icon-fill');
    flagIcon.onmouseenter = (e) => {
      const c = document.getElementsByClassName('d4-tooltip');
      if (c.length > 0) {
        const text = flagIcon.getAttribute('tooltip');
        if (text !== null && text !== undefined)
          c[0].setAttribute('data', text);
      }
    };

    let labelDiv = null;
    const iconsInfo = ui.divH([flagIcon, labelDiv = ui.divText(label)]);
    value(group).labelDiv = labelDiv;

    const c = molHost.getElementsByTagName('CANVAS');
    if (c.length > 0)
      value(group).canvas = c[0];

    iconsInfo.onclick = (e) => e.stopImmediatePropagation();
    iconsInfo.onmousedown = (e) => e.stopImmediatePropagation();
    molHost.appendChild(ui.divV([iconsInfo, iconsDiv], 'chem-mol-box-info'));
    molHost.insertBefore(ui.divV([iconsDivLeft], 'chem-mol-box-info'), c[0]);
  }


  private createGroup(molStr: string, rootGroup: TreeViewGroup, skipDraw: boolean = false) : TreeViewGroup | null {
    if (this.molColumn === null)
      return null;
    
    const bitset = DG.BitSet.create(this.molColumn.length);
    const molHost = renderMolecule(molStr, this.sizesMap[this.size].width, this.sizesMap[this.size].height, skipDraw);
    const group = rootGroup.group(molHost, {smiles: molStr, bitset: bitset, orphansBitset : null, bitwiseNot: false}) ;
    this.addIcons(molHost, bitset.trueCount === 0 ? "" : bitset.trueCount.toString(), group);

    group.enableCheckBox(false);
    group.autoCheckChildren = false;
    const thisViewer = this;
    group.onNodeCheckBoxToggled.subscribe((node: TreeViewNode) => {
      if (!thisViewer.checkBoxesUpdateInProgress && node.value !== null)
        thisViewer.updateFilters();
    });

    return group;
  }

  createOrphansGroup(rootGroup: TreeViewGroup, label: string) : DG.TreeViewGroup {
    const divFolder = ui.iconFA('folder');
    divFolder.style.fontSize = '66px';
    divFolder.style.width = `${this.sizesMap[this.size].width}px`;
    divFolder.style.height = `${this.sizesMap[this.size].height}px`;
    divFolder.style.cssText += 'color: hsla(0, 0%, 0%, 0) !important';
    divFolder.classList.remove('fal');
    divFolder.classList.add('fas', 'icon-fill');

    const labelDiv = ui.divText(label);
    const divHost = ui.divH([divFolder, ui.divV([labelDiv], 'chem-mol-box-info')], {style: {'flex-grow': 1}});

    const group = rootGroup.group(divHost, {orphans: true});
    if (group.children.length === 0)
      enableNodeExtendArrow(group, false);

    group.enableCheckBox(false);
    group.autoCheckChildren = false;
    const thisViewer = this;
    group.onNodeCheckBoxToggled.subscribe((node: TreeViewNode) => {
      if (!thisViewer.checkBoxesUpdateInProgress && node.value !== null)
        thisViewer.updateFilters();
    });

    value(group).labelDiv = labelDiv;

    return group;
  }


  clearOrphanFolders(rootGroup: TreeViewGroup) {
    if (isOrphans(rootGroup)) {
      rootGroup.remove();
      return;
    }

    for (let n = 0; n < rootGroup.children.length; ++n)
      this.clearOrphanFolders(rootGroup.children[n] as TreeViewGroup);
  }

  appendOrphanFolders(rootGroup: TreeViewGroup) {
    if (isNodeFiltered(rootGroup))
      return;

    if (rootGroup.parent) {
      for (let n = 0; n < rootGroup.children.length; ++n) {
        if (value(rootGroup.children[n]).orphans)
          rootGroup.children[n].remove();
      }
      const bitsetOrphans = value(rootGroup).orphansBitset;
      if (bitsetOrphans !== null && bitsetOrphans !== undefined && bitsetOrphans.trueCount > 0) {
        const group = this.createOrphansGroup(rootGroup, bitsetOrphans.trueCount.toString());
        value(group).bitset = bitsetOrphans;
      }
    }

    for (let n = 0; n < rootGroup.children.length; ++n)
      this.appendOrphanFolders(rootGroup.children[n] as TreeViewGroup);
  }

  filterTree(hitsThresh: number) : void {
    this.clearOrphanFolders(this.tree);
    filterNodesIter(this.tree, this.molColumn!.length, hitsThresh / 100);
    if (this.addOrphanFolders) {
      buildOrphans(this.tree);
      this.appendOrphanFolders(this.tree);
    }
    this.updateSizes();
  }

  changeCanvasSize(molString: string, canvas: any, width: number, height: number): void {
    const newMolHost = renderMolecule(molString, width, height);
    canvas.replaceWith(newMolHost);
  }

  onPropertyChanged(p: DG.Property): void {
    if (p.name === 'Table') {
      for (let n = 0; n < this.molColumns.length; ++n) {
        if (this.molColumns[n][0].dataFrame.name === this.Table) {
          if (this.tableIdx === n)
            return;

          this.tableIdx = n;
          break;
        }
      }
      this.dataFrameSwitchgInProgress = true;
      this.clear();

      this.molColumnIdx = this.molColumns[this.tableIdx].length > 0 ? 0 : -1;
      this.MoleculeColumn = this.molColumns[this.tableIdx][this.molColumnIdx].name;
      this.dataFrameSwitchgInProgress = false;

      const div = getMoleculePropertyDiv();
      if (div !== null)
        div.innerHTML = this.MoleculeColumn;

      setTimeout(() => this.generateTree(), 1000);
    } else if (p.name === 'MoleculeColumn') {
      for (let n = 0; n < this.molColumns[this.tableIdx].length; ++n) {
        if (this.molColumns[this.tableIdx][n].name === this.MoleculeColumn) {
          if (this.molColumnIdx === n)
            return;

          this.molColumnIdx = n;
          break;
        }
      }
      this.clear();
      //this.molColumn = this.dataFrame.columns.byName(this.MoleculeColumn);
    } else if (p.name === 'treeEncode') {
      if (this.treeEncodeUpdateInProgress)
        return;

      this.skipAutoGenerate = true;
      const json = JSON.parse(this.treeEncode);
      const thisViewer = this;
      ScaffoldTreeViewer.deserializeTrees(json, this.tree, (molStr: string, rootGroup: TreeViewGroup) => {
        return thisViewer.createGroup(molStr, rootGroup);
      });

      this.updateSizes();
      this.updateUI();
      updateAllNodesHits(this, () => thisViewer.filterTree(this.threshold)); // async
    } else if (p.name === 'threshold')
      this.filterTree(this.threshold);
    else if (p.name === 'bitOperation') {
      this.updateFilters();
      this._bitOpInput!.value = this.bitOperation;
    } else if (p.name === 'size') {
      const savedTree = JSON.parse(JSON.stringify(ScaffoldTreeViewer.serializeTrees(this.tree)));
      this.clear();
      ScaffoldTreeViewer.deserializeTrees(savedTree, this.tree, (molStr: string, rootGroup: TreeViewGroup) => {
        return this.createGroup(molStr, rootGroup, false);
      });
      this.updateSizes();
      this.updateUI();
    }
    else if (p.name === 'size') {
      const canvases = this.tree.root.querySelectorAll('.chem-canvas');
      const molStrings = this.tree.items.map((item) => (item.value as ITreeNode).smiles);
      for (let i = 0; i < canvases.length; ++i) 
        this.changeCanvasSize(molStrings[i], canvases[i], this.sizesMap[this.size].width, this.sizesMap[this.size].height);
      this.updateSizes();
      this.updateUI();
    }
  }

  onFrameAttached(dataFrame: DG.DataFrame): void {
    ui.empty(this.root);

    if (this.dataFrameSwitchgInProgress) {
      this.dataFrameSwitchgInProgress = true;
      return;
    }

    if (this.molColumnIdx >= 0)
      this.MoleculeColumn = this.molColumns[this.tableIdx][this.molColumnIdx].name;

    const thisViewer = this;
    this.tree.root.onscroll = async (e) => await updateVisibleNodesHits(thisViewer);
    this.tree.onNodeContextMenu.subscribe((args: any) => {
      const menu: DG.Menu = args.args.menu;
      const node: TreeViewGroup = args.args.item;
      const orphans = node.value === null || value(node).orphans;
      if (orphans)
        return;

      if (attached) 
        menu.clear();

      menu
        .item('Add New...', () => thisViewer.openAddSketcher(node))
        .item('Edit...', () => this.openEditSketcher(node))
        .item('Remove', () => {
          if (thisViewer.wrapper !== null && thisViewer.wrapper.node === node ) {
            thisViewer.wrapper.close();
            thisViewer.wrapper = null;
          }

          node.remove();
          //orphans
          thisViewer.filterTree(thisViewer.threshold);
          thisViewer.updateUI();
          thisViewer.updateSizes();
          thisViewer.clearFilters();
          thisViewer.treeEncodeUpdateInProgress = true;
          thisViewer.treeEncode = JSON.stringify(ScaffoldTreeViewer.serializeTrees(thisViewer.tree));
          thisViewer.treeEncodeUpdateInProgress = false;
        });
    });

    this.tree.onSelectedNodeChanged.subscribe((node: DG.TreeViewNode) => {
      if (node.value !== null) {
        if (value(node).bitset === undefined)
          return;

        thisViewer.checkBoxesUpdateInProgress = true;
        this.selectGroup(node);
        thisViewer.checkBoxesUpdateInProgress = false;
        thisViewer.resetFilters();
        thisViewer.updateFilters();
        const molFile = value(node).smiles;
        setTimeout(() =>
          grok.shell.o = SemanticValue.fromValueType(molFile, SEMTYPE.MOLECULE, UNITS.Molecule.MOLBLOCK), 50);
      }
      //update the sketcher if open
      if (thisViewer.wrapper === null)
        return;

      thisViewer.wrapper.node = (node as DG.TreeViewGroup);
    });

    this.tree.onChildNodeExpandedChanged.subscribe((group: DG.TreeViewGroup) => {
      const isFolder = value(group).orphans;
      if (isFolder) {
        const className = group.expanded ?
          'grok-icon fa-folder fas icon-fill' : 'grok-icon fa-folder-open fas icon-fill';
        const c = group.root.getElementsByClassName(className);
        if (c.length > 0) {
          let cl = null;
          for (let n = 0; n < c.length && c[n].classList !== undefined; ++n) {
            cl = c[n].classList;
            cl.remove(group.expanded ? 'fa-folder' : 'fa-folder-open');
            cl.add(group.expanded ? 'fa-folder-open' : 'fa-folder');
          }
        }
      }
    });

    this.tree.onNodeMouseEnter.subscribe((node: DG.TreeViewNode) => {
      if (node.value === null)
        return;

      const bitset = value(node).bitset!;
      const rows: DG.RowList = dataFrame.rows;
      rows.highlight((idx: number) => bitset.get(idx));
    });

    this.tree.onNodeMouseLeave.subscribe((node: DG.TreeViewNode) => {
      // @ts-ignore
      dataFrame.rows.highlight(null);
    });

    this.subs.push(dataFrame.onRowsFiltering.subscribe(() => {
      if (thisViewer.bitset != null)
        dataFrame.filter.and(thisViewer.bitset);
    }));

    this.subs.push(grok.events.onTooltipShown.subscribe((args) => {
      const tooltip = args.args.element;
      const text = tooltip.getAttribute('data');
      tooltip.removeAttribute('data');
      if (text !== null && text !== undefined)
        tooltip.innerHTML = text;
    }));

    this.render();
    if (this.allowGenerate)
      setTimeout(() => this.generateTree(), 1000);
    attached = true;
  }

  detach(): void {
    this.cancelled = true;

    if (this.wrapper !== null) {
      this.wrapper.close();
      this.wrapper = null;
    }

    if (this.progressBar !== null) {
      this.progressBar.close();
      this.progressBar = null;
    }

    this.molColPropObserver!.disconnect();
    this.molColPropObserver = null;

    this.clearFilters();
    super.detach();
  }

  selectGroup(group: TreeViewNode) : void {
    const items = this.tree.items;
    for (let n = 0; n < items.length; ++n)
      items[n].checked = false;

    group.checked = true;
  }

  updateSizes() {
    let lastElement = this.tree.root.classList[this.tree.root.classList.length - 1];
    this.tree.root.classList.remove(lastElement);
    this.tree.root.classList.add(`scaffold-tree-${this.size}`);
  }

  updateUI() {
    if (this.molColumn === null) {
      this._generateLink!.style.pointerEvents = 'none';
      this._generateLink!.style.color = 'lightgrey';
      this.message = NO_MOL_COL_ERROR_MSG;
      (this._iconAdd! as any).inert = true;
      this._iconAdd!.style.color = 'grey';
      return;
    }

    const itemCount = this.tree.items.length;
    this._iconDelete!.style.display = itemCount > 0 ? 'flex' : 'none';
    this._generateLink!.style.visibility = (itemCount > 0 || !this.allowGenerate) ? 'hidden' : 'visible';
    this._message!.style.visibility = itemCount > 0 ? 'hidden' : 'visible';

    const c = this.root.getElementsByClassName('grok-icon fal fa-filter grok-icon-filter');
    if (c.length > 0)
      (c[0] as HTMLElement).style.visibility = this.bitset === null ? 'hidden' : 'visible';
  }

  render() {
    const thisViewer = this;
    this._bitOpInput = ui.choiceInput('', BitwiseOp.OR, Object.values(BitwiseOp), (op: BitwiseOp) => {
      thisViewer.bitOperation = op;
      thisViewer.updateFilters();
    });
    this._bitOpInput.setTooltip('AND: all selected substructures match \n\r OR: any selected substructures match');
    this._bitOpInput.root.style.marginLeft = '20px';
    const iconHost = ui.box(ui.divH([
      this._iconAdd = ui.iconFA('plus', () => thisViewer.openAddSketcher(thisViewer.tree), 'Add new root structure'),
      ui.iconFA('filter', () => thisViewer.clearFilters(), 'Clear filter'),
      ui.iconFA('folder-open', () => this.loadTree(), 'Open saved tree'),
      ui.iconFA('arrow-to-bottom', () => this.saveTree(), 'Save this tree to disk'),
      ui.divText(' '),
      this._iconDelete = ui.iconFA('trash-alt',
        () => {
          const dialog = ui.dialog({title: 'Delete Tree'});
          dialog
          .add(ui.divText('This cannot be undone. Are you sure?'))
          .addButton('Yes', () => {
            thisViewer.cancelled = true; 
            thisViewer.clear();
            dialog.close();
          })
          .show();
          
        }, 'Drop all trees'),
      ui.divText(' '),
      this._bitOpInput.root,
    ], 'chem-scaffold-tree-scrollbar'), 'chem-scaffold-tree-toolbar');
    this.root.appendChild(ui.splitV([iconHost, this.tree.root]));

    this._message = ui.divText('', 'chem-scaffold-tree-generate-message-hint');
    this.root.appendChild(this._message);

    this._generateLink = ui.link('Generate',
      async () => await thisViewer.generateTree(),
      'Generates scaffold tree',
      'chem-scaffold-tree-generate-hint');
    this.root.appendChild(this._generateLink);
    this.updateSizes();
    this.updateUI();
  }

  static validateNodes(childSmiles: string, parentSmiles: string): boolean {
    const parentMol = getMol(parentSmiles);
    const parentCld = getMol(childSmiles);
    if (parentMol === null || parentCld === null)
      return false;

    const match: string = parentCld.get_substruct_match(parentMol);
    parentMol.delete();
    parentCld.delete();
    return match.length > 2;
  }

  static serializeTrees(treeRoot: TreeViewGroup): Array<any> {
    const json: Array<any> = [];
    for (let n = 0; n < treeRoot.children.length; ++n)
      json[n] = ScaffoldTreeViewer.serializeTree(treeRoot.children[n] as TreeViewGroup);
    return json;
  }

  static serializeTree(rootGroup: TreeViewGroup): INode {
    const jsonNode: INode = {};
    if (value(rootGroup))
      jsonNode.scaffold = value(rootGroup).smiles;
    jsonNode.child_nodes = new Array(rootGroup.children.length);

    for (let i = 0; i < rootGroup.children.length; ++i)
      jsonNode.child_nodes[i] = ScaffoldTreeViewer.serializeTree(rootGroup.children[i] as TreeViewGroup);

    return jsonNode;
  }

  static deserializeTrees(json: INode[], treeRoot: TreeViewGroup, createGroup: Function) : number {
    let countNodes = 0;
    for (let n = 0; n < json.length; ++n) {
      countNodes += ScaffoldTreeViewer
        .deserializeTree(json[n], treeRoot, (molStr: string, rootGroup: TreeViewGroup, countNodes: number) => {
          return createGroup(molStr, rootGroup, countNodes);
        }, 0);
    }
    return countNodes;
  }

  static deserializeTree(json: INode, rootGroup: TreeViewGroup, createGroup: Function, countNodes: number) : number {
    const molStr = json.scaffold;
    if (molStr === null || molStr === undefined) {
      _package.logger.error('Scaffold is null or undefined.');
      return countNodes;
    }

    const group: TreeViewGroup = createGroup(molStr, rootGroup, countNodes);
    if (group === null)
      return countNodes;

    if (json.child_nodes === undefined)
      json.child_nodes = [];

    value(group).autocreated = true;

    for (let n = 0; n < json.child_nodes.length; ++n)
      countNodes += ScaffoldTreeViewer.deserializeTree(json.child_nodes[n], group, createGroup, countNodes);


    ++countNodes;
    if (group.children.length === 0)
      enableNodeExtendArrow(group, false);

    return countNodes;
  }
}

class SketcherDialogWrapper {
  readonly dialog: DG.Dialog;
  readonly sketcher: Sketcher;
  success: boolean;
  group: DG.TreeViewGroup;
  isMolBlock: boolean;
  activeElement : HTMLElement | null = null;

  constructor(title: string, actionName: string, group: DG.TreeViewGroup,
    action: (molStrSketcher: string, parent: TreeViewGroup, errorMsg: string | null) => void,
    validate: (smilesSketcher: string, nodeSketcher: TreeViewGroup) => string | null,
    onCancel: () => void, onClose: () => void, onStrucChanged: (strMolSketch: string) => void) {
    this.success = true;
    this.dialog = ui.dialog({title: title});
    this.group = group;
    const v = value(this.group);
    const molStr = v === null ? '' : v.smiles;
    this.isMolBlock = DG.chem.isMolBlock(molStr);

    const thisWrapper = this;

    const validLabel = ui.label(SketcherDialogWrapper.validationMessage(true, true));
    validLabel.style.height = '30px';
    validLabel.style.color = SketcherDialogWrapper.validationColor(true);

    this.sketcher = new DG.chem.Sketcher();
    this.isMolBlock ? this.sketcher.setMolFile(molStr) : this.sketcher.setSmiles(molStr);

    const molStrTmp = thisWrapper.sketcher.getMolFile();
    let errorMsg = validate(molStrTmp, thisWrapper.node);
    let valid = errorMsg === null;//validate(molStrTmp, thisWrapper.node);
    validLabel.style.color = SketcherDialogWrapper.validationColor(valid);
    validLabel.innerText = errorMsg ?? '';

    this.sketcher.onChanged.subscribe(() => {
      const molStr = thisWrapper.sketcher.getMolFile();
      errorMsg = validate(molStr, thisWrapper.node);
      valid = errorMsg === null;
      validLabel.style.color = SketcherDialogWrapper.validationColor(valid);
      validLabel.innerText = errorMsg ?? '';

      if (onStrucChanged !== null)
        onStrucChanged(molStr);
    });

    this.dialog.add(this.sketcher);
    this.dialog.add(validLabel);
    this.dialog.addButton('Reset', () => {
      thisWrapper.isMolBlock ? thisWrapper.sketcher.setMolFile(molStr) : thisWrapper.sketcher.setSmiles(molStr);
    });
    this.dialog.addButton(actionName, () => {
      const molStr = thisWrapper.sketcher.getMolFile();
      action(molStr, thisWrapper.node, errorMsg);
    });

    if (onCancel != null)
      this.dialog.onCancel(onCancel);

    if (onClose != null)
      this.dialog.onCancel(onClose);
  }

  set node(node: DG.TreeViewGroup) {
    this.group = node;
    const v = value(node);
    const molStr = v === null ? '' : v.smiles;
    this.isMolBlock = DG.chem.isMolBlock(molStr);
    this.isMolBlock ? this.sketcher.setMolFile(molStr) : this.sketcher.setSmiles(molStr);
  }

  get node() {
    return this.group;
  }

  show(): void {
    this.activeElement = document.activeElement instanceof HTMLElement ? document.activeElement as HTMLElement : null;
    this.dialog?.show();
  }

  close(): void {
    this.activeElement!.style!.display = 'none';
    this.dialog?.close();
    const thisWrapper = this;
    setTimeout(() => thisWrapper.activeElement!.style!.display = '', 2);
  }

  static create(title: string, actionName: string, group: DG.TreeViewGroup,
    action: (molStrSketcher: string, parent: TreeViewGroup, errorMsg: string | null) => void,
    validate: (smilesSketcher: string, nodeSketcher: TreeViewGroup) => string | null,
    onCancel: () => void, onClose: () => void, onStrucChanged: (strMolSketch: string) => void): SketcherDialogWrapper {
    return new SketcherDialogWrapper(title, actionName, group, action, validate, onCancel, onClose, onStrucChanged);
  }

  static validationMessage(success: boolean, parentCheck: boolean): string {
    if (success)
      return '';

    return parentCheck ? 'The edited molecule is not a superstructure of its parent' :
      'The edited molecule is not a substructure of its children';
  }

  static validationColor(success: boolean): string {
    return success ? SketcherDialogWrapper.SUCCESS_MSG_COLOR : SketcherDialogWrapper.FAILURE_MSG_COLOR;
  }

  static SUCCESS_MSG_COLOR = 'green';
  static FAILURE_MSG_COLOR = 'red';
}