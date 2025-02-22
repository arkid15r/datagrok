import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {category, test, testViewer} from '@datagrok-libraries/utils/src/test';
import {injectTreeForGridUI2} from '../viewers/inject-tree-for-grid2';
import {TreeHelper} from '../utils/tree-helper';
import {_package} from '../package-test';
import {viewsTests} from './utils/views-tests';
import {ITreeHelper} from '@datagrok-libraries/bio/src/trees/tree-helper';
import {NodeType} from '@datagrok-libraries/bio/src/trees';
import {parseNewick} from '@datagrok-libraries/bio/src/trees/phylocanvas';


category('GridWithTree', viewsTests((ctx: { dfList: DG.DataFrame[], vList: DG.ViewBase[] }) => {
  test('open', async () => {
    const _th: ITreeHelper = new TreeHelper();

    const csv: string = await _package.files.readAsText('data/tree95df.csv');
    const newickStr: string = await _package.files.readAsText('data/tree95.nwk');
    const leafColName = 'id';

    const dataDf: DG.DataFrame = DG.DataFrame.fromCsv(csv);
    const newickRoot: NodeType = parseNewick(newickStr);

    const tv: DG.TableView = grok.shell.addTableView(dataDf);
    ctx.dfList.push(dataDf);
    ctx.vList.push(tv);
    const neighborWidth = 250;

    injectTreeForGridUI2(tv.grid, newickRoot, leafColName, neighborWidth);
  });
}));


category('viewers', () => {
  const viewers = DG.Func.find({package: 'Dendrogram', tags: ['viewer']}).map((f) => f.friendlyName);
  for (const v of viewers) {
    test(v, async () => {
      await testViewer(v, await (async () => {
        const newickStr: string = await _package.files.readAsText('data/tree95.nwk');
        const treeHelper = new TreeHelper();
        return treeHelper.newickToDf(newickStr, 'tree95');
      })(), {detectSemanticTypes: true});
    });
  }
});
