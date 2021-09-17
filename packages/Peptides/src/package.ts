/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {SARViewer} from './SARViewer/sar-viewer';
import {AlignedSequenceCellRenderer} from './utils/cellRenderer'

export const _package = new DG.Package();

async function main() {
  const pi = DG.TaskBarProgressIndicator.create('Loading Peptides');
  //let peptides = await grok.data.loadTable('https://datagrok.jnj.com/p/ejaeger.il23peptideidp5562/il-23_peptide_idp-5562')
  const path = _package.webRoot + 'files/' + 'aligned.csv';
  const peptides = (await grok.data.loadTable(path));

  const view = grok.shell.addTableView(peptides);
  view.name = 'PeptidesView';

  pi.close();
}

//name: Peptides
//tags: app
export function Peptides() {
  const appDescription = ui.info(
    [
      ui.span(['For more deatails see LINK ']),
      ui.divText('\n To start the application :', {style: {'font-weight': 'bolder'}}),
      ui.divText('Select the corresponding .csv table with peptide sequences'),
    ], 'Transform peptide sequence data to research insights',
  );
  const annotationViewerDiv = ui.div();

  const windows = grok.shell.windows;
  windows.showToolbox = false;
  windows.showHelp = false;
  windows.showProperties = false;

  const mainDiv = ui.div();
  grok.shell.newView('Peptides', [
    appDescription,
    ui.h2('Choose .csv file'),
    ui.div([
      ui.block25([
        ui.button('Open demo', () => main(), ''),
      ]),
      ui.block75([annotationViewerDiv]),
    ]),
    mainDiv,
  ]);
}

//name: SAR Viewer Help
//tags: panel, widget
//input: column _ {semType: alignedSequence}
//output: widget result
export function SARViewerHelp(_: DG.Column): DG.Widget {
  const helpStr = 
  "med - Difference of activity medians of the currently selected AAR on the current position and total median;\n\
  avg - Mean activity of the currently selected AAR on the current position;\n\
  min - Min activity of the currently selected AAR on the current position;\n\
  max - Max activity of the currently selected AAR on the current position;\n\
  q1 - First quartile of activities for the currently selected AAR on the current position;\n\
  q2 - Second quartile of activities for the currently selected AAR on the current position;\n\
  q3 - Third Quartile of activities for the currently selected AAR on the current position;\n\
  count - Amount of the current AARs found on the current position;\n\
  variance - Variance of activities for the currently selected AAR on the current position;\n\
  skew - Skew of activities for the currently selected AAR on the current position;\n\
  kurt - Kurtosis of activities for the currently selected AAR on the current position;\n\
  stdev - Standard deviation for the currently selected AAR on the current position;\n\
  sum - Sum of activities for the currently selected AAR on the current position;\n\
  ratio - Ratio of the selected AAR on the current position;\n\
  cv - Coefficient of variation for the currently selected AAR on the current position;\n\
  iqr - Interquartile range of activities for the currently selected AAR on the current position";
  const div = ui.divV(helpStr.split("\n").map((line) => {
    return ui.divText(line);
  }))
  return new DG.Widget(div);
}

//name: Analyze Peptides
//tags: panel, widget
//input: column col {semType: alignedSequence}
//output: widget result
export function analyzePeptides(col: DG.Column): DG.Widget {
  const activityColumnChoice = ui.columnInput('Activity column', col.dataFrame, col);
  const activityScalingMethod = ui.choiceInput('Activity scaling', 'none', ['none', 'lg', '-lg']);
  const showHistogram = ui.boolInput('Show histogram', false);
  const startBtn = ui.button('Start', async () => {
    const peptidesView = grok.shell.v;
    if (peptidesView.type === DG.VIEW_TYPE.TABLE_VIEW) {
      const options = {
        'activityColumnColumnName': activityColumnChoice.value.name,
        'activityScalingMethod': activityScalingMethod.value,
        'showHistogram': showHistogram.value
      };
      // @ts-ignore: I know what I'm doing!
      // peptidesView.addViewer('SARViewer', options);

      const sarViewer = await col.dataFrame.plot.fromType('SARViewer', options);
      (<DG.TableView>peptidesView).addViewer(<DG.Viewer>sarViewer);
    }
  });
  return new DG.Widget(ui.divV([activityColumnChoice.root, activityScalingMethod.root, showHistogram.root, startBtn]));
}

//name: SARViewer
//description: Peptides SAR Viewer
//tags: viewer
//output: viewer result
export function sar(): SARViewer {
  return new SARViewer();
}

//name: alignedSequenceCellRenderer
//tags: cellRenderer, cellRenderer-alignedSequence
//meta-cell-renderer-sem-type: alignedSequence
//output: grid_cell_renderer result
export function alignedSequenceCellRenderer() {
  return new AlignedSequenceCellRenderer();
}
