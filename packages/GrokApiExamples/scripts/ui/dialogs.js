// Creating custom dialogs

ui.dialog('Vogon Announcement')
  .add(ui.h1(''))
  .add(ui.span(['People of Earth, your attention, please… ']))
  .onOK(() => { grok.balloon.info('OK!'); })
  .show();