import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {category, test, testViewer} from '@datagrok-libraries/utils/src/test';


category('Viewers', () => {
  const df = grok.data.demo.demog(100);
  const viewers = DG.Func.find({package: 'Charts', tags: ['viewer']}).map((f) => f.friendlyName);
  for (const v of viewers) {
    test(v, async () => {
      await testViewer(v, await (async () => {
        if (['Sankey', 'Chord'].includes(v)) return (await grok.data.getDemoTable('energy_uk.csv'));
        else if (['Tree', 'Sunburst'].includes(v)) return (await grok.data.getDemoTable('demog.csv'));
        else if (v === 'Globe') return (await grok.data.getDemoTable('geo/earthquakes.csv'));
        return df.clone();
      })(), {detectSemanticTypes: true});
    }, v === 'Tree' ? {skipReason: 'GROK-12569'} :
    v === 'Word Cloud Viewer' ? {skipReason: 'GROK-13198'} : {});
  }
});
