/**
 * RDKit-based molecule cell renderer.
 * */

import * as DG from 'datagrok-api/dg';
import {_rdKitModule, drawErrorCross, drawRdKitMoleculeToOffscreenCanvas} from '../utils/chem-common-rdkit';
import {IMolContext, getMolSafe} from '../utils/mol-creation_rdkit';
import {RDModule, RDMol} from '@datagrok-libraries/chem-meta/src/rdkit-api';

interface IMolInfo {
  //mol: RDMol | null; // null when molString is invalid?
  molCtx: IMolContext;
  substruct: any;
  molString: string;
  scaffoldMolString: string;
}

export class GridCellRendererProxy extends DG.GridCellRenderer {
  renderer: DG.GridCellRenderer;
  _cellType: string;

  constructor(renderer: DG.GridCellRenderer, cellType: string) {
    super();
    this.renderer = renderer;
    this._cellType = cellType;
  }

  get defaultWidth(): number | null {return this.renderer.defaultWidth;}
  get defaultHeight(): number | null {return this.renderer.defaultHeight;}

  get name(): string {return this.renderer.name;}
  get cellType(): string {return this._cellType;}

  render(
    g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle): void {
    this.renderer.render(g, x, y, w, h, gridCell, cellStyle);
  }

  renderInternal(
    g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle): void {
    this.renderer.renderInternal(g, x, y, w, h, gridCell, cellStyle);
  }
}

export class RDKitCellRenderer extends DG.GridCellRenderer {
  readonly WHITE_MOLBLOCK_SUFFIX = `
  0  0  0  0  0  0  0  0  0  0999 V2000
M  END
`;
  rdKitModule: RDModule;
  canvasCounter: number;
  molCache: DG.LruCache<String, IMolInfo> = new DG.LruCache<String, IMolInfo>();
  rendersCache: DG.LruCache<String, ImageData> = new DG.LruCache<String, ImageData>();
  canvasReused: OffscreenCanvas;

  constructor(rdKitModule: RDModule) {
    super();
    this.rdKitModule = rdKitModule;
    this.canvasCounter = 0;
    this.canvasReused = new OffscreenCanvas(this.defaultWidth, this.defaultHeight);
    this.molCache.onItemEvicted = function(obj: {[_ : string]: any}) {
      obj.mol?.delete();
    };
  }

  ensureCanvasSize(w: number, h: number) : OffscreenCanvas {
    if (this.canvasReused.width < w || this.canvasReused.height < h)
      this.canvasReused = new OffscreenCanvas(Math.max(this.defaultWidth, w), Math.max(this.defaultHeight, h));
    return this.canvasReused;
  }

  get name(): string {return 'RDKit cell renderer';}
  get cellType(): DG.SemType {return DG.SEMTYPE.MOLECULE;}
  get defaultWidth() {return 200;}
  get defaultHeight() {return 100;}

  getDefaultSize(gridColumn: DG.GridColumn): {width: number, height: number} {
    return {width: this.defaultWidth, height: this.defaultHeight};
  }

