import * as DG from 'datagrok-api/dg';
//import * as grok from 'datagrok-api/grok';
//import * as ui from 'datagrok-api/ui';  await _package.files.readAsText(name);

import {category, test, testViewer} from '@datagrok-libraries/utils/src/test';
import {_package} from '../package-test';
import {newickToDf} from '../utils';


category('Viewers', () => {
  const viewers = DG.Func.find({package: 'PhyloTreeViewer', tags: ['viewer']}).map((f) => f.friendlyName);
  for (const v of viewers) {
    test(v, async () => {
      await testViewer(v, await (async () => {
        const newickStr: string = await _package.files.readAsText('data/tree95.nwk');
        return newickToDf(newickStr, 'tree95');
      })(), true);
    });
  }
});
