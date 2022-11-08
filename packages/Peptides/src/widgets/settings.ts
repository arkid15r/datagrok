import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import * as type from '../utils/types';
import {PeptidesModel} from '../model';

import $ from 'cash-dom';

//TODO: show sliderInput values
export function getSettingsDialog(model: PeptidesModel): DG.Dialog {
  const settings = model.settings;
  const result: type.PeptidesSettings = {};
  const activityScaling = ui.choiceInput('Activity scaling', settings.scaling ?? 'none', ['none', 'lg', '-lg'],
    () => result.scaling = activityScaling.value! as type.ScalingMethods);
  const bidirectionalAnalysis = ui.boolInput('Bidirectional analysis', settings.isBidirectional ?? false,
    () => result.isBidirectional = bidirectionalAnalysis.value!);
  const maxMutations = ui.sliderInput('Max mutations', settings.maxMutations ?? 1, 0, 50, () => {
    const val = Math.round(maxMutations.value!);
    $(maxMutations.root).find('label.ui-input-description').remove();
    result.maxMutations = val;
    maxMutations.addPostfix(val.toString());
  });
  maxMutations.addPostfix((settings.maxMutations ?? 1).toString());

  const minActivityDelta = ui.sliderInput('Min activity delta', settings.minActivityDelta ?? 0, 0, 100, () => {
    const val = Math.round(minActivityDelta.value!);
    result.minActivityDelta = val;
    $(minActivityDelta.root).find('label.ui-input-description').remove();
    minActivityDelta.addPostfix(val.toString());
  });
  minActivityDelta.addPostfix((settings.minActivityDelta ?? 0).toString());

  const accordion = ui.accordion();
  accordion.addPane('General', () => ui.inputs([activityScaling, bidirectionalAnalysis]), true);
  accordion.addPane('Mutation Cliffs', () => ui.inputs([maxMutations, minActivityDelta]), true);

  const dialog = ui.dialog('Peptides settings').add(accordion);
  dialog.root.style.width = '400px';
  dialog.onOK(() => model.settings = result);
  dialog.show();

  return dialog.show();
}
