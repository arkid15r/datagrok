import {toDart, toJs} from "./wrappers";
import {__obs, _sub, observeStream, StreamSubscription} from "./events";
import {Observable, Subscription} from "rxjs";
import {Func, Property} from "./entities";
import {Cell, Column, DataFrame} from "./dataframe";
import {ColorType, PropertyOptions, Type} from "./const";
import * as React from "react";
import * as rxjs from "rxjs";
import {Rect} from "./grid";

declare let grok: any;
declare let DG: any;
declare let ui: any;
let api = <any>window;

export class ObjectPropertyBag {
  source: any;

  constructor(source: any, x: any = null) {

    /** @member {Object} */
    this.source = source;

    if (x == null)
      x = source;

    let props = this;

    const handler = {
      ownKeys(target: any) {
        return props.getProperties().map((p: Property) => p.name);
      },
      has(target: any, name: string) {
        return props.getProperties().find((p: Property) => p.name === name) !== null;
      },
      getOwnPropertyDescriptor(target: any, key: any) {
        return {
          enumerable: true,
          configurable: true
        };
      },
      set(target: any, name: string, value: any) {
        if (<any>x instanceof DartWidget)
          x = toDart(x);
        target.getProperty(name).set(x, value);
        return true;
      },
      get(target: any, name: any) {
        const own = ['__proto__', 'hasProperty', 'getProperty', 'getProperties', 'get', 'set', 'setAll', 'apply'];
        if (own.includes(name) || props.hasOwnProperty(name))
          // @ts-ignore
          return props[name];
        if (<any>x instanceof DartWidget)
          x = toDart(x);
        return target.getProperty(name)?.get(x);
      }
    }

    return new Proxy(this, handler);
  }

  /**
   * Gets the value of the specified property
   * @param {string} propertyName
   * @returns {object}
   * */
  get(propertyName: string): object {
    return this.getProperty(propertyName).get(this.source);
  }

  /**
   * Sets the value of the specified property
   * @param {string} propertyName
   * @param {object} propertyValue
   * */
  set(propertyName: string, propertyValue: object) {
    this.getProperty(propertyName).set(this.source, propertyValue);
  }

  /** Sets all properties according to the passed object containing key-value pairs */
  setAll(params: object) {
    for (const [k, v] of Object.entries(params))
      this.set(k, v);
  }

  /** @returns {Property[]} */
  getProperties(): Property[] {
    return this.source.getProperties();
  }

  /** Gets property by name (case-sensitive).
   * @param {string} name
   * @returns {Property} */
  getProperty(name: string): Property {
    let property = this.getProperties().find((p) => p.name === name);
    if (typeof property == 'undefined')
      throw `Property not found: ${name}`;
    return property;
  }

  /**
   * @param {string} name
   * @returns {boolean} */
  hasProperty(name: string): boolean {
    return this.getProperties().findIndex((p) => p.name === name) !== -1;
  }
}


/** Base class for controls that have a visual root and a set of properties. */
export class Widget {

  /** Constructor function. No parameters, returns [Widget]. */
  factory: Func | null = null;

  protected _root: HTMLElement;
  protected _properties: Property[];
  props: any; //ObjectPropertyBag;
  subs: Subscription[];
  d: any;

  /** @constructs Widget and initializes its root. */
  constructor(widgetRoot: HTMLElement) {

    /** @member {HTMLElement} */
    this._root = widgetRoot;

    /** @member {Property[]}*/
    this._properties = [];

    /** @member {ObjectPropertyBag} */
    this.props = new ObjectPropertyBag(this);

    /** @member {StreamSubscription[]} */
    this.subs = [];

    this.getProperties = this.getProperties.bind(this);
  }

  toDart() {
    if (this.d == null)
      this.d = api.grok_Widget_Wrap(this);
    return this.d;
  }

  /** Registers a subscription to an external event.
   * @param {Subscription} subscription */
  sub(subscription: Subscription): void {
    this.subs.push(subscription);
  }

  /**
   * @param {Object} properties
   * @returns {Widget} */
  apply(properties: object): Widget {
    for (let name of Object.keys(properties))
      if (typeof name !== 'undefined')
        // @ts-ignore
        this.props[name] = properties[name];

     //this.props.apply(properties);
    return this;
  }

  getProperties(): Property[] { return this._properties; }

  /** Gets called when viewer's property is changed.
   * @param {Property} property - or null, if multiple properties were changed. */
  onPropertyChanged(property: Property | null): void {}

  getDartProperties(): any[] {
    return this.getProperties().map((p) => p.d);
  }

