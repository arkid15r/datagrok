/* eslint-disable valid-jsdoc */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {zipSync, Zippable} from 'fflate';
import {Subject, combineLatest} from 'rxjs';
import {filter} from 'rxjs/operators';
import $ from 'cash-dom';
import {FunctionView} from './function-view';
import {ComputationView} from './computation-view';
import {historyUtils} from '../../history-utils';
import '../css/pipeline-view.css';
import {RunComparisonView} from './run-comparison-view';
import {CARD_VIEW_TYPE} from './shared/consts';
import wu from 'wu';

export class PipelineView extends ComputationView {
  public steps = {} as {[scriptNqName: string]: {
    func: DG.Func, editor: string, view: FunctionView, idx: number, options?: {friendlyName?: string}
  }};
  public onStepCompleted = new Subject<DG.FuncCall>();

  private stepTabs: DG.TabControl | null = null;

  // Sets current step of pipeline
  public set currentTabName(name: string) {
    if (this.stepTabs?.getPane(name))
      this.stepTabs!.currentPane = this.stepTabs?.getPane(name);
  }

  // PipelineView unites several export files into single ZIP file
  protected pipelineViewExportExtensions: () => Record<string, string> = () => {
    return {
      'Archive': 'zip',
    };
  };

  protected pipelineViewExportFormats = () => {
    return ['Archive'];
  };

  protected pipelineViewExport = async (format: string) => {
    if (format !== 'Archive')
      throw new Error('This export format is not supported');

    if (!this.stepTabs)
      throw new Error('Set step tabs please for export');

    const zipConfig = {} as Zippable;

    for (const step of Object.values(this.steps)) {
      this.stepTabs.currentPane = this.stepTabs.getPane(step.options?.friendlyName ?? step.func.name);

      await new Promise((r) => setTimeout(r, 100));
      const stepBlob = await step.view.exportConfig!.export('Excel');

      zipConfig[step.view.exportConfig!.filename('Excel')] = [new Uint8Array(await stepBlob.arrayBuffer()), {level: 0}];
    };

    return new Blob([zipSync(zipConfig)]);
  };

  exportConfig = {
    supportedExtensions: this.pipelineViewExportExtensions(),
    supportedFormats: this.pipelineViewExportFormats(),
    export: this.pipelineViewExport,
    filename: this.defaultExportFilename,
  };

  constructor(
    funcName: string,
    private stepsConfig: {
      funcName: string,
      friendlyName?: string
    }[],
  ) {
    super(
      funcName,
      {historyEnabled: true, isTabbed: false},
    );
  }

