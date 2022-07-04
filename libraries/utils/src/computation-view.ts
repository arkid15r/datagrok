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

    if (!this.exportConfig && !this.reportBug && !this.getHelp) return;

    const ribbonMenu = this.ribbonMenu.group('Model');

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
}
