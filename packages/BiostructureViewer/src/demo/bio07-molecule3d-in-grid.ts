import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {IBiostructureViewer} from '@datagrok-libraries/bio/src/viewers/molstar-viewer';
import {handleError} from './utils';
import {DemoScript} from '@datagrok-libraries/tutorials/src/demo-script';

import {_package} from '../package';

const pdbCsvFn: string = 'pdb_data.csv';
const pdbColName: string = 'pdb';

export async function demoBio07NoScript(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('Demo Proteins ...');
  try {
    grok.shell.windows.showContextPanel = false;
    grok.shell.windows.showProperties = false;

    const df = await _package.files.readCsv(pdbCsvFn);
    const view = grok.shell.addTableView(df);
    view.grid.columns.byName('id')!.width = 0;

    df.currentCell = df.cell(0, pdbColName);
    const pdbStr: string = df.currentCell.value;
    const viewer = (await df.plot.fromType('Biostructure', {
      pdb: pdbStr,
    }));
    view.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'Biostructure', 0.5);

    grok.shell.windows.showHelp = true;
    // TODO: Dependency on datagrok-api ^1.15.0
    // @ts-ignore
    if (grok.shell.windows.help) {
      // @ts-ignore
      grok.shell.windows.help.showHelp(viewer.helpUrl);
    }
  } finally {
    pi.close();
  }
}

export async function demoBio07UI(): Promise<void> {
  let view: DG.TableView;
  let df: DG.DataFrame;
  let viewer: DG.Viewer & IBiostructureViewer;

  try {
    await new DemoScript(
      'Molecule3D in Grid',
      'View structures PDB in grid',
    )
      .step('Loading structures', async () => {
        grok.shell.windows.showContextPanel = false;
        grok.shell.windows.showProperties = false;

        df = await _package.files.readCsv(pdbCsvFn);
        view = grok.shell.addTableView(df);
        view.grid.columns.byName('id')!.width = 0;
      }, {
        description: 'Load dataset with structures (PDB).',
        delay: 2000,
      })
      .step('Biostructure viewer', async () => {
        df.currentCell = df.cell(0, pdbColName);
        const pdbStr: string = df.currentCell.value;
        viewer = (await df.plot.fromType('Biostructure', {
          pdb: pdbStr,
        }));
        view.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'Biostructure', 0.5);
      }, {
        description: `Add Biostructure viewer`,
        delay: 2000,
      })
      .step('Tracking PDB cell', async () => {
        df.currentCell = df.cell(2, pdbColName);
        const pdbStr: string = df.currentCell.value;
        viewer.setOptions({pdb: pdbStr});
      }, {
        description: `'Molecule3D' cell renderer handle mouse click displaying data with the BiostructureViewer.`,
        delay: 2000,
      })
      .step('Tracking PDB cell', async () => {
        df.currentCell = df.cell(1, pdbColName);
        const pdbStr: string = df.currentCell.value;
        viewer.setOptions({pdb: pdbStr});
      }, {
        description: `'Molecule3D' cell renderer handle mouse click displaying data with the BiostructureViewer.`,
        delay: 2000,
      })
      .start();
  } catch (err: any) {
    handleError(err);
  }
}
