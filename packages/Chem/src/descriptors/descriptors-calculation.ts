import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {getDescriptorsPy} from '../scripts-api';
import {getRdKitModule} from '../utils/chem-common-rdkit';
import {_convertMolNotation} from '../utils/convert-notation-utils';
import {_package} from '../package';
import {addCopyIcon} from '../utils/ui-utils';
import {MESSAGE_MALFORMED} from '../constants';

const _STORAGE_NAME = 'rdkit_descriptors';
const _KEY = 'selected';
let descriptors: any;

/** Adds descriptors to table */
export async function addDescriptors(smilesCol: DG.Column, viewTable: DG.DataFrame): Promise<void> {
  openDescriptorsDialog(await getSelected(), async (selected: any) => {
    await grok.dapi.userDataStorage.postValue(_STORAGE_NAME, _KEY, JSON.stringify(selected));
    selected = await getSelected();
    const pi = DG.TaskBarProgressIndicator.create('Calculating descriptors...');
    try {
      const table = await getDescriptorsPy(
        smilesCol.name, DG.DataFrame.fromColumns([smilesCol]), 'selected',
        DG.DataFrame.fromColumns([DG.Column.fromList('string', 'selected', selected)]),
      );
      addResultColumns(table, viewTable);
    } catch (e: any) {
      grok.shell.error(e);
    } finally {
      pi.close();
    }
  });
}

/** Calculates descriptors for single entry*/
export function getDescriptorsSingle(smiles: string): DG.Widget {
  const rdKitModule = getRdKitModule();
  smiles = _convertMolNotation(smiles, DG.chem.Notation.Unknown, DG.chem.Notation.Smiles, rdKitModule);
  if (smiles === MESSAGE_MALFORMED)
    return new DG.Widget(ui.divText('Molecule is possibly malformed'));
  const molecule = DG.chem.isMolBlock(smiles) ? `\"${smiles}\"` : smiles;
  const widget = new DG.Widget(ui.div());
  const result = ui.div();
  const selectButton = ui.bigButton('SELECT', async () => {
    openDescriptorsDialog(await getSelected(), async (selected: any) => {
      await grok.dapi.userDataStorage.postValue(_STORAGE_NAME, _KEY, JSON.stringify(selected));
      update();
    });
  });
  selectButton.style.marginTop = '20px';

  const update = () => {
    removeChildren(result);
    result.appendChild(ui.loader());
    getSelected().then((selected) => {
      getDescriptorsPy(
        'smiles', DG.DataFrame.fromCsv(`smiles\n${molecule}`), 'selected',
        DG.DataFrame.fromColumns([DG.Column.fromList('string', 'selected', selected)]),
      ).then((table: any) => {
        removeChildren(result);
        const map: { [_: string]: any } = {};
        for (const descriptor of selected)
          map[descriptor] = table.col(descriptor).get(0);
        result.appendChild(ui.tableFromMap(map));
      });
    });
  };

  addCopyIcon(result, 'Descriptors');
  widget.root.appendChild(result);
  widget.root.appendChild(selectButton);

  update();

  return widget;
}

/** demo application for descriptor calculation*/
export function getDescriptorsApp(): void {
  const defaultSmiles = 'O=C1CN=C(c2ccccc2N1)C3CCCCC3';
  let sketcherValue = defaultSmiles;

  const windows = grok.shell.windows;
  windows.showToolbox = false;
  windows.showHelp = false;
  windows.showProperties = false;

  let table = DG.DataFrame.create();
  table.name = 'Descriptors';
  const view = grok.shell.addTableView(table);

  const dsDiv = ui.divV([], 'grok-prop-panel');
  dsDiv.appendChild(getDescriptorsSingle(defaultSmiles).root);

  const sketcher = grok.chem.sketcher((smiles: string, _molfile: string) => {
    sketcherValue = smiles;
    removeChildren(dsDiv);
    dsDiv.appendChild(getDescriptorsSingle(smiles).root);
  }, defaultSmiles);
  const addButton = ui.bigButton('ADD', async () => {
    getSelected().then((selected) => {
      getDescriptorsPy(
        'smiles', DG.DataFrame.fromCsv(`smiles\n${sketcherValue}`), 'selected',
        DG.DataFrame.fromColumns([DG.Column.fromList('string', 'selected', selected)]),
      ).then((t) => {
      //grok.chem.descriptors(DG.DataFrame.fromCsv(`smiles\n${sketcherValue}`), 'smiles', selected).then(t => {
        const columnNames = table.columns.names();
        if ((table.columns.length !== selected.length + 1) || selected.some((s: any) => !columnNames.includes(s))) {
          table = DG.DataFrame.create();
          table.name = 'Descriptors';
          view.dataFrame = table;
          for (const col of t.columns.toList())
            table.columns.addNew(col.name, col.type);
        }
        table.rows.addNew(t.columns.toList().map((c: any) => c.get(0)));
      });
    });
  });
  addButton.style.marginTop = '12px';
  const skDiv = ui.divV([sketcher, addButton], 'grok-prop-panel,dlg-sketcher,pure-form');

  const skNode = view.dockManager.dock(skDiv, DG.DOCK_TYPE.RIGHT, null, 'Sketcher', 0.25);
  view.dockManager.dock(dsDiv, DG.DOCK_TYPE.DOWN, skNode, 'Descriptors', 0.5);

  grok.events.onViewRemoved.subscribe((v: any) => {
    if (v.name === view.name) {
      windows.showToolbox = true;
      windows.showHelp = true;
      windows.showProperties = true;
    }
  });
}

