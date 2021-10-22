let subscr = null;

export function getMolColumnPropertyPanel(col) {

  const NONE = 'None';
  let scaffoldColName = null;
  if (col?.temp && col.temp['scaffold-col']) {
    scaffoldColName = col.temp['scaffold-col'];
  } else {
    scaffoldColName = NONE;
  }
  // TODO: replace with an efficient version, bySemTypesExact won't help; GROK-8094
  const columnsList = Array.from(col.dataFrame.columns).filter(c => c.semType === DG.SEMTYPE.MOLECULE).map(c => c.name);
  let columnsSet = new Set(columnsList);
  columnsSet.delete(col.name);

  let scaffoldColumnChoice = ui.choiceInput(
    'Scaffold column',
     scaffoldColName,
    [NONE].concat([...columnsSet].sort()));
  scaffoldColumnChoice.onChanged(_ => {
    const scaffoldColName = scaffoldColumnChoice.stringValue;
    col.temp['scaffold-col'] = scaffoldColName === NONE ? null : scaffoldColName;
    col.dataFrame.fireValuesChanged();
  });
  let highlightScaffoldsCheckbox = ui.boolInput(
    'Highlight from column', col?.temp && col.temp['highlight-scaffold'] === 'true',
    v => { col.temp['highlight-scaffold'] = v.toString(); col.dataFrame.fireValuesChanged(); });
  let regenerateCoordsCheckbox = ui.boolInput(
    'Regenerate coords', col?.temp && col.temp['regenerate-coords'] === 'true',
    v => { col.temp['regenerate-coords'] = v.toString(); col.dataFrame.fireValuesChanged(); });
    
    
    const matchMoleculeFilteringToDropdown = (v) => {
    if (v === 'categorical') return 'Categorical';
    if (v === 'sketching') return 'Sketching';
    return 'Dynamic';
  };
  
  const matchDropdownToMoleculeFiltering = (v) => {
    if (v === 'Categorical') {
      col.temp['.molecule-filtering'] = 'categorical';
    } else if (v === 'Sketching') {
      col.temp['.molecule-filtering'] = 'sketching';
    } else {
      col.temp.delete('.molecule-filtering');
    }
  };
  
  let moleculeFilteringChoice = ui.choiceInput('Filter Type',
    matchMoleculeFilteringToDropdown(col.temp['.molecule-filtering']),
    ['Dynamic', 'Categorical', 'Sketching']);
  moleculeFilteringChoice.onChanged(_ => {
    const v = moleculeFilteringChoice.stringValue;
    matchDropdownToMoleculeFiltering(v);
  });

  subscr?.unsubscribe();
  subscr = col.dataFrame.onMetadataChanged.subscribe((a) => {
    // Handling scaffold column
    let scaffoldColumnChoiceValue = scaffoldColumnChoice.stringValue;
    const scaffoldColumnTag = col.temp && col.temp['scaffold-col'] ? col.temp['scaffold-col'] : NONE;
    if (scaffoldColumnChoiceValue !== scaffoldColumnTag) {
      if (scaffoldColumnTag === NONE) {
        scaffoldColumnChoice.root.children[1].value = NONE;
      } else if (columnsSet.has(scaffoldColumnTag)) {
        scaffoldColumnChoice.root.children[1].value = scaffoldColumnTag;
      } else {
        // TODO: handle a selection of a non-molecule column
      }
    }
    // handling highlight scaffolds selection
    const highlightScaffoldsCheckboxValue = highlightScaffoldsCheckbox.value;
    const highlightScaffoldsTagPresent = col.temp && col.temp['highlight-scaffold'] === 'true';
    if (highlightScaffoldsCheckboxValue != highlightScaffoldsTagPresent) {
      highlightScaffoldsCheckbox.root.children[1].checked = highlightScaffoldsTagPresent;
    }
    // handling regenerate coords selection
    const regenerateCoordsCheckboxValue = regenerateCoordsCheckbox.value;
    const regenerateCoordsTagPresent = col.temp && col.temp['regenerate-coords'] === 'true';
    if (regenerateCoordsCheckboxValue != regenerateCoordsTagPresent) {
      regenerateCoordsCheckbox.root.children[1].checked = regenerateCoordsTagPresent;
    }
    // handling molecule filtering choice value
    const moleculeFilteringChoiceValue = moleculeFilteringChoice.stringValue;
    const moleculeFilteringTag = matchMoleculeFilteringToDropdown(col?.temp['.molecule-filtering']);
    if (moleculeFilteringChoiceValue != moleculeFilteringTag) { 
      moleculeFilteringChoice.root.children[1].value = moleculeFilteringTag;
    }
  });

  let widget = new DG.Widget(ui.div([
    ui.inputs([
      scaffoldColumnChoice,
      highlightScaffoldsCheckbox,
      regenerateCoordsCheckbox,
      moleculeFilteringChoice
    ])
  ]));

  widget.subs.push(subscr);

  return widget;
}