import * as DG from 'datagrok-api/dg';
import * as rxjs from 'rxjs';
import * as ui from 'datagrok-api/ui';
import {MonomerLibrary} from '../monomer-library';
import {PeptidesController} from '../peptides';

import * as C from '../utils/constants';
import * as type from '../utils/types';

export function addViewerToHeader(grid: DG.Grid, barchart: StackedBarChart) {
  if (grid.temp['containsBarchart'])
    return;
  
  const compareBarParts = (bar1: type.BarChart.BarPart | null, bar2: type.BarChart.BarPart | null) =>
    bar1 && bar2 && bar1.aaName === bar2.aaName && bar1.colName === bar2.colName;

  const eventAction = (mouseMove: MouseEvent) => {
    const cell = grid.hitTest(mouseMove.offsetX, mouseMove.offsetY);
    if (cell?.isColHeader && cell.tableColumn?.semType == C.SEM_TYPES.AMINO_ACIDS) {
      const newBarPart = barchart.findAARandPosition(cell, mouseMove);
      const previousClickedBarPart = barchart._previousClickedBarPart;
      if (mouseMove.type === 'click' && compareBarParts(newBarPart, previousClickedBarPart))
        barchart.isSameBarClicked = true;
      else
        barchart.currentBarPart = newBarPart;
      barchart.requestAction(mouseMove);
      barchart.computeData();
    }
  };

  // The following events makes the barchart interactive
  rxjs.fromEvent<MouseEvent>(grid.overlay, 'mousemove').subscribe((mouseMove: MouseEvent) => eventAction(mouseMove));
  rxjs.fromEvent<MouseEvent>(grid.overlay, 'click').subscribe((mouseMove: MouseEvent) => eventAction(mouseMove));
  rxjs.fromEvent<MouseEvent>(grid.overlay, 'mouseout').subscribe(() => barchart.unhighlight());

  barchart.tableCanvas = grid.canvas;

  //Setting grid options
  grid.setOptions({'colHeaderHeight': 130});

  grid.onCellTooltip((cell, x, y) => {
    if (
      cell.tableColumn &&
      [C.SEM_TYPES.AMINO_ACIDS, C.SEM_TYPES.ALIGNED_SEQUENCE].includes(cell.tableColumn.semType as C.SEM_TYPES)
    ) {
      if (!cell.isColHeader) {
        const monomerLib = cell.cell.dataFrame.temp[MonomerLibrary.id];
        PeptidesController.chemPalette.showTooltip(cell, x, y, monomerLib);
      } else if (barchart.currentBarPart) {
        let elements: HTMLElement[] = [];
        elements = elements.concat([ui.divText(barchart.currentBarPart.aaName)]);
        ui.tooltip.show(ui.divV(elements), x, y);
      }
    }
    return true;
  });

  grid.onCellRender.subscribe((args) => {
    const context = args.g;
    const boundX = args.bounds.x;
    const boundY = args.bounds.y;
    const boundWidth = args.bounds.width;
    const boundHeight = args.bounds.height;
    const cell = args.cell;
    context.save();
    context.beginPath();
    context.rect(boundX, boundY, boundWidth, boundHeight);
    context.clip();

    if (cell.isColHeader && barchart.aminoColumnNames.includes(cell.gridColumn.name)) {
      barchart.renderBarToCanvas(context, cell, boundX, boundY, boundWidth, boundHeight);
      args.preventDefault();
    }
    context.restore();
  });

  grid.temp['containsBarchart'] = true;
  //FIXME: for some reason barchat didn't show when running analysis. This fixes it, but it's bad. Find a way to fix
  // the problem
  barchart.unhighlight();
}

export class StackedBarChart extends DG.JsViewer {
  dataEmptyAA: string;
  _currentBarPart: type.BarChart.BarPart | null = null;
  tableCanvas: HTMLCanvasElement | undefined;
  aminoColumnNames: string[] = [];
  ord: { [Key: string]: number; } = {};
  aminoColumnIndices: {[Key: string]: number} = {};
  aggregatedFilterTables: type.DataFrameDict = {};
  max = 0;
  barStats: {[Key: string]: type.BarChart.BarStatsObject[]} = {};
  selected: type.BarChart.BarPart[] = [];
  aggregatedSelectedTables: type.DataFrameDict = {};
  controller!: PeptidesController;
  isSameBarClicked: boolean = false;
  _previousClickedBarPart: type.BarChart.BarPart | null = null;

  constructor() {
    super();
    this.dataEmptyAA = this.string('dataEmptyAA', '-');
  }