  onFrameAttached(dataFrame: DataFrame): void {
    if (this.props.hasProperty('dataFrame'))
      this.props.set('dataFrame', dataFrame);
  }

  /** Widget's visual root.
   * @type {HTMLElement} */
  get root(): HTMLElement { return this._root; }
  set root(r: HTMLElement) { this._root = r; }

  /** Gets called when a widget is detached and will no longer be used. Typically used for unsubscribing from events.
   * Be sure to call super.detach() if this method is overridden.  */
  detach(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  /** Registers an property with the specified type, name, and defaultValue.
   *  Registered property gets added to {@see properties}.
   *  Returns default value, thus allowing to combine registering a property with the initialization
   *
   * @param {string} propertyName
   * @param {TYPE} propertyType
   * @param defaultValue
   * @param {Object} options
   * @returns {*}
   * @private
   */
  addProperty(propertyName: string, propertyType: Type, defaultValue: any = null, options: { [key: string]: string } & PropertyOptions | null = null): any {
    let obj = this;
    // @ts-ignore
    let p = Property.create(propertyName, propertyType, () => obj[propertyName], null, defaultValue);
    p.set = function (_: any, x: any) {
      // @ts-ignore
      obj[propertyName] = x;
      obj.onPropertyChanged(p);
    };

    if (options !== null) {
      for (let key of Object.keys(options))
        api.grok_PropMixin_SetPropertyValue(p.d, key, options[key]);
    }

    this._properties.push(p);
    return p.defaultValue;
  }

  /** @returns {Widget} */
  static fromRoot(root: HTMLElement): Widget {
    return new Widget(root);
  }

  /** Creates a {@see Widget} from the specified React component. */
  // @ts-ignore
  static react(reactComponent: React.DOMElement<any, any> | Array<React.DOMElement<any, any>> | React.CElement<any, any> | Array<React.CElement<any, any>> | React.ReactElement | Array<React.ReactElement>): Widget {
    let widget = Widget.fromRoot(ui.div());
    // @ts-ignore
    ReactDOM.render(reactComponent, widget.root);
    return widget;
  }
}


/** Base class for DataFrame-bound filtering controls */
export class Filter extends Widget {
  dataFrame: DataFrame | null;

  constructor() {
    super(ui.div());

    /** @member {DataFrame} */
    this.dataFrame = null;
  }

  /** Gets called when a data frame is attached.
   * @param {DataFrame} dataFrame*/
  attach(dataFrame: DataFrame): void {}

  detach(): void {}
}


export class DartWidget extends Widget {
  constructor(d: any) {
    super(api.grok_Widget_Get_Root(d));
    this.d = d;
  }

  get root(): HTMLElement {
    return api.grok_Widget_Get_Root(this.d);
  }

  getProperties(): Property[] {
    return toJs(api.grok_PropMixin_GetProperties(this.d));
  }
}

/**
 * Accordion control with collapsible/expandable panes.
 * Samples: {@link https://public.datagrok.ai/js/samples/ui/accordion}
 * @extends {DartWidget}
 * */
export class Accordion extends DartWidget {

  /** @constructs Accordion */
  constructor(d: any) {
    super(d);
  }

  /** An object this accordion is associated with */
  get context(): any {
    return toJs(api.grok_Accordion_Get_Context(this.d));
  }

  /** Creates a new instance of Accordion */
  static create(key: any = null): Accordion {
    return toJs(api.grok_Accordion(key));
  }

  /** @type {AccordionPane[]} */
  get panes(): AccordionPane[] {
    return api.grok_TabControlBase_Get_Panes(this.d).map(toJs);
  }

  /** Returns a pane with the specified name.
   * @param {string} name
   * @returns {AccordionPane} */
  getPane(name: string): AccordionPane {
    return toJs(api.grok_TabControlBase_GetPane(this.d, name));
  }

  addPane(name: string, getContent: Function, expanded: boolean = false, before: AccordionPane | null = null): AccordionPane {
    return toJs(api.grok_Accordion_AddPane(this.d, name, getContent, expanded, before !== null ? before.d : null));
  }

  removePane(pane: AccordionPane) {
    api.grok_Accordion_RemovePane(this.d, pane.d);
  }
}


/** A pane in the {@link Accordion} control. */
export class AccordionPane {
  d: any;

  constructor(d: any) {
    this.d = d;
  }

  /** Expanded state
   * @type {boolean} */
  get expanded(): boolean {
    return api.grok_AccordionPane_Get_Expanded(this.d);
  }

  set expanded(v: boolean) {
    api.grok_AccordionPane_Set_Expanded(this.d, v);
  }

