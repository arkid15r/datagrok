import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

const window = grok.shell.windows;

let topmenuToggle = ui.div([ui.iconFA('window-maximize')], 'windows-manager-toggle');
let propertiesToggle = ui.div([ui.iconFA('sliders-h')], 'windows-manager-toggle');
let helpToggle = ui.div([ui.iconFA('info')], 'windows-manager-toggle');
let vairablesToggle = ui.div([ui.iconFA('value-absolute')], 'windows-manager-toggle');
let consoleToggle = ui.div([ui.iconFA('terminal')], 'windows-manager-toggle');
let presentationToggle = ui.div([ui.iconFA('presentation')], 'windows-manager-toggle');

presentationToggle.addEventListener('click', ()=> {
    window.presentationMode ? window.presentationMode = false : window.presentationMode = true;
});

topmenuToggle.addEventListener('click', ()=> {
    window.simpleMode ? window.simpleMode = false : window.simpleMode = true;
});

propertiesToggle.addEventListener('click', ()=> {
    window.showProperties ? window.showProperties = false : window.showProperties = true;
});

helpToggle.addEventListener('click', ()=> {
    window.showHelp ? window.showHelp = false : window.showHelp = true;
});

vairablesToggle.addEventListener('click', ()=> {
    window.showVariables ? window.showVariables = false : window.showVariables = true;
});

consoleToggle.addEventListener('click', ()=> {
    window.showConsole ? window.showConsole = false : window.showConsole = true; 
});

function setToggleState (v:boolean, toggle:HTMLDivElement) {
    return (v ? toggle.className = 'windows-manager-toggle active' : toggle.className = 'windows-manager-toggle');
}

export function windowsManagerPanel() {
    let root = ui.div([
        ui.tooltip.bind(topmenuToggle, ()=>{ return ui.div(['Top Menu ', ui.span([''], {style:{color:'var(--grey-4)'}})])}), 
        ui.tooltip.bind(propertiesToggle, ()=>{ return ui.div(['Context Panel ', ui.span(['F4'], {style:{color:'var(--grey-4)'}})])}), 
        ui.tooltip.bind(helpToggle, ()=>{ return ui.div(['Context Help ', ui.span(['F1'], {style:{color:'var(--grey-4)'}})])}),
        ui.tooltip.bind(vairablesToggle, ()=>{ return ui.div(['Variables ', ui.span(['ALT+V'], {style:{color:'var(--grey-4)'}})])}),
        ui.tooltip.bind(consoleToggle, ()=>{ return ui.div(['Console ', ui.span([''], {style:{color:'var(--grey-4)'}})])}),
        ui.tooltip.bind(presentationToggle, ()=>{ return ui.div(['Presentation mode ', ui.span(['F7'], {style:{color:'var(--grey-4)'}})])})
    ]);

    root.className = 'windows-manager-statusbar';
    document.getElementsByClassName('d4-global-status-panel')[0].append(root);

    setInterval(() => {
        setToggleState(window.showProperties, propertiesToggle);
        setToggleState(window.showConsole, consoleToggle);
        setToggleState(window.showVariables, vairablesToggle);
        setToggleState(window.showHelp, helpToggle);
        setToggleState(window.presentationMode, presentationToggle);
        window.simpleMode ? topmenuToggle.className = 'windows-manager-toggle' : topmenuToggle.className = 'windows-manager-toggle active';
    }, 100);
}
