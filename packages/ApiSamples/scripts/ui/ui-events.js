// Demonstrates handling of Grok-originated events

demog = grok.data.demo.demog();
view = grok.shell.addTableView(demog);

function info(s) { grok.shell.info(s); }

grok.events.onProjectClosed.subscribe(p => info(`${p.name}: closed`));
grok.events.onProjectModified.subscribe(p => info(`${p.name}: modified`));
grok.events.onProjectOpened.subscribe(p => info(`${p.name}: opened`));
grok.events.onProjectSaved.subscribe(p => info(`${p.name}: saved`));
grok.events.onProjectUploaded.subscribe(p => info(`${p.name}: uploaded`));

grok.events.onCurrentProjectChanged.subscribe(p => info(`Current project changed: ${grok.shell.project.name}`));

grok.events.onEvent('d4-current-view-changed').subscribe((_) => info('view changed'));