  /** @type {string} */
  get name(): string {
    return api.grok_AccordionPane_Get_Name(this.d);
  }

  set name(name: string) {
    api.grok_AccordionPane_Set_Name(this.d, name);
  }
}


export class TabControl {
  d: any;
  constructor(d: any) {
    this.d = d;
  }

  static create(vertical: boolean = false): TabControl {
    return toJs(api.grok_TabControl(vertical));
  }

  get root(): HTMLDivElement {
    return api.grok_Widget_Get_Root(this.d);
  }

  get header(): HTMLDivElement {
    return api.grok_TabControlBase_Get_Header(this.d);
  }

  get panes(): TabPane[] {
    return api.grok_TabControlBase_Get_Panes(this.d).map(toJs);
  }

  getPane(name: string): TabPane {
    return toJs(api.grok_TabControlBase_GetPane(this.d, name));
  }

  addPane(name: string, getContent: Function, icon: any = null): TabPane {
    return toJs(api.grok_TabControlBase_AddPane(this.d, name, getContent, icon));
  }

  clear(): void {
    api.grok_TabControlBase_Clear(this.d);
  }

  get currentPane(): TabPane {
    return api.grok_TabControlBase_Get_CurrentPane(this.d);
  }

  set currentPane(v: TabPane) {
    api.grok_TabControlBase_Set_CurrentPane(this.d, v.d);
  }

}


export class TabPane {
  d: any;
  constructor(d: any) {
    this.d = d;
  }

  get parent(): TabControl {
    return toJs(api.grok_TabPane_Get_Parent(this.d));
  }

  get root(): HTMLDivElement {
    return api.grok_TabPane_Get_Root(this.d);
  }

  get content(): HTMLDivElement {
    return api.grok_TabPane_Get_Content(this.d);
  }

  get expanded(): boolean {
    return api.grok_AccordionPane_Get_Expanded(this.d);
  }

  set expanded(v: boolean) {
    api.grok_AccordionPane_Set_Expanded(this.d, v);
  }

  get name(): string {
    return api.grok_AccordionPane_Get_Name(this.d);
  }

  set name(name: string) {
    api.grok_AccordionPane_Set_Name(this.d, name);
  }
}


export class ToolboxPage {
  d: any;
  constructor(d: any) {
    this.d = d;
  }

  get accordion(): Accordion {
    return toJs(api.grok_ToolboxPage_Get_Accordion(this.d));
  }
}


/**
 * A non-modal dialog.
 * Sample: https://public.datagrok.ai/js/samples/ui/dialogs
 *
 * @example
 * ui.dialog('Windows')
 *   .add(ui.)
 *   .add(ui.span(['People of Earth, your attention, please… ']))
 *   .onOK(() => { grok.shell.info('OK!'); })
 *   .show();
 * */
export class Dialog extends DartWidget {

  constructor(d: any) {
    super(d);
  }

  static create(options: { title?: string, helpUrl?: string } | string = ''): Dialog {
    if (typeof options === 'string')
      return new Dialog(api.grok_Dialog(options, null));
    else
      return new Dialog(api.grok_Dialog(options?.title, options?.helpUrl));
  }

  get helpUrl(): string {
    return api.grok_Dialog_Get_HelpUrl(this.d);
  };

  set helpUrl(url: string) {
    api.grok_Dialog_Set_HelpUrl(this.d, url);
  };

  /** Returns the title of a dialog. */
  get title(): string { return api.grok_Dialog_Get_Title(this.d); };
  set title(t: string) { api.grok_Dialog_Set_Title(this.d, t); };

  /** Returns a list of the dialog's inputs. */
  get inputs(): InputBase[] { return api.grok_Dialog_Get_Inputs(this.d); }

  /**
   * Sets the OK button handler, and shows the OK button
   * @param {Function} handler
   * @returns {Dialog} */
  onOK(handler: Function): Dialog {
    api.grok_Dialog_OnOK(this.d, handler);
    return this;
  }

  /**
   * Sets the CANCEL button handler
   * @param {Function} handler
   * @returns {Dialog} */
  onCancel(handler: Function): Dialog {
    api.grok_Dialog_OnCancel(this.d, handler);
    return this;
  }

  /** @returns {Observable} */
  get onClose(): Observable<any> {
    return __obs('d4-dialog-closed', this.d);
  }

  // Using __obs is a recommended method. The below are obsolete and shall not be used:
  // onClose(handler) { api.grok_Dialog_OnClose(this.d, handler); return this; }
  // onClose(handler) { let s = _sub(api.grok_Dialog_OnClose(this.d, () => { handler(); s.cancel(); })); return this; }

