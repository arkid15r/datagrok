import {Cell, Column, Row} from "./dataframe";
import {Viewer} from "./viewer";
import {toDart, toJs} from "./wrappers";
import {__obs, _sub, EventData, StreamSubscription} from "./events";
import {_identityInt32, _toIterable} from "./utils";
import { Observable } from "rxjs";
import { RangeSlider } from "./widgets";
import {SemType} from "./const";


let api = <any>window;
let _bytes = new Float64Array(4);

export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class Rect {
  x: any;
  y: any;
  width: any;
  height: any;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  static fromDart(d: any): Rect {
    api.grok_Rect_Pack(d, _bytes);
    return new Rect(_bytes[0], _bytes[1], _bytes[2], _bytes[3]);
  }

  get midX(): number {
    return this.x + this.width / 2;
  }

  get midY(): number {
    return this.y + this.height / 2;
  }

  get left(): number {
    return this.x;
  }

  get top(): number {
    return this.y;
  }

  get right(): number {
    return this.x + this.width;
  }

  get bottom(): number {
    return this.y + this.height;
  }
}

/** Represents a grid cell */
export class GridCell {
  d: any;

  constructor(d: any) {
    this.d = d;
  }

  /** @returns {GridCell} */
  static fromColumnRow(grid: Grid, columnName: string, gridRow: number): GridCell {
    return new GridCell(api.grok_Grid_GetCell(grid.d, columnName, gridRow));
  }

  /** @returns {string} Cell type */
  get cellType(): string {
    return api.grok_GridCell_Get_CellType(this.d);
  }

  /** @returns {boolean} Whether this is a table (data) cell (as opposed to special cells like row headers). */
  get isTableCell(): boolean {
    return api.grok_GridCell_Get_IsTableCell(this.d);
  }

  /** @returns {boolean} Whether this is a row header. */
  get isRowHeader(): boolean {
    return api.grok_GridCell_Get_IsRowHeader(this.d);
  }

  /** @returns {boolean} Whether this is a column header. */
  get isColHeader(): boolean {
    return api.grok_GridCell_Get_IsColHeader(this.d);
  }

  /** @returns {Column} Corresponding table column, or null. */
  get tableColumn(): Column | null {
    return this.gridColumn.column;
  }

  /** @returns {Row} Corresponding table row, or null. */
  get tableRow(): Row | null {
    return this.isTableCell || this.isRowHeader ? this.cell.row : null;
  }

  /** @returns {number|null} Index of the corresponding table row. */
  get tableRowIndex(): number | null {
    return this.isTableCell || this.isRowHeader ? this.cell.rowIndex : null;
  }

  /** @returns {number} Index of the corresponding grid row. */
  get gridRow(): number {
    return api.grok_GridCell_Get_GridRow(this.d);
  }

  /** @returns {GridColumn} Corresponding grid column. */
  get gridColumn(): GridColumn {
    return new GridColumn(api.grok_GridCell_Get_GridColumn(this.d));
  }

  /** Custom text to be shown in a cell . */
  get customText(): string {
    return api.grok_GridCell_Get_CustomText(this.d);
  }

  set customText(x: string) {
    api.grok_GridCell_Set_CustomText(this.d, x);
  }

  /** @returns {Grid} this cell belongs to. */
  get grid(): Grid {
    return new Grid(api.grok_GridCell_Get_Grid(this.d));
  }

  /** @returns {Cell} Corresponding table cell. */
  get cell(): Cell {
    return new Cell(api.grok_GridCell_Get_Cell(this.d));
  }

  /** @returns {GridCellStyle} Style to use for rendering. */
  get style(): GridCellStyle {
    return new GridCellStyle(api.grok_GridCell_Get_Style(this.d));
  }

  /** Grid cell bounds.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/cell-bounds}
   */
  get bounds(): Rect {
    return Rect.fromDart(api.grok_GridCell_Get_Bounds(this.d));
  }
}

/** Represents a grid column */
export class GridColumn {
  d: any;

  constructor(d: any) {
    this.d = d;
  }

  static fromDart(d: any): GridColumn | null {
    return d == null ? null : new GridColumn(d);
  }

  /** A {@link Grid} this column is associated with */
  get grid(): Grid {
    return toJs(api.grok_GridColumn_Get_Grid(this.d));
  }

