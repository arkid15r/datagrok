/* eslint-disable valid-jsdoc */
import wu from 'wu';
import $ from 'cash-dom';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export class FunctionView extends DG.ViewBase {
  constructor(func: DG.Func) {
    super();
    this.func = func;
  }

  init() {
    this.lastCall ??= this.func.prepare();
    this.lastCall.aux['view'] = this;
    this.lastCall.context = DG.Context.cloneDefault();

    this.singleDfParam = wu(this.func.outputs).filter((p) => p.propertyType == DG.TYPE.DATA_FRAME)
      .toArray().length == 1;

    for (const inParam of wu(this.lastCall.inputParams.values() as DG.FuncCallParam[])
      .filter((p: DG.FuncCallParam) =>
        p.property.propertyType == DG.TYPE.DATA_FRAME && p.property.options['viewer'] != null)) {
      this.showInputs = true;
      const self = this;
      this.subs.push(inParam.onChanged.subscribe(async function(param: DG.FuncCallParam) {
        self.clearResults(true, false);
        param.processOutput();

        self.appendResultDataFrame(param,
          {height: (self.singleDfParam && !grok.shell.windows.presentationMode) ? 600 : 400,
            category: 'INPUT'});
      }));
    }

    this.root.appendChild(this.build());
    this.name = this.func.friendlyName;
    this.box = true;
  }

  private _type: string = 'function';
  public get type(): string {
    return this._type;
  }
  public func: DG.Func;
  public lastCall: DG.FuncCall | null = null;
  _inputFields: Map<string, DG.InputBase> = new Map<string, DG.InputBase>();

  /** Input panel for form, run button, etc. On the left side by default */
  inputPanel = ui.div() as HTMLElement;
  /** Override if custom input panel is required */
  buildInputPanel(): HTMLElement {
    return ui.div([this.buildInputForm(this.lastCall!)]);
  }
  /** Call to update input panel */
  async renderInputPanel() {
    const newInputPanel = this.buildInputPanel();
    this.inputPanel.replaceWith(newInputPanel);
    this.inputPanel = newInputPanel;
  }

  /** Output panel for viewing results. On the right side by default */
  outputPanel = ui.div() as HTMLElement;
  /** Override if custom ouptut panel is required */
  buildOutputPanel(): HTMLElement {
    return ui.div();
  }
  /** Call to update output panel */
  async renderOutputPanel() {
    const newOutputPanel = this.buildOutputPanel();
    console.log('newOutputPanel', newOutputPanel);
    this.outputPanel.replaceWith(newOutputPanel);
    this.outputPanel = newOutputPanel;
    console.log('outputPanel', this.outputPanel);
  }

  public async render() {
    const newRoot = this.build();
    this.root.replaceWith(newRoot);
    this.root = newRoot;
  }

  build(): HTMLElement {
    this.renderInputPanel();
    this.renderOutputPanel();
    return ui.divH([this.inputPanel, this.outputPanel]);
  }

  clearResults(clearTabs: boolean = true, showOutput: boolean = true) {
    const categories: string[] = [];
    //  resultTabs.clear();
    if (this.showInputs) {
      categories.push('INPUT');
      this.resultTabs.set('INPUT', this.inputsDiv);
    }
    for (const p of this.func!.outputs) {
      if (categories.includes(p.category))
        continue;
      categories.push(p.category);
    }
    if (clearTabs && (categories.length > 1 || (categories.length == 1 && categories[0] != 'Misc'))) {
      this.resultsTabControl = DG.TabControl.create();
      for (const c of categories) {
        if (!this.resultTabs.has(c))
          this.resultTabs.set(c, ui.div([], 'ui-panel,grok-func-results'));
        let name = c;
        if (this.showInputs && categories.length == 2 && c == 'Misc')
          name = 'OUTPUT';
        this.resultsTabControl.addPane(name, () => this.resultTabs.get(c) ?? ui.div());
      }
      if (categories.length > 1 && this.showInputs && showOutput)
        this.resultsTabControl.currentPane = this.resultsTabControl.panes[1];
      this.resultsDiv = this.resultsTabControl.root;
    } else {
      this.resultsDiv = ui.panel([], 'grok-func-results');
      this.resultsTabControl = undefined;
    }
    this.buildOutputPanel();
  }

  inputFieldsToParameters(call: DG.FuncCall): void { }

  async run(): Promise<void> {
    if (!this.lastCall) return;

    this.inputFieldsToParameters(this.lastCall);

    try {
      await this.compute(this.lastCall);
    } catch (e) {
      // this.onComputationError.next(this.lastCall);
    }

    this.outputParametersToView(this.lastCall);
  }

  async compute(call: DG.FuncCall): Promise<void> {
    ui.setUpdateIndicator(this.outputPanel, true);
    this.lastCall = await call.call(true, undefined, {processed: true});
    ui.setUpdateIndicator(this.outputPanel, false);
  }

  outputParametersToView(call: DG.FuncCall): void {
    this.clearResults(false, true);
    for (const [, p] of call.outputParams) {
      p.processOutput();
      if (p.property.propertyType == DG.TYPE.DATA_FRAME && p.value != null)
        this.appendResultDataFrame(p, {caption: p.property.name, category: p.property.category});
    }
  }

  showInputs: boolean = false;
  singleDfParam: boolean = false;
  paramViewers: Map<string, DG.Viewer[]> = new Map();
  resultsTabControl: DG.TabControl | undefined;
  resultTabs: Map<String, HTMLElement> = new Map();
  resultsDiv: HTMLElement = ui.panel([], 'grok-func-results');
  inputsDiv: HTMLDivElement = ui.panel([], 'grok-func-results');

  appendResultDataFrame(param: DG.FuncCallParam, options?: { caption?: string, category?: string, height?: number}) {
    const df = param.value;
    let caption = options?.caption;
    let height = options?.height ?? 400;
    const viewers: DG.Viewer[] = param.aux['viewers'] ?? [];
    caption ??= param.aux['viewerTitle'] ??
      ((this.singleDfParam && viewers.length == 1) ? '' : param.property.caption) ?? '';
    let existingViewers: DG.Viewer[] | undefined = this.paramViewers.get(param.name);
    if (existingViewers != null) {
      for (const v of existingViewers)
        v.dataFrame = df;

      return;
    }
    existingViewers ??= [];
    this.paramViewers.set(param.name, existingViewers);
    if (viewers.length == 0)
      viewers.push(df.plot.grid());

    const hideList: HTMLElement[] = [];
    let blocks: number = 0;
    let blockSize: number = 0;
    const gridWrapper = ui.block([]);

    const gridSwitch = !wu(viewers).some((v: DG.Viewer) => v.type == 'Grid');
    $(gridWrapper).hide();

    const getHeader = (sw: boolean) => {
      const s = caption ?? df.name ?? '';
      const header = ui.div([], 'grok-func-results-header');
      if (s != '') {
        const h = ui.h1(s);
        ui.Tooltip.bind(h, () => s);
        header.appendChild(h);
      }
      if (gridSwitch) {
        const icon = ui.iconSvg('table', (e) => {
          e.stopPropagation();
          ui.setDisplayAll(hideList, !sw);
          ui.setDisplay(gridWrapper, sw);
          gridWrapper.classList.add(`ui-block-${blockSize}`);
        }
        , 'Show grid');
        if (!sw)
          icon.classList.add('active');
        header.appendChild(icon);
      }
      if (!grok.shell.tables.includes(df)) {
        header.appendChild(ui.icons.add((e: any) => {
          e.stopPropagation();
          const v = grok.shell.addTableView(df);
          (async () => {
            for (const viewer of viewers) {
              if (viewer.type != 'Grid') {
                const newViewer = await df.plot.fromType(viewer.type) as DG.Viewer;
                newViewer.setOptions(viewer.getOptions());
                v.addViewer(newViewer);
              }
            }
          })();
        },
        'Add to workspace',
        ));
      }
      return header;
    };

    if (gridSwitch) {
      gridWrapper.appendChild(getHeader(false));
      const grid = df.plot.grid();
      grid.root.style.height = `${height}px`;
      gridWrapper.appendChild(grid.root);
      existingViewers.push(grid);
    }

    let header = getHeader(true);
    this._appendResultElement(gridWrapper, options?.category);
    for (const viewer of viewers) {
      if (viewer?.tags == null)
        continue;
      existingViewers.push(viewer);
      const block = viewer.tags['.block-size'] ?? 100;
      const wrapper = ui.block([], `ui-block-${block}`);
      if (blocks + block <= 100) {
        hideList.push(wrapper);
        blockSize += block;
      }
      blocks += block;
      wrapper.appendChild(header);
      header = ui.div([], 'grok-func-results-header');
      wrapper.appendChild(viewer.root);
      if (viewer.type == 'grid') {
        // @ts-ignore
        const totalHeight = viewer.getOptions()['rowHeight'] *
          (viewer.dataFrame!.rowCount + 1);
        if (totalHeight < height)
          height = totalHeight;
      }
      viewer.root.style.height = `${height}px`;
      this._appendResultElement(wrapper, options?.category);
    }
  }

  _appendResultElement(d: HTMLElement, category?: string) {
    if (category != null && this.resultsTabControl != undefined && this.resultTabs.get(category) != null)
      this.resultTabs.get(category)!.appendChild(d);
    else
      this.resultsDiv.appendChild(d);
  }

  /** helper methods */
  buildInputForm(call: DG.FuncCall): HTMLElement {
    return ui.wait(async () => {
      const runButton = ui.bigButton('Run', async () => {
        call.aux['view'] = this.dart;
        await this.run();
      });
      const editor = ui.div();
      const inputs: DG.InputBase[] = await call.buildEditor(editor, {condensed: true});
      editor.appendChild(ui.buttonsInput([runButton]));
      for (const input of inputs)
        this._inputFields.set(input.property.name, input);
      return editor;
    });
  };
}
