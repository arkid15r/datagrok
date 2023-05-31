import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {after, before, category, expect, test, delay, testViewer} from '@datagrok-libraries/utils/src/test';
import {TestViewerForProperties} from './test-viewer-for-properties';

category('Viewers: Core Viewers', () => {
  const skip: {[key: string]: string} = {'Form': 'GROK-11708',
    'Heat map': 'GROK-11705', 'Network diagram': 'GROK-11707'};
  const df = grok.data.demo.demog(100);
  const regViewers = Object.values(DG.VIEWER).filter((v) => v != DG.VIEWER.GRID &&
    !v.startsWith('Surface') && !v.startsWith('Radar') && !v.startsWith('Timelines') &&
    v !== 'Google map' && v !== 'Markup');
  const JsViewers = DG.Func.find({tags: ['viewer']}).map((f) => f.friendlyName);
  const coreViewers = regViewers.filter((x) => !JsViewers.includes(x));
  //@ts-ignore
  coreViewers.push('Leaflet', 'distributionProfiler');
  for (const v of coreViewers) {
    test(v, async () => {
      await testViewer(v, df.clone());
    }, {skipReason: skip[v]});
  }
});

category('Viewers', () => {
  let df: DG.DataFrame;
  let tv: DG.TableView;
  let coreViewerTypes: string[];
  let viewerList: DG.JsViewer[];

  before(async () => {
    coreViewerTypes = Object.values(DG.VIEWER).filter((v) => v != DG.VIEWER.GRID &&
      !v.startsWith('Surface') && !v.startsWith('Radar') && !v.startsWith('Timelines') && v !== 'Google map');
    df = grok.data.demo.demog(100);
    tv = grok.shell.addTableView(df);
    viewerList = [];
  });

  /*
  test('addViewer(ViewerType)', async () => {
    try {
      for (const viewerType of coreViewerTypes) {
        console.log(`Adding ${viewerType}`);
        const viewer = await addViewerAndWait(tv, viewerType);//tv.addViewer(viewerType);
        if (!(viewer instanceof DG.Viewer))
          throw new Error(`TableView.addViewer('${viewerType}') should add a Viewer instance`);
        await delay(200);

        viewer.removeFromView();
        console.log(`Removed ${viewerType}`);
      }
    } finally {
      closeViewers(tv);
    }
  });

  test('addViewer(Viewer)', async () => {
    try {
      for (const viewerType of coreViewerTypes) {
        console.log(`Adding ${viewerType}`);
        const viewer = await addViewerAndWait(tv, DG.Viewer.fromType(viewerType, df));
        await delay(200);
        viewer.removeFromView();
        console.log(`Removed ${viewerType}`);
      }
    } finally {
      closeViewers(tv);
    }
  });
  */

  test('close', async () => {
    tv.scatterPlot();
    tv.barChart();
    expect(Array.from(tv.viewers).length, 3);
    closeViewers(tv);
    expect(Array.from(tv.viewers).length, 1);
  });

  test('getViewerTypes', async () => {
    const registeredViewers = DG.Viewer.getViewerTypes();
    expect(coreViewerTypes.every((t) => registeredViewers.includes(t)), true);
  });

  test('fromType', async () => {
    for (const viewerType of coreViewerTypes) {
      const viewer = DG.Viewer.fromType(viewerType, df);
      await delay(200);
      if (!(viewer instanceof DG.Viewer))
        throw new Error(`Viewer.fromType('${viewerType}', df) should add a Viewer instance`);
      expect(viewer.table.id, df.id);
    }
    DG.Balloon.closeAll();
  });

  test('Reset default properties', async () => {
    try {
      const options = {
        colorColumnName: 'sex',
        backColor: DG.Color.lightBlue,
      };

      testDefaultSettings(tv, true, true, false);
      const sp1 = tv.scatterPlot();
      expect(sp1.props.colorColumnName, options.colorColumnName);
      expect(sp1.props.backColor, options.backColor);

      sp1.props.resetDefault();
      const sp2 = tv.scatterPlot();
      expect(sp2.props.colorColumnName == options.colorColumnName, false);
      expect(sp2.props.backColor == options.backColor, false);
    } finally {
      closeViewers(tv);
    }
  });

  test('Set default style properties', async () => testDefaultSettings(tv, false, true));

  test('Set default data properties', async () => testDefaultSettings(tv, true, false));

  test('Set default style and data properties', async () => testDefaultSettings(tv, true, true));

  test('ScatterPlotViewer.zoom', async () => {
    const sp = DG.Viewer.scatterPlot(df);
    tv.addViewer(sp);
    try {
      sp.zoom(10, 10, 100, 100);
    } finally {
      sp.close();
    }
  });

  test('ScatterPlotViewer.onZoomed', async () => {
    const sp = DG.Viewer.scatterPlot(df);
    tv.addViewer(sp);
    try {
      let rectangle: any;
      sp.onZoomed.subscribe((r) => rectangle = r);
      sp.zoom(10, 10, 100, 100);
      expect(rectangle instanceof DG.Rect, true);
    } finally {
      sp.close();
    }
  });

  test('onTableAttached', async () => {
    const df1 = DG.DataFrame.fromCsv('id1');
    const df2 = DG.DataFrame.fromCsv('id2');

    const viewer: TestViewerForProperties = (await df1.plot.fromType(
      'TestViewerForProperties', {})) as TestViewerForProperties;
    expect(viewer.dataFrame.columns.byIndex(0).name, df1.columns.byIndex(0).name);
    expect(viewer.onTableAttachedCounter, 1);

    viewer.dataFrame = df2;
    expect(viewer.dataFrame.columns.byIndex(0).name, df2.columns.byIndex(0).name);
    expect(viewer.onTableAttachedCounter, 2);

    // TODO: Check onTableAttached has been called
  }, {skipReason: 'GROK-11484'});

  test('setPropertyStringWithNumber', async () => {
    // const v: TestViewerForProperties = tv.addViewer('TestViewerForProperties', {}) as TestViewerForProperties;
    const dfTemp = DG.DataFrame.fromCsv('id');
    const viewer: TestViewerForProperties = (
      await dfTemp.plot.fromType('TestViewerForProperties')) as TestViewerForProperties;
    viewerList.push(viewer);

    let exCaught: boolean = false;
    try {
      viewer.setOptions({'testPropertyString': 1});
    } catch {
      // There should be an exception caught while
      // assigning number value to string option of JsViewer
      exCaught = true;
    }
    const propValueFromProps = viewer.props.get('testPropertyString');
    const propValueFromObject = viewer.testPropertyString;

    // Silent type cast or exception expected
    if ((typeof propValueFromObject !== typeof 'str' || typeof propValueFromProps !== typeof 'str') && !exCaught) {
      throw new Error('JsViewer string property assigned with number value ' +
        `become value of type '${typeof propValueFromObject}' without an exception or type conversion.`);
    }
  }, {skipReason: 'GROK-11485'});

  test('setPropertyIntWithString', async () => {
    // const v: TestViewerForProperties = tv.addViewer('TestViewerForProperties', {}) as TestViewerForProperties;
    const dfTemp = DG.DataFrame.fromCsv('id');
    const viewer: TestViewerForProperties = (
      await dfTemp.plot.fromType('TestViewerForProperties')) as TestViewerForProperties;
    viewerList.push(viewer);

    let exCaught: boolean = false;
    try {
      viewer.setOptions({'testPropertyInt': '1'}); // silent parse to int available
    } catch {
      // There should be an exception caught while
      // assigning string value to int option of JsViewer
      exCaught = true;
    }
    const propValueFromProps = viewer.props.get('testPropertyInt');
    const propValueFromObject = viewer.testPropertyInt;

    // Silent type cast or exception expected
    if ((typeof propValueFromObject !== typeof 1 || typeof propValueFromProps !== typeof 1) && !exCaught) {
      throw new Error('JsViewer int property assigned with string value ' +
        `become value of type '${typeof propValueFromObject}' without an exception or type conversion.`);
    }
  }, {skipReason: 'GROK-11485'});

  after(async () => {
    grok.shell.closeAll();

    for (const viewer of viewerList) {
      try {
        // viewer.removeFromView();
        viewer.close();
      } catch (err: any) {
        console.warn(`Closing viewer error: ${err.toString()}`);
      } // ignore everything on closing viewers
    }
    viewerList = [];
  });
});

