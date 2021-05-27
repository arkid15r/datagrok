import * as ui from "datagrok-api/ui";
import * as grok from "datagrok-api/grok";
import * as DG from "datagrok-api/dg";
import {MiscMethods} from "./misc";
import json from "./TPP000153303.json";


export class RepertoireBrowserPanel {

    async init(view) {

        // ---- SIDEPANEL REMOVAL ----
        this.view = view
        this.table = this.view.table;
        let windows = grok.shell.windows;
        windows.showProperties = false;
        windows.showHelp = false;
        windows.showConsole = false;


        // ---- INPUTS ----
        this.reps = ['cartoon', 'backbone', 'ball+stick', 'licorice', 'hyperball', 'surface'];
        this.repChoice = ui.choiceInput('Representation', 'cartoon', this.reps);

        this.schemes_lst = MiscMethods.extract_schemes();
        this.cdr_scheme = ui.choiceInput('CDR3 Scheme', 'default', this.schemes_lst);

        this.ptm_predictions = [...new Set([...Object.keys(json.ptm_predictions.H), ...Object.keys(json.ptm_predictions.L)])];
        this.ptm_choices = ui.multiChoiceInput('', [], this.ptm_predictions);

        this.ptm_prob = ui.floatInput('PTM probability', 0.2);

        this.paratopes = ui.boolInput('Paratopes', false);

        this.msaContentChoice = ui.choiceInput('Content', 'AA MSA', ['AA MSA', 'DNA MSA', 'Hybrid']);


        // ---- INPUTS PANEL ----
        this.root = ui.div();
        let acc_options = ui.accordion();
        acc_options.addPane('3D model', () => ui.inputs([this.repChoice, this.cdr_scheme]));
        acc_options.addPane('Sequence', () => ui.inputs([this.paratopes, this.ptm_prob]));
        acc_options.addPane('PTMs', () => ui.inputs([this.ptm_choices]));
        acc_options.addPane('MSA', () => ui.inputs([this.msaContentChoice]));
        // await MiscMethods.save_load(this.table, acc_options)
        this.root.append(acc_options.root);


        // ---- VIEWER CONTAINERS ----
        // ngl
        this.ngl_host = ui.div([],'d4-ngl-viewer');

        // pviz + msa
        this.pViz_host_L = ui.box();
        this.pViz_host_H = ui.box();
        this.msa_host_L = ui.box();
        this.msa_host_H = ui.box();
        this.sequence_tabs = ui.tabControl({
            'HEAVY': this.pViz_host_H,
            'LIGHT': this.pViz_host_L,
            'MSA HEAVY': this.msa_host_H,
            'MSA LIGHT': this.msa_host_L,
        }).root;


        // ---- DOCKING ----
        this.panel_node = view.dockManager.dock(this.root, 'right', null, 'NGL');
        this.ngl_node = view.dockManager.dock(this.ngl_host, 'left', this.panel_node, 'NGL');
        this.sequence_node = view.dockManager.dock(this.sequence_tabs, 'down', this.ngl_node, 'Sequence', 0.225);

    }

}