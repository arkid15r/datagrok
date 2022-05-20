import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {chemSpace} from './chem-space';
import * as chemSearches from '../chem-searches';
import {getSimilarityFromDistance} from '@datagrok-libraries/utils/src/similarity-metrics';
import {findMCS} from '../scripts-api';
import {drawMoleculeToCanvas} from '../utils/chem-common-rdkit';

const options = {
  'SPE': {cycles: 2000, lambda: 1.0, dlambda: 0.0005},
};

interface ILine {
  id: number;
  mols: number[];
  selected: boolean;
  a: number[];   // [x, y]
  b: number[];   // [x, y]
}

interface IRenderedLines {
  lines: ILine[];
  linesDf: DG.DataFrame;
}

// Searches for activity cliffs in a chemical dataset by selected cutoff
export async function getActivityCliffs(df: DG.DataFrame, smiles: DG.Column,
      activities: DG.Column, similarity: number, methodName: string) : Promise<void> {
  const automaticSimilarityLimit = false;
  const MIN_SIMILARITY = 80;

  const initialSimilarityLimit = automaticSimilarityLimit ? MIN_SIMILARITY : similarity / 100;
  const axes = ['Embed_X', 'Embed_Y'];
  const colNameInd = df.columns.names().filter((it) => it.includes(axes[0])).length + 1;

  const {distance, coordinates} = await chemSpace(smiles, methodName, 'Tanimoto',
    axes.map((it) => `${it}_${colNameInd}`), (options as any)[methodName], true);

  for (const col of coordinates)
    df.columns.add(col);

  const dfSmiles = DG.DataFrame.fromColumns([DG.Column.fromList('string', 'smiles', smiles.toList())]);
  const dim = smiles.length;
  const simArr: DG.Column[] = Array(dim - 1);

  if (!distance)
    await getSimilaritiesMarix(dim, smiles, dfSmiles, simArr);
  else
    getSimilaritiesMarixFromDistances(dim, distance, simArr);

  const optSimilarityLimit = initialSimilarityLimit;

  const simVals: number[] = [];
  //const diffVals: number[] = [];
  const saliVals: number[] = [];
  const n1: number[] = [];
  const n2: number[] = [];

  for (let i = 0; i != dim - 1; ++i) {
    for (let j = 0; j != dim - 1 - i; ++j) {
      const sim: number = simArr[i].get(j);

      if (sim >= optSimilarityLimit) {
        n1.push(i);
        n2.push(i + j + 1);
        simVals.push(sim);
        const diff = Math.abs(activities.get(i) - activities.get(i + j + 1));
        //diffVals.push(diff);
        if (sim != 1)
          saliVals.push(diff / (1 - sim));
        else
          saliVals.push(Infinity);
      }
    }
  }

  const neighboursCount = new Array(dim).fill(0);
  const similarityCount = new Array(dim).fill(0);
  const saliCount = new Array(dim).fill(0);

  for (let i = 0; i != n1.length; ++i) {
    neighboursCount[n1[i]] += 1;
    neighboursCount[n2[i]] += 1;
    similarityCount[n1[i]] += simVals[i];
    similarityCount[n2[i]] += simVals[i];
    if (saliVals[i] != Infinity) {
      if (activities.get(n1[i]) > activities.get(n2[i]))
        saliCount[n1[i]] += saliVals[i];
      else
        saliCount[n2[i]] += saliVals[i];
    }
  }

  const sali = DG.Column.fromList('double', `sali_${colNameInd}`, saliCount);

  df.columns.add(sali);

  const view = grok.shell.getTableView(df.name);
  const sp = view.addViewer(DG.Viewer.scatterPlot(df, {
    xColumnName: `${axes[0]}_${colNameInd}`,
    yColumnName: `${axes[1]}_${colNameInd}`,
    size: sali.name,
    color: activities.name,
    showXSelector: false,
    showYSelector: false,
    showSizeSelector: false,
    showColorSelector: false,
    markerMinSize: 5,
    markerMaxSize: 25,
  })) as DG.ScatterPlotViewer;

  const listCliffs = ui.button('List cliffs', () => {
    ui.dialog({title: 'Activity cliffs'})
      .add(ui.div(linesDf.plot.grid().root))
      .show();
  });
  listCliffs.style.position = 'absolute';
  listCliffs.style.top = '10px';
  listCliffs.style.right = '10px';
  view.root.append(ui.div(listCliffs));

  const canvas = (sp.getInfo() as any)['canvas'];
  let lines: ILine[] = [];
  let linesDf: DG.DataFrame;
  const tooltips: any = {};

  let timer: NodeJS.Timeout;
  canvas.addEventListener('mousemove', function(event : MouseEvent) {
    clearTimeout(timer);
    timer = global.setTimeout(function() {
      const line = checkCursorOnLine(event, canvas, lines);
      if (line && df.mouseOverRowIdx === -1) {
        if (!tooltips[line.id]) {
          tooltips[line.id] = ui.divText('Loading...');
          const mcsDf = DG.DataFrame.create(2);
          mcsDf.columns.addNewString('smiles').init((i) => df.get(smiles.name, line.mols[i]));
          findMCS('smiles', mcsDf, true).then((mcs) => {
            tooltips[line.id] = ui.divH([]);
            const columnNames = ui.divV([
              ui.divText('smiles'),
              ui.divText(activities.name),
            ]);
            columnNames.style.fontWeight = 'bold';
            columnNames.style.display = 'flex';
            columnNames.style.justifyContent = 'space-between';
            tooltips[line.id].append(columnNames);
            line.mols.forEach((mol: any) => {
              const imageHost = ui.canvas(200, 100);
              drawMoleculeToCanvas(0, 0, 200, 100, imageHost, df.get('smiles', mol), mcs);
              const activity = ui.divText(df.get(activities.name, mol).toFixed(2));
              activity.style.display = 'flex';
              activity.style.justifyContent = 'left';
              activity.style.paddingLeft = '30px';
              tooltips[line.id].append(ui.divV([
                imageHost,
                activity,
              ]));
            });
            ui.tooltip.show(tooltips[line.id], event.clientX, event.clientY);
          });
        }
        ui.tooltip.show(tooltips[line.id], event.clientX, event.clientY);
      }
    }, 1000);
  });

  canvas.addEventListener('mousedown', function(event: MouseEvent) {
    const line = checkCursorOnLine(event, canvas, lines);
    if (line && df.mouseOverRowIdx === -1) {
      if (event.ctrlKey) {
        line.selected = !line.selected;
        linesDf.selection.set(line.id, line.selected);

        if (!line.selected)
          line.mols.forEach((m) => df.selection.set(m, false));

        lines.forEach((l) => {
          if (l.selected)
            l.mols.forEach((m) => df.selection.set(m, true));
        });
      }
      else {
        if (linesDf.currentRowIdx !== line.id) {
          linesDf.currentRowIdx = line.id;
          df.currentRowIdx = line.mols[0];
          df.selection.set(0, !lines[0].selected);
          df.selection.set(0, lines[0].selected);
        }
      }
    }
  });

  sp.onEvent('d4-before-draw-scene')
    .subscribe((_) => {
      const renderRes = renderLines(sp, n1, n2,
        `${axes[0]}_${colNameInd}`, `${axes[1]}_${colNameInd}`, lines, linesDf, smiles, activities);
      lines = renderRes.lines;
      linesDf = renderRes.linesDf;
    });

  sp.addProperty('similarityLimit', 'double', optSimilarityLimit);
}

