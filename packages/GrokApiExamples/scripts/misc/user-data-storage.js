// User data storage demo: Saving values to storage

var STORAGE_NAME = 'user-data-storage-demo';

let v = grok.shell.newView('demo: user data storage');

let age = ui.intInput('Age', 30);
let sex = ui.choiceInput('Sex', 'Male', ['Male', 'Female']);
let music = ui.multiChoiceInput('Music genres', null, ['Classic', 'Rock', 'Pop', 'Jazz']);

var inputs = [age, sex, music];
v.append(ui.inputs(inputs));

let storageButton = ui.iconFA('database', () => {
    grok.dapi.userDataStorage.get(STORAGE_NAME).then((entities) => {
        if (entities !== null && Object.keys(entities).length === 0)
            grok.shell.balloon.info('Storage is empty. Try to post something to the storage');
        else {
            let menu = ui.Menu.popup();
            for (let time of Object.keys(entities)) {
                let values = JSON.parse(entities[time]);
                menu.item(values.map(v => `${v.caption}: ${v.value}`).join(', '), () => {
                    for (let input of values)
                        inputs.find(i => i.caption === input.caption).load(input.value);
                });
            }
            menu.show();
        }
    });
});
storageButton.style.margin = '8px 24px 0 24px';

let postButton = ui.button('Post to storage', () => {
    grok.shell.balloon.info(inputs.map((i) => `${i.caption}: ${i.stringValue}`).join('<br>'));
    grok.dapi.userDataStorage.postValue(STORAGE_NAME, new Date().toLocaleString(),
        JSON.stringify(inputs.map(i => { return {caption: i.caption, value: i.save()}; })));
});

let clearButton = ui.button('Clear storage', () => {
    grok.dapi.userDataStorage.remove(STORAGE_NAME, null);
});

v.append(ui.divH([
    storageButton,
    postButton,
    clearButton
]));
