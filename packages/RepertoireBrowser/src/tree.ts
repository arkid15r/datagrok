//(\(*[^:]+:[^,]+\)*)+
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {difference} from 'set-operations';
import {PhylocanvasGL, TreeTypes, Shapes} from '@phylocanvas/phylocanvas.gl';
import {TreeAnalyzer, PhylocanvasTreeNode} from './utils/tree-stats';

export class TreeBrowser {// extends DG.JsViewer {
  title: string;
  phyloTreeViewer: PhylocanvasGL;
  networkViewer: DG.Viewer;
  dataFrame: DG.DataFrame;
  mlbView: DG.TableView;
  network: DG.DataFrame;
  leaves: TreeLeaves = {};
  treeLeaves: TreeLeavesMap = {};
  idMappings: TreeLeavesMap = {};

  protected _extractTPP(id: string): string {
    return id.split('|')[0];
  }

  protected _modifyNodeId(node: PhylocanvasTreeNode): PhylocanvasTreeNode {
    node.id = this._extractTPP(node.id);
    return node;
  }

  // constructor() {
  //   super();
  //   this.title = this.string('title', 'Phylogenetic tree');
  // }

  private _initGrid(treeCol = 'TREE', semType = 'newick'): DG.Grid {
    this.dataFrame.col(treeCol).semType = semType;

    const grid = DG.Viewer.grid(this.dataFrame);
    grid.setOptions({
      rowHeight: 160,
    });

    grid.onCellRender.subscribe(function(args) {
      if (args.cell.isTableCell && args.cell.tableColumn.semType == semType) {
        const nwk: string = args.cell.cell.value;
        const regexp = new RegExp(/^(\(*[^:]+:[^,]+\)*)+$/);

        if (regexp.test(nwk.trim())) {
          /*const ctx = args.g.canvas;//.getContext('webgl').canvas;
          const phTree = new PhylocanvasGL(ctx, {
            shape: Shapes.Dot,
            size: ctx.getBoundingClientRect(),
            source: nwk,
            type: TreeTypes.Rectangular,
          });
          console.warn([ctx.getBoundingClientRect(), phTree]);*/
          //console.warn(newickParser.parse_newick(nwk));
          //args.preventDefault();
        }
      }
    });

    return grid;
  }

  /**
   * Adds a grid with simple tree statistics.
   * @return  {DG.Grid} Grid with statistics.
   */
  private _addTreeGrid(): DG.Grid {
    const itemsToFind = Object.keys(this.idMappings);
    const trees = this.dataFrame.col('TREE').toList();
    const analyser = new TreeAnalyzer(itemsToFind, this._modifyNodeId.bind(this));
    const stats = analyser.analyze(trees);
    const df = DG.DataFrame.fromColumns(['CLONE'].map((v) => this.dataFrame.col(v)));

    for (const k of Object.keys(stats)) {
      const dType = k.toLowerCase().includes('length') ? 'double' : 'int';
      (df.columns as DG.ColumnList).add(DG.Column.fromList(dType, k, stats[k]));
    }
    return DG.Viewer.grid(df);
  }

  /**
   * Initializes tree browser.
   * @param {DG.DataFrame} df Table to convert.
   * CLONE ... TREE
   * 123 ... ((raccoon:19.19959,bear:6.80041):0.84600,((sea_lion:11.99700, seal:12.00300):7.52973,((monkey:100.85930...
   * 123 ... (Bovine:0.69395,(Gibbon:0.36079,(Orang:0.33636,(Gorilla:0.17147,(Chimp:0.19268, Human:0.11927):0.08386)...
   * 456 ... (Bovine:0.69395,(Hylobates:0.36079,(Pongo:0.33636,(G._Gorilla:0.17147, (P._paniscus:0.19268,H._sapiens:...
   * @param {DG.TableView} mlbView
   * @return {Promise<void>}
   */
  async init(df: DG.DataFrame, mlbView: DG.TableView): Promise<void> {
    this.dataFrame = df;
    this.mlbView = mlbView;

    this.idMappings = this._collectMappings();

    const treeCol = df.col('TREE');
    const cloneId = df.col('CLONE');
    const processed: DG.DataFrame = await this._unpackNewickTrees(treeCol, cloneId, this._leavesProcessor.bind(this));

    this.network = processed;
    grok.data.linkTables(df, processed, ['clone'], ['clone'], [DG.SYNC_TYPE.CURRENT_ROW_TO_SELECTION]);
    treeCol.semType = 'newick';
    df.currentRowIdx = 1;

    const treeGrid = this._addTreeGrid();

    treeGrid.dataFrame.onCurrentRowChanged.subscribe((_) => {
      const cloneId = treeGrid.dataFrame.get('CLONE', treeGrid.dataFrame.currentRow.idx);
      this.selectTree(this.leaves[cloneId]['index'][0]);
    });

    const treeDiv = ui.div([]);
    const treeNode = mlbView.dockManager.dock(treeDiv, DG.DOCK_TYPE.DOWN);
    mlbView.dockManager.dock(treeGrid, DG.DOCK_TYPE.RIGHT, treeNode);

    const phTree = new PhylocanvasGL(treeDiv, {
      interactive: true,
      showLabels: true,
      showLeafLabels: true,
      shape: Shapes.Dot,
      size: treeDiv.getBoundingClientRect(),
      source: treeCol.get(df.currentRowIdx),
      type: TreeTypes.Rectangular,
    });

    phTree.selectNode = this.selectNode.bind(this);

    this.phyloTreeViewer = phTree;
    this._matchMappings();
  }

