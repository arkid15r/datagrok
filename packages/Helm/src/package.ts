/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export const _package = new DG.Package();

const lru = new DG.LruCache<any, any>(); 

//tags: init
export async function initChem(): Promise<void> {
  // apparently HELMWebEditor requires dojo to be initialized first
  return new Promise((resolve, reject) => {
    // @ts-ignore
    dojo.ready(function () { resolve(null); });
  });
}


//name: helmCellRenderer
//tags: cellRenderer,cellRenderer-Macromolecule
//meta.cellType: Macromolecule
//meta-cell-renderer-sem-type: Macromolecule
//output: grid_cell_renderer result
export function helmCellRenderer(): DG.GridCellRenderer {
  return new HelmCellRenderer();
}

//tags: cellEditor
//description: Macromolecule
//input: grid_cell cell
export function editMoleculeCell(cell: DG.GridCell): void {
  let view = ui.div();
  org.helm.webeditor.MolViewer.molscale = 0.8;
  let app = new scil.helm.App(view, { showabout: false, mexfontsize: "90%", mexrnapinontab: true, topmargin: 20, mexmonomerstab: true, sequenceviewonly: false, mexfavoritefirst: true, mexfilter: true });
  var sizes = app.calculateSizes();
  app.canvas.resize(sizes.rightwidth, sizes.topheight - 210);
  var s = { width: sizes.rightwidth + "px", height: sizes.bottomheight + "px" };
  //@ts-ignore
  scil.apply(app.sequence.style, s);
  //@ts-ignore
  scil.apply(app.notation.style, s);
  s = { width: sizes.rightwidth + "px", height: (sizes.bottomheight + app.toolbarheight) + "px" };
  //@ts-ignore
  scil.apply(app.properties.parent.style, s);
  app.structureview.resize(sizes.rightwidth, sizes.bottomheight + app.toolbarheight);
  app.mex.resize(sizes.topheight - 80);
  setTimeout(function() {
    app.canvas.helm.setSequence(cell.cell.value , 'HELM');
  }, 200);
  //@ts-ignore
  ui.dialog({ showHeader: false, showFooter: true })
  .add(view)
  .onOK(() => {
    cell.cell.value = app.canvas.getHelm(true);
  }).show({ modal: true, fullScreen: true});
}

//name: Details
//tags: panel, widgets
//input: string helmString {semType: Macromolecule}
//output: widget result
export function detailsPanel(helmString: string){
  //return new DG.Widget(ui.divText(lru.get(helmString)));
  var result = lru.get(helmString).split(',');
  return new DG.Widget(
    ui.tableFromMap({
      'formula': result[0].replace(/<sub>/g, '').replace(/<\/sub>/g, ''),
      'molecular weight': result[1],
      'extinction coefficient': result[2],
      'molfile': result[3],
      'fasta': ui.wait(async () => ui.divText(await helmToFasta(helmString))),
      'rna analogue sequence': ui.wait(async () => ui.divText(await helmToRNA(helmString))),
      'smiles': ui.wait(async () => ui.divText(await helmToSmiles(helmString))),
      'peptide analogue sequence': ui.wait(async () => ui.divText(await helmToPeptide(helmString))),
    })
  )
}

async function accessServer(url: string, key: string) {
  const params: RequestInit = {
    method: 'GET', 
    headers: {
      'Accept': 'application/json',
    }
  };
  const response = await fetch(url, params);
  const json = await response.json();
  return json[key];
}


//name: helmToFasta
//input: string helmString {semType: Macromolecule}
//output: string res
export async function helmToFasta(helmString: string) {
  const url = `http://localhost:8081/WebService/service/Fasta/Produce/${helmString}`
  return await accessServer(url, 'FastaFile');
}

//name: helmToRNA
//description: converts to rna analogue sequence
//input: string helmString {semType: Macromolecule}
//output: string res
export async function helmToRNA(helmString: string) {
  const url = `http://localhost:8081/WebService/service/Fasta/Convert/RNA/${helmString}`
  return await accessServer(url, 'Sequence');
}


