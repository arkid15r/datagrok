import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {UaView} from './tabs/ua';
import {UaToolbox} from './ua-toolbox';
// import {OverviewView} from './views/overview-view';
// import {EventsView} from './views/events-view';
// import {ErrorsView} from './tabs/errors';
// import {FunctionsView} from './views/function-errors-view';
// import {UsersView} from './views/users-view';
// import {DataView} from './views/data-view';
import {PackagesView} from './tabs/packages';
import {FunctionsView} from './tabs/functions';

const APP_PREFIX: string = `/apps/UsageAnalysis/`;


export class ViewHandler {
  private static instance: ViewHandler;
  private urlParams: Map<string, string> = new Map<string, string>();
  public static UAname = 'Usage Analysis';
  private static tabs: DG.TabControl;

  public static getInstance(): ViewHandler {
    if (!ViewHandler.instance)
      ViewHandler.instance = new ViewHandler();
    return ViewHandler.instance;
  }

  async init() {
    const pathSplits = decodeURI(window.location.pathname).split('/');
    const params = this.getSearchParameters();
    const toolbox = await UaToolbox.construct();
    ViewHandler.tabs = ui.tabControl();
    ViewHandler.tabs.root.style.width = 'inherit';
    ViewHandler.tabs.root.style.height = 'inherit';
    // [OverviewView, EventsView, ErrorsView, FunctionsView, UsersView, DataView];
    const viewClasses: (typeof UaView)[] = [PackagesView, FunctionsView];

    for (let i = 0; i < viewClasses.length; ++i) {
      ViewHandler.tabs.addPane(viewClasses[i].viewName, () => {
        const currentView = new viewClasses[i](toolbox);
        currentView.tryToinitViewers();
        return currentView.root;
      });
    }
    if (pathSplits.length > 3 && pathSplits[3] != '') {
      const viewName = pathSplits[3];
      if (ViewHandler.tabs.panes.map((p) => p.name).includes(viewName))
        ViewHandler.tabs.currentPane = ViewHandler.tabs.getPane(viewName);
      else
        ViewHandler.tabs.currentPane = ViewHandler.tabs.getPane(viewClasses[0].viewName);
    } else
      ViewHandler.tabs.currentPane = ViewHandler.tabs.getPane(viewClasses[0].viewName);

    const paramsHaveDate = params.has('date');
    const paramsHaveUsers = params.has('users');
    const paramsHavePackages = params.has('packages');
    if (paramsHaveDate || paramsHaveUsers || paramsHavePackages) {
      if (paramsHaveDate)
        toolbox.setDate(params.get('date')!);
      if (paramsHaveUsers)
        await toolbox.setGroups(params.get('users')!);
      if (paramsHavePackages)
        await toolbox.setPackages(params.get('packages')!);
      toolbox.applyFilter();
    }

    const UA = grok.shell.newView(ViewHandler.UAname, [ViewHandler.tabs]);
    UA.box = true;
    UA.toolbox = toolbox.rootAccordion.root;
  }

  public static changeTab(name: string) {
    ViewHandler.tabs.currentPane = ViewHandler.tabs.getPane(name);
  }

  getSearchParameters() : Map<string, string> {
    const prmstr = window.location.search.substring(1);
    return new Map<string, string>(Object.entries(prmstr ? this.transformToAssocArray(prmstr) : {}));
  }

  transformToAssocArray(prmstr: string) {
    const params: {[key: string]: string} = {};
    const prmarr = prmstr.split('&');
    for (let i = 0; i < prmarr.length; i++) {
      const tmparr = prmarr[i].split('=');
      params[decodeURI(tmparr[0])] = decodeURI(tmparr[1]);
    }
    return params;
  }

  setUrlParam(key: string, value: string, saveDuringChangingView: boolean = false) {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set(key, value);

    const params: string[] = [];

    for (const keyAndValue of urlParams.entries())
      params.push(encodeURI(keyAndValue.join('=')));

    if (saveDuringChangingView)
      this.urlParams.set(key, value);

    grok.shell.v.path = `${APP_PREFIX}${grok.shell.v.name}?${params.join('&')}`;
  }
}