function checkCursorOnLine(event: any, canvas: any, lines: ILine[]): ILine | null {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  for (const line of lines) {
    const dist =
      Math.abs(Math.hypot(line.a[0] - x, line.a[1] - y) +
      Math.hypot(line.b[0] - x, line.b[1] - y) - Math.hypot(line.a[0] - line.b[0], line.a[1] - line.b[1]));
    if (dist < 2)
      return line;
  }
  return null;
}

function renderLines(sp: DG.ScatterPlotViewer, n1: number[],
      n2: number[], xAxis: string, yAxis: string, lines: ILine[], linesDf: DG.DataFrame,
      smiles: DG.Column, activities: DG.Column): IRenderedLines {
  const canvas = sp.getInfo()['canvas'];
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const x = sp.dataFrame!.columns.byName(xAxis);
  const y = sp.dataFrame!.columns.byName(yAxis);
  if (!lines.length) {
    linesDf = createLines(sp, n1, n2, lines, linesDf, smiles, activities);
    linesDf.onCurrentRowChanged.subscribe(() => {
      sp.dataFrame.currentRowIdx = linesDf.currentRowIdx !== -1 ? lines[linesDf.currentRowIdx].mols[0] : -1;
      sp.dataFrame.selection.set(0, !lines[0].selected);
      sp.dataFrame.selection.set(0, lines[0].selected);
    });
    linesDf.onSelectionChanged.subscribe((_) => {
      const line = lines[linesDf.mouseOverRowIdx];
      line.selected = !line.selected;
      lines.forEach((l) => {
        if (l.selected)
          l.mols.forEach((m) => sp.dataFrame.selection.set(m, true));
      });
    });
  }
  for (let i = 0; i < lines.length; i++) {
    const pointFrom = sp.worldToScreen(x.get(lines[i].mols[0]), y.get(lines[i].mols[0]));
    const pointTo = sp.worldToScreen(x.get(lines[i].mols[1]), y.get(lines[i].mols[1]));
    lines[i].a = [pointFrom.x, pointFrom.y];
    lines[i].b = [pointTo.x, pointTo.y];
    const line = new Path2D();
    line.moveTo(lines[i].a[0], lines[i].a[1]);
    ctx.strokeStyle = lines[i].id === linesDf.currentRowIdx ? 'red' : lines[i].selected ? 'yellow' : 'green';
    ctx.lineWidth = 1;
    line.lineTo(lines[i].b[0], lines[i].b[1]);
    ctx.stroke(line);
  }
  return { lines: lines, linesDf: linesDf };
}


