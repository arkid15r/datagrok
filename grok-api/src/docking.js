/**
 * @typedef {string} DockType
 **/

/** @enum {DockType} */
export const DOCK_TYPE = {
    LEFT: "left",
    RIGHT: "right",
    TOP: "top",
    BOTTOM: "bottom",
    FILL: "fill",
};


export class DockNode {
    constructor(d) { this.d = d; }

    /** @returns {DockContainer} */
    get container() { return new DockContainer(grok_DockNode_Get_Container(this.d)); }

    detachFromParent() { return grok_DockNode_DetachFromParent(this.d); }
    removeChild(childNode) { return grok_DockNode_RemoveChild(this.d, childNode); }
};


export class DockContainer {
    constructor(d) { this.d = d; }

    get containerElement() { return grok_DockContainer_Get_ContainerElement(this.d); }

    destroy() { grok_DockContainer_Destroy(this.d); }

    /** Undocks a panel and converts it into a floating dialog window
     *  It is assumed that only leaf nodes (panels) can be undocked */
    undock() { grok_DockContainer_Undock(this.d); }

    /** Removes a dock container from the dock layout hierarcy
     *  @returns {DockNode} - the node that was removed from the dock tree */
    //remove() { return new DockNode(grok_DockContainer_Remove(this.d)); }
}


/** Window docking manager */
export class DockManager {
    constructor(d) { this.d = d; }

    get element() { return grok_DockManager_Get_Element(this.d); }

    get rootNode() { return new DockNode(grok_DockManager_Get_RootNode(this.d)); }

    /**
     * The document view is then central area of the dock layout hierarchy.
     * This is where more important panels are placed (e.g. the text editor in an IDE,
     * 3D view in a modeling package etc
     */
    get documentContainer() { return new DockContainer(grok_DockManaget_Get_DocumentContainer(this.d)); }

    /**
     * Docks the element relative to the reference node.
     * @param {DockType} dockType - Dock type (left | right | top | bottom | fill).
     * @param {number} ratio - Ratio of the area to take (relative to the reference node).
     * @param {string=} title - Name of the resulting column. Default value is agg(colName).
     * @returns {DockNode}
     * */
    dock(element, dockType, refNode, title = '', ratio = 0.5) {
        return new DockNode(grok_DockManager_Dock(this.d, refNode == null ? null : refNode.d, element, dockType, title, ratio));
    }

    /**
     * Docks the element relative to the reference node.
     * @param {DockType} dockType - Dock type (left | right | top | bottom | fill).
     * @param {number} ratio - Ratio of the area to take (relative to the reference node).
     * @param {string=} title - Name of the resulting column. Default value is agg(colName).
     * @returns {DockNode}
     * */
    dockDialog(element, dockType, refNode, title = '') {
        return new DockNode(grok_DockManager_DockDialog(this.d, refNode == null ? null : refNode.d, element, dockType, title));
    }
}