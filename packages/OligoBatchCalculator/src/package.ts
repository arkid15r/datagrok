/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export let _package = new DG.Package();

//name: Oligo Batch Calculator
//input: string sequence
//input: double amount
//input: string outputUnits {choices: ['NMole', 'Milligrams', 'Micrograms', 'Optical Density']}
//output: double opticalDensity
//output: double nMole
//output: double molecularMass
//output: double molecularWeight
//output: double extinctionCoefficient
export function OligoBatchCalculator(sequence: string, amount: number, outputUnits: string) {
  return {
    opticalDensity: od(sequence, amount, outputUnits),
    nMole: nMole(sequence, amount, outputUnits),
    molecularMass: molecularMass(sequence, amount, outputUnits),
    molecularWeight: molecularWeight(sequence),
    extinctionCoefficient: extinctionCoefficient(sequence)
  }
}

//name: opticalDensity
//input: string sequence
//input: double amount
//input: string outputUnits {choices: ['NMole', 'Milligrams', 'Micrograms']}
//output: double opticalDensity
export function od(sequence: string, amount: number, outputUnits: string) {
  if (outputUnits == 'Milligrams' || outputUnits == 'Micrograms') {
    const coefficient = outputUnits == 'Milligrams' ? 1 : 0.001;
    return coefficient * amount * extinctionCoefficient(sequence) / molecularWeight(sequence);
  }
  let coefficient = (outputUnits == 'Milligrams') ? 1 : 1000;
  if (outputUnits == 'NMole') coefficient = 1000000;
  return amount * extinctionCoefficient(sequence) / coefficient;
}

//name: nMole
//input: string sequence
//input: double amount
//input: string outputUnits {choices: ['Optical Density', 'Milligrams', 'Micrograms']}
//output: double nMole
export function nMole(sequence: string, amount: number, outputUnits: string): number {
  return (outputUnits == 'Optical Density') ? amount * 1000000 / extinctionCoefficient(sequence) : amount * 1000 / molecularWeight(sequence);
}

//name: molecularMass
//input: string sequence
//input: double amount
//input: string outputUnits {choices: ['Optical Density', 'Milligrams', 'Micromoles', 'Millimoles']}
//output: double molecularMass
export function molecularMass(sequence: string, amount: number, outputUnits: string): number {
  if (outputUnits == 'Optical Density')
    return 1000 * amount / extinctionCoefficient(sequence) * molecularWeight(sequence);
  const coefficient = (outputUnits == 'Milligrams' || outputUnits == 'Micromoles') ? 1 : 1000;
  return amount / extinctionCoefficient(sequence) * molecularWeight(sequence) * coefficient * od(sequence, amount, outputUnits) / nMole(sequence, amount, outputUnits);
}

//name: molecularWeight
//input: string sequence
//output: double molecularWeight
export function molecularWeight(sequence: string): number {
  const weights: {[index: string]: number} = {
    "ps":	16.07, "s": 16.07,
    "fA":	331.2, "fU": 308.16, "fC": 307.18, "fG": 347.19,
    "mA":	343.24, "mU":	320.2, "mC": 319.21, "mG": 359.24,
    "A": 313.21, "U": 306.17, "C": 289.18, "G": 329.21, "T": 304.2,
    "dA": 313.21, "dU": 306.17, "dC": 289.18, "dG": 329.21, "dT": 304.2,
    "rA": 329.21, "rU": 306.17, "rC": 305.18, "rG": 345.21,
    "Af": 331.2, "Uf": 308.16, "Gf": 347.19, "Cf": 307.18,
    "u": 320.2, "a": 343.24, "c": 319.21, "g": 359.24
  };
  const recognizableSymbols = Object.keys(weights);
  let molecularWeight = 0;
  for (let i = 0; i < sequence.length; i++)
    if (recognizableSymbols.includes(sequence.slice(i, i + 2)))
      molecularWeight += weights[sequence.slice(i, i + 2)];
    else if (recognizableSymbols.includes(sequence.slice(i, i + 1)))
      molecularWeight += weights[sequence.slice(i, i + 1)];
  return (sequence.length > 0) ? molecularWeight - 61.97 : 0;
}

