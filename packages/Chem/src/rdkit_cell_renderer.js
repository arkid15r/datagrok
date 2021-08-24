/**
 * RDKit-based molecule cell renderer.
 * */
class RDKitCellRenderer extends DG.GridCellRenderer {

  constructor() {

    super();
    this.canvasCounter = 0;
    this.molCache = new DG.LruCache();
    this.molCache.onItemEvicted = function (obj) {
      obj.mol?.delete();
      obj.mol = null;
      obj.substruct = null;
      obj = null;
    };
    this.rendersCache = new DG.LruCache();
    this.rendersCache.onItemEvicted = function (obj) {
      obj.canvas = null;
      obj = null;
    }
    this.WHITE_MOLBLOCK = `
Actelion Java MolfileCreator 1.0

  0  0  0  0  0  0  0  0  0  0999 V2000
M  END
`;
  }

  get name() { return 'RDKit cell renderer'; }
  get cellType() { return DG.SEMTYPE.MOLECULE; }
  get defaultWidth() { return 200; }
  get defaultHeight() { return 100; }

  _isMolBlock(molString) {

    return molString.includes('M  END');

  }

  _fetchMolGetOrCreate(molString, scaffoldMolString, molRegenerateCoords) {

    let mol = null;
    let substructJson = "{}";

    try {
      mol = rdKitModule.get_mol(molString);
    } catch (e) {
      try {
        mol = rdKitModule.get_mol(molString, "{\"kekulize\":false}");
      } catch (e2) {
        console.error(
          "In _fetchMolGetOrCreate: RDKit .get_mol crashes on a molString: `" + molString + "`");
        mol = null;
      }
    }
    if (mol) {
      try {
        if (mol.is_valid()) {
          const scaffoldIsMolBlock = this._isMolBlock(scaffoldMolString);
          if (scaffoldIsMolBlock) {
            const rdkitScaffoldMol = this._fetchMol(scaffoldMolString, "", molRegenerateCoords, false).mol;
            if (rdkitScaffoldMol && rdkitScaffoldMol.is_valid()) {
              substructJson = mol.generate_aligned_coords(rdkitScaffoldMol, true, true, false);
              if (substructJson === "") {
                substructJson = "{}";
              }
            }
          } else if (molRegenerateCoords) {
            const molBlock = mol.get_new_coords(true);
            mol.delete();
            mol = rdKitModule.get_mol(molBlock);
          }
          if (!scaffoldIsMolBlock || molRegenerateCoords) {
            mol.normalize_2d_molblock();
            mol.straighten_2d_layout();
          }
        }
        if (!mol.is_valid()) {
          console.error(
            "In _fetchMolGetOrCreate: RDKit mol is invalid on a molString molecule: `" + molString + "`");
          mol.delete();
          mol = null;
        }
      } catch (e) {
        console.error(
          "In _fetchMolGetOrCreate: RDKit crashed, possibly a malformed molString molecule: `" + molString + "`");
      }
    }
    return { mol: mol, substruct: JSON.parse(substructJson) };
  }

  _fetchMol(molString, scaffoldMolString, molRegenerateCoords, scaffoldRegenerateCoords) {
    const name = molString + " || " + scaffoldMolString + " || "
      + molRegenerateCoords + " || " + scaffoldRegenerateCoords;
    return this.molCache.getOrCreate(name, (s) =>
      this._fetchMolGetOrCreate(molString, scaffoldMolString, molRegenerateCoords));
  }
  
  _rendererGetOrCreate(width, height, molString, scaffoldMolString, highlightScaffold, molRegenerateCoords, scaffoldRegenerateCoords) {

    let fetchMolObj = this._fetchMol(molString, scaffoldMolString, molRegenerateCoords, scaffoldRegenerateCoords);
    let rdkitMol = fetchMolObj.mol;
    const substruct = fetchMolObj.substruct;

    const canvasId = '_canvas-rdkit-' + this.canvasCounter;
    let canvas = new OffscreenCanvas(width, height);
    this.canvasCounter++;
    if (rdkitMol != null) {
      this._drawMoleculeToCanvas(rdkitMol, width, height, canvas, substruct, highlightScaffold);
    } else {
      let ctx = canvas.getContext("2d");
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#EFEFEF';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(0, height);
      ctx.stroke();
    }
    return {canvas: canvas};

  }

  _fetchRender(width, height, molString, scaffoldMolString, highlightScaffold, molRegenerateCoords, scaffoldRegenerateCoords) {

    const name = width + " || " + height + " || "
      + molString + " || " + scaffoldMolString  + " || " + highlightScaffold + " || "
      + molRegenerateCoords + " || " + scaffoldRegenerateCoords;
    return this.rendersCache.getOrCreate(name, (s) =>
      this._rendererGetOrCreate(width, height,
        molString, scaffoldMolString, highlightScaffold, molRegenerateCoords, scaffoldRegenerateCoords));

  }

