import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
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
  static UA: DG.MultiView;

  public static getInstance(): ViewHandler {
    if (!ViewHandler.instance)
      ViewHandler.instance = new ViewHandler();
    return ViewHandler.instance;
  }

  async init() {
    // const pathSplits = decodeURI(window.location.pathname).split('/');
    ViewHandler.UA = new DG.MultiView({viewFactories: {}});
    const toolbox = await UaToolbox.construct();
    const params = this.getSearchParameters();
    // ViewHandler.tabs = ui.tabControl();
    // ViewHandler.tabs.root.style.width = 'inherit';
    // ViewHandler.tabs.root.style.height = 'inherit';
    // [OverviewView, EventsView, ErrorsView, FunctionsView, UsersView, DataView];
    const viewClasses: (typeof UaView)[] = [PackagesView, FunctionsView];
    // const viewFactories: {[name: string]: any} = {};
    for (let i = 0; i < viewClasses.length; i++) {
      const currentView = new viewClasses[i](toolbox);
      // viewFactories[currentView.name] = () => currentView;
      currentView.tryToinitViewers();
      ViewHandler.UA.addView(currentView.name, () => currentView, false);
    }
    // if (pathSplits.length > 3 && pathSplits[3] != '') {
    //   const viewName = pathSplits[3];
    //   if (ViewHandler.tabs.panes.map((p) => p.name).includes(viewName))
    //     ViewHandler.tabs.currentPane = ViewHandler.tabs.getPane(viewName);
    //   else
    //     ViewHandler.tabs.currentPane = ViewHandler.tabs.getPane(viewClasses[0].viewName);
    // } else
    //   ViewHandler.tabs.currentPane = ViewHandler.tabs.getPane(viewClasses[0].viewName);

    const paramsHaveDate = params.has('date');
    const paramsHaveUsers = params.has('users');
    const paramsHavePackages = params.has('packages');
    if (paramsHaveDate || paramsHaveUsers || paramsHavePackages) {
      if (paramsHaveDate)
        toolbox.setDate(params.get('date')!);
      if (paramsHaveUsers)
        toolbox.setGroups(params.get('users')!);
      if (paramsHavePackages)
        toolbox.setPackages(params.get('packages')!);
      toolbox.applyFilter();
    }

    ViewHandler.UA.name = ViewHandler.UAname;
    ViewHandler.UA.box = true;
    grok.shell.addView(ViewHandler.UA);
  }

  public static getView(name: string) {
    return ViewHandler.UA.getView(name) as UaView;
  }

  public static getCurrentView(): UaView {
    return ViewHandler.UA.currentView as UaView;
  }

  public static changeTab(name: string) {
    ViewHandler.UA.tabs.currentPane = ViewHandler.UA.tabs.getPane(name);
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