//name: extinctionCoefficient
//input: string sequence
//output: double ec
export function extinctionCoefficient(sequence: string) {
  sequence = !(sequence[0] == 'r' || sequence[0] == 'd') ? normalizeSequences([sequence])[0] : sequence;
  const individualBases: {[index: string]: number} = {
    'dA': 15400, 'dC': 7400, 'dG': 11500, 'dT': 8700,
    'rA': 15400, 'rC': 7200, 'rG': 11500, 'rU': 9900
    },
    nearestNeighbour: any = {
      'dA': {'dA': 27400, 'dC': 21200, 'dG': 25000, 'dT': 22800},
      'dC': {'dA': 21200, 'dC': 14600, 'dG': 18000, 'dT': 15200},
      'dG': {'dA': 25200, 'dC': 17600, 'dG': 21600, 'dT': 20000},
      'dT': {'dA': 23400, 'dC': 16200, 'dG': 19000, 'dT': 16800},
      'rA': {'rA': 27400, 'rC': 21000, 'rG': 25000, 'rU': 24000},
      'rC': {'rA': 21000, 'rC': 14200, 'rG': 17800, 'rU': 16200},
      'rG': {'rA': 25200, 'rC': 17400, 'rG': 21600, 'rU': 21200},
      'rU': {'rA': 24600, 'rC': 17200, 'rG': 20000, 'rU': 19600}
    };
  let ec1 = 0, ec2 = 0;
  for (let i = 0; i < sequence.length - 2; i += 2)
    if (sequence[i] == sequence[i + 2])
      ec1 += nearestNeighbour[sequence.slice(i, i + 2)][sequence.slice(i + 2, i + 4)];
    else
      ec1 += (
        nearestNeighbour['r' + ((sequence[i + 1] == 'T') ? 'U' : sequence[i + 1])]['r' + ((sequence[i + 3] == 'T') ? 'U' : sequence[i + 3])]
        +
        nearestNeighbour['d' + ((sequence[i + 1] == 'U') ? 'T' : sequence[i + 1])]['d' + ((sequence[i + 3] == 'U') ? 'T' : sequence[i + 3])]
      ) / 2;
  for (let i = 2; i < sequence.length - 2; i += 2)
    ec2 += individualBases[sequence.slice(i, i + 2)];
  return ec1 - ec2;
}

function calculateNMole(molecularWeights: number[], extinctionCoefficients: number[], amount: number, units: string): number[] {
  let nmoles = Array(molecularWeights.length);
  if (units == 'nmole' || units == 'µmole') return nmoles.fill(amount);
  if (units == 'OD') {
    for (let i = 0; i < molecularWeights.length; i++)
      nmoles[i] = amount * 1000000 / extinctionCoefficients[i];
    return (molecularWeights[0] > 0) ? nmoles : Array(molecularWeights.length).fill(0);
  }
  for (let i = 0; i < molecularWeights.length; i++)
    nmoles[i] = amount * 1000 / molecularWeights[i];
  return (molecularWeights[0] > 0) ? nmoles : Array(molecularWeights.length).fill(0);
}

function calculateMass(extinctionCoefficients: number[], molecularWeights: number[], nmoles: number[], od260: number[], amount: number, units: string) {
  let mass = Array(molecularWeights.length);
  if (units == 'mg' || units == 'µg') return mass.fill(amount);
  if (units == 'OD') {
    for (let i = 0; i < molecularWeights.length; i++)
      mass[i] = 1000 * amount / extinctionCoefficients[i] * molecularWeights[i];
    return (molecularWeights[0] > 0) ? mass : Array(molecularWeights.length).fill(0);
  }
  const coefficient = (units == 'mg' || units == 'µmole') ? 1 : 1000;
  for (let i = 0; i < extinctionCoefficients.length; i++)
    mass[i] = amount / extinctionCoefficients[i] * molecularWeights[i] * coefficient * od260[i] / nmoles[i];
  return mass;
}

