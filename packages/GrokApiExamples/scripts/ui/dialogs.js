// Creating custom dialogs

ui.dialog('Vogon Announcement')
  .add(ui.h1(''))
  .add(ui.span(['People of Earth, your attention, please… ']))
  .onOK(() => { grok.shell.balloon.info('OK!'); })
  .show();