import {VIEW_TYPE, VIEWER} from "./const";
import {DataFrame} from "./dataframe.js";
import * as ui from "./../ui";
import {Viewer} from "./viewer";
import {DockNode, DockManager} from "./docking";
import {Grid} from "./grid";
import {Menu, ToolboxPage} from "./widgets";


/**
 * Subclass ViewBase to implement a Datagrok view in JavaScript.
 * */
export class ViewBase {
    /** @constructs ViewBase
     * @param {Object} params - URL parameters.
     * @param {string} path - URL path.
     * @param {boolean} createHost - Create JS host wrapper. */
    constructor(params = null, path = '', createHost = true) {
        if (createHost)
            this.d = grok_View_CreateJsViewHost(this);

        this._root = ui.div([], 'grok-view');
        this._root.tabIndex = 0;

        /** @type {StreamSubscription[]} */
        this.subs = [];  // stream subscriptions - will be canceled when the viewer is detached
    }

    /** @type {HTMLElement} */
    get root() { return this._root; }

    /** View type
     * @type {string} */
    get type() { return 'js-view-base' }

    /** @returns {string|null} View help URL. */
    get helpUrl() { return null; };

    /** View name. It gets shown in the tab handle.
     * @type {string} */
    get name() { return ''; };
    set name(s) {}

    /** @type {string} */
    get description() { return ''; }
    set description(s) { }

    /** View toolbox.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/views/toolbox}
     * @type {HTMLElement} */
    get toolbox() { return grok_View_Get_Toolbox(this.d); }
    set toolbox(x) { grok_View_Set_Toolbox(this.d, x); }

    /** View menu.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/views/ribbon}
     *  @type {Menu} */
    get ribbonMenu() { return new Menu(grok_View_Get_RibbonMenu(this.d)); }
    set ribbonMenu(menu) { grok_View_Set_RibbonMenu(this.d, menu.d); }

    /** Sets custom view panels on the ribbon.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/views/ribbon} */
    setRibbonPanels(panels) { grok_View_SetRibbonPanels(this.d, panels); }

    /** @returns {HTMLElement} View icon. */
    getIcon() { return null; }

    /** @returns {Object} Viewer state map. */
    saveStateMap() { return null; }

    /** Load view state map.
     * @param {Object} stateMap - State map. */
    loadStateMap(stateMap) { }

    /** View URI, relative to the platform root. See also {@link basePath}
     * @type {string} */
    get path() { return ''; }
    set path(s) {}

    /** Handles URL path.
     * @param  {string} path - URL path. */
    handlePath(path) { }

    /** Checks if URL path is acceptable.
     * @returns {boolean} "true" if path is acceptable, "false" otherwise.
     * @param {string} path - URL path. */
    acceptsPath(path) { return false; }

    /** Appends an item to this view. Use {@link appendAll} for appending multiple elements.
     * @param {HTMLElement | Widget} item */
    append(item) { return this.appendAll([item]); }

    /** Appends multiple elements this view. Use {@link appendAll} for appending multiple elements.
     * @param {object[]} items */
    appendAll(items) { return ui.appendAll(this.root, items.map(ui.render)); }

    /** Detach this view. */
    detach() { this.subs.forEach((sub) => sub.unsubscribe()); }

    /** Closes this view. */
    close() { this.detach(); }
}


/**
 * A view is typically docked in the main document area of the Grok platform.
 * See [TableView], [SketchView], etc
 */
export class View extends ViewBase {

    /** @constructs View */
    constructor(d) {
        super(null, '', false);
        this.d = d;
    }

    static fromDart(d) {
        let type = grok_View_Get_Type(d);
        if (type === VIEW_TYPE.TABLE_VIEW)
            return new TableView(d);
        else
            return new View(d);
    }

    /** Creates a new empty view.
     * @returns {View} */
    static create() { let v = new View(grok_View()); ui._class(v.root, 'grok-default-view'); return v; }

    get root() { return grok_View_Get_Root(this.d); }

    get type() { return grok_View_Get_Type(this.d); }

    get name() { return grok_View_Get_Name(this.d); }
    set name(s) { grok_View_Set_Name(this.d, s); }

    get path() { return grok_View_Get_Path(this.d); }
    set path(s) { grok_View_Set_Path(this.d, s); }

    /** View type URI. Note that {@path} is specific to the instance of the view.
     *  @type {string} */
    get basePath() { return grok_View_Get_BasePath(this.d); }
    set basePath(s) { grok_View_Set_BasePath(this.d, s); }

    get description() { return grok_View_Get_Description(this.d); }
    set description(s) { grok_View_Set_Description(this.d, s); }