function opticalDensity(extinctionCoefficients: number[], molecularWeights: number[], nmoles: number[], amount: number, units: string) {
  let od = Array(molecularWeights.length);
  if (units == 'OD') return od.fill(amount);
  if (units == 'mg' || units == 'µg') {
    const coefficient = units == 'mg' ? 1 : 0.001;
    for (let i = 0; i < extinctionCoefficients.length; i++)
      od[i] = coefficient * amount * extinctionCoefficients[i] / molecularWeights[i];
    return od;
  }
  let coefficient = (units == 'mg') ? 1 : 1000;
  if (units == 'nmole') coefficient = 1000000;
  for (let i = 0; i < extinctionCoefficients.length; i++)
    od[i] = amount * extinctionCoefficients[i] / coefficient;
  return od;
}

function normalizeSequences(sequences: string[]): string[] {
  let normalizedSequences = Array(sequences.length);
  for (let i = 0; i < sequences.length; i++) {
    const isRna = /^[AUGC]+$/.test(sequences[i]);
    const isDna = /^[ATGC]+$/.test(sequences[i]);
    const inSiRnaAxolabs = /^[fAUGCuacgs]+$/.test(sequences[i]);
    const obj: {[index: string]: string} = isRna ?
      {"A": "rA", "U": "rU", "G": "rG", "C": "rC"} :
      isDna ?
        {"A": "dA", "T": "dT", "G": "dG", "C": "dC"} :
      inSiRnaAxolabs ?
        {"Af": "rA", "Uf": "rU", "Gf": "rG", "Cf": "rC", "u": "rU", "a": "rA", "c": "rC", "g": "rG", "s": ""} :
        {"U": "rU", "A": "rA", "C": "rC", "G": "rG", "fU": "rU", "fA": "rA", "fC": "rC", "fG": "rG", "mU": "rU", "mA": "rA", "mC": "rC", "mG": "rG", "ps": ""};
    normalizedSequences[i] = isRna ?
      sequences[i].replace(/[AUGC]/g, function (x) {return obj[x]}) :
      isDna ?
        sequences[i].replace(/[ATGC]/g, function (x) {return obj[x]}) :
      inSiRnaAxolabs ?
        sequences[i].replace(/(Uf|Af|Cf|Gf|u|a|c|g|s)/g, function (x) {return obj[x]}) :
        sequences[i].replace(/(fU|fA|fC|fG|mU|mA|mC|mG|ps|A|U|G|C)/g, function (x) {return obj[x]});
  }
  return normalizedSequences;
}