//name: helmToPeptide
//description: converts to peptide analogue sequence
//input: string helmString {semType: Macromolecule}
//output: string res
export async function helmToPeptide(helmString: string) {
  const url = `http://localhost:8081/WebService/service/Fasta/Convert/PEPTIDE/${helmString}`
  return await accessServer(url, 'Sequence');
}

//name: helmToSmiles
//description: converts to smiles
//input: string helmString {semType: Macromolecule}
//output: string smiles {semType: Molecule}
export async function helmToSmiles(helmString: string) {
  const url = `http://localhost:8081/WebService/service/SMILES/${helmString}`
  return await accessServer(url, 'SMILES');
}

function getRS(smiles: string) {
  var new_s = smiles.match(/(?<=\[)[^\][]*(?=])/gm);
  var res = {};
  var el = '';
  var digit;
  for (var i = 0; i < new_s.length; i++) {
    if (new_s[i] != null){
      if (/\d/.test(new_s[i])) {
        digit = new_s[i][new_s[i].length - 1];
        new_s[i] = new_s[i].replace(/[0-9]/g, '');
        for (var j = 0; j < new_s[i].length; j++) {
            if (new_s[i][j] != ':'){
                el += new_s[i][j];
            }
        }
        res['R' + digit] = el;
        el = '';
      }
    }
  }
  return res;
}

//name: Monomer Manager
//input: column helmColumn {semType: Macromolecule}
export async function monomerManager(helmColumn: DG.Column) {
  const file = await _package.files.readAsText('HELMCoreLibrary.json');
  const df = DG.DataFrame.fromJson(file);
  var m;
  for (var i = 0; i < df.rowCount; i++){
    m = {
      'id': df.get('symbol', i).toString(), 
      'n': df.get('name', i).toString(),
      'na': df.get('naturalAnalog', i).toString(),
      'type': df.get('polymerType', i).toString(),
      'mt': df.get('monomerType', i).toString(), 
      'm': df.get('molfile', i).toString(), 
      rs: Object.keys(getRS(df.get('smiles', i).toString())).length,
      at: getRS(df.get('smiles', i).toString()),
    }
    org.helm.webeditor.Monomers.addOneMonomer(m);
  }
}

//name: helmColumnToSmiles
//input: column helmColumn {semType: Macromolecule}
export function helmColumnToSmiles(helmColumn: DG.Column) {
  //todo: add column with smiles to col.dataFrame.
}

//name: findMonomers
//input: string helmString { semType: Macromolecule }
export async function findMonomers(helmString: string) {
  const types = Object.keys(org.helm.webeditor.monomerTypeList());
  const monomers = [];
  const monomer_names = [];
  for (var i = 0; i < types.length; i++) {
    monomers.push(new scil.helm.Monomers.getMonomerSet(types[i]));
    Object.keys(monomers[i]).forEach(k => {
      monomer_names.push(monomers[i][k].id);
    });
  }
  const split_string = helmString.match(/[^\s.,\/\\(){}$]+/gim);
  return new Set(split_string.filter(val => !monomer_names.includes(val)));
}

class HelmCellRenderer extends DG.GridCellRenderer {

  get name() { return 'macromolecule'; }
  get cellType() { return 'macromolecule'; }
  get defaultWidth(): number | null { return 400; }
  get defaultHeight(): number | null { return 100; }

  render(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gridCell: DG.GridCell, cellStyle: DG.GridCellStyle) {
    let host = ui.div([], { style: { width: `${w}px`, height: `${h}px`}});
    host.setAttribute('dataformat', 'helm');
    host.setAttribute('data', gridCell.cell.value);

    gridCell.element = host;
    var canvas = new JSDraw2.Editor(host, { width: w, height: h, skin: "w8", viewonly: true });
    var formula = canvas.getFormula(true);
    var molWeight = Math.round(canvas.getMolWeight() * 100) / 100;
    var coef = Math.round(canvas.getExtinctionCoefficient(true) * 100) / 100;
    var molfile = canvas.getMolfile();
    var result = formula + ', ' + molWeight + ', ' + coef + ', ' + molfile;
    lru.set(gridCell.cell.value, result);
  }
}
