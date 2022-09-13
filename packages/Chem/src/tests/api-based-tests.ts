import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import {category, expect, test, delay, before, after} from '@datagrok-libraries/utils/src/test';
import {_testSearchSubstructure, _testSearchSubstructureAllParameters} from './utils';
import {_testFindSimilar, _testGetSimilarities} from './menu-tests-similarity-diversity';
import {testCsv, testSubstructure} from './substructure-search-tests';
import {getHTMLElementbyInnerText, isViewerPresent, isDialogPresent, returnDialog, setDialogInputValue, checkHTMLElementbyInnerText, isColumnPresent} from './gui-utils';
import {_importSdf} from '../open-chem/sdf-importer';

category('server features', () => {
  test('descriptors', async () => {
    grok.chem.descriptors(grok.data.testData('molecules', 100), 'smiles', ['MolWt', 'Lipinski'])
      .then(function (table) {
        grok.shell.addTableView(table);
      });

    await delay(1000);

    isColumnPresent(grok.shell.t.columns, 'MolWt');
    isColumnPresent(grok.shell.t.columns, 'NumAromaticCarbocycles');
    isColumnPresent(grok.shell.t.columns, 'NumHAcceptors');
    isColumnPresent(grok.shell.t.columns, 'NumHeteroatoms');
    isColumnPresent(grok.shell.t.columns, 'NumRotatableBonds');
    isColumnPresent(grok.shell.t.columns, 'RingCount');
  });
});

category('chem exported', () => {
  test('findSimilar.api.sar-small', async () => {
    await _testFindSimilar(grok.chem.findSimilar);
  });

  test('getSimilarities.api.molecules', async () => {
    await _testGetSimilarities(grok.chem.getSimilarities);
  });

  test('substructureSearch', async () => {
    const df = DG.DataFrame.fromCsv(testCsv);
    const trueIndices = [0, 2];
    const bitset: DG.BitSet = await grok.chem.searchSubstructure(df.col('smiles')!, testSubstructure);
    const bitsetString = bitset.toBinaryString();
    const bitsetArray = [...bitsetString];
    for (let k = 0; k < trueIndices.length; k++) {
      expect(bitsetArray[trueIndices[k]] === '1', true);
      bitsetArray[trueIndices[k]] = '0';
    }
  });
});