function prepareInputTextField(text: string) {
  const oneDigitSymbols = ["A", "U", "T", "C", "G", "u", "a", "c", "g", "s"],
    twoDigitSymbols = ["fA", "fU", "fC", "fG", "mA", "mU", "mC", "mG", "dA", "dU", "dC", "dG", "dT", "rA", "rU", "rC", "rG", "ps",
      "Uf", "Af", "Cf", "Gf"],
    firstLettersInTwoDigitSymbols = ["m", "f", "p", "d", "r", "U", "A", "C", "G"];

  let dirtySequences = text.split('\n').map((s) => s.replace(/\s/g, '')).filter(item => item);

  let indicesOfWrongSymbols: number[][] = [];
  let cleanSequences: string[] = [];
  let c = 0;
  //todo: detect errors when code table contains one-char and two-chars codes
  for (let sequence of dirtySequences) {
    let arr: number[] = [];
    let i = 0;
    cleanSequences[indicesOfWrongSymbols.length] = '';
    while (i < sequence.length) {
      if (twoDigitSymbols.includes(sequence.slice(i, i + 2))) {
        cleanSequences[indicesOfWrongSymbols.length] += sequence.slice(i, i + 2);
        i += 2;
      } else if (oneDigitSymbols.includes(sequence[i])) {
        cleanSequences[indicesOfWrongSymbols.length] += sequence[i];
        i++;
      } else {
        while (i < sequence.length && !(oneDigitSymbols.includes(sequence[i]) || twoDigitSymbols.includes(sequence.slice(i, i + 2)))) {
          arr.push(i);
          i++;
        }
        if (arr.length > 0 && firstLettersInTwoDigitSymbols.includes(dirtySequences[c][arr[0]]) && !firstLettersInTwoDigitSymbols.includes(dirtySequences[c][arr[0] + 1]))
          cleanSequences[indicesOfWrongSymbols.length] += dirtySequences[c][arr[0]];
      }
    }
    indicesOfWrongSymbols[indicesOfWrongSymbols.length] = (arr.length > 0 && firstLettersInTwoDigitSymbols.includes(dirtySequences[c][arr[0]]) && !firstLettersInTwoDigitSymbols.includes(dirtySequences[c][arr[0] + 1])) ? arr.slice(1) : arr;
    c++;
  }
  return {cleanSequences: cleanSequences, dirtySequences: dirtySequences, indicesOfWrongSymbols: indicesOfWrongSymbols};
}

