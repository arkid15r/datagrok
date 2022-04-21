import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {callMVA} from '../utils/multivariate-analysis';
import {PeptidesController} from '../peptides';
import '../styles.css';
import {StringDictionary} from '@datagrok-libraries/utils/src/type-declarations';
import * as C from '../utils/constants';
import {FilteringStatistics} from '../utils/filtering-statistics';

/**
 * Peptide analysis widget.
 *
 * @export
 * @param {DG.Column} col Aligned sequence column.
 * @param {DG.TableView} view Working view.
 * @param {DG.Grid} tableGrid Working table grid.
 * @param {DG.DataFrame} currentDf Working table.
 * @return {Promise<DG.Widget>} Widget containing peptide analysis.
 */
export async function analyzePeptidesWidget(currentDf: DG.DataFrame, col: DG.Column): Promise<DG.Widget> {
  let tempCol = null;
  let tempDf: DG.DataFrame;
  let newScaledColName: string;

  for (const column of currentDf.columns.numerical)
    tempCol = column.type === DG.TYPE.FLOAT ? column : null;

  const defaultColumn: DG.Column = currentDf.col('activity') || currentDf.col('IC50') || tempCol;
  const histogramHost = ui.div([], {id: 'pep-hist-host'});

  const activityScalingMethod = ui.choiceInput(
    'Scaling', 'none', ['none', 'lg', '-lg'],
    async (currentMethod: string) => {
      const currentActivityCol = activityColumnChoice.value.name;
      

      [tempDf, newScaledColName] = await PeptidesController.scaleActivity(
        currentMethod, currentDf, currentActivityCol);

      const hist = tempDf.plot.histogram({
        filteringEnabled: false,
        valueColumnName: C.COLUMNS_NAMES.ACTIVITY_SCALED,
        legendVisibility: 'Never',
        showXAxis: true,
        showColumnSelector: false,
        showRangeSlider: false,
        showBinSelector: false,
      // bins: b,
      });
      histogramHost.lastChild?.remove();
      histogramHost.appendChild(hist.root);
    });
  activityScalingMethod.setTooltip('Function to apply for each value in activity column');

  const activityScalingMethodState = function(_: any) {
    activityScalingMethod.enabled =
      activityColumnChoice.value && DG.Stats.fromColumn(activityColumnChoice.value, currentDf.filter).min > 0;
    activityScalingMethod.fireChanged();
  };
  const activityColumnChoice = ui.columnInput(
    'Activity',
    currentDf,
    defaultColumn,
    activityScalingMethodState,
  );
  activityColumnChoice.fireChanged();
  activityScalingMethod.fireChanged();

  const startBtn = ui.button('Launch SAR', async () => {
    const progress = DG.TaskBarProgressIndicator.create('Loading SAR...');
    if (activityColumnChoice.value.type === DG.TYPE.FLOAT) {
      const activityColumn: string = activityColumnChoice.value.name;
      // const activityColumnScaled = `${activityColumn}Scaled`;
      // const originalDfColumns = (currentDf.columns as DG.ColumnList).names();
      const options: StringDictionary = {
        'scaling': activityScalingMethod.value,
      };

      //prepare new DF
      const newDf = currentDf.clone(currentDf.filter, [col.name, activityColumn]);
      newDf.getCol(activityColumn).name = C.COLUMNS_NAMES.ACTIVITY;
      newDf.getCol(col.name).name = C.COLUMNS_NAMES.ALIGNED_SEQUENCE;
      const activityScaledCol = tempDf.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
      (newDf.columns as DG.ColumnList).add(activityScaledCol);
      // newDf.temp[C.COLUMNS_NAMES.ACTIVITY] = activityColumn;
      newDf.name = 'Peptides analysis';
      newDf.temp[C.COLUMNS_NAMES.ACTIVITY_SCALED] = newScaledColName;
      newDf.tags['isPeptidesAnalysis'] = 'true';

      const peptides = await PeptidesController.getInstance(newDf);
      await peptides.init(newDf);
    } else
      grok.shell.error('The activity column must be of floating point number type!');
    progress.close();
  });
  startBtn.style.alignSelf = 'center';

  // const startMVABtn = ui.button('Launch MVA', async () => {
  //   if (activityColumnChoice.value.type === DG.TYPE.FLOAT) {
  //     const progress = DG.TaskBarProgressIndicator.create('Loading MVA...');

  //     const options: {[key: string]: string} = {
  //       'activityColumnName': activityColumnChoice.value.name,
  //       'scaling': activityScalingMethod.value,
  //     };

  //     await callMVA(tableGrid, view, currentDf, options, col);

  //     progress.close();
  //   } else
  //     grok.shell.error('The activity column must be of floating point number type!');
  // });


  const viewer = await currentDf.plot.fromType('peptide-logo-viewer');

  return new DG.Widget(
    ui.divV([
      viewer.root,
      ui.splitH([
        ui.splitV([ui.inputs([activityColumnChoice, activityScalingMethod]), startBtn]),
        histogramHost,
      ], {style: {height: 'unset'}}),
      // histogramHost,
    ]),
  );
}
