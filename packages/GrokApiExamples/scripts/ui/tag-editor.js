let v = grok.shell.newView('demo: tag editor');

let editor = ui.TagEditor.create();
editor.addTag('demo');
editor.addTag('test');
editor.addTag(1234);

v.append(editor.root);