function closeViewers(view: DG.TableView) {
  Array.from(view.viewers).slice(1).forEach((v) => v.close());
}

// function addViewerAndWait(tv: DG.TableView, viewerType: string | DG.Viewer): Promise<DG.Viewer> {
//   return new Promise((resolve, reject) => {
//     const sub = grok.events.onViewerAdded.subscribe((data) => {
//       // @ts-ignore
//       if ((data.args.viewer as DG.Viewer).type == viewerType || data.args.viewer == viewerType) {
//         sub.unsubscribe();
//         // @ts-ignore
//         resolve(data.args.viewer);
//       }
//     });
//     tv.addViewer(viewerType);
//     setTimeout(() => {
//       sub.unsubscribe();
//       // eslint-disable-next-line prefer-promise-reject-errors
//       reject('timeout');
//     }, 100);
//   });
// }

function testDefaultSettings(tv: DG.TableView, dataFields: boolean, styleFields: boolean, reset: boolean = true) {
  const options = {
    colorColumnName: 'sex',
    backColor: DG.Color.lightBlue,
  };
  let sp1: DG.Viewer;

  try {
    sp1 = tv.scatterPlot();
    expect(sp1.props.colorColumnName == options.colorColumnName, false);
    expect(sp1.props.backColor == options.backColor, false);
    sp1.setOptions(options);

    expect(sp1.props.colorColumnName, options.colorColumnName);
    expect(sp1.props.backColor, options.backColor);
    sp1.props.setDefault(dataFields, styleFields);

    const sp2 = tv.scatterPlot();
    if (dataFields)
      expect(sp2.props.colorColumnName, options.colorColumnName);
    else
      expect(sp2.props.colorColumnName == options.colorColumnName, false);

    if (styleFields)
      expect(sp2.props.backColor, options.backColor);
    else
      expect(sp2.props.backColor == options.backColor, false);
  } finally {
    closeViewers(tv);
    if (reset)
      sp1!.props.resetDefault();
  }
}
