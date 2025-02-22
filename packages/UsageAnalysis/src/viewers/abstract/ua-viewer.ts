import * as ui from 'datagrok-api/ui';


export abstract class UaViewer {
  root: HTMLElement;
  name: string;
  setStyle: Function = null as any;
  loader: HTMLElement;

  static splineStyle: Object = {
    'aggrType': 'count',
    'innerChartMarginTop': 0,
    'innerChartMarginBottom': 0,
    'outerChartMarginTop': 5,
    'outerChartMarginBottom': 0,
    'yGlobalScale': false,
    'showTopPanel': false,
    'showMouseOverRowLine': false,
    'showXSelector': false,
    'showYSelectors': false,
    'showAggrSelectors': false,
    'showSplitSelector': false,
    // "showYAxis": false,
    'showMarkers': 'Never',
    'Title': 'Users',
  };

  static defaultBarchartOptions: Object = {
    valueAggrType: 'avg',
    style: 'dashboard',
  };

  static defaultChartOptions: Object = {
    style: 'dashboard',
  };

  protected constructor(name: string, setStyle?: Function | null) {
    this.root = ui.box();
    this.name = name;
    if (setStyle)
      this.setStyle = setStyle;
    this.loader = ui.div([ui.loader()], 'grok-wait');
  }

  reloadViewer() {}

  setViewer(loader?: any, host?: HTMLDivElement): void {}
}