//name: Oligo Batch Calculator
//tags: app
export function OligoBatchCalculatorApp() {

  const defaultInput = 'fAmCmGmAmCpsmU\nmApsmApsfGmAmUmCfGfAfC\nmAmUfGmGmUmCmAfAmGmA';

  function updateTable(text: string) {
    let {cleanSequences, dirtySequences, indicesOfWrongSymbols} = prepareInputTextField(text);
    let normalizedSequences = normalizeSequences(cleanSequences);
    tableDiv.innerHTML = '';
    removeUnrecognizedSymbolsButtonDiv.innerHTML = '';

    let molecularWeights = cleanSequences.map((s) => molecularWeight(s));
    let extinctionCoefficients = normalizedSequences.map((s) => extinctionCoefficient(s));
    let nMole = calculateNMole(molecularWeights, extinctionCoefficients, yieldAmount.value, units.value);
    let od260 = opticalDensity(extinctionCoefficients, molecularWeights, nMole, yieldAmount.value, units.value);
    let mass = calculateMass(extinctionCoefficients, molecularWeights, nMole, od260, yieldAmount.value, units.value);

    let moleName1 = (units.value == 'µmole' || units.value == 'mg') ? 'µmole' : 'nmole';
    let moleName2 = (units.value == 'µmole') ? 'µmole' : 'nmole';
    let massName = (units.value == 'µmole') ? 'mg' : (units.value == 'mg') ? units.value : 'µg';
    const coefficient = (units.value == 'mg' || units.value == 'µmole') ? 1000 : 1;

    table = DG.DataFrame.fromColumns([
      DG.Column.fromList('int', 'Item', Array(...Array(cleanSequences.length + 1).keys()).slice(1)),
      DG.Column.fromList('string', 'Sequence', dirtySequences),
      DG.Column.fromList('int', 'Length', normalizedSequences.map((s) => s.length / 2)),
      DG.Column.fromList('double', 'OD 260', od260),
      DG.Column.fromList('double', moleName1, nMole),
      DG.Column.fromList('double', 'Mass (' + massName + ')', mass),
      DG.Column.fromList('double', moleName2 + '/OD', nMole.map(function(n, i) {return coefficient * n / od260[i]})),
      DG.Column.fromList('double', 'µg/OD', mass.map(function(n, i) {return coefficient * n / od260[i]})),
      DG.Column.fromList('double', 'MW', molecularWeights),
      DG.Column.fromList('int', 'Ext. Coefficient', extinctionCoefficients)
    ]);

    let grid = DG.Viewer.grid(table);
    let col = grid.columns.byName('Sequence');
    col!.cellType = 'html';

    grid.onCellPrepare(function (gc) {
      if (gc.isTableCell && gc.gridColumn.name == 'Sequence') {
        let arr = ui.divH([], {style: {margin: '6px 0 0 6px'}});
        for (let i = 0; i < gc.cell.value.length; i++) {
          if (indicesOfWrongSymbols[gc.gridRow].includes(i)) {
            arr.append(ui.divText(gc.cell.value[i], {style: {color: "red"}}));
          } else {
            arr.append(ui.divText(gc.cell.value[i], {style: {color: "grey"}}));
          }
        }
        gc.style.element = arr;
      }
    });
    tableDiv.append(grid.root);
    if (indicesOfWrongSymbols.some((e) => e.length > 0))
      removeUnrecognizedSymbolsButtonDiv.append(
        ui.button('REMOVE ERRORS', () => {
          inputSequenceField.value = cleanSequences.join('\n');
          updateTable(cleanSequences.join('\n'));
        })
      );
  }

  let windows = grok.shell.windows;
  windows.showProperties = false;
  windows.showToolbox = false;
  windows.showHelp = false;

  let text2 = ui.divText('Search Modifications');

  let yieldAmount = ui.floatInput('', 1, () => updateTable(inputSequenceField.value));
  let enter2 = ui.stringInput('', '');
  let units = ui.choiceInput('', 'OD', ['OD', 'µg', 'mg', 'µmole', 'nmole'], () => {
    updateTable(inputSequenceField.value);
  });
  let analyzeAsSingleStrand = ui.button('Analyze As Single Strand', () => grok.shell.info('Coming soon'));
  let analyzeAsDuplexStrand = ui.button('Analyze As Duplex Strand', () => grok.shell.info('Coming soon'));
  let clearSequences = ui.button('CLEAR', () => inputSequenceField.value = '');
  let addModifications = ui.button('Add Modifications', () => grok.shell.info('Coming soon'));
  let threeMod = ui.boolInput("3' MOD", false);
  let internal = ui.boolInput('INTERNAL', false);
  let fiveMod = ui.boolInput("5' MOD", false);
  let table = DG.DataFrame.create();
  let inputSequenceField = ui.textInput("", defaultInput, async (txt: string) => updateTable(txt));

  let tableDiv = ui.box();
  let removeUnrecognizedSymbolsButtonDiv = ui.div();
  updateTable(defaultInput);

  let saveAsButton = ui.bigButton('SAVE AS CSV', () => {
    let csvContent = table.toCsv();
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", "data:text/csv;charset=utf-8,\uFEFF" + encodedUri);
    link.setAttribute("download", "Oligo Properties.csv");
    link.click();
  });

  let title = ui.panel([ui.h1('Oligo Properties')], 'ui-panel ui-box');
  title.style.maxHeight = '45px';
  $(title).children('h1').css('margin', '0px');

  let view = grok.shell.newView('Oligo Batch Calculator', [
    ui.splitV([
      ui.box(
        ui.panel([
          ui.h1('Yield Amount & Units'),
          ui.divH([
            yieldAmount.root,
            units.root
          ]),
          ui.h1('Input Sequences'),
          ui.div([
            inputSequenceField.root
          ],'inputSequence'),
          clearSequences,
        ]), {style:{maxHeight:'245px'}}
      ),
      ui.splitV([
        title,
        ui.panel([tableDiv], 'ui-box')
      ]),
      ui.box(
        ui.panel([
          ui.divH([
            saveAsButton,
            removeUnrecognizedSymbolsButtonDiv
          ])
        ]), {style:{maxHeight:'60px'}}
      ),
    ])
  ]);
  view.box = true;

  $('.inputSequence textarea')
    .css('resize','none')
    .css('min-height','50px')
    .css('width','100%')
    .css('font-family','monospace');
}