  _fetchMolGetOrCreate(molString: string, scaffoldMolString: string, molRegenerateCoords: boolean,
    details: object = {}): IMolInfo {
    let molCtx: IMolContext;
    let mol = null;
    let substruct = {};
    if ((details as any).isSubstructure) {
      if (molString.includes(' H ') || molString.includes('V3000')) {
        molCtx = getMolSafe(molString, {mergeQueryHs: true}, _rdKitModule);
        mol = molCtx.mol;
      } else {
        try {
          mol = this.rdKitModule.get_qmol(molString);
          mol.set_aromatic_form();
        } catch (e) {
          if (mol) {
            mol.delete();
            mol = null;
          }
        }
        molCtx = {mol: mol, kekulize: false, isQMol: true, useMolBlockWedging: false};
      }
    } else {
      molCtx = getMolSafe(molString, details, _rdKitModule);
      mol = molCtx.mol;
    }

    if (mol !== null) {
      try {
        let molHasOwnCoords = (mol.has_coords() > 0);
        const scaffoldIsMolBlock = DG.chem.isMolBlock(scaffoldMolString);
        if (scaffoldIsMolBlock) {
          const rdKitScaffoldMolCtx = this._fetchMol(scaffoldMolString, '', molRegenerateCoords, false,
            {mergeQueryHs: true, isSubstructure: true}).molCtx;
          const rdKitScaffoldMol = rdKitScaffoldMolCtx.mol;
          if (rdKitScaffoldMol) {
            rdKitScaffoldMol.normalize_depiction(0);
            if (molHasOwnCoords)
              mol.normalize_depiction(0);

            let substructJson = '';
            try {
              substructJson = mol.generate_aligned_coords(rdKitScaffoldMol, JSON.stringify({
                useCoordGen: true,
                allowRGroups: true,
                acceptFailure: false,
                alignOnly: molHasOwnCoords,
              }));
            } catch {
              // exceptions should not be thrown anymore by RDKit, but let's play safe
            }
            if (substructJson === '') {
              substruct = {};
              if (molHasOwnCoords)
                mol.straighten_depiction(true);
            } else
              substruct = JSON.parse(substructJson);
          }
        }
        if (mol.has_coords() === 0 || molRegenerateCoords) {
          mol.set_new_coords(molRegenerateCoords);
          molHasOwnCoords = false;
        }
        if (!scaffoldIsMolBlock) {
          mol.normalize_depiction(molHasOwnCoords ? 0 : 1);
          mol.straighten_depiction(molHasOwnCoords);
        } else if (!molHasOwnCoords)
          mol.normalize_depiction(0);

        molCtx.useMolBlockWedging = (mol.has_coords() === 2);
      } catch (e) {
        console.error(
          'In _fetchMolGetOrCreate: RDKit crashed, possibly a malformed molString molecule: `' + molString + '`');
        if (mol !== null) {
          mol.delete();
          molCtx.mol = null;
        }
      }
    }

    return {
      molCtx: molCtx,
      substruct: substruct,
      molString: molString,
      scaffoldMolString: scaffoldMolString,
    };
  }

  _fetchMol(molString: string, scaffoldMolString: string, molRegenerateCoords: boolean,
    scaffoldRegenerateCoords: boolean, details: object = {}): IMolInfo {
    const name = molString + ' || ' + scaffoldMolString + ' || ' +
      molRegenerateCoords + ' || ' + scaffoldRegenerateCoords +
      (Object.keys(details).length ? ' || ' + JSON.stringify(details) : '');
    return this.molCache.getOrCreate(name, (_: any) =>
      this._fetchMolGetOrCreate(molString, scaffoldMolString, molRegenerateCoords, details));
  }

  _rendererGetOrCreate(
    width: number, height: number, molString: string, scaffoldMolString: string,
    highlightScaffold: boolean, molRegenerateCoords: boolean, scaffoldRegenerateCoords: boolean): ImageData {
    const fetchMolObj : IMolInfo =
      this._fetchMol(molString, scaffoldMolString, molRegenerateCoords, scaffoldRegenerateCoords);
    const rdKitMolCtx = fetchMolObj.molCtx;
    const rdKitMol = rdKitMolCtx.mol;//fetchMolObj.mol;
    const substruct = fetchMolObj.substruct;

    const canvas = this.ensureCanvasSize(width, height);//new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
    this.canvasCounter++;
    if (rdKitMol != null)
      drawRdKitMoleculeToOffscreenCanvas(rdKitMolCtx, width, height, canvas, highlightScaffold ? substruct : null);
    else {
      // draw a crossed rectangle
      ctx.clearRect(0, 0, width, height);
      drawErrorCross(ctx, width, height);
    }

    return ctx.getImageData(0, 0, !Math.floor(width) ? 1 : width, !Math.floor(height) ? 1 : height);
  }

  _fetchRender(
    width: number, height: number, molString: string, scaffoldMolString: string,
    highlightScaffold: boolean, molRegenerateCoords: boolean, scaffoldRegenerateCoords: boolean): ImageData {
    const name = width + ' || ' + height + ' || ' +
      molString + ' || ' + scaffoldMolString + ' || ' + highlightScaffold + ' || ' +
      molRegenerateCoords + ' || ' + scaffoldRegenerateCoords;

    return this.rendersCache.getOrCreate(name, (_: any) => this._rendererGetOrCreate(width, height,
      molString, scaffoldMolString, highlightScaffold, molRegenerateCoords, scaffoldRegenerateCoords));
  }