  /** @returns {Dialog}
   * @param {{modal: boolean, fullScreen: boolean, center: boolean, centerAt: Element, x: number, y: number, width: number, height: number}|{}} options
   * */
  show(options?: { modal?: boolean; fullScreen?: boolean; center?: boolean; centerAt?: Element; x?: number; y?: number; width?: number; height?: number; backgroundColor: string;}): Dialog {
    api.grok_Dialog_Show(this.d, options?.modal, options?.fullScreen, options?.center, options?.centerAt, options?.x, options?.y, options?.width, options?.height, options?.backgroundColor);
    return this;
  }

  /** @returns {Dialog}
   * @param {boolean} fullScreen  */
  showModal(fullScreen: boolean): Dialog {
    api.grok_Dialog_Show(this.d, true, fullScreen, false, null, null, null, null, null, null);
    return this;
  }

  /** Adds content to the dialog.
   * @param {HTMLElement | Widget | InputBase} content
   * @returns {Dialog} */
  add(content: HTMLElement | Widget | InputBase): Dialog {
    api.grok_Dialog_Add(this.d, toDart(content));
    return this;
  }

  /** Closes the dialog. */
  close(): void {
    api.grok_Dialog_Close(this.d);
  }

  /** Returns command button with the specified text.
   * @param {string} text
   * @returns {HTMLButtonElement}
   * */
  getButton(text: string): HTMLButtonElement {
    return api.grok_Dialog_GetButton(this.d, text);
  }

  /** Adds command button with the specified text.
   * @param {string} text
   * @param {Function} action
   * @param index
   * @param tooltip
   * @returns {Dialog}
   * */
  addButton(text: string, action: Function, index: number = 0, tooltip: any = null): Dialog {
    api.grok_Dialog_AddButton(this.d, text, action, index, tooltip);
    return this;
  }

  /** Adds context action with the specified text.
   * @param {string} text
   * @param {Function} action
   * @returns {Dialog}
   * */
  addContextAction(text: string, action: Function): Dialog {
    api.grok_Dialog_AddContextAction(this.d, text, action);
    return this;
  }

  /** Initializes the 'history' feature.
   * @param {Function} getInput - collects the input from UI into JSON-serializable object
   * @param {Function} applyInput - refreshes the UI according to input
   * */
  history(getInput: () => any, applyInput: (x: any) => void): void {
    api.grok_Dialog_History(this.d, getInput, applyInput);
  }

  /** Initializes default history. */
  initDefaultHistory(): Dialog {
    api.grok_Dialog_InitDefaultHistory(this.d);
    return this;
  }

  /** Clears the content. */
  clear() {
    api.grok_Dialog_Clear(this.d);
  }
}

/**
 * Menu (either top menu or popup menu).
 * Top menu sample: {@link https://public.datagrok.ai/js/samples/ui/menu}
 * Popup menu sample: {@link https://public.datagrok.ai/js/samples/ui/popup-menu}
 *
 * @example
 * DG.Menu.popup()
 *   .item('Show info', () => grok.shell.info('Info'))
 *   .separator()
 *   .items(['First', 'Second'], showBalloon)
 *   .show();
 * */
export class Menu {
  d: any;

  constructor(d: any) {
    this.d = d;
  }

  static create(): Menu {
    return toJs(api.grok_Menu());
  }

  /** Creates a popup menu.
   * @returns {Menu} */
  static popup(): Menu {
    return toJs(api.grok_Menu_Context());
  }

  /** Finds a child menu item with the specified text.
   * @param {string} text
   * @returns {Menu} */
  find(text: string): Menu {
    return toJs(api.grok_Menu_Find(this.d, text));
  }

  /** Removes a child menu item with the specified text.
   * @param {string} text */
  remove(text: string): void {
    api.grok_Menu_Remove(this.d, text);
  }

  /** Removes all child menu items. */
  clear(): void {
    api.grok_Menu_Clear(this.d);
  }

  /** Returns an existing menu group or adds a new group with the specified text.
   * @param {string} text
   * @returns {Menu} */
  group(text: string): Menu {
    return toJs(api.grok_Menu_Group(this.d, text));
  }

  /** Ends a group of menu items and returns to the higher menu level.
   * @returns {Menu} */
  endGroup(): Menu {
    return toJs(api.grok_Menu_End_Group(this.d));
  }

