import * as grok from 'datagrok-api/grok';
import * as DG from "datagrok-api/dg";
import * as ui from "datagrok-api/ui";
import { study, ClinRow } from "../clinical-study";
import { addDataFromDmDomain } from '../data-preparation/utils';
import { AE_BODY_SYSTEM, AE_CAUSALITY, AE_OUTCOME, AE_SEVERITY, SUBJECT_ID } from '../constants/columns-constants';
import { updateDivInnerHTML } from '../utils/utils';
import { _package } from '../package';
import { ClinicalCaseViewBase } from '../model/ClinicalCaseViewBase';
import { AE_START_DAY_FIELD, AE_TERM_FIELD, TRT_ARM_FIELD, VIEWS_CONFIG } from '../views-config';
import { checkColumnsAndCreateViewer } from '../utils/views-validation-utils';


export class AdverseEventsView extends ClinicalCaseViewBase {

  aeWithArm: DG.DataFrame;
  typesPlot = ui.box();
  bodySystemsPlot = ui.box();
  causalityPlot = ui.box();
  outcomePlot = ui.box();
  eventsPerWeekPlot = ui.box();
  allEventsPlot = ui.box();

  constructor(name) {
    super({});
    this.name = name;
    this.helpUrl = `${_package.webRoot}/views_help/adverse_events.md`;
    //@ts-ignore
    this.basePath = '/adverse-events';
  }

  createView(): void {

    if (study.domains.ae.col(VIEWS_CONFIG[this.name][AE_START_DAY_FIELD]) && !study.domains.ae.col('week')) {
      study.domains.ae.columns.addNewFloat('week').init((i) => Math.floor(study.domains.ae.get(VIEWS_CONFIG[this.name][AE_START_DAY_FIELD], i) / 7));
    };
    if (study.domains.dm) {
      if (study.domains.dm.col(VIEWS_CONFIG[ this.name ][ TRT_ARM_FIELD ])) {
        this.aeWithArm = addDataFromDmDomain(study.domains.ae.clone(), study.domains.dm, study.domains.ae.columns.names(), [ VIEWS_CONFIG[ this.name ][ TRT_ARM_FIELD ] ]);
      } else {
        this.aeWithArm = study.domains.ae.clone();
      };
      grok.data.linkTables(study.domains.dm, this.aeWithArm,
        [ SUBJECT_ID ], [ SUBJECT_ID ],
        [ DG.SYNC_TYPE.FILTER_TO_FILTER ]);
    }
    let viewerTitle = {
      style: {
        'color': 'var(--grey-6)',
        'margin': '12px 0px 6px 12px',
        'font-size': '16px',
      }
    };

    checkColumnsAndCreateViewer(
      this.aeWithArm,
      [VIEWS_CONFIG[this.name][AE_TERM_FIELD]],
      this.typesPlot, () => {
        let bar = this.bar(VIEWS_CONFIG[this.name][AE_TERM_FIELD], 'Types', viewerTitle, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]);
        updateDivInnerHTML(this.typesPlot, bar);
      },
      'Types');

    checkColumnsAndCreateViewer(
      this.aeWithArm,
      [AE_BODY_SYSTEM],
      this.typesPlot, () => {
        let bar = this.bar(AE_BODY_SYSTEM, 'Body system', viewerTitle, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]);
        updateDivInnerHTML(this.bodySystemsPlot, bar);
      },
      'Body system');

    checkColumnsAndCreateViewer(
      this.aeWithArm,
      [AE_CAUSALITY],
      this.typesPlot, () => {
        let bar = this.bar(AE_CAUSALITY, 'Causality', viewerTitle, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]);
        updateDivInnerHTML(this.causalityPlot, bar);
      },
      'Causality');

    checkColumnsAndCreateViewer(
      this.aeWithArm,
      [AE_OUTCOME],
      this.typesPlot, () => {
        let bar = this.bar(AE_OUTCOME, 'Outcome', viewerTitle, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]);
        updateDivInnerHTML(this.outcomePlot, bar);
      },
      'Outcome');

    checkColumnsAndCreateViewer(
      this.aeWithArm,
      [VIEWS_CONFIG[this.name][AE_START_DAY_FIELD]],
      this.eventsPerWeekPlot, () => {
        let bar = this.eventsPerWeek(viewerTitle);
        updateDivInnerHTML(this.eventsPerWeekPlot, bar);
      },
      'Events per week');

    checkColumnsAndCreateViewer(
      this.aeWithArm,
      [SUBJECT_ID, VIEWS_CONFIG[this.name][AE_START_DAY_FIELD]],
      this.allEventsPlot, () => {
        let bar = this.allEvents(viewerTitle);
        updateDivInnerHTML(this.allEventsPlot, bar);
      },
      'All events');

    let grid = this.aeWithArm.plot.grid();
    this.aeWithArm.onCurrentRowChanged.subscribe((_) => {
      grok.shell.o = new ClinRow(this.aeWithArm.currentRow);
    });


    let legend = this.createLegend();

    this.root.className = 'grok-view ui-box';
    this.root.append(ui.splitV([
      ui.splitH([this.eventsPerWeekPlot, this.allEventsPlot]),
      ui.divV([
        ui.div(legend, { style: { height: '50px' } }),
        ui.splitH([this.typesPlot, this.bodySystemsPlot, this.causalityPlot, this.outcomePlot], { style: { width: '100%' } })
      ]),
      ui.splitH([grid.root])
    ]));

  }

  private bar(categoryColumn: string, title: string, viewerTitle: any, splitColumn: string) {
    let splitCol = this.aeWithArm.col(splitColumn) ? splitColumn : '';
    let chart = this.aeWithArm.plot.bar({
      split: categoryColumn,
      stack: splitCol,
      style: 'dashboard',
      legendVisibility: 'Never'
    }).root;
    chart.prepend(ui.divText(title, viewerTitle))
    return chart
  }

  private createLegend() {
    if (this.aeWithArm.col(VIEWS_CONFIG[this.name][TRT_ARM_FIELD])) {
      let legend = DG.Legend.create(this.aeWithArm.columns.byName(VIEWS_CONFIG[this.name][TRT_ARM_FIELD]));
      legend.root.style.width = '500px';
      legend.root.style.height = '35px';
      return legend.root;
    }
    return null;
  }

  private eventsPerWeek(viewerTitle: any) {
    let timelinesPlot = this.aeWithArm.plot.line({
      x: 'week',
      yColumnNames: ['week'],
      chartTypes: ['Stacked Bar Chart'],
      yAggrTypes: [DG.STATS.TOTAL_COUNT],
      split: this.aeWithArm.col(AE_SEVERITY) ? AE_SEVERITY : '',
      style: 'dashboard'
    }).root;
    timelinesPlot.prepend(ui.divText('Events per week', viewerTitle));
    return timelinesPlot;
  }

  private allEvents(viewerTitle: any) {
    let scatterPlot = this.aeWithArm.plot.scatter({
      x: VIEWS_CONFIG[this.name][AE_START_DAY_FIELD],
      y: SUBJECT_ID,
      color: this.aeWithArm.col(AE_SEVERITY) ? AE_SEVERITY : '',
      markerDefaultSize: 5,
      legendVisibility: 'Never',
      style: 'dashboard'
    }).root;

    scatterPlot.prepend(ui.divText('All events', viewerTitle));
    return scatterPlot;
  }
}