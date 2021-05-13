import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export const _package = new DG.Package();
const dfExts = ['csv'];

async function loadSnippets(ent) {
  const type = ent.constructor.name;
  let tags = `#demo and #${type}`;
  if (type === 'FileInfo' && dfExts.includes(ent.extension)) {
    tags += 'and #dataframe';
  }
  const snippets = (await grok.dapi.scripts.list({ filter: tags }));
  return snippets.slice(0, 3);
}

//tags: autostart
export function describeCurrentObj() {
  grok.events.onAccordionConstructed.subscribe(async (acc) => {
    const ent = acc.context;

    if (ent) {
      const snippets = await loadSnippets(ent);
      const snippetNames = snippets.map(s => ui.divText(s.name, { classes: 'd4-link-action' }));
      let editor = ui.textInput('', '');
      editor.input.style = 'width: 0; height: 0; visibility: hidden;';
      editor.root.style.display = 'none';

      snippetNames.forEach((el, idx) => el.addEventListener('click', () => {
        editor.value = snippets[idx].script;
        editor.root.style.display = 'block';
        editor.input.style = 'width: 200; height: 300; visibility: visible;';
      }));

      let snippetsPane = acc.getPane('Snippets');      
      if (!snippetsPane) snippetsPane = acc.addPane('Snippets', () => {
        return ui.divV([
          ui.divText(ent.name),
          ...snippetNames,
          editor.root
        ]);
      });
    }
  });
}