  /** Adds a menu group with the specified text and handler.
   * @param {string} text
   * @param {Function} onClick - callback with no parameters
   * @returns {Menu} */
  item(text: string, onClick: Function): Menu {
    return toJs(api.grok_Menu_Item(this.d, text, onClick));
  }

  /** For each item in items, adds a menu group with the specified text and handler.
   * Returns this.
   * @param {string[]} items
   * @param {Function} onClick - a callback with one parameter
   * @returns {Menu} */
  items(items: string[], onClick: Function): Menu {
    return toJs(api.grok_Menu_Items(this.d, items, onClick));
  }

  /** Adds a separator line.
   *  @returns {Menu} */
  separator(): Menu {
    return toJs(api.grok_Menu_Separator(this.d));
  }

  /** Shows the menu.
   * @returns {Menu} */
  show(): Menu {
    return toJs(api.grok_Menu_Show(this.d));
  }
}


/** Balloon-style visual notifications. */
export class Balloon {
  /** Shows information message (green background) */
  info(s: string): void {
    api.grok_Balloon(s, 'info');
  }

  /** Shows information message (red background) */
  error(s: string): void {
    api.grok_Balloon(s, 'error');
  }
}


/** Input control base. Could be used for editing {@link Property} values as well. */
export class InputBase {
  d: any;

  constructor(d: any, onChanged: any = null) {
    this.d = d;
    if (onChanged != null)
      this.onChanged((_: any) => onChanged(this.value));
  }

  get root(): HTMLElement {
    return api.grok_InputBase_Get_Root(this.d);
  };

  get caption(): string {
    return api.grok_InputBase_Get_Caption(this.d);
  };

  get format(): string {
    return api.grok_InputBase_Get_Format(this.d);
  } ;

  get captionLabel(): string {
    return api.grok_InputBase_Get_CaptionLabel(this.d);
  };

  get input(): HTMLElement | string {
    return api.grok_InputBase_Get_Input(this.d);
  };

  get nullable(): boolean {
    return api.grok_InputBase_Get_Nullable(this.d);
  };

  set nullable(v: boolean) {
    api.grok_InputBase_Set_Nullable(this.d, v);
  };

  get value(): any {
    return toJs(api.grok_InputBase_Get_Value(this.d));
  };

  set value(x: any) {
    toDart(api.grok_InputBase_Set_Value(this.d, x));
  };

  get stringValue(): string {
    return api.grok_InputBase_Get_StringValue(this.d);
  };

  set stringValue(s: string) {
    api.grok_InputBase_Set_StringValue(this.d, s);
  };

  get readOnly(): boolean {
    return api.grok_InputBase_Get_ReadOnly(this.d);
  };

  set readOnly(v: boolean) {
    api.grok_InputBase_Set_ReadOnly(this.d, v);
  };

  get enabled(): boolean {
    return api.grok_InputBase_Get_Enabled(this.d);
  };

  set enabled(v: boolean) {
    api.grok_InputBase_Set_Enabled(this.d, v);
  };

  /// Occurs when [value] is changed, either by user or programmatically.
  onChanged(callback: Function): StreamSubscription {
    return _sub(api.grok_InputBase_OnChanged(this.d, callback));
  }

  /// Occurs when [value] is changed by user.
  onInput(callback: Function): StreamSubscription {
    return _sub(api.grok_InputBase_OnInput(this.d, callback));
  }

  save(): any {
    return api.grok_InputBase_Save(this.d);
  };

  load(s: any): any {
    return api.grok_InputBase_Load(this.d, s);
  };

  init(): any {
    return api.grok_InputBase_Init(this.d);
  };

  fireChanged(): any {
    return api.grok_InputBase_FireChanged(this.d);
  };

  addCaption(caption: string): void {
    api.grok_InputBase_AddCaption(this.d, caption);
  };

  addPatternMenu(pattern: any): void {
    api.grok_InputBase_AddPatternMenu(this.d, pattern);
  }

  setTooltip(msg: string): void {
    api.grok_InputBase_SetTooltip(this.d, msg);
  };

  static forProperty(property: Property): InputBase {
    return toJs(api.grok_InputBase_ForProperty(property.d));
  }
}


export class ProgressIndicator {
  d: any;
  constructor(d: any) {
    this.d = d;
  }

  static create() {
    return toJs(api.grok_ProgressIndicator_Create());
  }

  get percent(): number {
    return api.grok_ProgressIndicator_Get_Percent(this.d);
  }

  get description(): string {
    return api.grok_ProgressIndicator_Get_Description(this.d);
  }

  set description(s: string) {
    api.grok_ProgressIndicator_Set_Description(this.d, s);
  }