  public override async init() {
    await this.loadFuncCallById();

    this.stepsConfig.forEach((stepConfig, idx) => {
      //@ts-ignore
      this.steps[stepConfig.funcName] = {idx, options: {friendlyName: stepConfig.friendlyName}};
    });

    this.subs.push(
      grok.functions.onAfterRunAction.pipe(
        filter((run) => Object.values(this.steps).some(({view}) => (view?.funcCall?.id === run?.id) && !!run)),
      ).subscribe((run) => {
        this.onStepCompleted.next(run);
        if (run.func.nqName === this.stepsConfig[this.stepsConfig.length-1].funcName) this.run();
      }),
    );

    const stepScripts = Object.keys(this.steps).map((stepNqName) => {
      const stepScript = (grok.functions.eval(stepNqName) as Promise<DG.Func>);
      return stepScript;
    });
    const loadedScripts = await Promise.all(stepScripts) as DG.Script[];
    loadedScripts.forEach((loadedScript) => {
      this.steps[loadedScript.nqName].func = loadedScript;
    });
    this.root.classList.remove('ui-panel');

    const editorFuncs = {} as {[editor: string]: DG.Func};

    const EDITOR_TAG = 'editor:' as const;
    const NEWLINE = '\n' as const;
    const DEFAULT_EDITOR = 'Compute:PipelineStepEditor';

    const extractEditor = (script: DG.Script) => {
      const scriptCode = script.script;
      const editorTagIndex = scriptCode.indexOf(EDITOR_TAG);
      if (editorTagIndex < 0)
        return DEFAULT_EDITOR;

      const newlineIndex = scriptCode.indexOf(NEWLINE, editorTagIndex);
      const editorFuncName = scriptCode.substring(editorTagIndex + EDITOR_TAG.length, newlineIndex).trim();

      return editorFuncName;
    };

    const editorsLoading = loadedScripts.map(async (loadedScript) => {
      // TO DO: replace for type guard
      const editorName = (loadedScript.script) ? extractEditor(loadedScript): DEFAULT_EDITOR;
      if (!editorFuncs[editorName])
        editorFuncs[editorName] = await(grok.functions.eval(editorName.split(' ').join('')) as Promise<DG.Func>);
      this.steps[loadedScript.nqName].editor = editorName;

      return Promise.resolve();
    });

    await Promise.all(editorsLoading);

    const viewsLoading = loadedScripts.map(async (loadedScript) => {
      const scriptCall: DG.FuncCall = loadedScript.prepare();
      const editorFunc = editorFuncs[this.steps[loadedScript.nqName].editor];

      await this.onBeforeStepFuncCallApply(loadedScript.nqName, scriptCall, editorFunc);
      const view = await editorFunc.apply({'call': scriptCall}) as FunctionView;

      this.steps[loadedScript.nqName].view = view;

      const step = this.steps[loadedScript.nqName];

      const subscribeOnDisableEnable = () => {
        const outerSub = step.view.funcCallReplaced.subscribe(() => {
          const subscribeForTabsDisabling = () => {
            wu(step.view.funcCall.inputParams.values() as DG.FuncCallParam[]).forEach(
              (param) => {
                const disableFollowingTabs = () => {
                  const tabsCount = this.stepTabs!.panes.length;

                  Array.from(
                    {length: tabsCount - (step.idx + 1)},
                    (_, index) => step.idx + 1 + index,
                  ).forEach((idxToDisable) => {
                    $(this.stepTabs!.panes[idxToDisable].header).addClass('d4-disabled');
                    ui.tooltip.bind(
                      this.stepTabs!.panes[idxToDisable].header, 'Previous steps are required to be completed.',
                    );
                  });
                };

                const sub = param.onChanged.subscribe(disableFollowingTabs);
                this.subs.push(sub);

                // DG.DataFrames have interior mutability
                if (param.property.propertyType === DG.TYPE.DATA_FRAME && param.value) {
                  const sub = (param.value as DG.DataFrame).onDataChanged.subscribe(disableFollowingTabs);
                  this.subs.push(sub);
                }
              });
          };
          subscribeForTabsDisabling();

          const subscribeForTabsEnabling = () => {
            const sub = grok.functions.onAfterRunAction.pipe(
              filter((run) => step.view.funcCall.id === run.id && !!run),
            ).subscribe((run) => {
              if (step.idx + 1 < this.stepTabs!.panes.length) {
                $(this.stepTabs!.panes[step.idx + 1].header).removeClass('d4-disabled');
                ui.tooltip.bind(this.stepTabs!.panes[step.idx + 1].header, '');
              }
            });
            this.subs.push(sub);
          };
          subscribeForTabsEnabling();
        });
        this.subs.push(outerSub);
      };

      subscribeOnDisableEnable();
      this.funcCallReplaced.subscribe(() => {
        subscribeOnDisableEnable();

        if (this.isHistorical) {
          this.stepTabs!.panes.forEach((stepTab) => {
            $(stepTab.header).removeClass('d4-disabled');
            ui.tooltip.bind(stepTab.header, '');
          });
        }
      });

      await this.onAfterStepFuncCallApply(loadedScript.nqName, scriptCall, view);
    });

    await Promise.all(viewsLoading);

    await this.onFuncCallReady();
  }

