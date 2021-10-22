import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {BitSet, DataFrame} from 'datagrok-api/dg';

export async function selectOutliersManually(inputData: DataFrame) {
  const IS_OUTLIER_COL_LABEL = 'isOutlier';

  const OUTLIER_REASON_COL_LABEL = 'Outlying reason';

  const editedInput = inputData.clone();
  const augmentedInput = inputData.clone();
  augmentedInput.columns
    .add(DG.Column.fromBitSet(IS_OUTLIER_COL_LABEL, BitSet.create(inputData.rowCount, () => false)));
  augmentedInput.columns
    .add(DG.Column.fromStrings(OUTLIER_REASON_COL_LABEL, Array.from({length: inputData.rowCount}, () => '')));

  const reasonInput = ui.textInput('Reason text', '');
  const scatterPlot = DG.Viewer.scatterPlot(augmentedInput, {
    'color': OUTLIER_REASON_COL_LABEL,
  });

  const addOutlierGroupBtn = {
    text: 'ADD OUTLIERS GROUP',
    action: () => {
      ui.dialog('Enter the outling reason for selected group')
        .add(reasonInput)
        .onOK(
          () => {
            augmentedInput.selection.getSelectedIndexes().forEach((selectedIndex: number) => {
              augmentedInput.set(IS_OUTLIER_COL_LABEL, selectedIndex, true);
              augmentedInput.set(OUTLIER_REASON_COL_LABEL, selectedIndex, reasonInput.value);
            });
            augmentedInput.selection.setAll(false);
          },
        )
        .show();
    },
  };

  ui.dialog('Manually select outliers')
    .add(scatterPlot.root)
    .addButton(addOutlierGroupBtn.text, addOutlierGroupBtn.action)
    .onOK(async () => {
      editedInput.rows.filter((row) => !augmentedInput.get(IS_OUTLIER_COL_LABEL, row.idx));
      grok.shell.addTableView(augmentedInput);
      grok.shell.addTableView(editedInput);
    }).show();
}
