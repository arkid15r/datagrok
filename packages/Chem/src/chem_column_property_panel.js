let subscr = null;

function getMolColumnPropertyPanel(col) {

  const NONE = 'None';
  let scaffoldColName = null;
  if (col?.tags && col.tags['scaffold-col']) {
    scaffoldColName = col.tags['scaffold-col'];
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
    col.tags['scaffold-col'] = scaffoldColName === NONE ? null : scaffoldColName;
  });
  let highlightScaffoldsCheckbox = ui.boolInput(
    'Highlight from column', col?.tags && col.tags['highlight-scaffold'] === 'true',
    v => { col.tags['highlight-scaffold'] = v.toString(); });
  let regenerateCoordsCheckbox = ui.boolInput(
    'Regenerate coords', col?.tags && col.tags['regenerate-coords'] === 'true',
    v => { col.tags['regenerate-coords'] = v.toString(); });

  subscr?.unsubscribe();
  subscr = col.dataFrame.onMetadataChanged.subscribe((a) => {
    // Handling scaffold column
    let scaffoldColumnChoiceValue = scaffoldColumnChoice.stringValue;
    const scaffoldColumnTag = col.tags && col.tags['scaffold-col'] ? col.tags['scaffold-col'] : NONE;
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
    const highlightScaffoldsTagPresent = col.tags && col.tags['highlight-scaffold'] === 'true';
    if (highlightScaffoldsCheckboxValue != highlightScaffoldsTagPresent) {
      highlightScaffoldsCheckbox.root.children[1].checked = highlightScaffoldsTagPresent;
    }
    // handling regenerate coords selection
    const regenerateCoordsCheckboxValue = regenerateCoordsCheckbox.value;
    const regenerateCoordsTagPresent = col.tags && col.tags['regenerate-coords'] === 'true';
    if (regenerateCoordsCheckboxValue != regenerateCoordsTagPresent) {
      regenerateCoordsCheckbox.root.children[1].checked = regenerateCoordsTagPresent;
    }

  });
  
  let categoricalFilteringCheckbox = ui.boolInput(
    'Filter by categories', col?.tags &&
      col.tags['.categorical-filtering'] === 'true',
    v => { col.tags['.categorical-filtering'] = v.toString(); })

  let widget = new DG.Widget(ui.div([
    ui.inputs([
      scaffoldColumnChoice,
      highlightScaffoldsCheckbox,
      regenerateCoordsCheckbox,
      categoricalFilteringCheckbox
    ])
  ]));

  widget.subs.push(subscr);

  return widget;
}