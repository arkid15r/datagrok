/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {ImageCellRenderer} from './cell-types/image-cell-renderer';
import {HyperlinkCellRenderer} from './cell-types/hyperlink-cell-renderer';
import {HtmlTestCellRenderer, TestCellRenderer} from './cell-types/test-cell-renderer';
import {BarCellRenderer} from './cell-types/bar-cell-renderer';
import {BinaryImageCellRenderer} from './cell-types/binary-image-cell-renderer';

import {SparklineCellRenderer} from './sparklines/sparklines-lines';
import {BarChartCellRenderer} from './sparklines/bar-chart';
import {PieChartCellRenderer} from './sparklines/piechart';
import {RadarChartCellRender} from './sparklines/radar-chart';
import {ScatterPlotCellRenderer} from './sparklines/scatter-plot';
import {names, SparklineType, sparklineTypes} from './sparklines/shared';
import * as PinnedUtils from '@datagrok-libraries/gridext/src/pinned/PinnedUtils';
import {PinnedColumn} from "@datagrok-libraries/gridext/src/pinned/PinnedColumn";

export const _package = new DG.Package();

//name: imageUrlCellRenderer
//tags: cellRenderer
//meta.cellType: ImageUrl
//output: grid_cell_renderer result
export function imageUrlCellRenderer() {
  return new ImageCellRenderer();
}

//name: binaryImageCellRenderer
//tags: cellRenderer
//meta.cellType: BinaryImage
//output: grid_cell_renderer result
export function binaryImageCellRenderer() {
  return new BinaryImageCellRenderer();
}

//name: hyperlinkCellRenderer
//tags: cellRenderer
//meta.cellType: Hyperlink
//output: grid_cell_renderer result
export function hyperlinkCellRenderer() {
  return new HyperlinkCellRenderer();
}

//name: htestCellRenderer
//tags: cellRenderer
//meta.cellType: htest
//output: grid_cell_renderer result
export function htestCellRenderer() {
  return new HtmlTestCellRenderer();
}

//name: barCellRenderer
//tags: cellRenderer
//meta.gridChart: true
//meta.cellType: bar
//output: grid_cell_renderer result
export function barCellRenderer() {
  return new BarCellRenderer();
}

//name: Sparklines
//tags: cellRenderer
//meta.cellType: sparkline
//meta.gridChart: true
//meta.virtual: true
//output: grid_cell_renderer result
export function sparklineCellRenderer() {
  return new SparklineCellRenderer();
}

//name: Scatter Plot
//tags: cellRenderer
//meta.cellType: scatterplot
//meta.virtual: true
//output: grid_cell_renderer result
export function scatterPlotRenderer() {
  return new ScatterPlotCellRenderer();
}

//name: Bar Chart
//tags: cellRenderer
//meta.cellType: barchart
//meta.gridChart: true
//meta.virtual: true
//output: grid_cell_renderer result
export function barchartCellRenderer() {
  return new BarChartCellRenderer();
}

//name: Pie Chart
//tags: cellRenderer
//meta.cellType: piechart
//meta.gridChart: true
//meta.virtual: true
//output: grid_cell_renderer result
export function piechartCellRenderer() {
  return new PieChartCellRenderer();
}

//name: Radar
//tags: cellRenderer
//meta.cellType: radar
//meta.gridChart: true
//meta.virtual: true
//output: grid_cell_renderer result
export function radarCellRenderer() {
  return new RadarChartCellRender();
}

//description: Adds a sparkline column for the selected columns
//input: list columns { type: numerical }
//meta.action: Sparklines...
export function summarizeColumns(columns: DG.Column[]) {
  const table = columns[0].dataFrame;
  const name = ui.stringInput('Name', table.columns.getUnusedName('Summary'));
  const sparklineType = ui.choiceInput('Type', SparklineType.Sparkline, sparklineTypes);
  const columnsSelector = ui.columnsInput('Columns', table, (_) => {}, {
    available: names(table.columns.numerical),
    checked: names(columns),
  });
  const hide = ui.boolInput('Hide', false);
  hide.setTooltip('Hide source columns in the grid');

  function addSummaryColumn() {
    const grid = grok.shell.tv.grid;
    const left = grid.horzScroll.min;
    const columnNames = names(columnsSelector.value);
    const options = {gridColumnName: name.value, cellType: sparklineType.value!};
    const gridCol = grid.columns.add(options);
    gridCol.move(grid.columns.byName(columnNames[0])!.idx);
    gridCol.settings = {columnNames: columnNames};
    if (hide.value) {
      for (const name of columnNames)
        grid.columns.byName(name)!.visible = false;
    }
    grid.horzScroll.scrollTo(left);
    gridCol.scrollIntoView();
    grok.shell.o = gridCol;
  }

  DG.Dialog
    .create({title: 'Add Summary Column'})
    .add(name)
    .add(sparklineType)
    .add(columnsSelector)
    .add(hide)
    .onOK(addSummaryColumn)
    .show();
}


//name: testUnitsKgCellRenderer
//tags: cellRenderer
//meta.cellType: testUnitsKg
//meta.columnTags: foo=bar,units=kg
//output: grid_cell_renderer result
export function testUnitsKgCellRenderer() {
  return new TestCellRenderer();
}

//name: testUnitsTonCellRenderer
//tags: cellRenderer
//meta.cellType: testUnitsTon
//meta.columnTags: foo=bar,units=ton
//output: grid_cell_renderer result
export function testUnitsTonCellRenderer() {
  return new HtmlTestCellRenderer();
}

//name: addPinnedColumn
//input: object gridCol
//output: object result
export function addPinnedColumn(gridCol: DG.GridColumn) : PinnedColumn {
  return PinnedUtils.addPinnedColumn(gridCol);
}

//name: demoTestUnitsCellRenderer
export function demoTestUnitsCellRenderer() {
  const t = DG.DataFrame.fromColumns([
    DG.Column.fromStrings('kg', ['a', 'b']).setTag('quality', 'test').setTag('foo', 'bar').setTag('units', 'kg'),
    DG.Column.fromStrings('ton', ['a', 'b']).setTag('quality', 'test').setTag('foo', 'bar').setTag('units', 'ton')
  ]);

  grok.shell.addTableView(t);
  grok.shell.info('Different renderers even though semantic types are the same');
}

//tags: autostart
export function _autoPowerGrid(): void {
  PinnedUtils.registerPinnedColumns();
  DG.GridCellRenderer.register(new ScatterPlotCellRenderer());
}