function createLines(sp: DG.Viewer, n1: number[], n2: number[], lines: ILine[],
                     linesDf: DG.DataFrame, smiles: DG.Column, activities: DG.Column) : DG.DataFrame {
  for (let i = 0; i < n1.length; i++) {
    const num1 = n1[i];
    const num2 = n2[i];
    lines.push({id: i, mols: [num1, num2], selected: false, a: [], b: []});
  }
  linesDf = DG.DataFrame.create(lines.length);
  linesDf.columns.addNewString('1_smiles').init((i) => smiles.get(lines[i].mols[0]));
  linesDf.columns.addNewString('2_smiles').init((i) => smiles.get(lines[i].mols[1]));
  linesDf.columns.addNewFloat('act_diff')
    .init((i) => Math.abs(activities.get(lines[i].mols[0]) - activities.get(lines[i].mols[1])));
  linesDf.columns.addNewInt('line_index').init((i) => i);
  linesDf.col('1_smiles')!.tags[DG.TAGS.UNITS] = 'smiles';
  linesDf.col('2_smiles')!.tags[DG.TAGS.UNITS] = 'smiles';
  linesDf.col('1_smiles')!.semType = DG.SEMTYPE.MOLECULE;
  linesDf.col('2_smiles')!.semType = DG.SEMTYPE.MOLECULE;
  return linesDf;
}

async function getSimilaritiesMarix(dim: number, smiles: DG.Column, dfSmiles: DG.DataFrame, simArr: DG.Column[])
  : Promise<DG.Column[]> {
  for (let i = 0; i != dim - 1; ++i) {
    const mol = smiles.get(i);
    dfSmiles.rows.removeAt(0, 1, false);
    simArr[i] = (await chemSearches.chemGetSimilarities(dfSmiles.col('smiles')!, mol))!;
  }
  return simArr;
}

function getSimilaritiesMarixFromDistances(dim: number, distances: [], simArr: DG.Column[])
  : DG.Column[] {
  for (let i = 0; i < dim - 1; ++i) {
    const similarityArr = [];
    for (let j = i + 1; j < dim; ++j)
      similarityArr.push(getSimilarityFromDistance(distances[i][j]));
    simArr[i] = DG.Column.fromFloat32Array('similarity', Float32Array.from(similarityArr));
  }
  return simArr;
}