  /** @returns {Column} Corresponding table column, or null. */
  get column(): Column | null {
    let col = api.grok_GridColumn_Get_Column(this.d);
    return col === null ? null : new Column(col);
  }

  /** Index of the column.
   *  @returns {number} */
  get idx(): number {
    return api.grok_GridColumn_Get_Idx(this.d);
  }

  /** @returns {string} Column name. */
  get name(): string {
    return api.grok_GridColumn_Get_Name(this.d);
  }

  set name(x: string) {
    api.grok_GridColumn_Set_Name(this.d, x);
  }

  /** Column width in pixels.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/resize-columns}
   *  @returns {number} */
  get width(): number {
    return api.grok_GridColumn_Get_Width(this.d);
  }

  set width(x: number) {
    api.grok_GridColumn_Set_Width(this.d, x);
  }

  /** Background column as a 4-byte ARGB number.
   *  @returns {number} */
  get backColor(): number {
    return api.grok_GridColumn_Get_BackColor(this.d);
  }

  set backColor(x: number) {
    api.grok_GridColumn_Set_BackColor(this.d, x);
  }

  /** Column format.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/html-markup-cells}
   *  @returns {string} */
  get format(): string {
    return api.grok_GridColumn_Get_Format(this.d);
  }

  set format(x: string) {
    api.grok_GridColumn_Set_Format(this.d, x);
  }

  /** @returns {string} Cell type. */
  get cellType(): string {
    return api.grok_GridColumn_Get_CellType(this.d);
  }

  set cellType(x: string) {
    api.grok_GridColumn_Set_CellType(this.d, x);
  }

  /** Column visibility.
   *  @returns {boolean} */
  get visible(): boolean {
    return api.grok_GridColumn_Get_Visible(this.d);
  }

  set visible(x: boolean) {
    api.grok_GridColumn_Set_Visible(this.d, x);
  }

  /** Custom colors for categories.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/category-colors}
   *  @returns {Object.<string, number>} */
  get categoryColors(): { [s: string]: number } {
    return api.grok_GridColumn_Get_CategoryColors(this.d);
  }

  set categoryColors(x: { [s: string]: number }) {
    api.grok_GridColumn_Set_CategoryColors(this.d, x);
  }

  /** Whether the column is editable.
   *  @returns {boolean} */
  get editable(): boolean {
    return api.grok_GridColumn_Get_Editable(this.d);
  }

  set editable(x: boolean) {
    api.grok_GridColumn_Set_Editable(this.d, x);
  }

  /** Whether the column is selected.
   *  @returns {boolean}  */
  get selected(): boolean {
    return api.grok_GridColumn_Get_Selected(this.d);
  }

  set selected(x: boolean) {
    api.grok_GridColumn_Set_Selected(this.d, x);
  }

  /** Column position from the left side.
   *  @returns {number}  */
  get left(): number {
    return api.grok_GridColumn_Get_Left(this.d);
  }

  /** Column position from the right side.
   *  @returns {number}  */
  get right(): number {
    return api.grok_GridColumn_Get_Right(this.d);
  }

  /** Returns all visible cells */
  getVisibleCells(): Iterable<GridCell> {
    return this.grid.getVisibleCells(this);
  }
}

/** Represents grid columns. */
export class GridColumnList {
  d: any;

  constructor(d: any) {
    this.d = d;
  }

  /** Row header column.
   *  @returns {GridColumn}  */
  get rowHeader(): GridColumn | null {
    return this.byIndex(0);
  }

  /** Returns a grid column by index, or null if it does not exist.
   *  @param {number} index
   *  @returns {GridColumn}  */
  byIndex(index: number): GridColumn | null {
    return GridColumn.fromDart(api.grok_GridColumnList_ByIndex(this.d, index));
  }

  /** Returns a grid column by name, or null if it does not exist.
   *  @param {string} columnName
   *  @returns {GridColumn}  */
  byName(columnName: string): GridColumn | null {
    return GridColumn.fromDart(api.grok_GridColumnList_ByName(this.d, columnName));
  }

  /** Sets column order.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/order-columns}
   *  @param {string[]} columnNames - Order of columns. */
  setOrder(columnNames: string[]): void {
    api.grok_GridColumnList_SetOrder(this.d, columnNames);
  }