  _drawMolecule(x: number, y: number, w: number, h: number, onscreenCanvas: HTMLCanvasElement,
    molString: string, scaffoldMolString: string, highlightScaffold: boolean,
    molRegenerateCoords: boolean, scaffoldRegenerateCoords: boolean, cellStyle: DG.GridCellStyle): void {
    const vertical = cellStyle !== undefined && cellStyle !== null ? cellStyle.textVertical : false;

    if (vertical) {
      h += w;
      w = h - w;
      h -= w;
    }
    const imageData = this._fetchRender(w, h, molString, scaffoldMolString,
      highlightScaffold, molRegenerateCoords, scaffoldRegenerateCoords);

    if (vertical) {
      const ctx = onscreenCanvas.getContext('2d', {willReadFrequently: true})!;
      ctx.save();
      const scl = ctx.getTransform();
      ctx.resetTransform();
      ctx.translate(x + h, y);
      ctx.rotate(Math.PI / 2);
      if (scl.m11 < 1 || scl.m22 < 1)
        ctx.scale(scl.m11, scl.m22);
      const f = new OffscreenCanvas(imageData.width, imageData.height)!;
      f.getContext('2d')?.putImageData(imageData, 0, 0);
      ctx.drawImage(f, 0, 0);
      ctx.restore();
    } else {
      //const image = offscreenCanvas.getContext('2d')!.getImageData(0, 0, w, h);
      onscreenCanvas.getContext('2d', {willReadFrequently: true})!.putImageData(imageData, x, y);
    }
  }

  _initScaffoldString(colTemp: any, tagName: string) {
    let scaffoldString = colTemp ? colTemp[tagName] : null;
    if (scaffoldString?.endsWith(this.WHITE_MOLBLOCK_SUFFIX)) {
      scaffoldString = null;
      if (colTemp[tagName])
        delete colTemp[tagName];
    }
    return scaffoldString;
  }

  render(g: any, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle): void {
    const molString = gridCell.cell.value;
    if (molString == null || molString === '')
      return;

    const r = window.devicePixelRatio;
    x = r * x; y = r * y;
    w = r * w; h = r * h;

    // value-based drawing (coming from HtmlCellRenderer.renderValue)
    if (gridCell.cell.column == null) {
      this._drawMolecule(x, y, w, h, g.canvas, molString, '', false, false, false, cellStyle);
      return;
    }

    const colTemp = gridCell.cell.column.temp;

    const singleScaffoldHighlightMolString = this._initScaffoldString(colTemp, 'chem-scaffold');
    const singleScaffoldFilterMolString = this._initScaffoldString(colTemp, 'chem-scaffold-filter'); //expected molBlock
    const singleScaffoldMolString = singleScaffoldFilterMolString ?? singleScaffoldHighlightMolString;
    // TODO: make both filtering scaffold and single highlight scaffold appear

    if (singleScaffoldMolString) {
      this._drawMolecule(x, y, w, h, g.canvas,
        molString, singleScaffoldMolString, true, false, false, cellStyle);
    } else {
      let molRegenerateCoords = colTemp && colTemp['regenerate-coords'] === 'true';
      let scaffoldRegenerateCoords = false;
      const df = gridCell.cell.dataFrame;
      let rowScaffoldCol = null;

      // if given, take the 'scaffold-col' col
      if (colTemp && colTemp['scaffold-col']) {
        const rowScaffoldColName = colTemp['scaffold-col'];
        const rowScaffoldColProbe = df.columns.byName(rowScaffoldColName);
        if (rowScaffoldColProbe !== null) {
          const scaffoldColTemp = rowScaffoldColProbe.temp;
          scaffoldRegenerateCoords = scaffoldColTemp && scaffoldColTemp['regenerate-coords'] === 'true';
          molRegenerateCoords = scaffoldRegenerateCoords;
          rowScaffoldCol = rowScaffoldColProbe;
        }
      }

      if (rowScaffoldCol == null || rowScaffoldCol.name === gridCell.cell.column.name) {
        // regular drawing
        this._drawMolecule(x, y, w, h, g.canvas, molString, '', false, molRegenerateCoords, false, cellStyle);
      } else {
        // drawing with a per-row scaffold
        const idx = gridCell.tableRowIndex; // TODO: supposed to be != null?
        const scaffoldMolString = df.get(rowScaffoldCol.name, idx!);
        const highlightScaffold = colTemp && colTemp['highlight-scaffold'] === 'true';
        this._drawMolecule(x, y, w, h, g.canvas,
          molString, scaffoldMolString, highlightScaffold, molRegenerateCoords, scaffoldRegenerateCoords, cellStyle);
      }
    }
  }
}
