import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import * as bio from '@datagrok-libraries/bio';

import {GridNeighbor} from '@datagrok-libraries/gridext/src/ui/GridNeighbor';
import {TreeHelper} from '../utils/tree-helper';
import {attachDivToGrid} from './inject-tree-to-grid';
import {
  GridTreeRendererBase,
} from './grid-tree-renderer';
import {NodeCuttedType} from '@datagrok-libraries/bio';
import {markupNode, MarkupNodeType} from './tree-renderers/markup';
import {LeafRangeGridTreeRenderer} from './tree-renderers/grid-tree-renderer';


export function injectTreeForGridUI2(
  grid: DG.Grid, newickRoot: bio.NodeType, dataDf: DG.DataFrame, clusterDf: DG.DataFrame, leafColName: string, neighborWidth: number = 100,
  cut?: { min: number, max: number, clusterColName: string }
): GridNeighbor {
  const th: bio.ITreeHelper = new TreeHelper();

  const treeN = attachDivToGrid(grid, neighborWidth);
  const treeRoot = treeN.root!;

  // const treeDiv = ui.div();
  // treeRoot.appendChild(treeDiv);
  // treeRoot.style.backgroundColor = '#FFF0F0';
  // treeRoot.style.setProperty('overflow-y', 'hidden', 'important');

  const treeRenderer: GridTreeRendererBase<MarkupNodeType> =
    LeafRangeGridTreeRenderer.create(newickRoot, treeRoot, grid);
  treeRenderer.onAfterRender.subscribe(({target, context, lengthRatio}) => {
    if (cutSlider) {
      const tgt = target as GridTreeRendererBase<MarkupNodeType>;

      cutSlider.root.style.left = `${0}px`;
      cutSlider.root.style.width = `${tgt.view.clientWidth}px`;
      cutSlider.root.style.height = `${tgt.grid.colHeaderHeight}px`;

      const posX = cutSlider.value! * lengthRatio + tgt.leftPadding * window.devicePixelRatio;

      context.strokeStyle = '#A00000';
      context.moveTo(posX, 0);
      context.lineTo(posX, context.canvas.height);
      context.stroke();
    }
  });

  grid.dataFrame.onFilterChanged.subscribe((args) => {
    // TODO: Filter newick tree
    console.debug('PhyloTreeViewer: injectTreeForGridUI2() grid.dataFrame.onFilterChanged()');

    // to prevent nested fire event in event handler
    window.setTimeout(() => {
      const [viewedRoot] = th.setGridOrder(newickRoot, grid, leafColName);
      markupNode(viewedRoot);
      const source = viewedRoot ? {type: 'biojs', data: viewedRoot} :
        {type: 'biojs', data: {name: 'NONE', branch_length: 1, children: []}};

      treeRenderer.treeRoot = viewedRoot as MarkupNodeType;
    }, 0 /* next event cycle */);
  });

  let cutSlider: DG.InputBase<number | null> | null = null;
  if (cut) {
    // TODO: Get max from tree height
    //@ts-ignore
    const treeHeight: number = (newickRoot as MarkupNodeType).subtreeLength;
    cutSlider = ui.sliderInput('', 0, 0, treeHeight);
    $(cutSlider.root).find('input').each((_, el) => {
      el.setAttribute('step', '0.01');
      el.style.width = '100%';
      el.style.height = `100%`;
    });
    cutSlider.root.style.position = 'absolute';
    cutSlider.root.style.top = `${0}px`;
    cutSlider.root.style.backgroundColor = '#FFF0F0';

    treeRoot.appendChild(cutSlider.root);

    cutSlider.onChanged(() => {
      // console.debug('PhyloTreeViewer: injectTreeToGrid() cutSlider.onChanged() ' + `${cutSlider!.value}`);
      // th.cutTreeToGrid(newickRoot, cutSlider!.value!, grid.dataFrame, leafColName, 'Cluster');

      const t1 = Date.now();
      th.treeCutAsTree(newickRoot, cutSlider!.value!, true);
      const t2 = Date.now();
      console.debug('PhyloTreeViewer: injectTreeForGrid() cutSlider.onChanged() treeCutAsTree() ' +
        `ET: ${((t2 - t1) / 1000).toString()}`);

      const newickRootCopy = JSON.parse(JSON.stringify(newickRoot));
      const newickRootCutted = th.treeCutAsTree(newickRootCopy, cutSlider!.value!);
      th.markClusters(newickRootCutted as NodeCuttedType, dataDf, leafColName, cut.clusterColName);
      th.buildClusters(newickRootCutted as NodeCuttedType, clusterDf, cut.clusterColName, leafColName);

      markupNode(newickRootCutted!);
      treeRenderer.treeRoot = newickRootCutted as MarkupNodeType;
    });
  }

  return treeN;
}
