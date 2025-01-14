import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {UaView} from './tabs/ua';
import {UaToolbox} from './ua-toolbox';
import {EventsView} from './tabs/events';
import {PackagesView} from './tabs/packages';
import {FunctionsView} from './tabs/functions';
import {OverviewView} from './tabs/overview';
import {LogView} from "./tabs/log";

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
    ViewHandler.UA = new DG.MultiView({viewFactories: {}});
    ViewHandler.UA.parentCall = grok.functions.getCurrentCall();
    const toolbox = await UaToolbox.construct();
    const params = this.getSearchParameters();
    // [ErrorsView, FunctionsView, UsersView, DataView];
    const viewClasses: (typeof UaView)[] = [OverviewView, PackagesView, FunctionsView, EventsView, LogView];
    // const viewFactories: {[name: string]: any} = {};
    for (let i = 0; i < viewClasses.length; i++) {
      const currentView = new viewClasses[i](toolbox);
      currentView.tryToinitViewers();
      ViewHandler.UA.addView(currentView.name, () => currentView, false);
    }
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
    let helpShown = false;
    ViewHandler.UA.tabs.onTabChanged.subscribe((tab) => {
      const view = ViewHandler.UA.currentView;
      if (view instanceof UaView) {
        for (const viewer of view.viewers) {
          if (!viewer.activated) {
            viewer.activated = true;
            viewer.reloadViewer();
          }
        }
      }
      if (!helpShown) {
        if (ViewHandler.UA.currentView instanceof PackagesView || ViewHandler.UA.currentView instanceof FunctionsView) {
          grok.shell.windows.showToolbox = true;
          grok.shell.windows.showContextPanel = true;
          const info = ui.divText(`To view more detailed information about the events represented by a particular point,\
    simply click on the point of interest. You can also select multiple points. Once you've made your selection,\
    more information about the selected events will be displayed on context pane`);
          info.classList.add('ua-hint');
          grok.shell.o = info;
        }
        helpShown = true;
      }
    });
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