  /** Shows the specified columns (and hides the rest).
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/hide-columns}
   *  @param {string[]} columnNames - Names of the columns to show. */
  setVisible(columnNames: string[]): void {
    api.grok_GridColumnList_SetVisible(this.d, columnNames);
  }

  /** GridColumnList length.
   *  @returns {number}  */
  get length(): number {
    return api.grok_GridColumnList_Get_Length(this.d);
  }
}


/** High-performance, flexible spreadsheet control */
export class Grid extends Viewer {
  constructor(d: any) {
    super(d);
  }

  /** Grid columns.
   *  @returns {GridColumnList} */
  get columns(): GridColumnList {
    return new GridColumnList(api.grok_Grid_Get_Columns(this.d));
  }

  /** Returns a column with the specified name.
   * @param {string} name
   * @returns {GridColumn} */
  col(name: string): GridColumn | null {
    return this.columns.byName(name);
  }

  /** Returns a grid cell at the specified position. */
  cell(columnName: string, gridRow: number): GridCell {
    return GridCell.fromColumnRow(this, columnName, gridRow);
  }

  /**
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/custom-cell-rendering-indexes}
   * @returns {Observable<GridCellRenderArgs>} */
  get onCellRender(): Observable<GridCellRenderArgs> {
    return __obs('d4-grid-cell-render', this.d);
  }

  /** @returns {HTMLCanvasElement} */
  get canvas(): HTMLCanvasElement {
    return api.grok_Grid_Get_Canvas(this.d);
  }

  /** @returns {HTMLCanvasElement} */
  get overlay(): HTMLCanvasElement {
    return api.grok_Grid_Get_Overlay(this.d);
  }

  /**
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/custom-cell-prepare}
   */
  onCellPrepare(callback: (cell: GridCell) => any): StreamSubscription {
    return _sub(api.grok_Grid_OnCellPrepare(this.d, (dcell: any) => {
      return callback(new GridCell(dcell));
    }));
  }

  /**
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/custom-cell-tooltip}
   */
  onCellTooltip(callback: (cell: GridCell, x: number, y: number) => any): StreamSubscription {
    return _sub(api.grok_Grid_OnCellTooltip(this.d, (dcell: any, x: any, y: any) => {
      return callback(new GridCell(dcell), x, y);
    }));
  }

  /** Returns a grid cell at the specified position, or null if there is none.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/hit-test} */
  hitTest(x: number, y: number): GridCell | null {
    return toJs(api.grok_Grid_HitTest(this.d, x, y));
  }

  /** Sorts rows by the specified [columnIds].
   *  Specify sort directions via [asc] array (true = ascending, false = descending)
   *  If [asc] is not specified, sorts in ascending order. */
  sort(columns: string[] | Column[], orders: boolean[] | null = null): Grid {
    api.grok_Grid_Sort(this.d, (columns as any[]).map((c: string | Column) => c instanceof Column ? c.d : c), orders);
    return this;
  }

  /** Sorts the rows, using the specified comparer that accepts indexes.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/order-rows-by-comparer}
   * Also, @see setRowOrder */
  sortIndexes(indexComparer: (a: number, b: number) => number): Grid {
    let indexes = _identityInt32(this.table.rowCount);
    indexes.sort(indexComparer);
    this.setRowOrder(<number[]><unknown>indexes);
    return this;
  }

  /** Sets the order or rows in the table.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/order-rows}
   * Also, @see sortIndexes */
  setRowOrder(indexes: number[]): Grid {
    api.grok_Grid_SetRowOrder(this.d, indexes);
    return this;
  }

  /** Returns a grid cell at the specified position.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/scroll-to-cell}
   */
  scrollToCell(column: string | Column, row: number): void {
    api.grok_Grid_ScrollToCell(this.d, toDart(column), row);
  }

  /** Scrolls the grid to the specified position.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/scroll-to-pixels}
   */
  scrollToPixels(x: number, y: number): void {
    api.grok_Grid_ScrollToPixels(this.d, x, y);
  }

  static create(table: { d: any; }): Grid {
    return new Grid(api.grok_Grid_Create(table.d));
  }

  /** Causes the grid to repaint.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/advanced/invalidate}
   **/
  invalidate(): void { api.grok_Grid_Invalidate(this.d); }

  /** Vertical scroll bar.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/scroll-bars}
   */
  get vertScroll(): RangeSlider {
    return toJs(api.grok_Grid_Get_VertScroll(this.d));
  }

