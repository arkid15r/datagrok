/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {DockingApp} from './apps/docking-app';
import {byId, byData, MolstarViewer} from './viewers/molstar-viewer';
import {SaguaroViewer} from './viewers/saguaro-viewer';
import {PdbGridCellRenderer} from './utils/pdb-grid-cell-renderer';
import {NglForGridTestApp} from './apps/ngl-for-grid-test-app';
import {nglViewerGen as _nglViewerGen} from './utils/ngl-viewer-gen';
import {NglViewer} from './viewers/ngl-viewer';
import {NglViewerApp} from './apps/ngl-viewer-app';
import {PdbHelper, PdbResDataFrame} from './utils/pdb-helper';
import {nglWidgetUI} from './viewers/ngl-ui';
import {IPdbHelper} from '@datagrok-libraries/bio/src/pdb/pdb-helper';
import {NglGlServiceBase} from '@datagrok-libraries/bio/src/viewers/ngl-gl-viewer';
import {TaskBarProgressIndicator} from 'datagrok-api/dg';
import {dockingDemoApp} from './demo/docking';
import {biostructureInGridApp} from './demo/biostructure-in-grid';
import {BiotrackViewerApp} from './apps/biotrack-viewer-app';
import {BiostructureAndTrackViewerApp} from './apps/biostructure-and-track-viewer-app';
import {previewBiostructure, viewBiostructure} from './viewers/view-preview';
import {BiostructureViewerApp} from './apps/biostructure-viewer-app';
import {demoBio06NoScript} from './demo/bio06-docking-ngl';
import {demoBio07NoScript} from './demo/bio07-molecule3d-in-grid';
import {NglGlDocService} from './utils/ngl-gl-doc-service';
import {LigandsWithBiostructureApp, LigandsWithNglApp} from './apps/ligands-with';

class Package extends DG.Package {
  private _pLogger: DG.PackageLogger;

  get logger(): DG.PackageLogger {
    if (!this._pLogger) {
      this._pLogger = new class extends DG.PackageLogger {
        private logPrefix: string = 'BsV: ';

        constructor(_package: DG.Package) { super(_package); }

        debug(message: string, params?: object): void { super.debug(this.logPrefix + message, params); }
      }(this);
    }

    return this._pLogger;
  }
}

export const _package = new Package();

//name: init
//tags: init
//description:
export async function init() {
  _package.logger.debug('BiostructureViewer.initBiostructureViewer() init package start');
}

//name: pdbCellRenderer
//tags: cellRenderer
//meta.cellType: Molecule3D
//meta.columnTags: quality=Molecule3D
//output: grid_cell_renderer result
export function Molecule3dCellRenderer(): PdbGridCellRenderer {
  return new PdbGridCellRenderer();
}