  update(percent: number, description: string): void {
    api.grok_ProgressIndicator_Update(this.d, percent, description);
  }

  log(line: string): void {
    api.grok_ProgressIndicator_Log(this.d, line);
  }

  get onProgressUpdated(): Observable<any> {
    return observeStream(api.grok_Progress_Updated(this.d));
  }

  get onLogUpdated(): Observable<any> {
    return observeStream(api.grok_Progress_Log_Updated(this.d));
  }

}


export class TaskBarProgressIndicator extends ProgressIndicator {
  static create(name?: string): TaskBarProgressIndicator {
    return toJs(api.grok_TaskBarProgressIndicator_Create(name));
  }

  close(): any {
    return api.grok_TaskBarProgressIndicator_Close(this.d);
  }
}


export class TagEditor {
  d: any;
  constructor(d: any) {
    this.d = d;
  }

  static create(): TagEditor {
    return toJs(api.grok_TagEditor());
  }

  get root(): HTMLElement {
    return api.grok_TagEditor_Get_Root(this.d);
  }

  get tags(): TagElement[] {
    return api.grok_TagEditor_Get_Tags(this.d);
  }

  addTag(tag: TagElement | string, notify: boolean = true) {
    return api.grok_TagEditor_AddTag(this.d, tag, notify);
  }

  removeTag(tag: TagElement | string): void {
    api.grok_TagEditor_RemoveTag(this.d, tag);
  }

  clearTags(): void {
    api.grok_TagEditor_ClearTags(this.d);
  }

  set acceptsDragDrop(predicate: (...params: any[]) => boolean) {
    api.grok_TagEditor_Set_AcceptsDragDrop(this.d, (x: any) => predicate(toJs(x, false)));
  };

  set doDrop(action: Function) {
    api.grok_TagEditor_Set_DoDrop(this.d, (x: any) => action(toJs(x, false)));
  }

  onChanged(callback: Function): StreamSubscription {
    return _sub(api.grok_TagEditor_OnChanged(this.d, callback));
  }
}


export class TagElement {
  d: any;
  constructor(d: any) {
    this.d = d;
  }

  get tag(): TagElement | string {
    return api.grok_TagElement_Get_Tag(this.d);
  };

  set tag(x: TagElement | string) {
    api.grok_TagElement_Set_Tag(this.d, x);
  };
}


/** Color-related routines. */
export class Color {

  /** Returns a color associated with the specified cell as an ARGB-formatted integer.
   * To convert to html color, use {@link getCellColorHtml} or {@link toHtml}. */
  static getCellColor(cell: Cell): number {
    return api.grok_Color_FromCell(cell.d);
  }

  /** Returns a string representation of the color associated with the specified cell.
   * For batch color manipulations, use {@link getCellColor}. */
  static getCellColorHtml(cell: Cell): string {
    return Color.toHtml(Color.getCellColor(cell));
  }

  /** Returns a color associated with the specified category within a column.
   * Returns ARGB-formatted integer. To convert to html color, use {@link toHtml}. */
  static getCategoryColor(column: Column, category: any): number {
    return api.grok_Color_FromCategory(column.d, category);
  }

  /** Returns the Alpha component of the color represented as ARGB-formatted integer. */
  static a(c: number): number { return (c >> 24) & 0xFF; }

  /** Returns the Red component of the color represented as ARGB-formatted integer. */
  static r(c: number): number { return (c >> 16) & 0xFF; }

  /** Returns the Green component of the color represented as ARGB-formatted integer. */
  static g(c: number): number { return (c >> 8) & 0xFF; }

  /** Returns the Blue component of the color represented as ARGB-formatted integer. */
  static b(c: number): number { return c & 0xFF; }

  /** Returns i-th categorical color (looping over the palette if needed) */
  static getCategoricalColor(i: number): ColorType {
    return Color.categoricalPalette[i % Color.categoricalPalette.length];
  }

  /** Returns either black or white color, depending on which one would be most contrast to the specified [color]. */
  static getContrastColor(color: ColorType): ColorType {
    return api.grok_Color_GetContrastColor(color);
  }

  /** Converts ARGB-formatted integer color to a HTML-formatted string (such as `#FF68Gf5T`). See also {@link toRgb}. */
  static toHtml(color: number) { return api.grok_Color_ToHtml(color); }

  /** Converts ARGB-formatted integer color to a HTML-formatted string (such as `rbg(20, 46, 124)`). See also {@link toHtml. }*/
  static toRgb(color: ColorType): string {
    return color === null ? '' : `rgb(${Color.r(color)},${Color.g(color)},${Color.b(color)})`;
  }