  private _leavesProcessor(id: string, index: number) {
    if (!this.leaves[id])
      this.leaves[id] = {index: [], items: []};

    this.leaves[id]['index'].push(index);

    const leafId = this._extractTPP(id);

    if (!this.treeLeaves[leafId])
      this.treeLeaves[leafId] = [];

    this.treeLeaves[leafId].push(index);
  }

  private _collectMappings(columnName = 'gdb id mappings'): TreeLeavesMap {
    const col = this.mlbView.dataFrame.col(columnName);
    const mapper: TreeLeavesMap = {};

    for (let i = 0; i < col.length; ++i) {
      const ids = (col.get(i) as string).split(', ');

      for (const id of ids) {
        if (!mapper[id])
          mapper[id] = [];
        mapper[id].push(i);
      }
    }
    return mapper;
  }

  private _matchMappings(columnName = 'clones') {
    const df = this.mlbView.dataFrame;
    const col = (df.columns as DG.ColumnList).addNewString(columnName);

    for (const [id, indices] of Object.entries(this.idMappings)) {
      if (this.treeLeaves[id]) {
        for (const i of indices)
          col.set(i, [col.get(i), this.treeLeaves[id].join('|')].join('|'));
      }
    }
  }

  /**
   * Converts trees column into network diagram data frame.
   * @param {DG.Column} treeCol Column with trees in newick format.
   * @param {DG.Column} cloneId Clone ids.
   * @param {LeavesCallback} [leavesCallback] A callback function to call when leaf is found.
   * @return {(Promise<DG.DataFrame | undefined>)} Data frame or undefined if the newick converter was failed.
   * node parent  distance  clone edgeColor
   * node-0-349 root-349  0.00  349 1
   * node-1-349 node-0-349  0.02  349 1
   * node-2-349 node-1-349  0.01  349 1
   * ...
   */
  private async _unpackNewickTrees(
    treeCol: DG.Column,
    cloneId: DG.Column,
    leavesCallback?: LeavesCallback,
  ): Promise<DG.DataFrame | undefined> {
    let processed: DG.DataFrame | undefined;

    if (DG.Func.find({name: '_newickToDf'}).length == 0)
      grok.shell.warning('Newick parser is unavailable');
    else {
      for (let i = 1; i < treeCol.length; i++) {
      // TODO: switch call from system to local import.
        const t: DG.DataFrame = await grok.functions.call(
          'PhyloTreeViewer:_newickToDf',
          {newick: treeCol.get(i), filename: 'nwk'},
        );
        const p = t.col('parent');
        const c = t.col('node');
        const id = cloneId.get(i);

        this.leaves[id] = {index: [i], items: Array.from(difference(c.toList(), p.toList()))};

        t.rows.removeAt(0);
        t.columns.addNewString('clone').init((_) => id);
        t.columns.addNewInt('edgeColor').init((_) => i);

        for (let k = 0; k < t.rowCount; k++) {
          const n1 = p.get(k);

          if (n1 == 'root')
            p.set(k, `root-${id}`);
          else if (n1.startsWith('node-'))
            p.set(k, `${n1}-${id}`);

          const n2 = c.get(k);

          if (n2.startsWith('node-'))
            c.set(k, `${n2}-${id}`);
          else {
            if (leavesCallback)
              leavesCallback(n2, i);
          }
        }
        if (processed === undefined)
          processed = t;
        else
          processed.append(t, true);
      }
    }
    return processed;
  }

  selectNode(node: any) {
    if (node) {
      if (node.label) {
        const nodeId: string = node?.label;
        const tppId = this._extractTPP(nodeId);
        const df = this.mlbView.dataFrame;
        const col = df.col('gdb id mappings');
        //const isIntersected = (row) => (col.get(row.idx) as string).includes(tppId);
        //df.rows.select(isIntersected);
        df.selection.init((i) => (col.get(i) as string).includes(tppId));
        //df.currentRowIdx = 1;
      }
    } else {
    }
  }

  selectTree(index: number) {
    const maxIndex = this.dataFrame.rowCount;
    this.dataFrame.currentRowIdx = index >= maxIndex ? maxIndex - 1 : (index < 0 ? 0 : index);

    const nwk = this.dataFrame.col('TREE').get(this.dataFrame.currentRowIdx);
    this.phyloTreeViewer.setProps({source: nwk});

    const treeItems = this.leaves[this.dataFrame.col('CLONE').get(this.dataFrame.currentRowIdx)].items;
    let styles = {};

    for (const item of treeItems) {
      const tpp = this._extractTPP(item);
      const style = {};

      if (this.idMappings[tpp])
        style[item] = {fillColour: '#0000ff'};
      else
        style[item] = {shape: Shapes.Dot};

      styles = {...styles, ...style};
    }
    this.phyloTreeViewer.setProps({styles: styles});
    console.warn({styles: styles});
  }

  private _selectNode(nodeId: string) {
    let cloneId: string;

    if (nodeId.startsWith('node') || nodeId.startsWith('root')) {
      const s = nodeId.split('-');
      cloneId = s[s.length - 1];
    } else
      cloneId = nodeId;

    this.selectTree(this.leaves[cloneId]['index'][0]);
  }

  // get root(): HTMLElement {
  //   const title = ui.h1(this.title, {style: {'align-self': 'center', 'alignContent': 'center'}});
  //   if (this.phyloTreeViewer && this.networkViewer) {
  //     [this.phyloTreeViewer.root, this.networkViewer.root].forEach((v) => v.style.width = 'auto');
  //     return ui.divV([title, ui.divH([this.phyloTreeViewer.root, this.networkViewer.root])]);
  //   }
  //   return title;
  // }
}

interface TreeMap {
  index: number[];
  items: string[]
}

type TreeLeaves = {[key: string]: TreeMap};
type TreeLeavesMap = {[key: string]: number[]};
type LeavesCallback = (id: string, index: number) => void;