  get currentBarPart() { return this._currentBarPart; }
  set currentBarPart(barPart: type.BarChart.BarPart | null) {
    this._currentBarPart = barPart;
    this.isSameBarClicked = false;
  }

  init() {
    const groups: {[key: string]: string[]} = {
      'yellow': ['C', 'U'],
      'red': ['G', 'P'],
      'all_green': ['A', 'V', 'I', 'L', 'M', 'F', 'Y', 'W'],
      'light_blue': ['R', 'H', 'K'],
      'dark_blue': ['D', 'E'],
      'orange': ['S', 'T', 'N', 'Q'],
    };
    let i = 0;

    for (const value of Object.values(groups)) {
      for (const obj of value)
        this.ord[obj] = i++;
    }

    this.aminoColumnNames = [];
  }

  // Stream subscriptions
  async onTableAttached() {
    this.init();
    this.controller = await PeptidesController.getInstance(this.dataFrame);
    this.controller.init(this.dataFrame);
    if (this.dataFrame) {
      this.subs.push(DG.debounce(this.dataFrame.selection.onChanged, 50).subscribe((_) => this.computeData()));
      this.subs.push(DG.debounce(this.dataFrame.filter.onChanged, 50).subscribe((_) => this.computeData()));
      this.subs.push(DG.debounce(this.dataFrame.onValuesChanged, 50).subscribe(() => this.computeData()));
    }
  }