    /** Loads previously saved view layout. Only applicable to certain views, such as TableView.
     *  See also {@link saveLayout}
     *  @param {ViewLayout} layout */
    loadLayout(layout) { return grok_View_Load_Layout(this.d, layout.d);  }

    /** Saves view layout as a string. Only applicable to certain views, such as TableView.
     *  See also {@link loadLayout}
     *  @returns {ViewLayout} */
    saveLayout() { return new ViewLayout(grok_View_Save_Layout(this.d)); }

    close() { grok_View_Close(this.d); }
}


/**
 * A {@link View} that is associated with a {@link DataFrame} and exposes
 * exploratory data analysis functionality. This view gets opened whenever
 * a new table is added to the workspace when a user drag-and-drops a CSV file,
 * or opens a table in any other way.
 * @extends View
 */
export class TableView extends View {
    /** @constructs TableView */
    constructor(d) { super(d); }

    /** Associated table, if it exists (for TableView), or null.
     *  @type {DataFrame} */
    get table() { return new DataFrame(grok_View_Get_Table(this.d)); }

    /** @type {Grid} */
    get grid() { return new Grid(grok_View_Get_Grid(this.d)); }

    /** @type {DataFrame} */
    get dataFrame() { return new DataFrame(grok_View_Get_DataFrame(this.d)); }
    set dataFrame(x) { grok_View_Set_DataFrame(this.d, x.d); }

    /** View toolbox that gets shown on the left, in the sidebar
     *  @type {ToolboxPage} */
    get toolboxPage() { return new ToolboxPage(grok_View_Get_ToolboxPage(this.d)); }

    /** Adds a viewer of the specified type.
     * @param {string} viewerType
     * @param options
     * @returns {Viewer} */
    addViewer(viewerType, options = null) {
        let v = new Viewer(grok_View_AddViewer(this.d, viewerType));
        if (options !== null)
            v.setOptions(options);
        return v;
    }

    /** A dock node for this view.
     *  Use `grok.shell.dockManager` to manipulate it; {@link dockManager} is for controlling
     *  widows that reside inside this view.
     *  @type {DockNode} */
    get dockNode() { return new DockNode(grok_View_Get_DockNode(this.d)); }

