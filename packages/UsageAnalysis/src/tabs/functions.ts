// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import '../../css/usage_analysis.css';
import {UaToolbox} from '../ua-toolbox';
import {UaView} from './ua';
import {UaFilterableQueryViewer} from '../viewers/ua-filterable-query-viewer';


export class FunctionsView extends UaView {
  static viewName = 'Functions';

  constructor(uaToolbox: UaToolbox) {
    super(uaToolbox);
  }

  async initViewers(): Promise<void> {
    const functionsViewer = new UaFilterableQueryViewer(
      this.uaToolbox.filterStream,
      'Functions',
      'FunctionsUsage',
      (t: DG.DataFrame) => {
        const viewer = DG.Viewer.scatterPlot(t, {
          x: 'time',
          y: 'function',
          size: 'count',
          color: 'user',
        }).root;
        return viewer;
      },
    );
    this.viewers.push(functionsViewer);

    this.root.append(
      functionsViewer.root,
    );
  }
}
