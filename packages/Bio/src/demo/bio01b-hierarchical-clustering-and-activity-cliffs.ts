import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_package, activityCliffs} from '../package';
import $ from 'cash-dom';

import {TEMPS as acTEMPS} from '@datagrok-libraries/ml/src/viewers/activity-cliffs';
import * as lev from 'fastest-levenshtein';
import {DistanceMatrix} from '@datagrok-libraries/ml/src/distance-matrix';
import {getTreeHelper, ITreeHelper} from '@datagrok-libraries/bio/src/trees/tree-helper';
import {getDendrogramService, IDendrogramService} from '@datagrok-libraries/bio/src/trees/dendrogram';
import {handleError} from './utils';
import {DemoScript} from '@datagrok-libraries/tutorials/src/demo-script';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/reduce-dimensionality';

const dataFn: string = 'data/sample_FASTA_PT_activity.csv';

export async function demoBio01bUI() {
  let treeHelper: ITreeHelper;
  let dendrogramSvc: IDendrogramService;

  let df: DG.DataFrame;
  let view: DG.TableView;
  let activityCliffsViewer: DG.ScatterPlotViewer;

  const dimRedMethod: DimReductionMethods = DimReductionMethods.UMAP;

  try {
    const demoScript = new DemoScript(
      'Activity Cliffs',
      'Activity Cliffs analysis on Macromolecules data');
    await demoScript
      .step(`Load DNA sequences`, async () => {
        grok.shell.windows.showContextPanel = false;
        grok.shell.windows.showProperties = false;

        [df, treeHelper, dendrogramSvc] = await Promise.all([
          _package.files.readCsv(dataFn),
          getTreeHelper(),
          getDendrogramService(),
        ]);

        view = grok.shell.addTableView(df);
        view.grid.props.rowHeight = 22;
        view.grid.columns.byName('cluster')!.visible = false;
        view.grid.columns.byName('sequence')!.width = 300;
        view.grid.columns.byName('is_cliff')!.visible = false;
      }, {
        description: 'Load dataset with macromolecules of \'fasta\' notation, \'DNA\' alphabet.',
        delay: 2000,
      })
      .step('Find activity cliffs', async () => {
        activityCliffsViewer = (await activityCliffs(
          df, df.getCol('Sequence'), df.getCol('Activity'),
          80, dimRedMethod)) as DG.ScatterPlotViewer;
        view.dockManager.dock(activityCliffsViewer, DG.DOCK_TYPE.RIGHT, null, 'Activity Cliffs', 0.35);

        // Show grid viewer with the cliffs
        const cliffsLink: HTMLButtonElement = $(activityCliffsViewer.root)
          .find('button.scatter_plot_link,cliffs_grid').get()[0] as HTMLButtonElement;
        cliffsLink.click();
      }, {
        description: 'Reveal similar sequences with a cliff of activity.',
        delay: 2000,
      })
      .step('Cluster sequences', async () => {
        const seqCol: DG.Column<string> = df.getCol('sequence');
        const seqList = seqCol.toList();
        const distance: DistanceMatrix = DistanceMatrix.calc(seqList, (aSeq: string, bSeq: string) => {
          const levDistance = lev.distance(aSeq, bSeq);
          return levDistance / ((aSeq.length + bSeq.length) / 2);
        });
        const treeRoot = await treeHelper.hierarchicalClusteringByDistance(distance, 'ward');
        dendrogramSvc.injectTreeForGrid(view.grid, treeRoot, undefined, 150, undefined);

        // adjust for visual
        const activityGCol = view.grid.columns.byName('Activity')!;
        activityGCol.scrollIntoView();
      }, {
        description: 'Perform hierarchical clustering to reveal relationships between sequences.',
        delay: 2000,
      })
      .step('Browse the cliff', async () => {
        //cliffsDfGrid.dataFrame.currentRowIdx = -1; // reset
        const cliffsDfGrid: DG.Grid = activityCliffsViewer.dataFrame.temp[acTEMPS.cliffsDfGrid];
        //cliffsDfGrid.dataFrame.selection.init((i) => i == currentCliffIdx);
        if (cliffsDfGrid.dataFrame.rowCount > 0) cliffsDfGrid.dataFrame.currentRowIdx = 0;
        //cliffsDfGrid.dataFrame.selection.set(currentCliffIdx, true, true);

        // /* workaround to select rows of the cliff */
        // const entryCol: DG.Column = df.getCol('Entry');
        // df.selection.init((rowIdx) => ['UPI00000BFE1D', 'UPI00000BFE17'].includes(entryCol.get(rowIdx)));
        //
        // const selectionIdxList: Int32Array = df.selection.getSelectedIndexes();
        // if (selectionIdxList.length > 0) {
        //   df.currentRowIdx = selectionIdxList[0];
        //   view.grid.scrollToCell('UniProtKB', view.grid.tableRowToGrid(selectionIdxList[0]));
        // }
      }, {
        description: 'Zoom in to explore selected activity cliff details.',
        delay: 2000,
      })
      .start();
  } catch (err: any) {
    handleError(err);
  }
}
