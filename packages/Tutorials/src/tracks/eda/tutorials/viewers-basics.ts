import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import { filter } from 'rxjs/operators';
import { Tutorial } from "../../../tutorial";
import { Observable } from 'rxjs';


export class ViewersTutorial extends Tutorial {
  get name() { return 'Viewers'; }
  get description() {
    return 'Learn how to use different viewers together';
  }

  protected async _run() {
    this.title('Opening viewers');

    this.describe(`There are a few ways to add a viewer:
    <ol>
      <li>Toolbox (a panel on the left side)</li>
      <li>The top menu icon: <i class="grok-icon svg-icon svg-add-viewer"></i></li>
    </ol>
    `);
    this.describe('The icon opens a list of custom viewers, while ' +
    'the "Viewers" tab contains a standard set of visualizations.');

    this.describe("Let's start by opening some viewers.");

    const sp = await this.openPlot('scatter plot', (x) => x.type === DG.VIEWER.SCATTER_PLOT);
    const hist = await this.openPlot('histogram', (x) => x.type === DG.VIEWER.HISTOGRAM);
    const pie = await this.openPlot('pie chart', (x) => x.type === DG.VIEWER.PIE_CHART);

    this.title('Selection and the current record');

    await this.action('Select points by dragging a rectangle on a scatter plot while holding Shift.',
      this.t.onSelectionChanged);

    this.describe('Move the mouse over histogram bins to see how the points that fall into that bin ' +
      'are reflected in other viewers. Similarly, hover the mouse over pie chart segments.');

    await this.action('Note that the selection is synchronized between all viewers. Now, select one ' +
      'of the bins on the histogram by clicking on it, and see the corresponding records being ' +
      'highlighted on both scatter plot and grid.', this.t.onSelectionChanged);

    this.describe('The same concept applies to the rest of the viewers, such as a pie chart or histogram. ' +
      'To select multiple data points, click on a segment while holding Shift. To unselect, hold Ctrl+Shift ' +
      'while clicking. To invert, hold Ctrl while clicking.');
    
    this.describe('Please go ahead and try it out.');
    await this.action('Move the mouse over records on the scatter plot and grid, and note that the ' +
      'corresponding records are being highlighted in other viewers. Click on a point to make it current, ' +
      'and see how other viewers indicate where the current record is.', this.t.onCurrentRowChanged);

  }
}