  /** Returns the standard palette of the categorical colors used across all visualizations in Datagrok. */
  static get categoricalPalette(): ColorType[] {
    return api.grok_Color_CategoricalPalette();
  }

  static scale(x: number, min: number, max: number): number {
    return min === max ? min : (x - min) / (max - min);
  }

  static get gray(): ColorType {
    return 0xFF808080;
  }

  static get lightLightGray(): ColorType {
    return 0xFFF0F0F0;
  }

  static get lightGray(): ColorType {
    return 0xFFD3D3D3;
  }

  static get darkGray(): ColorType {
    return 0xFF838383;
  }

  static get blue(): ColorType {
    return 0xFF0000FF;
  }

  static get green(): ColorType {
    return 0xFF00FF00;
  }

  static get darkGreen(): ColorType {
    return 0xFF006400;
  }

  static get black(): ColorType {
    return 0xFF000000;
  }

  static get yellow(): ColorType {
    return 0xFFFFFF00;
  }

  static get white(): ColorType {
    return 0xFFFFFFFF;
  }

  static get red(): ColorType {
    return 0xFFFF0000;
  }

  static get darkRed(): ColorType {
    return 0xFF8b0000;
  }

  static get maroon(): ColorType {
    return 0xFF800000;
  }

  static get olive(): ColorType {
    return 0xFF808000;
  }

  static get orange(): ColorType {
    return 0xFFFFA500;
  }

  static get darkOrange(): ColorType {
    return 0xFFFF8C00;
  }

  static get lightBlue(): ColorType {
    return 0xFFADD8E6;
  }

  static get darkBlue(): ColorType {
    return 0xFF0000A0;
  }

  static get purple(): ColorType {
    return 0xFF800080;
  }

  static get whitesmoke(): ColorType {
    return 0xFFF5F5F5;
  }

  static get navy(): ColorType {
    return 0xFF000080;
  }

  static get cyan(): ColorType {
    return 0xFF00ffff;
  }

  static get filteredRows(): ColorType {
    return 0xff1f77b4;
  }

  static get filteredOutRows(): ColorType {
    return Color.lightLightGray;
  }

  static get selectedRows(): ColorType {
    return Color.darkOrange;
  }

  static get missingValueRows(): ColorType {
    return Color.filteredOutRows;
  }

  static get mouseOverRows(): ColorType {
    return 0xFFAAAAAA;
  }

  static get currentRow(): ColorType {
    return 0xFF38B738;
  }

  static get histogramBar(): ColorType {
    return Color.filteredRows;
  }

  static get barChart(): ColorType {
    return 0xFF24A221;
  }

  static get scatterPlotMarker(): ColorType {
    return 0xFF40699c;
  }

  static get scatterPlotSelection(): ColorType {
    return 0x80323232;
  }

  static get scatterPlotZoom(): ColorType {
    return 0x80626200;
  }

  static get areaSelection(): ColorType {
    return Color.lightBlue;
  }

  static get rowSelection(): ColorType {
    return 0x60dcdca0;
  }

  static get colSelection(): ColorType {
    return 0x60dcdca0;
  }

  static get areaZoom(): ColorType {
    return 0x80323232;
  }

  static get gridWarningBackground(): ColorType {
    return 0xFFFFB9A7;
  }

  static get success(): ColorType {
    return 0xFF3cb173;
  }

  static get failure(): ColorType {
    return 0xFFeb6767;
  }
}


/** Tree view node.
 * Sample: {@link https://public.datagrok.ai/js/samples/ui/tree-view}
 * */
export class TreeViewNode {
  d: any;

  /** @constructs {TreeView} */
  constructor(d: any) {
    this.d = d;
  }

  /** Creates new nodes tree
   * @returns {TreeViewNode} */
  static tree(): TreeViewNode {
    return toJs(api.grok_TreeViewNode_Tree());
  }

  /** Visual root.
   * @type {HTMLElement} */
  get root(): HTMLElement {
    return api.grok_TreeViewNode_Root(this.d);
  }

  /** Caption label.
   * @type {HTMLElement} */
  get captionLabel(): HTMLElement {
    return api.grok_TreeViewNode_CaptionLabel(this.d);
  }

  /** Check box.
   * @type {null|HTMLElement} */
  get checkBox(): HTMLElement | null {
    return api.grok_TreeViewNode_CheckBox(this.d);
  }

  /** Returns 'true' if checked
   * @returns {boolean} */
  get checked(): boolean {
    return api.grok_TreeViewNode_Get_Checked(this.d);
  }

