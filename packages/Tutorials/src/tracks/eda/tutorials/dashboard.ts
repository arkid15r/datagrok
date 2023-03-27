import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import { filter } from 'rxjs/operators';
import { Tutorial, TutorialPrerequisites } from '@datagrok-libraries/tutorials/src/tutorial';
import { interval } from 'rxjs';


export class DashboardTutorial extends Tutorial {
  get name(): string {
    return 'Dashboards';
  }
  get description(): string {
    return 'Creation of interactive dashboards';
  }
  get steps(): number {
    return 25;
  }

  demoTable: string = '';
  helpUrl: string = '';
  prerequisites: TutorialPrerequisites = {grokConnect: true};

  protected async _run(): Promise<void> {
    this.header.textContent = this.name;
    this.describe('In this tutorial, we will learn how to query data and visualize the results.');

    this.title('Access data');

    const dbViewInfo = 'In this view, you can manage connections to various data ' +
      'providers and run data queries. Each tree branch corresponds to a provider and shows ' +
      'connections to the given data source.';

    await this.openViewByType(
      'Find "Data | Databases" in the sidebar to open the tree of connections',
      DG.View.DATABASES,
      this.getSidebarHints('Data', DG.View.DATABASES),
      dbViewInfo
    );

    const connectionName = 'Starbucks';
    const queryName = 'Stores in @state';

    const providerRoot = $('div.d4-tree-view-group-label').filter((idx, el) =>
      (el.textContent ?? '')?.startsWith('Postgres'))[0]!;

    const dlg = await this.openDialog('Create a connection to PostgreSQL server', 'Add new connection',
      providerRoot, 'Open the context menu on the PostgreSQL connector and click "Add connection..."');

    await this.dlgInputAction(dlg, `Set "Name" to "${connectionName}"`, 'Name', connectionName);
    await this.dlgInputAction(dlg, 'Set "Server" to "db.datagrok.ai"', 'Server', 'db.datagrok.ai');
    await this.dlgInputAction(dlg, 'Set "Port" to "54324"', 'Port', '54324');
    await this.dlgInputAction(dlg, 'Set "Db" to "starbucks"', 'Db', 'starbucks');
    await this.dlgInputAction(dlg, 'Set "Login" to "datagrok"', 'Login', 'datagrok');
    await this.dlgInputAction(dlg, 'Set "Password" to "datagrok"', 'Password', 'datagrok');
    await this.action('Click "OK"', dlg.onClose, $(dlg.root).find('button.ui-btn.ui-btn-ok')[0]);

    const dqv = await this.openViewByType(`Create a data query to the "${connectionName}" data connection`,
      'DataQueryView', $(providerRoot).find('div.d4-tree-view-group-label').filter((idx, el) =>
        el.textContent === connectionName)[0],
      `Open the context menu on PostgreSQL | ${connectionName} and click "Add query..."`);

    // UI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await this.textInpAction(dqv.root, `Set "Name" to "${queryName}"`, 'Name', queryName);

    const query = 'select * from starbucks_us where state = @state;';
    const paramAnnotation = '--input: string state';
    const queryDescription = 'As you can see, the query uses one parameter identifying the state. ' +
      'Let\'s add an annotation for it. After that, we will be able to pass a state name into the query.';
    const paramQueryDescription = 'Your query should now consist of two lines: a comment with parameter ' +
      'annotation and the "select" statement that makes use of this parameter.';

    await this.action(`Add "${query}" to the editor`,
      interval(1000).pipe(filter(() => $(dqv.root).find('pre.CodeMirror-line > span')
        .filter((idx, el) => el.textContent?.trim() === query)[0] != null)),
      null, queryDescription,
    );

    await this.action(`Add "${paramAnnotation}" as the first line of the query`,
      interval(1000).pipe(filter(() => $(dqv.root).find('pre.CodeMirror-line > span')
        .filter((idx, el) => el.textContent?.trim() === paramAnnotation)[0] != null)),
      null, paramQueryDescription);

    const paramEditorDlg = await this.openDialog('Hit the "Play" button',
      queryName, $('div.d4-ribbon-item').has('i.fa-play')[0]);
    await this.dlgInputAction(paramEditorDlg, 'Set state to "NY"', 'State', 'NY');

    const resultRowCount = 645;
    await this.action('Click "OK" to run the query', grok.functions.onAfterRunAction.pipe(filter((call) => {
      const res = call.outputs.get('result');
      return call.func.name === 'StoresInState' &&
        res instanceof DG.DataFrame && res?.rowCount === resultRowCount;
    })), $(paramEditorDlg.root).find('button.ui-btn.ui-btn-ok')[0]);

    this.title('Create a dashboard');

    await this.openViewByType('Add query results to the workspace',
      DG.VIEW_TYPE.TABLE_VIEW, $('div.d4-ribbon-item').has('i.fa-plus')[0]);

    await this.openPlot('bar chart', (x) => x.type === DG.VIEWER.BAR_CHART);

    const projectPane = grok.shell.sidebar.getPane('Projects');
    const projectPaneHints = [
      projectPane.header,
      $('button.ui-btn').filter((idx, el) => el.textContent?.toLowerCase() === 'upload')[0]!,
    ];
    const uploadProjectInfo = 'Click on the "UPLOAD" button in the scratchpad.';

    const projectName = 'Coffee sales dashboard';
    const projectDlg = await this.openDialog('Save a project', 'Upload project', projectPaneHints, uploadProjectInfo);
    const projectNameHint = $(projectDlg.root).find('div.grok-project-summary > input.ui-input-editor')[0];
    await this.action(`Set the project name to "${projectName}"`, interval(1000).pipe(filter(() => projectName ===
      (<HTMLInputElement>$(projectDlg.root).find('div.grok-project-summary > input.ui-input-editor')[0])?.value)),
      projectNameHint);

    const sharingDescription = 'You can share a newly created project with other users of the platform. Also, ' +
      'there is a link your project will be available at. Copy it, if you prefer this way of sharing.';
    const shareDlg = await this.openDialog('Click "OK"', `Share ${projectName}`,
      $(projectDlg.root).find('button.ui-btn.ui-btn-ok')[0]);
    await this.action('Skip the sharing step', shareDlg.onClose, null, sharingDescription);

    await this.openViewByType('Open the project gallery', DG.View.PROJECTS,
      this.getSidebarHints('Data', DG.View.PROJECTS));

    await this.action('Find your project',
      grok.events.onAccordionConstructed.pipe(filter((acc) =>
        acc.context instanceof DG.Project && acc.context?.friendlyName == projectName)));
  }
}
