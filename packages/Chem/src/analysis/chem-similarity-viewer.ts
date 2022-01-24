import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {Property} from 'datagrok-api/dg';
import * as chemSearches from '../chem-searches';
import {similarityMetric} from '@datagrok-libraries/utils/src/similarity-metrics';
import $ from 'cash-dom';
import {Fingerprint} from "../utils/chem-common";
import {chem} from "datagrok-api/grok";
import Sketcher = chem.Sketcher;

export class ChemSimilarityViewer extends DG.JsViewer {
  moleculeColumnName: string;
  initialized: boolean;
  isEditedFromSketcher: boolean = false;
  hotSearch: boolean;
  sketchButton: HTMLButtonElement;
  sketchedMolecule: string = "";
  distanceMetric: string;
  curIdx: number;
  molCol: DG.Column;
  idxs: DG.Column;
  scores: DG.Column;
  limit: number;
  minScore: number;
  fingerprint: string;
  gridSelect: boolean = false;

  get targetMolecule(): string {
    return this.isEditedFromSketcher
      ? this.sketchedMolecule
      : this.dataFrame?.getCol(this.moleculeColumnName).get(this.curIdx)
  }

  constructor() {
    super();

    this.moleculeColumnName = this.string('moleculeColumnName');
    this.limit = this.int('limit', 10);
    this.minScore = this.float('minScore', 0.1);
    this.distanceMetric = this.string('distanceMetric', 'Tanimoto', {choices: Object.keys(similarityMetric)});
    this.fingerprint = this.string('fingerprint', 'Morgan', {choices: ['Morgan', 'RDKit', 'Pattern']});
    this.hotSearch = this.bool('hotSearch', true);
    this.initialized = false;
    this.sketchButton = ui.button('Sketch', () => {
      this.isEditedFromSketcher = true;
      const sketcher = new Sketcher();
      sketcher.setMolecule(this.targetMolecule);
      const dialog = ui.dialog()
        .add(sketcher.root)
        .onOK(() => {
            this.sketchedMolecule = sketcher.getMolFile();
            this.render();
          })
        .show();
    });
    this.sketchButton.id = 'reference';
    this.curIdx = 0;
    this.molCol = DG.Column.fromList('string', 'foo', ['foo', 'boo']);
    this.idxs = DG.Column.fromList('string', 'foo', ['foo', 'boo']);
    this.scores = DG.Column.fromList('string', 'foo', ['foo', 'boo']);
  }

  init(): void {
    this.initialized = true;
    this.isEditedFromSketcher = false;
    this.hotSearch = true;
  }

  async onTableAttached(): Promise<void> {
    this.init();

    if (this.dataFrame) {
      this.subs.push(DG.debounce(this.dataFrame.onMouseOverRowChanged, 50).subscribe(async (_) => await this.render()));
      this.subs.push(DG.debounce(this.dataFrame.onRowsRemoved, 50).subscribe(async (_) => await this.render()));
      this.subs.push(DG.debounce(this.dataFrame.onCurrentRowChanged, 50).subscribe(async (_) => await this.render()));
      this.subs.push(DG.debounce(this.dataFrame.selection.onChanged, 50).subscribe(async (_) => await this.render(false)));
      this.subs.push(DG.debounce(ui.onSizeChanged(this.root), 50).subscribe(async (_) => await this.render(false)));
      this.moleculeColumnName = this.dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE).name;
    }