  public override async onComparisonLaunch(funcCallIds: string[]) {
    const parentCall = grok.shell.v.parentCall;

    const childFuncCalls = await Promise.all(
      funcCallIds.map((funcCallId) => historyUtils.loadChildRuns(funcCallId)),
    );

    // Main child function should habe `meta.isMain: true` tag or the last function is used
    const fullMainChildFuncCalls = await Promise.all(childFuncCalls
      .map(
        (res) => res.childRuns.find(
          (childRun) => childRun.func.options['isMain'] === 'true',
        ) ??
        res.childRuns.find(
          (childRun) => childRun.func.nqName === this.stepsConfig[this.stepsConfig.length - 1].funcName,
        )!,
      )
      .map((mainChildRun) => historyUtils.loadRun(mainChildRun.id)));

    const cardView = [...grok.shell.views].find((view) => view.type === CARD_VIEW_TYPE);
    const v = await RunComparisonView.fromComparedRuns(fullMainChildFuncCalls, {
      parentView: cardView,
      parentCall,
    });
    grok.shell.addView(v);
  }

  protected async onBeforeStepFuncCallApply(nqName: string, scriptCall: DG.FuncCall, editorFunc: DG.Func) {
  }

  protected async onAfterStepFuncCallApply(nqName: string, scriptCall: DG.FuncCall, view: FunctionView) {
  }

  public override buildIO() {
    const tabs = Object.values(this.steps)
      .reduce((prev, step) => ({
        ...prev,
        [step.options?.friendlyName ?? step.func.name]: step.view.root,
      }), {} as Record<string, HTMLElement>);

    const pipelineTabs = ui.tabControl(tabs);

    const tabsLine = pipelineTabs.panes[0].header.parentElement!;
    tabsLine.classList.add('d4-ribbon', 'pipeline-view');
    tabsLine.classList.remove('d4-tab-header-stripe');
    tabsLine.firstChild!.remove();
    for (let i = 0; i < pipelineTabs.panes.length; i++) {
      pipelineTabs.panes[i].header.classList.add('d4-ribbon-name');
      pipelineTabs.panes[i].header.classList.remove('d4-tab-header');
    }
    pipelineTabs.panes[0].header.style.marginLeft = '12px';

    pipelineTabs.root.style.height = '100%';
    pipelineTabs.root.style.width = '100%';

    if (!this.isHistorical) {
      pipelineTabs.panes
        .filter((_, idx) => idx >= 1)
        .forEach((stepTab) => {$(stepTab.header).addClass('d4-disabled');});
    }

    this.stepTabs = pipelineTabs;

    return pipelineTabs.root;
  }

  public override async run(): Promise<void> {
    if (!this.funcCall) throw new Error('The correspoding function is not specified');

    await this.onBeforeRun(this.funcCall);
    const pi = DG.TaskBarProgressIndicator.create('Calculating...');
    this.funcCall.newId();
    await this.funcCall.call(); // mutates the funcCall field
    pi.close();

    const stepsSaving = Object.values(this.steps)
      .map(async (step) => {
        const scriptCall = step.view.funcCall;

        scriptCall.options['parentCallId'] = this.funcCall.id;
        scriptCall.newId();

        this.steps[scriptCall.func.nqName].view.lastCall =
          await this.steps[scriptCall.func.nqName].view.saveRun(scriptCall);

        return Promise.resolve();
      });

    await Promise.all(stepsSaving);

    await this.onAfterRun(this.funcCall);

    this.lastCall = await this.saveRun(this.funcCall);
  }

  /**
   * Overrided to use {@link loadChildRuns} during run load.
   * This implementation takes "parentCallId" and looks for the funcCalls with options.parentCallId = parentCallId.
   * Each child run is related to the particular pipeline step.
   * @param funcCallId ID of the parent FuncCall
   * @returns Parent FuncCall
   */
  public async loadRun(funcCallId: string): Promise<DG.FuncCall> {
    const {parentRun: pulledParentRun, childRuns: pulledChildRuns} = await historyUtils.loadChildRuns(funcCallId);

    await this.onBeforeLoadRun();

    pulledChildRuns.forEach(async (pulledChildRun) => {
      this.steps[pulledChildRun.func.nqName].view.linkFunccall(await historyUtils.loadRun(pulledChildRun.id));
    });
    this.lastCall = pulledParentRun;

    await this.onAfterLoadRun(pulledParentRun);

    return pulledParentRun;
  }
}