  set checked(checked: boolean) {
    api.grok_TreeViewNode_Set_Checked(this.d, checked);
  }

  /** Returns node text.
   * @returns {string} */
  get text(): string {
    return api.grok_TreeViewNode_Text(this.d);
  }

  /** Node value.
   * @type {Object}
   */
  get value(): object {
    return api.grok_TreeViewNode_Get_Value(this.d)
  };

  set value(v: object) {
    api.grok_TreeViewNode_Set_Value(this.d, v)
  };

  /** Gets all node items.
   * @returns {Array<TreeViewNode>} */
  get items(): TreeViewNode[] {
    return api.grok_TreeViewNode_Items(this.d).map((i: any) => toJs(i));
  }

  /** Add new group to node.
   * @param {string} text
   * @param {object} value
   * @param {boolean} expanded
   * @returns {TreeViewNode} */
  group(text: string, value: object | null = null, expanded: boolean = true): TreeViewNode {
    return toJs(api.grok_TreeViewNode_Group(this.d, text, value, expanded));
  }

  /** Add new item to node.
   * @param {string} text
   * @param {object} value
   * @returns {TreeViewNode} */
  item(text: string, value: object | null = null): TreeViewNode {
    return toJs(api.grok_TreeViewNode_Item(this.d, text, value));
  }

  /** Enables checkbox on node
   * @param {boolean} checked */
  enableCheckBox(checked: boolean = false): void {
    api.grok_TreeViewNode_EnableCheckBox(this.d, checked);
  }
}

export class RangeSlider extends DartWidget {

  static create(): RangeSlider {
    return toJs(api.grok_RangeSlider());
  }

  /** Gets minimum range value.
   * @type {number}
   */
  get minRange(): number {
    return api.grok_RangeSlider_Get_MinRange(this.d)
  };

  /** Gets maximum range value.
   * @type {number}
   */
  get maxRange(): number {
    return api.grok_RangeSlider_Get_MaxRange(this.d);
  };

  /** Gets minimum value.
   * @type {number}
   */
  get min(): number {
    return api.grok_RangeSlider_Get_Min(this.d);
  };

  /** Gets maximum value.
   * @type {number}
   */
  get max(): number {
    return api.grok_RangeSlider_Get_Max(this.d);
  };

  /** Sets values to range slider.
   * @param {number} minRange
   * @param {number} maxRange
   * @param {number} min
   * @param {number} max */
  setValues(minRange: number, maxRange: number, min: number, max: number): void {
    api.grok_RangeSlider_SetValues(this.d, minRange, maxRange, min, max);
  };

  /** @returns {Observable} */
  get onValuesChanged(): Observable<any> {
    return observeStream(api.grok_RangeSlider_Get_OnValuesChanged(this.d));
  }
}

export class HtmlTable extends DartWidget {

  /** @constructs {HtmlTable} */
  constructor(d: any) {
    super(d);
  }

  /** Creates a visual table based on [items], [renderer], and [columnNames]
   * @returns {HtmlTable} */
  static create(items: any, renderer: any, columnNames: any = null): HtmlTable {
    return toJs(api.grok_HtmlTable(items, renderer !== null ? (object: any, ind: number) => renderer(toJs(object), ind) : null, columnNames));
  }

  /** Removes item */
  remove(item: any): void {
    api.grok_HtmlTable_Remove(this.d, item);
  }
}

export class ColumnComboBox extends DartWidget {
  /** @constructs {ColumnComboBox} */
  constructor(d: any) {
    super(d);
  }

  /** Creates a column combo box with specified [dataframe] and [predicate]
   * @returns {ColumnComboBox} */
  static create(dataframe: DataFrame, predicate: Function): ColumnComboBox {
    return toJs(api.grok_ColumnComboBox(dataframe.d, (x: any) => predicate(toJs(x))));
  }

  /** @type {boolean} */
  get vertical(): boolean {
    return api.grok_ColumnComboBox_Get_Vertical(this.d);
  }

  /** @type {string} */
  get caption(): string {
    return api.grok_ColumnComboBox_Get_Caption(this.d);
  }

  set caption(c: string) {
    api.grok_ColumnComboBox_Set_Caption(this.d, c);
  }

  /** @type {Property} */
  get property(): Property {
    return toJs(api.grok_ColumnComboBox_Get_Property(this.d));
  }

  onEvent(eventId: string): rxjs.Observable<any> {
    return __obs(eventId, this.d);
  }
  get onChanged(): rxjs.Observable<String> { return this.onEvent('d4-column-box-column-changed'); }
}