//description: Open descriptors selection dialog
function openDescriptorsDialog(selected: any, onOK: any): void {
  _package.files.readAsText('constants/descriptors_const.json').then((res) => {
    descriptors = JSON.parse(res);
  });
  const tree = ui.tree();
  tree.root.style.maxHeight = '400px';

  const groups: { [_: string]: any } = {};
  const items: DG.TreeViewNode[] = [];
  const selectedDescriptors: { [_: string]: string } = {};

  const checkAll = (val: boolean) => {
    for (const g of Object.values(groups))
      g.checked = val;
    for (const i of items)
      i.checked = val;
  };

  const selectAll = ui.label('All', {classes: 'd4-link-label', onClick: () => checkAll(true)});
  selectAll.style.marginLeft = '6px';
  selectAll.style.marginRight = '12px';
  const selectNone = ui.label('None', {classes: 'd4-link-label', onClick: () => checkAll(false)});

  const countLabel = ui.label('0 checked');
  countLabel.style.marginLeft = '24px';
  countLabel.style.display = 'inline-flex';

  const keys = Object.keys(descriptors);
  for (const groupName of keys) {
    const group = tree.group(groupName, null, false);
    group.enableCheckBox();
    groups[groupName] = group;

    group.checkBox!.onchange = (_e) => {
      countLabel.textContent = `${items.filter((i) => i.checked).length} checked`;
      if (group.checked)
        selectedDescriptors[group.text] = group.text;
      group.items.filter((i) => {
        if (i.checked)
          selectedDescriptors[i.text] = group.text;
      });
    };

    for (const descriptor of descriptors[groupName]['descriptors']) {
      const item = group.item(descriptor['name'], descriptor);
      item.enableCheckBox(selected.includes(descriptor['name']));
      items.push(item);

      item.checkBox!.onchange = (_e) => {
        countLabel.textContent = `${items.filter((i) => i.checked).length} checked`;
        if (item.checked)
          selectedDescriptors[item.text] = groupName;
      };
    }

    checkAll(false);
  }

  const saveInputHistory = (): any => {
    const resultHistory: { [_: string]: any } = {};
    const descriptorNames = Object.keys(selectedDescriptors);
    for (const descriptorName of descriptorNames)
      resultHistory[descriptorName] = selectedDescriptors[descriptorName];
    return resultHistory;
  };

  const loadInputHistory = (history: any): void => {
    checkAll(false);
    const keys: string[] = Object.keys(history);
    for (const key of keys) {
      groups[history[key]].items.filter(function(i: any) {
        if (i.text === key)
          i.checked = true;
      });
      if (key === history[key])
        groups[history[key]].checked = true;
    }
    countLabel.textContent = `${keys.length} checked`;
  };

  ui.dialog('Chem Descriptors')
    .add(ui.divH([selectAll, selectNone, countLabel]))
    .add(tree.root)
    .onOK(() => onOK(items.filter((i) => i.checked).map((i: any) => i.value['name'])))
    .show()
    .history(
      () => saveInputHistory(),
      (x) => loadInputHistory(x),
    );
}

//description: Get selected descriptors
async function getSelected() : Promise<any> {
  const str = await grok.dapi.userDataStorage.getValue(_STORAGE_NAME, _KEY);
  let selected = (str != null && str !== '') ? JSON.parse(str) : [];
  if (selected.length === 0) {
    //selected =
    //  (await grok.chem.descriptorsTree() as any)['Lipinski']['descriptors'].slice(0, 3).map((p: any) => p['name']);
    selected = descriptors['Lipinski']['descriptors'].slice(0, 3).map((p: any) => p['name']);
    await grok.dapi.userDataStorage.postValue(_STORAGE_NAME, _KEY, JSON.stringify(selected));
  }
  return selected;
}

//description: Removes all children from node
function removeChildren(node: any): void {
  while (node.firstChild)
    node.removeChild(node.firstChild);
}

//description: add columns into table.
function addResultColumns(table: DG.DataFrame, viewTable: DG.DataFrame): void {
  if (table.columns.length > 0) {
    const descriptors: string[] = table.columns.names();

    for (let i = 0; i < descriptors.length; i++) {
      const column: DG.Column = table.columns.byName(descriptors[i]);
      column.name = viewTable.columns.getUnusedName(column.name);
      viewTable.columns.add(column);
    }
  }
}