    await this.render();
  }

  onPropertyChanged(property: Property): void {
    super.onPropertyChanged(property);
    if (!this.initialized)
      return;
    this.render();
  }

  async render(computeData = true): Promise<void> {
    if (!this.initialized)
      return;

    if (this.dataFrame) {
      this.curIdx = this.dataFrame.currentRowIdx;

      if (computeData && !this.gridSelect) {
        const df = await chemSimilaritySearch(this.dataFrame, this.dataFrame?.getCol(this.moleculeColumnName),
                   this.targetMolecule, this.distanceMetric, this.limit, this.minScore, this.fingerprint as Fingerprint);

        this.molCol = df.getCol('smiles');
        this.idxs = df.getCol('indexes');
        this.scores = df.getCol('score');
      }
      else if (this.gridSelect)
        this.gridSelect = false;

      if (this.root.hasChildNodes())
        this.root.removeChild(this.root.childNodes[0]);
      const panel = [];
      const grids = []; 
      let cnt = 0, cnt2 = 0;
      panel[cnt++] = ui.h1('Reference');
      panel[cnt++] = grok.chem.svgMol(this.targetMolecule, 200, 100);
      panel[cnt++] = this.sketchButton;
      for (let i = 0; i < this.molCol.length; ++i) {
        const mol = grok.chem.svgMol(this.molCol?.get(i), 200, 100);
        const text = ui.label(`${this.scores.get(i).toPrecision(2)}`);
        let grid = ui.div([mol, text], {style: {width: '200px', height: '120px', margin: '5px'}});
        let divClass = 'd4-flex-col';

        if (this.idxs.get(i) == this.curIdx) {
          divClass += ' d4-current';
          grid.style.backgroundColor = '#ddffd9';
        } 
        if (this.dataFrame.selection.get(this.idxs.get(i))) {
          divClass += ' d4-selected';
          if (divClass == 'd4-flex-col d4-selected')
            grid.style.backgroundColor = '#f8f8df';
          else 
            grid.style.backgroundColor = '#d3f8bd';
        }

        $(grid).addClass(divClass);
        grid.addEventListener('click', (event: MouseEvent) => {
          if (this.dataFrame) {
            if (event.shiftKey || event.altKey) {
              this.dataFrame.selection.set(this.idxs.get(i), true);
            } else if (event.metaKey) {
              let selected = this.dataFrame.selection;
              this.dataFrame.selection.set(this.idxs.get(i), !selected.get(this.idxs.get(i)));
            } else {
              this.dataFrame.currentRowIdx = this.idxs.get(i);
              this.isEditedFromSketcher = false;
              this.gridSelect = true;
            }
          }
        });
        grids[cnt2++] = grid;
      }
      panel[cnt++] = ui.div(grids, {classes: 'd4-flex-wrap'});
      this.root.appendChild(ui.div(panel, {style: {margin: '5px'}}));
    }
  }
}

export async function chemSimilaritySearch(
  table: DG.DataFrame,
  smiles: DG.Column,
  molecule: string,
  metricName: string,
  limit: number,
  minScore: number,
  fingerprint: Fingerprint
) {
  limit = Math.min(limit, smiles.length);
  const targetFingerprint = chemSearches.chemGetFingerprint(molecule, fingerprint);
  const fingerprintCol = await chemSearches.chemGetFingerprints(smiles, fingerprint);
  const distances: number[] = [];

  let fpSim = similarityMetric[metricName];
  for (let row = 0; row < fingerprintCol.length; row++) {
    const fp = fingerprintCol[row];
    distances[row] = fp == null ? 100.0 : fpSim(targetFingerprint, fp);
  }

  function range(end: number) {
    return Array(end).fill(0).map((_, idx) => idx);
  }

  function compare(i1: number, i2: number) {
    if (distances[i1] > distances[i2])
      return -1;

    if (distances[i1] < distances[i2])
      return 1;

    return 0;
  }

  const indexes = range(table.rowCount)
    .filter((idx) => fingerprintCol[idx] != null)
    .sort(compare);
  const molsList = [];
  const scoresList = [];
  const molsIdxs = [];

  for (let n = 0; n < limit; n++) {
    const idx = indexes[n];
    const score = distances[idx];
    if (score < minScore)
      break;

    molsIdxs[n] = idx;
    molsList[n] = smiles.get(idx);
    scoresList[n] = score;
  }
  const mols = DG.Column.fromList(DG.COLUMN_TYPE.STRING, 'smiles', molsList);
  mols.semType = DG.SEMTYPE.MOLECULE;
  const scores = DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'score', scoresList);
  const newIndexes = DG.Column.fromList(DG.COLUMN_TYPE.INT, 'indexes', molsIdxs);
  return DG.DataFrame.fromColumns([mols, scores, newIndexes]);
}
