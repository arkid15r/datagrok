import { ClinicalCaseView } from "../clinical-case-view";
import * as grok from "datagrok-api/grok";
import * as DG from "datagrok-api/dg";
import * as ui from "datagrok-api/ui";
import { study } from "../clinical-study";
import { ValidationView } from "./validation-view";
import { event } from "jquery";

export class StudySummaryView extends DG.ViewBase {

 validationView: DG.View;

 constructor() {
    super();

    this.name = study.name;

    let subjsPerDay = study.domains.dm.groupBy(['RFSTDTC']).uniqueCount('USUBJID').aggregate();
    let refStartCol = subjsPerDay.col('RFSTDTC');
    for (let i = 0, rowCount = subjsPerDay.rowCount; i < rowCount; i++) {
      if (refStartCol.isNone(i))
        subjsPerDay.rows.removeAt(i);
    }
    let lc = DG.Viewer.lineChart(subjsPerDay);

    let summary = ui.tableFromMap({
      'subjects': study.subjectsCount,
      'sites': study.sitesCount
    });

    let errorsSummary = ui.tableFromMap(this.createErrorsMap());

    this.root.appendChild(ui.div([
      ui.divH([
        ui.block25([ui.h2('Summary'), summary]),
        ui.block25([ui.h2('Errors'), errorsSummary]),
        ui.block50([ui.h2('Enrollment'), lc.root])
      ]),
      ui.divH([
        ui.block25([ui.h2('ARM'), study.domains.dm.plot.bar( { split: 'arm', style: 'dashboard' }).root]),
        ui.block25([ui.h2('Sex'), DG.Viewer.barChart(study.domains.dm, { split: 'sex', style: 'dashboard' }).root]),
        ui.block25([ui.h2('Race'), DG.Viewer.barChart(study.domains.dm, { split: 'race', style: 'dashboard' }).root]),
        ui.block25([ui.h2('Age'), DG.Viewer.histogram(study.domains.dm, { value: 'age', style: 'dashboard' }).root]),
      ], { style: { width: '100%' } }),
    ]));
  }

  private createErrorsMap() {
    const errorsMap = {};
    const validationSummary = study.validationResults.groupBy([ 'Domain' ]).count().aggregate();
    for (let i = 0; i < validationSummary.rowCount; ++i) {
      const domain = validationSummary.get('Domain', i);
      const link = ui.link(validationSummary.get('count', i), {}, '', {id: domain});
      link.addEventListener('click', (event) => {
        this.validationView.close();
        const filteredView = new ValidationView($(link).attr('id'));
        this.validationView = grok.shell.newView(`Validation`, [filteredView.root]);
        grok.shell.v = this.validationView;
        event.stopPropagation();
      });
      errorsMap[ validationSummary.get('Domain', i) ] = link;
    }
    return errorsMap;
  }
}