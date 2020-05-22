import {Project} from "./src/entities";
import * as ui from "./ui.js";
import * as _chem from './src/chem';
import * as _ml from './src/ml';
import {Dapi} from "./src/dapi";
import {DataFrame} from "./src/dataframe";
import {TableView, View} from "./src/view";
import {User} from "./src/entities";
import {Functions} from "./src/functions";
import {Events} from "./src/events";
import {_toDart, _wrap} from "./src/wrappers";


/** Grok entry point, use it to get access to top-level views, tables, methods, etc. */

class Shell {

    get t() { return new DataFrame(grok_CurrentTable()); }

    /** Current view */
    set v(view) { grok_Set_CurrentView(view.d); }
    get v() { return View.fromDart(grok_Get_CurrentView()); }

    /** Current project */
    get project() { return new Project(grok_Project()); }

    /** List of table names that are currently open */
    get tableNames() { return grok_TableNames(); }

    /** List of currently open tables table */
    get tables() { return this.tableNames.map(this.tableByName); }

    /** Current user */
    get user() { return new User(grok_User()); }

    /** Current object */
    get o() { return _wrap(grok_Get_CurrentObject(), false); }
    set o(x) { grok_Set_CurrentObject(_toDart(x)); }

    get sidebar() { return new ui.TabControl(grok_Get_Sidebar()); }

    get topMenu() { return new ui.Menu(grok_Get_TopMenu()); }

    get balloon() { return new ui.Balloon(); }

    dockElement(e, title = null, dockStyle = 'fill', ratio = 0.5) { grok_DockElement(e, title, dockStyle, ratio); }

    route(url) { return View.fromDart(grok_Route(url)); }

    get settings() { return new Settings(); }


    addView(v) { grok_AddView(v.d); }

    newView(name = 'view', children = []) {
        let view = View.create();
        view.name = name;
        ui.appendAll(view.root, children);
        this.addView(view);
        return view;
    }
    addTableView(t, dockStyle = 'fill', width = null) { return new TableView(grok_AddTableView(t.d, dockStyle, width)); }
    getTableView(name) { return new TableView(grok_GetTableView(name)); }
    closeAll() { grok_CloseAll(); }
    registerViewer(name, description, createViewer) { grok_RegisterViewer(name, description, createViewer); }
    tableByName(s) { return new DataFrame(grok_TableByName(s)); }
    getVar(name) {return _toJs(grok_GetVar(name)); }
    setVar(name, value) {return grok_SetVar(name, _toDart(value)); }
}

class Scripts {
    script(s) {
        return new Promise((resolve, reject) => grok_Script(s, (t) => resolve(_wrap(t, false))));
    }

    scriptSync(s) { return _wrap(grok_ScriptSync(s), false); }
}

class Data {
    /**
     * Creates a generic dataset with the defined number of rows and columns.
     * [dataset] allowed values:
     * "wells" - experimental plate wells: barcode, row, col, pos, volume, concentration, role
     * "demog" - clinical study demographics data: subj, study, site, sex, race, disease, start date
     * "biosensor": wearable sensor data: time, x, y, z, temp, eda
     * "random walk": random walk data for the specified number of dimensions
     *
     * @returns {DataFrame} */
    testData(dataset, rows = 10000, columns = 3) { return new DataFrame(grok_TestData(dataset, rows, columns)); }
    getDemoTable(path) {
        return new Promise((resolve, reject) => grok_GetDemoTable(path, (t) => resolve(_wrap(t))));
    }

    /** @returns {DataFrame} */
    parseCsv(csv) { return new DataFrame(grok_ParseCsv(csv)); }

    loadDataFrame(csvUrl) {
        return new Promise((resolve, reject) => grok_LoadDataFrame(csvUrl, (t) => resolve(_wrap(t, false))));
    }

    linkTables(t1, t2, keyColumns1, keyColumns2, linkTypes) { grok_LinkTables(t1.d, t2.d, keyColumns1, keyColumns2, linkTypes); };
    compareTables(t1, t2, keyColumns1, keyColumns2, valueColumns1, valueColumns2) { grok_CompareTables(t1.d, t2.d, keyColumns1, keyColumns2, valueColumns1, valueColumns2); };
    joinTables(t1, t2, keyColumns1, keyColumns2, valueColumns1, valueColumns2, joinType, inPlace) {
        return new DataFrame(grok_JoinTables(t1.d, t2.d, keyColumns1, keyColumns2, valueColumns1, valueColumns2, joinType, inPlace));
    }

    openTable(id) { return new Promise((resolve, reject) => grok_OpenTable(id, (t) => resolve(new DataFrame(t)))); }
    query(queryName, queryParameters = null, adHoc = false, pollingInterval = 1000) {
        return new Promise((resolve, reject) => grok_Query(queryName, queryParameters, adHoc, pollingInterval, (t) => resolve(new DataFrame(t))));
    }
    callQuery(queryName, queryParameters = null, adHoc = false, pollingInterval = 1000) {
        return new Promise((resolve, reject) => grok_CallQuery(queryName, queryParameters, adHoc, pollingInterval, (c) => resolve(new FuncCall(c))));
    }
    detectSemanticTypes(t) { return new Promise((resolve, reject) => grok_DetectSematicTypes(t.d, (_) => resolve())); }

}

class Settings {
    /** Hide dock tabs in presentaion mode **/
    get hideTabsInPresentationMode() { return grok_Get_HideTabsInPresentationMode(); }
    set hideTabsInPresentationMode(x) { return grok_Set_HideTabsInPresentationMode(x); }
    /** Presentaion mode **/
    get presentationMode() { return grok_Get_PresentationMode(); }
    set presentationMode(x) { return grok_Set_PresentationMode(x); }
}

export class utils {
    static *range(length) {
        for (let i = 0; i < length; i++)
            yield i;
    }

    /** Returns an 'identity' array where the element in idx-th position is equals to idx. */
    static identity(length) {
        let res = new Array(length);
        for (let i = 0; i < length; i++)
            res[i] = i;
        return res;
    }
}

export let functions = new Functions();

export let scripts = new Scripts();

export let events = new Events();

export let dapi = new Dapi();

export let shell = new Shell();

export let data = new Data();

export let chem = _chem;

export let ml = _ml.ml;





