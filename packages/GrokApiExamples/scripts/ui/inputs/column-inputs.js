let v = grok.newView('demo: column inputs');
let t = grok.testData('demog', 100);

let predict = ui.columnInput('Predict', t,  t.col('age'));
let features = ui.columnsInput('Features', t);

let inputs = [predict, features];
let container = ui.div();
v.append(container);
container.appendChild(ui.inputs(inputs));

container.appendChild(ui.bigButton('Build', () => {
    grok.balloon.info(inputs.map((i) => `${i.caption}: ${i.stringValue}`).join('<br>'));
}));