  /** Horizontal scroll bar */
  get horzScroll(): RangeSlider {
    return toJs(api.grok_Grid_Get_HorzScroll(this.d));
  }

  /** Forces the grid to execute calculations that were postponed before the next rendering (such as recalculating layout).
   * Call it in case the client code changes column widths and needs to access the new recalculated layout. */
  runPostponedComputations(): void {
    api.grok_CanvasViewer_RunPostponedComputations(this.d);
  }

  /**
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/resize-events}
   */
  get onColumnResized(): Observable<any> {
    return __obs('d4-grid-column-resized', this.d);
  }

  /**
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/resize-events}
   */
  get onRowsResized(): Observable<any> {
    return __obs('d4-grid-rows-resized', this.d);
  }

  /**
   * Currently visible cells
   */
  getVisibleCells(column: GridColumn | null = null): Iterable<GridCell> {
    return _toIterable(api.grok_Grid_GetVisibleCells(this.d, column?.d))
  }
}


export class GridCellStyle {
  d: any;

  constructor(d: any) {
    this.d = d;
  }

  get font(): string {
    return api.grok_GridCellStyle_Get_Font(this.d);
  }

  set font(x: string) {
    api.grok_GridCellStyle_Set_Font(this.d, x);
  }

  get textColor(): number {
    return api.grok_GridCellStyle_Get_TextColor(this.d);
  }

  set textColor(x: number) {
    api.grok_GridCellStyle_Set_TextColor(this.d, x);
  }

  get backColor(): number {
    return api.grok_GridCellStyle_Get_BackColor(this.d);
  }

  set backColor(x: number) {
    api.grok_GridCellStyle_Set_BackColor(this.d, x);
  }

  get element(): HTMLElement {
    return api.grok_GridCellStyle_Get_Element(this.d);
  }

  set element(x: HTMLElement) {
    api.grok_GridCellStyle_Set_Element(this.d, x);
  }
}


/** Grid cell rendering args. */
export class GridCellRenderArgs extends EventData {

  constructor(d: any) {
    super(d);
  }

  /** @returns {CanvasRenderingContext2D} */
  get g(): CanvasRenderingContext2D {
    return api.grok_GridCellRenderArgs_Get_G(this.d);
  }

  get cell(): GridCell {
    return new GridCell(api.grok_GridCellRenderArgs_Get_Cell(this.d));
  }

  /** @returns {Rect} */
  get bounds(): Rect {
    return api.grok_GridCellRenderArgs_Get_Bounds(this.d);
  }
}


export class CanvasRenderer {
  get defaultWidth(): number | null {
    return null;
  }

  get defaultHeight(): number | null {
    return null;
  }

  /**
   * @param {CanvasRenderingContext2D} g
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {Object} value
   * @param {Object} context
   **/
  render(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, value: object, context: object): void {
    throw 'Not implemented';
  }
}


export class GridCellRenderer extends CanvasRenderer {
  get name(): string {
    throw 'Not implemented';
  }

  get cellType(): string {
    throw 'Not implemented';
  }

  renderInternal(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gridCell: any, cellStyle: any): void {
    this.render(g, x, y, w, h, new GridCell(gridCell), new GridCellStyle(cellStyle));
  }

  static register(renderer: any): void {
    api.grok_GridCellRenderer_Register(renderer);
  }
}


export class SemanticValue {
  private readonly d: any;

  constructor(d: any) {
    this.d = d;
  }

  static fromValueType(value: any, semType: SemType | null) {
    return new SemanticValue(api.grok_SemanticValue(value, semType));
  }

  get value(): any { return api.grok_SemanticValue_Get_Value(this.d); }
  set value(x: any) { api.grok_SemanticValue_Set_Value(this.d, x); }

  get semType(): string { return api.grok_SemanticValue_Get_SemType(this.d); }
  set semType(x: string) { api.grok_SemanticValue_Set_SemType(this.d, x); }

  getMeta(name: string): any { return api.grok_SemanticValue_Get_Meta(name); }
  setMeta(name: string, value: any): void { api.grok_SemanticValue_Set_Meta(name, toDart(value)); }

  get cell(): Cell { return api.grok_SemanticValue_Get_Cell(this.d); }
  get gridCell(): GridCell { return this.getMeta('gridCell'); }
  get viewer(): Viewer { return this.getMeta('viewer'); }
}