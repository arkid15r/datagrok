import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {UaFilterableQueryViewer} from '../../viewers/ua-filterable-query-viewer';
import {UaQueryViewer} from '../../viewers/abstract/ua-query-viewer';
import {UaFilter} from '../../filter';
import {PropertyPanel} from '../../property-panel';
import {UaDataFrameQueryViewer} from '../../viewers/ua-data-frame-query-viewer';
import {BehaviorSubject} from 'rxjs';

export class TopQueriesViewer extends UaFilterableQueryViewer {
  public constructor(filterStream: BehaviorSubject<UaFilter>) {
    super(
      filterStream,
      'Queries',
      'TopQueries',
      (t: DG.DataFrame) => {
        const viewer = DG.Viewer.barChart(t, UaQueryViewer.defaultBarchartOptions);
        viewer.onEvent('d4-bar-chart-on-category-clicked').subscribe(async (args) => {
          const entity = await grok.dapi.queries.filter(`shortName = "${args.args.categories[0]}"`).first();
          const pp = new PropertyPanel(
            entity,
            null,
            [
              new UaDataFrameQueryViewer(
                'Users',
                'TopUsersOfQuery',
                (t: DG.DataFrame) => DG.Viewer.barChart(t, UaQueryViewer.defaultBarchartOptions).root,
                    null as any,
                    {name: args.args.categories[0]},
                    filterStream.getValue(),
                    false,
              ),
            ],
            `Query: ${args.args.categories[0]}`,
            'Query');

          grok.shell.o = pp.getRoot();
        });
        return viewer.root;
      },
    );
  }
}