  _drawMoleculeToCanvas(rdkitMol, w, h, canvas, substruct, highlightScaffold) {
    let opts = {
      "clearBackground": false,
      "offsetx": 0, "offsety": 0,
      "width": Math.floor(w),
      "height": Math.floor(h),
      "bondLineWidth": 1,
      "fixedScale": 0.07,
      "minFontSize": 9,
      "highlightBondWidthMultiplier": 12,
      "dummyIsotopeLabels": false,
      "atomColourPalette": {
        16: [0.498, 0.247, 0.0],
        9: [0.0, 0.498, 0.0],
        17: [0.0, 0.498, 0.0],
      },
    };
    if (highlightScaffold) {
      Object.assign(opts, substruct);
    }
    rdkitMol.draw_to_canvas_with_highlights(canvas, JSON.stringify(opts));
  }

  _drawMolecule(x, y, w, h, onscreenCanvas,
                molString, scaffoldMolString, highlightScaffold,
                molRegenerateCoords, scaffoldRegenerateCoords) {

    const r = window.devicePixelRatio;
    x = r * x; y = r * y;
    w = r * w; h = r * h;
    const renderObj = this._fetchRender(w, h,
      molString, scaffoldMolString, highlightScaffold, molRegenerateCoords, scaffoldRegenerateCoords);
    let offscreenCanvas = renderObj.canvas;
    let image = offscreenCanvas.getContext('2d').getImageData(0, 0, w, h);
    let context = onscreenCanvas.getContext('2d');
    context.putImageData(image, x, y);
  }

  _initScaffoldString(colTags, tagName) {

    let scaffoldString = colTags ? colTags[tagName] : null;
    if (scaffoldString  === this.WHITE_MOLBLOCK) {
      scaffoldString  = null;
      if (colTags[tagName]) {
        delete colTags[tagName];
      }
    }
    return scaffoldString;

  }

  render(g, x, y, w, h, gridCell, cellStyle) {

    let molString = gridCell.cell.value;
    if (molString == null || molString === '')
      return;

    // value-based drawing (coming from HtmlCellRenderer.renderValue)
    if (gridCell.cell.column == null) {
      this._drawMolecule(x, y, w, h, g.canvas, molString, "", false, false, false);
      return;
    }

    let colTags = gridCell.cell.column.tags;

    const singleScaffoldHighlightMolString = this._initScaffoldString(colTags, 'chem-scaffold');
    const singleScaffoldFilterMolString = this._initScaffoldString(colTags, 'chem-scaffold-filter');
    const singleScaffoldMolString = singleScaffoldFilterMolString ?? singleScaffoldHighlightMolString;
    // TODO: make both filtering scaffold and single highlight scaffold appear
    
    if (singleScaffoldMolString) {


      this._drawMolecule(x, y, w, h, g.canvas,
        molString, singleScaffoldMolString, true, false, false);

    } else {

      let molRegenerateCoords = colTags && colTags['regenerate-coords'] === 'true';
      let scaffoldRegenerateCoords = false;
      let df = gridCell.cell.dataFrame;
      let rowScaffoldCol = null;

      // if given, take the 'scaffold-col' col
      if (colTags && colTags['scaffold-col']) {
        let rowScaffoldColName = colTags['scaffold-col'];
        let rowScaffoldColProbe = df.columns.byName(rowScaffoldColName);
        if (rowScaffoldColProbe !== null) {
          const scaffoldColTags = rowScaffoldColProbe.tags;
          scaffoldRegenerateCoords = scaffoldColTags && scaffoldColTags['regenerate-coords'] === 'true';
          molRegenerateCoords = scaffoldRegenerateCoords;
          rowScaffoldCol = rowScaffoldColProbe;
        }
      }

      if (rowScaffoldCol == null || rowScaffoldCol.name === gridCell.cell.column.name) {
        // regular drawing
        this._drawMolecule(x, y, w, h, g.canvas, molString, "", false, molRegenerateCoords, false);
      } else {
        // drawing with a per-row scaffold
        let idx = gridCell.tableRowIndex;
        let scaffoldMolString = df.get(rowScaffoldCol.name, idx);
        let highlightScaffold = colTags && colTags['highlight-scaffold'] === 'true';
        this._drawMolecule(x, y, w, h, g.canvas,
          molString, scaffoldMolString, highlightScaffold, molRegenerateCoords, scaffoldRegenerateCoords);
      }
    }
  }
}