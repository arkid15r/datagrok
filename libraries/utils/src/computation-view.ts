/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {FunctionView} from './function-view';

/**
 * Base class for handling Compute models (see https://github.com/datagrok-ai/public/blob/master/help/compute/compute.md).
 * In most cases, the computation is a simple {@link Func}
 * Extend it in cases where a behavior or UI not supported by the {@link FunctionView} is needed.
 *
 * It provides the following functionality out-of-the-box, where each section could be customized:
 * - a structured way to represent input and output parameters: {@link parameters}
 * - generic way to generate UI for inputs, outputs, and interactivity (running the model, etc)
 *   - persisting historical results to the db (via {@link parameters})
 * - export (to Excel and PDF): {@link export}
 * - easy loading of historical runs
 * - routing
 * - entering the real, measured (as opposed to predicted) values manually
 * - notifications for changing inputs, completion of computations, etc: {@link onInputChanged}
 * */
export class ComputationView extends FunctionView {
  /** Find the function by fully specified name, link it to the view and constructs the view.
    * If function name is not specified, calls {@link init} and {@link build} without FuncCall linkage.
    * @stability Stable
  */
  constructor(funcName?: string) {
    super();

    this.parentCall = grok.functions.getCurrentCall();
    this.parentView = grok.functions.getCurrentCall().parentCall.aux['view'];
    this.basePath = `/${grok.functions.getCurrentCall()?.func.name}`;

    ui.setUpdateIndicator(this.root, true);
    if (funcName) {
      grok.functions.eval(funcName).then(async (func: DG.Func) => {
        const funccall = func.prepare({});
        this.linkFunccall(funccall);
        await this.init();
        this.build();
      }).finally(() => {
        ui.setUpdateIndicator(this.root, false);
      });
    } else {
      setTimeout(async () => {
        await this.init();
        this.build();
        ui.setUpdateIndicator(this.root, false);
      }, 0);
    }

    grok.shell.o = this.historyRoot;
  }

  /** Override to customize getting mocks
    * @stability Experimental
  */
  getMocks: ({mockName: string, action: () => Promise<void>}[]) | null = null;

  /** Override to customize getting templates
    * @stability Experimental
  */
  getTemplates: ({name: string, action: () => Promise<void>}[]) | null = null;

  /** Override to customize getting help feature
    * @stability Stable
  */
  getHelp: (() => Promise<void>) | null = null;

  /** Override to customize bug reporting feature
    * @stability Stable
  */
  reportBug: (() => Promise<void>) | null = null;

  /**
   * Looks for {@link reportBug}, {@link getHelp} and {@link exportConfig} members and creates model menus
   * @stability Stable
  */
  override buildRibbonMenu() {
    super.buildRibbonMenu();

    if (!this.exportConfig && !this.reportBug && !this.getHelp && !this.getMocks && !this.getTemplates) return;

    const ribbonMenu = this.ribbonMenu.group('Model');

    if (this.getMocks && this.getMocks.length > 0) {
      if (this.getMocks.length === 1) {
        ribbonMenu.item('Input data mock', this.getMocks[0].action);
      } else {
        const dataGroup = ribbonMenu.group('Input data mocks');
        this.getMocks.forEach((val) => {
          dataGroup.item(val.mockName, val.action);
        });
        ribbonMenu.endGroup();
      }
    }

    if (this.getTemplates && this.getTemplates.length > 0) {
      if (this.getTemplates.length === 1) {
        ribbonMenu.item('Input data template', this.getTemplates[0].action);
      } else {
        const dataGroup = ribbonMenu.group('Input data templates');
        this.getTemplates.forEach((val) => {
          dataGroup.item(val.name, val.action);
        });
        ribbonMenu.endGroup();
      }
    }

    if (this.exportConfig && this.exportConfig.supportedFormats.length > 0) {
      ribbonMenu
        .group('Export')
        .items(this.exportConfig.supportedFormats, async (format: string) => DG.Utils.download(this.exportConfig!.filename(format), await this.exportConfig!.export(format)))
        .endGroup();
    }

    if (this.reportBug)
      ribbonMenu.item('Report a bug', () => this.reportBug!());

    if (this.getHelp)
      ribbonMenu.item('Help', () => this.getHelp!());
  }

  override buildHistoryBlock(): HTMLElement {
    const mainAcc = ui.accordion();
    mainAcc.root.style.width = '100%';
    mainAcc.addTitle(ui.h1('History'));
    const dateInput = ui.stringInput('Date', 'Any time');
    dateInput.addPatternMenu('datetime');

    mainAcc.addPane('Filter', () => {
      const form =ui.divV([
        ui.choiceInput('User', 'Current user', ['Current user']),
        dateInput,
      ], 'ui-form-condensed ui-form');
      form.style.marginLeft = '0px';

      return form;
    });

    const renderSavedCard = async (funcCall: DG.FuncCall) => {
      const currentUser = await grok.dapi.users.current();

      return ui.divV([
        ui.h3(funcCall.aux['Title'] ?? 'My custom title'),
        ui.divText(funcCall.aux['Annotation'] ?? 'My custom annotation with some details'),
        ui.render(currentUser),
      ]);
    };

    const renderHistoryCard = async (funcCall: DG.FuncCall) => {
      const currentUser = await grok.dapi.users.current();

      return ui.divV([
        ui.h3(funcCall.aux['Title'] ?? 'My custom title'),
        ui.render(currentUser),
      ]);
    };

    mainAcc.addPane('Saved', () => ui.wait(async () => {
      const historicalRuns = await this.pullRuns(this.func!.id);

      return ui.divV(historicalRuns.filter((run) => run.id.lastIndexOf('0') > 14).map((run) => ui.wait(() => renderSavedCard(run))));
    }));

    mainAcc.addPane('History', () => ui.wait(async () => {
      const historicalRuns = await this.pullRuns(this.func!.id);

      return ui.divV(historicalRuns.map((run) => ui.wait(() => renderHistoryCard(run))));
    }));

    const newHistoryBlock = mainAcc.root;
    ui.empty(this.historyRoot);
    this.historyRoot.style.removeProperty('justify-content');
    this.historyRoot.append(newHistoryBlock);
    return newHistoryBlock;
  }
}