//name: Docking
//tags: app
export async function dockingApp() {
  const pi = DG.TaskBarProgressIndicator.create('Opening BioStructure Viewer');
  try {
    grok.shell.warning('dockingApp demo deprecated');
    const app = new DockingApp('dockingApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: viewPdbById
//input: string pdbId
export async function viewPdbById(pdbId: string) {
  const pi = DG.TaskBarProgressIndicator.create(`Opening PDB ${pdbId}...`);
  try {
    await byId(pdbId);
  } finally {
    pi.close();
  }
}

//name: viewPdbByData
//input: string pdbData
//input: string name
export async function viewPdbByData(pdbData: string, name: string): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create(`Opening PDB '${name ?? '[data]'}'...`);
  try {
    await byData(pdbData, name);
  } finally {
    pi.close();
  }
}


type BsvWindowType = Window & {
  $pdbHelper?: IPdbHelper,
  $nglGlService?: NglGlServiceBase,
};
declare const window: BsvWindowType;

//name: getNglGlService
//output: object result
export function getNglGlService(): NglGlServiceBase {
  if (!(window.$nglGlService)) {
    const svc: NglGlServiceBase = new NglGlDocService();
    window.$nglGlService = svc;
  }

  return window.$nglGlService;
}

// -- File handlers --

/* The Chem package is opening formats 'mol2', 'sdf', 'mol' for small molecules */
//name: importPdb
//description: Opens PDB file
//tags: file-handler
//meta.ext: mmcif, cifCore, pdb, pdbqt, gro
//input: string fileContent
//output: list tables
export async function importPdb(fileContent: string): Promise<DG.DataFrame[]> {
  // Do not build up data frame from PDB file, allows to open various formats
  // const ph: IPdbHelper = await getPdbHelper();
  // const df: DG.DataFrame = await ph.pdbToDf(fileContent, '');
  // const app = new BiostructureApp();
  // await app.init(df);

  await viewBiostructure(fileContent);
  return [];
}

/* as file is handled as string we don't know its extension, thus we need a separate handler **/
//name: importXYZ
//description: Opens XYZ file
//tags: file-handler
//meta.ext: xyz
//input: string fileContent
//output: list tables
export async function importXYZ(fileContent: string): Promise<DG.DataFrame[]> {
  await viewBiostructure(fileContent, 'xyz');
  return [];
}

// -- File (pre)viewers --

// eslint-disable-next-line max-len
//tags: fileViewer, fileViewer-mol, fileViewer-cif, fileViewer-mcif, fileViewer-mmcif, fileViewer-gro, fileViewer-pdb, fileViewer-ent, fileViewer-pqr, fileViewer-mmtf, fileViewer-mtl, fileViewer-sd, fileViewer-pdbqt, fileViewer-xyz
//input: file file
//output: view v
export function molecule3dNglView1(file: DG.FileInfo): DG.View {
  return previewBiostructure(file);
}

//tags: fileViewer, fileViewer-ply, fileViewer-obj
//input: file file
//output: view v
export function molecule3dNglView2(file: DG.FileInfo): DG.View {
  return previewBiostructure(file);
}

//tags: fileViewer, fileViewer-prmtop, fileViewer-parm7, fileViewer-psf, fileViewer-top
//input: file file
//output: view v
export function molecule3dNglView3(file: DG.FileInfo): DG.View {
  return previewBiostructure(file);
}

// eslint-disable-next-line max-len
//tags: fileViewer, fileViewer-dsn6, fileViewer-brix, fileViewer-cube, fileViewer-cub, fileViewer-dx, fileViewer-dxbin, fileViewer-xplor, fileViewer-cns, fileViewer-mrc, fileViewer-map, fileViewer-ccp4
//input: file file
//output: view v
export function molecule3dNglView4(file: DG.FileInfo): DG.View {
  return previewBiostructure(file);
}

//name: openPdbResidues
//input: file fi
export async function openPdbResidues(fi: DG.FileInfo): Promise<void> {
  const ph = await getPdbHelper();
  const pdbStr: string = await fi.readAsString();
  const pdbDf: PdbResDataFrame = await ph.pdbToDf(pdbStr, fi.fileName);
  const view = grok.shell.addTableView(pdbDf);
  const viewer = await pdbDf.plot.fromType('NGL', {});
  view.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'NGL', 0.40);
}

// -- Panel widgets --

//name: PDB id viewer
//tags: panel
//input: string pdbId {semType: PDB_ID}
//output: widget result
export function pdbIdNglPanelWidget(pdbId: string): DG.Widget {
  return nglWidgetUI(pdbId);
}

// -- Test apps --

//name: nglForGridTestApp
//description: Example app for NGL drawing in grid cells
export async function nglForGridTestApp() {
  const pi = DG.TaskBarProgressIndicator.create('open nglForGridTest app');
  try {
    const app = new NglForGridTestApp();
    await app.init();
  } finally {
    pi.close();
  }
}

//name: nglViewerApp
//description: Test app for NglViewer
export async function nglViewerApp() {
  const pi = DG.TaskBarProgressIndicator.create('open nglViewer app');
  try {
    const app = new NglViewerApp('nglViewerApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: biostructureViewerApp
//description: Test app for BiostructureViewer (molstar)
export async function biostructureViewerApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('open biostructureViewer app');
  try {
    const app = new BiostructureViewerApp('biostructureViewerApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: biotrackViewerApp
//description: Test app for BiotrackViewer (saguaro)
export async function biotrackViewerApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('open biotrackViewer app');
  try {
    const app = new BiotrackViewerApp('biotrackViewerApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: biostructureAndTrackViewerApp
//description: Test app for twin BiostructureViewer (molstar) and BiotrackViewer (saguaro)
export async function biostructureAndTrackViewerApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('open biostructureAndTrackViewer app');
  try {
    const app = new BiostructureAndTrackViewerApp('biostructureAndTrackViewerApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: ligandsWithNglApp
export async function ligandsWithNglApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('Ligands with NGL app');
  try {
    const app = new LigandsWithNglApp('ligandsWithNglApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: ligandsWithBiostructureApp
export async function ligandsWithBiostructureApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('Ligands with Biostructure app');
  try {
    const app = new LigandsWithBiostructureApp('ligandsWithBiostructureApp');
    await app.init();
  } finally {
    pi.close();
  }
}


// -- Viewers --

//name: NGL
// eslint-disable-next-line max-len
//description: 3D structure viewer for large biological molecules (proteins, DNA, and RNA)
//meta.keywords: PDB, Biostructure
//meta.icon: files/icons/ngl-viewer.svg
//tags: viewer, panel
//output: viewer result
export function nglViewer(): DG.JsViewer {
  return new NglViewer();
}

//name: Biostructure
// eslint-disable-next-line max-len
//description: 3D structure molstar RCSB viewer for large biological molecules (proteins, DNA, and RNA)
//meta.keywords: Molstar, PDB
//meta.icon: files/icons/biostructure-viewer.svg
//tags: viewer, panel
//output: viewer result
export function molstarViewer(): DG.JsViewer {
  return new MolstarViewer();
}

//name: Biotrack
//description: structure polymer annotation tracks
//meta.keywords: PDB, track
//tags: viewer, panel
//output: viewer result
export function saguaroViewer(): DG.Viewer {
  return new SaguaroViewer();
}

// -- Top menu --

// code pdbViewer moved to utils/pdb-viewer.ts because of annotations in comments

// -- Utils --


//name: getPdbHelper
//output: object result
export async function getPdbHelper(): Promise<IPdbHelper> {
  if (!(window.$pdbHelper)) {
    const ph = await PdbHelper.getInstance(); // getPdbHelper
    window.$pdbHelper = ph;
  }
  return window.$pdbHelper;
}

export async function nglViewerGen(): Promise<void> {
  _nglViewerGen();
}

//name: dockingDemo
//description:
export async function dockingDemo() {
  const piMsg: string = 'Opening docking demo app ...';
  const pi: TaskBarProgressIndicator = TaskBarProgressIndicator.create(piMsg);
  try {
    await dockingDemoApp('dockingDemo', pi);
  } finally {
    pi.close();
  }
}

//name: inGridDemo
//description:
export async function inGridDemo() {
  const piMsg: string = 'Opening biostructure in grid demo app ...';
  const pi: TaskBarProgressIndicator = TaskBarProgressIndicator.create(piMsg);
  try {
    await biostructureInGridApp('inGridDemo', pi);
  } finally {
    pi.close();
  }
}

// -- Demo --

// demoBio06
//name: demoBioDockingConformations
//meta.demoPath: Cheminformatics | Docking Conformations
//description: Docking ligands along the structure
//meta.path: /apps/Tutorials/Demo/Cheminformatics/Docking%20Conformations
export async function demoBioDockingConformations(): Promise<void> {
  // Do not use any script for this demo (askalkin, 2023-05-17)
  //await demoBio06UI();
  await demoBio06NoScript();
}

// demoBio07
//name: demoBioProteins
//meta.demoPath: Cheminformatics | Proteins
//description: View structures PDB in grids
//meta.path: /apps/Tutorials/Demo/Cheminformatics/Proteins
export async function demoBioProteins(): Promise<void> {
  await demoBio07NoScript();
}