    /** View's dock manager. Only defined for DockView descendants such as {@link TableView}, UsersView, etc.
     * @type {DockManager} */
    get dockManager() { return new DockManager(grok_View_Get_DockManager(this.d)); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/histogram | histogram}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/histogram}
     *  @param options
     *  @returns {Viewer} */
    histogram      (options = null) { return this.addViewer(VIEWER.HISTOGRAM, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/bar-chart | bar chart}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/bar-chart}
     *  @param options
     *  @returns {Viewer} */
    barChart       (options = null) { return this.addViewer(VIEWER.BAR_CHART, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/box-plot | box plot}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/box-plot}
     *  @param options
     *  @returns {Viewer} */
    boxPlot        (options = null) { return this.addViewer(VIEWER.BOX_PLOT, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/calendar | calendar}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/calendar}
     *  @param options
     *  @returns {Viewer} */
    calendar       (options = null) { return this.addViewer(VIEWER.CALENDAR, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/correlation-plot | correlation plot}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/corr-plot}
     *  @param options
     *  @returns {Viewer} */
    corrPlot       (options = null) { return this.addViewer(VIEWER.CORR_PLOT, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/density-plot | density plot}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/density-plot}
     *  @param options
     *  @returns {Viewer} */
    densityPlot    (options = null) { return this.addViewer(VIEWER.DENSITY_PLOT, options); }

    /** Adds {@link https://datagrok.ai/help/visualize/viewers/filters | filters}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/filters}
     *  @param options
     *  @returns {Viewer} */
    filters        (options = null) { return this.addViewer(VIEWER.FILTERS, options); }

    /** Adds default {@link https://datagrok.ai/help/visualize/viewers/form | form}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/form}
     *  @param options
     *  @returns {Viewer} */
    form           (options = null) { return this.addViewer(VIEWER.FORM, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/google-map | geographical map}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/google-map}
     *  @param options
     *  @returns {Viewer} */
    googleMap      (options = null) { return this.addViewer(VIEWER.GOOGLE_MAP, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/heat-map | heat map}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/heat-map}
     *  @param options
     *  @returns {Viewer} */
    heatMap        (options = null) { return this.addViewer(VIEWER.HEAT_MAP, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/line-chart | line chart}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/line-chart}
     *  @param options
     *  @returns {Viewer} */
    lineChart      (options = null) { return this.addViewer(VIEWER.LINE_CHART, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/shape-map | shape map}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/shape-map}
     *  @param options
     *  @returns {Viewer} */
    shapeMap       (options = null) { return this.addViewer(VIEWER.SHAPE_MAP, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/markup | markup viewer}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/markup}
     *  @param options
     *  @returns {Viewer} */
    markup         (options = null) { return this.addViewer(VIEWER.MARKUP, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/matrix-plot | matrix plot}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/matrix-plot}
     *  @param options
     *  @returns {Viewer} */
    matrixPlot     (options = null) { return this.addViewer(VIEWER.MATRIX_PLOT, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/network-diagram | network diagram}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/network-diagram}
     *  @param options
     *  @returns {Viewer} */
    networkDiagram (options = null) { return this.addViewer(VIEWER.NETWORK_DIAGRAM, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/pc-plot | parallel coordinates plot}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/pc-plot}
     *  @param options
     *  @returns {Viewer} */
    pcPlot         (options = null) { return this.addViewer(VIEWER.PC_PLOT, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/pie-chart | pie chart}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/pie-chart}
     *  @param options
     *  @returns {Viewer} */
    pieChart       (options = null) { return this.addViewer(VIEWER.PIE_CHART, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/scatter-plot | scatter plot}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/scatter-plot}
     *  @param options
     *  @returns {Viewer} */
    scatterPlot    (options = null) { return this.addViewer(VIEWER.SCATTER_PLOT, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/3d-scatter-plot | 3D scatter plot}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/scatter-plot-3d}
     *  @param options
     *  @returns {Viewer} */
    scatterPlot3d  (options = null) { return this.addViewer(VIEWER.SCATTER_PLOT_3D, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/statistics | statistics}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/statistics}
     *  @param options
     *  @returns {Viewer} */
    statistics     (options = null) { return this.addViewer(VIEWER.STATISTICS, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/tile-viewer | tile viewer}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/tile-viewer}
     *  @param options
     *  @returns {Viewer} */
    tileViewer     (options = null) { return this.addViewer(VIEWER.TILE_VIEWER, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/tree-map | tree map}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/tree-map}
     *  @param options
     *  @returns {Viewer} */
    treeMap        (options = null) { return this.addViewer(VIEWER.TREE_MAP, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/trellis-plot | trellis plot}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/trellis-plot}
     *  @param options
     *  @returns {Viewer} */
    trellisPlot    (options = null) { return this.addViewer(VIEWER.TRELLIS_PLOT, options); }

    /** Adds a {@link https://datagrok.ai/help/visualize/viewers/word-cloud | word cloud}.
     *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/word-cloud}
     *  @param options
     *  @returns {Viewer} */
    wordCloud      (options = null) { return this.addViewer(VIEWER.WORD_CLOUD, options); }

    /** Resets view layout, leaving only grid visible. */
    resetLayout() { grok_View_ResetLayout(this.d); }

    /** Detaches and closes the view. */
    detach() { grok_View_Detach(this.d); }

    /** Detaches all viewers. */
    detachViewers() { grok_View_DetachViewers(this.d); }
}


/** Base view for working with collection of objects that reside on the server.
 *  Typically, results are filtered by applying AND operation between two
 *  filters: {@link permanentFilter} (which is programmatically and is not visible)
 *  and {@link searchValue} entered by user.
 *
 *  More details on the smart search syntax: @{link https://datagrok.ai/help/overview/smart-search}
 *
 * @extends View */
export class DataSourceCardView extends View {

    /** @constructs DataSourceCardView */
    constructor(d) { super(d); }

    /** User-specified {@link https://datagrok.ai/help/overview/smart-search | filter expression}.
     * @type {string} */
    get searchValue() { return grok_DataSourceCardView_Get_SearchValue(this.d); }
    set searchValue(s) { return grok_DataSourceCardView_Set_SearchValue(this.d, s); }

    /** Programmatically defined invisible
     * {@link https://datagrok.ai/help/overview/smart-search | filter expression}.
     *  @type {string} */
    get permanentFilter() { return grok_DataSourceCardView_Get_PermanentFilter(this.d); }
    set permanentFilter(s) { return grok_DataSourceCardView_Set_PermanentFilter(this.d, s); }
}


/** Projects view */
export class ProjectsView extends DataSourceCardView {
    /** @constructs ProjectsView */
    constructor(d) { super(d); }

    static create(params) { return new ProjectsView(grok_ProjectsView(params)); }
}


export class ViewLayout {
    constructor(d) { this.d = d; }

    static fromJson(json) { return new ViewLayout(grok_ViewLayout_FromJson(json)); }

    toJson() { return grok_ViewLayout_ToJson(this.d); }
}


export class VirtualView {
    constructor(d) { this.d = d; }

    static create() { return new VirtualView(grok_VirtualItemView()); }

    get root() { return grok_VirtualItemView_Get_Root(this.d); }
    setData(length, renderer) { grok_VirtualItemView_SetData(this.d, length, renderer); }
}
