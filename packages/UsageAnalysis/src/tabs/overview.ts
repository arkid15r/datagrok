// import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import '../../css/usage_analysis.css';
import {UaToolbox} from '../ua-toolbox';
import {UaView} from './ua';
import {UaFilterableQueryViewer} from '../viewers/ua-filterable-query-viewer';
import {PackagesView} from './packages';
import {UaFilter} from "../filter";

export class OverviewView extends UaView {
  expanded: {[key: string]: boolean} = {f: true, l: true};

  constructor(uaToolbox: UaToolbox) {
    super(uaToolbox);
    this.name = 'Overview';
  }

  async initViewers() : Promise<void> {
    this.root.className = 'grok-view ui-box';
    const uniqueUsersViewer = new UaFilterableQueryViewer({
      filterSubscription: this.uaToolbox.filterStream,
      name: 'UniqueUsers',
      queryName: 'UniqueUsersOverview',
      viewerFunction: (t: DG.DataFrame) => {
        return DG.Viewer.lineChart(t, {
          'overviewColumnName': 'date',
          'xColumnName': 'date',
          'showXSelector': false,
          'yColumnNames': ['count'],
          'showYSelectors': false,
          'showAggrSelectors': false,
          'showSplitSelector': false,
          'showMarkers': 'Never',
          'chartTypes': ['Line Chart'],
          'title': 'Unique users',
        });
      }});

    const getPackagesViewerName = (user?: string) => {
      if (user === undefined)
        return 'Packages unique users';
      else
        return `Package used by ${user}`;
    };

    const getUsersViewerName = (p?: string) => {
      if (p === undefined)
        return 'Users activity';
      else
        return `Users activity in ${p} package`;
    };

    let df: Promise<DG.DataFrame>;
    let packagesSelection: DG.BitSet;
    let usersSelection: DG.BitSet;

    function query(filter: UaFilter) {
      df = grok.data.query('UsageAnalysis:PackagesUsageOverview', {...filter});
      df.then((df) => {
        packagesSelection = DG.BitSet.create(df.rowCount, (i) => true);
        usersSelection = DG.BitSet.create(df.rowCount, (i) => true);
      });
    }
    query(this.uaToolbox.getFilter());
    this.uaToolbox.filterStream.subscribe( (filter) => {
      query(filter);
    });
    const packageStatsViewer = new UaFilterableQueryViewer({
      filterSubscription: this.uaToolbox.filterStream,
      name: 'PackageStats',
      getDataFrame: () => df,
      viewerFunction: (t: DG.DataFrame) => {
        let viewer = DG.Viewer.barChart(t, {
          'valueColumnName': 'user',
          'valueAggrType': 'unique',
          'barSortType': 'by value',
          'barSortOrder': 'desc',
          'showValueAxis': false,
          'showValueSelector': false,
          'splitColumnName': 'package',
          'showCategoryValues': false,
          'showCategorySelector': false,
          'stackColumnName': '',
          'showStackSelector': false,
          'title': getPackagesViewerName(),
          'rowSource': 'All',
        });
        let skipEvent: boolean = false;
        viewer.onEvent('d4-bar-chart-on-category-clicked').subscribe(async (args) => {

          skipEvent = true;
          packagesSelection.init((i) => t.get('package', i) == args.args.categories[0]);
          userStatsViewer.viewer!.props.title = getUsersViewerName(args.args.categories[0]);
          userStatsViewer.viewer!.props.rowSource = 'Filtered';
          t.filter.copyFrom(usersSelection).and(packagesSelection);
          //t.selection.copyFrom(t.filter);
          PackagesView.showSelectionContextPanel(t, this.uaToolbox, this.expanded, 'Overview');
        });
        viewer.root.onclick =(me) => {
          //resetViewers(skipEvent, viewer.table);
          if (skipEvent) {
            skipEvent = false;
            return;
          }
          if (userStatsViewer.viewer!.props.rowSource != 'All') {
            packagesSelection.setAll(true);
            userStatsViewer.viewer!.props.rowSource = 'All';
            userStatsViewer.viewer!.props.title = getUsersViewerName();
          } else {
            usersSelection.setAll(true);
            packageStatsViewer.viewer!.props.rowSource = 'All';
            packageStatsViewer.viewer!.props.title = getPackagesViewerName();
          }
          t.filter.copyFrom(usersSelection).and(packagesSelection);
          t.selection.copyFrom(t.filter);
          PackagesView.showSelectionContextPanel(t, this.uaToolbox, this.expanded, 'Overview');
          skipEvent = false;
        };
        return viewer;
      }});


    const userStatsViewer = new UaFilterableQueryViewer({
      filterSubscription: this.uaToolbox.filterStream,
      name: 'UserStats',
      getDataFrame: () => df,
      viewerFunction: (t: DG.DataFrame) => {
        const viewer = DG.Viewer.barChart(t, {
          'valueColumnName': 'count',
          'valueAggrType': 'sum',
          'barSortType': 'by value',
          'barSortOrder': 'desc',
          'showValueAxis': false,
          'showValueSelector': false,
          'splitColumnName': 'user',
          'showCategoryValues': false,
          'showCategorySelector': false,
          'showStackSelector': false,
          'title': getUsersViewerName(),
          'legendVisibility': 'Never',
          'onClick': 'Select',
          'rowSource': 'All',
        });
        let skipEvent: boolean = false;
        viewer.onEvent('d4-bar-chart-on-category-clicked').subscribe(async (args) => {

          skipEvent = true;
          usersSelection.init((i) => t.get('user', i) == args.args.categories[0]);
          packageStatsViewer.viewer!.props.title = getPackagesViewerName(args.args.categories[0]);
          packageStatsViewer.viewer!.props.rowSource = 'Filtered';
          t.filter.copyFrom(usersSelection).and(packagesSelection);
          t.selection.copyFrom(t.filter);
          PackagesView.showSelectionContextPanel(t, this.uaToolbox, this.expanded, 'Overview');
        });
        viewer.root.onclick =(me) => {
          //resetViewers(skipEvent, viewer.table);
          if (skipEvent) {
            skipEvent = false;
            return;
          }
          if (packageStatsViewer.viewer!.props.rowSource != 'All') {
            usersSelection.setAll(true);
            packageStatsViewer.viewer!.props.rowSource = 'All';
            packageStatsViewer.viewer!.props.title = getPackagesViewerName();
          } else {
            packagesSelection.setAll(true);
            userStatsViewer.viewer!.props.rowSource = 'All';
            userStatsViewer.viewer!.props.title = getUsersViewerName();
          }
          t.filter.copyFrom(usersSelection).and(packagesSelection);
          t.selection.copyFrom(t.filter);
          PackagesView.showSelectionContextPanel(t, this.uaToolbox, this.expanded, 'Overview');
          skipEvent = false;
        };
        return viewer;
      }});


    this.viewers.push(uniqueUsersViewer);
    this.viewers.push(packageStatsViewer);
    this.viewers.push(userStatsViewer);
    this.root.append(ui.splitH([
      ui.splitV([
        ui.box(uniqueUsersViewer.root, {style: {maxHeight: '250px'}}),
        ui.splitH([packageStatsViewer.root, userStatsViewer.root]),
      ]),
    ]));
  }
}