  // Cancel subscriptions when the viewer is detached
  detach() {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  computeData() {
    this.aminoColumnNames = [];
    this.aminoColumnIndices = {};

    this.dataFrame!.columns.names().forEach((name: string) => {
      if (this.dataFrame!.getCol(name).semType === C.SEM_TYPES.AMINO_ACIDS &&
          !this.dataFrame!.getCol(name).categories.includes('COOH') &&
          !this.dataFrame!.getCol(name).categories.includes('NH2')) {
        this.aminoColumnIndices[name] = this.aminoColumnNames.length + 1;
        this.aminoColumnNames.push(name);
      }
    });

    this.aggregatedFilterTables = {};
    this.aggregatedSelectedTables = {};
    //TODO: optimize it, why store so many tables?
    this.aminoColumnNames.forEach((name) => {
      this.aggregatedFilterTables[name] = this.dataFrame!
        .groupBy([name])
        .whereRowMask(this.dataFrame!.filter)
        .add('count', name, `${name}_count`)
        .aggregate();

      this.aggregatedSelectedTables[name] = this.dataFrame!
        .groupBy([name])
        .whereRowMask(this.dataFrame!.selection)
        .add('count', name, `${name}_count`)
        .aggregate();
    });

    this.barStats = {};

    for (const [name, df] of Object.entries(this.aggregatedFilterTables)) {
      const colData: {'name': string, 'count': number, 'selectedCount': number}[] = [];
      const aminoCol = df.getCol(name);
      const aminoCountCol = df.getCol(`${name}_count`);
      this.barStats[name] = colData;

      for (let i = 0; i < df.rowCount; i++) {
        const amino = aminoCol.get(i);
        const aminoCount = aminoCountCol.get(i);
        const aminoObj = {'name': amino, 'count': aminoCount, 'selectedCount': 0};
        const aggSelectedAminoCol = this.aggregatedSelectedTables[name].getCol(`${name}`);
        const aggSelectedCountCol = this.aggregatedSelectedTables[name].getCol(`${name}_count`);

        if (!amino || amino === this.dataEmptyAA)
          continue;

        colData.push(aminoObj);

        for (let j = 0; j < aggSelectedCountCol.length; j++) {
          const selectedAmino = aggSelectedAminoCol.get(j);
          const curAmino = (selectedAmino);
          if (curAmino == amino) {
            aminoObj['selectedCount'] = aggSelectedCountCol.get(j);
            break;
          }
        }
      }

      colData.sort((o1, o2) => this.ord[o2['name']] - this.ord[o1['name']]);
    }

    this.max = this.dataFrame!.filter.trueCount;
  }

  renderBarToCanvas(g: CanvasRenderingContext2D, cell: DG.GridCell, x: number, y: number, w: number, h: number) {
    const name = cell.tableColumn!.name;
    const colNameSize = g.measureText(name).width;
    const barData = this.barStats[name];
    const margin = 0.2;
    const innerMargin = 0.02;
    const selectLineRatio = 0.1;
    let sum = 0;

    barData.forEach((obj) => {
      sum += obj['count'];
    });

    x = x + w * margin;
    y = y + h * margin / 4;
    w = w - w * margin * 2;
    h = h - h * margin;
    const barWidth = w - 10;
    g.fillStyle = 'black';
    g.textBaseline = 'top';
    g.font = `${h * margin / 2}px`;
    g.fillText(name, x + (w - colNameSize) / 2, y + h + h * margin / 4);

    barData.forEach((obj) => {
      const sBarHeight = h * obj['count'] / this.max;
      const gapSize = sBarHeight * innerMargin;
      const verticalShift = (this.max - sum) / this.max;
      const [color, aarOuter] = PeptidesController.chemPalette.getColorAAPivot(obj['name']);
      const textSize = g.measureText(aarOuter);
      const fontSize = 11;
      const leftMargin = (w - (aarOuter.length > 1 ? fontSize : textSize.width - 8)) / 2;
      const subBartHeight = sBarHeight - gapSize;
      const yStart = h * verticalShift + gapSize / 2;
      const xStart = (w - barWidth) / 2;
      const absX = x + leftMargin;
      const absY = y + yStart + subBartHeight / 2 + (aarOuter.length == 1 ? + 4 : 0);
      const eps = 0.1;

      g.strokeStyle = color;
      g.fillStyle = color;
      if (textSize.width <= subBartHeight) {
        const origTransform = g.getTransform();

        if (color != PeptidesController.chemPalette.undefinedColor) {
          g.fillRect(x + xStart, y + yStart, barWidth, subBartHeight);
          g.fillStyle = 'black';
        } else
          g.strokeRect(x + xStart + 0.5, y + yStart, barWidth - 1, subBartHeight);

        g.font = `${fontSize}px monospace`;
        g.textAlign = 'center';
        g.textBaseline = 'bottom';

        if (aarOuter.length > 1) {
          g.translate(absX, absY);
          g.rotate(Math.PI / 2);
          g.translate(-absX, -absY);
        }

        g.fillText(aarOuter, absX, absY);
        g.setTransform(origTransform);
      } else
        g.fillRect(x + xStart, y + yStart, barWidth, subBartHeight);

      if (obj['selectedCount'] > eps) {
        g.fillStyle = 'rgb(255,165,0)';
        g.fillRect(
          x + xStart - w * selectLineRatio * 2,
          y + yStart,
          barWidth * selectLineRatio,
          h * obj['selectedCount'] / this.max - gapSize,
        );
      }

      sum -= obj['count'];
    });
  }

  findAARandPosition(cell: DG.GridCell, mouseEvent: MouseEvent) {
    if (!cell.tableColumn?.name || !this.aminoColumnNames.includes(cell.tableColumn.name))
      return null;

    const offsetX = mouseEvent.offsetX;
    const offsetY = mouseEvent.offsetY;
    const colName = cell.tableColumn?.name;
    const innerMargin = 0.02;
    const margin = 0.2;
    const bound = cell.bounds;
    const height = 130;
    const x = bound.x + bound.width * margin;
    const y = height * margin / 4;
    const w = bound.width - bound.width * margin * 2;
    const h = height - height * margin;
    const barData = this.barStats[colName];
    const barWidth = w - 10;
    let sum = 0;

    barData.forEach((obj) => {
      sum += obj['count'];
    });

    const xStart = x + (w - barWidth) / 2;
    for (const obj of barData) {
      const sBarHeight = h * obj['count'] / this.max;
      const gapSize = sBarHeight * innerMargin;
      const verticalShift = (this.max - sum) / this.max;
      const subBartHeight = sBarHeight - gapSize;
      const yStart = y + h * verticalShift + gapSize / 2;

      const isIntersectingX = offsetX >= xStart && offsetX <= xStart + barWidth;
      const isIntersectingY = offsetY >= yStart && offsetY <= yStart + subBartHeight;

      if (isIntersectingX && isIntersectingY)
        return {'colName': colName, 'aaName': obj['name']};

      sum -= obj['count'];
    }

    return null;
  }

  unhighlight() {
    ui.tooltip.hide();
    this.computeData();
  }

  /**
   * Requests highlight/select/filter action based on currentBarPart
   * @param event 
   * @returns 
   */
  requestAction(event: MouseEvent) {
    if (!this._currentBarPart)
      return;
    let aar = this._currentBarPart!['aaName'];
    let position = this._currentBarPart!['colName'];
    if (event.type === 'click') {
      if (this.isSameBarClicked) {
        aar = position = C.CATEGORIES.ALL;
        this.currentBarPart = null;
      }
      this.controller.setSARGridCellAt(aar, position);
      this._previousClickedBarPart = this._currentBarPart;
    } else {
      ui.tooltip.showRowGroup(this.dataFrame, (i) => {
        const currentAAR = this.dataFrame.get(position, i);
        return currentAAR === aar;
      }, event.offsetX, event.offsetY);
    }
  }
}
