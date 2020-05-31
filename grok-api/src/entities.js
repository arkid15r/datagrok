import * as ui from "./../ui.js";
import {Functions} from "./functions";

/**
 * Represents a user of the Datagrok platform.
 * */
export class User {
    constructor(d) { this.d = d; }

    static fromId(id) { return new User(grok_User_From_Id(id)); }

    static current() { return new User(grok_User()); }

    /** @type {string} */
    get firstName() { return grok_User_Get_FirstName(this.d); }

    /** @type {string} */
    get lastName() { return grok_User_Get_LastName(this.d); }

    /** @type {string} */
    get email() { return grok_User_Get_Email(this.d); }

    /** @type {string} */
    get picture() { return grok_User_Get_Picture(this.d); }

    /** @type {string} */
    get login() { return grok_User_Get_Login(this.d); }

    toMarkup() { return grok_User_ToMarkup(this.d); }
}


/**
 * Base class for system objects stored in the database in a structured manner.
 *
 *
 * */
export class Entity {
    constructor(d) { this.d = d;}

    get id() { return grok_Entity_Get_Id([this.d]); }
    set id(x) { return grok_Entity_Set_Id([this.d], x); }

    get name() { return grok_Entity_Get_Name([this.d]); }
    set name(x) { return grok_Entity_Set_Name([this.d], x); }

    get path() { return grok_Entity_Path([this.d]); }
}


/** Represents a project */
export class Project extends Entity {
    constructor(d) { super(d); }

    get description() { return grok_Project_Description(this.d); }
    get isDirty() { return grok_Project_IsDirty(this.d); }
    get isEmpty() { return grok_Project_IsEmpty(this.d); }

    toMarkup() { return grok_Project_ToMarkup(this.d); }
}


/** Represents a data query */
export class DataQuery extends Entity {
    constructor(d) { super(d); }

    get query() { return grok_Query_Query([this.d]); }
}


/** Represents a data connection */
export class DataConnection extends Entity {
    constructor(d) { super(d); }

    get parameters() { return grok_DataConnection_Parameters([this.d]); }
}


/** Represents connection credentials */
export class Credentials extends Entity {
    constructor(d) { super(d); }

    get parameters() { return grok_Credentials_Parameters([this.d]); }
}


/**
 * Represents a package, which is a unit of distribution of content in the Datagrok platform.
 */
export class Package {
    constructor(webRoot) {
        this.webRoot = webRoot;
    }

    // Override init() method to provide package-specific initialization.
    // It is guaranteed to get called exactly once before the execution of any function below.
    /*async*/ init() { return Promise.resolve(null); }
}


/**
 * Override this class, and {@link register} an instance to integrate the platform with custom
 * types and objects.
 *
 * Samples: {@see https://public.datagrok.ai/js/samples/ui/meta/meta}
 */
export class JsEntityMeta {

    /** Type of the object that this meta handles. */
    get type() { throw 'Not defined.'; }

    /**
     * Override this method to check whether this meta class should handle the specified object.
     * @param x - specified object.
     * @returns {boolean}
     * */
    isApplicable(x) { throw 'Not defined.'; }

    /** String representation of the [item], by default item.toString().
     * @param x - item
     * @returns {string} */
    getCaption(x) { return `${x}`; };

    renderIcon(x) { return ui.divText(this.getCaption(x)); }

    renderMarkup(x) { return ui.divText(this.getCaption(x)); }
    renderTooltip(x) { return ui.divText(this.getCaption(x)); }
    renderCard(x) { return ui.divText(this.getCaption(x)); }
    renderProperties(x) { return ui.divText(this.getCaption(x)); }
    renderView(x) {return this.renderProperties(x); }

    /** Gets called once upon the registration of meta export class. */
    init() {}

    static register(meta) { grok_Meta_Register(meta); }

    /**
     * Registers a function that takes applicable objects an the only argument.
     * It will be suggested to run in the context menu for that object, and
     * also in the "Actions" pane on the property panel.
     *
     * Samples: {@see https://public.datagrok.ai/js/samples/ui/docking/docking}
     *
     * @param {string} name - function name
     * @param run - a function that takes exactly one parameter
     * */
    registerParamFunc(name, run) {
        new Functions().registerParamFunc(name, this.type, run, this.isApplicable);
    }
}


/**
 * Strongly-typed property associated with an object.
 * Used for reflection, serialization, UI generation, and other introspection-dependent tasks.
 *
 * Samples:
 */
export class Property {
    constructor(d) { this.d = d; }

    /** Property getter is a function that acccepts one parameter (item)
     * and returns the property value. */
    get get() { return grok_Property_Get_Get(this.d); }
    set get(x) { return grok_Property_Set_Get(this.d, x); }

    /** Property setter */
    get set() { return grok_Property_Get_Set(this.d); }
    set set(x) { return grok_Property_Set_Set(this.d, x); }

    /** Property name
     *  @type {string} */
    get name() { return grok_Property_Get_Name(this.d); }
    set name(s) { grok_Property_Set_Name(this.d, s); }

    /** Property type
     *  @type {string} */
    get propertyType() { return grok_Property_Get_PropertyType(this.d); }
    set propertyType(s) { grok_Property_Set_PropertyType(this.d, s); }

    /** Semantic type
     *  @type {string} */
    get semType() { return grok_Property_Get_SemType(this.d); }
    set semType(s) { grok_Property_Set_SemType(this.d, s); }

    /** Description */
    get description() { return grok_Property_Get_Description(this.d); }
    set description(s) { grok_Property_Set_Description(this.d, s); }

    /** Default value */
    get defaultValue() { return grok_Property_Get_DefaultValue(this.d); }
    set defaultValue(s) { grok_Property_Set_DefaultValue(this.d, s); }

    /** List of possible values of that property.
     *  PropertyGrid will use it to populate combo boxes.
     *  @returns ArrayList<string>*/
    get choices() { return grok_Property_Get_Choices(this.d); }
    set choices(x) { return grok_Property_Set_Choices(this.d, x); }

    static create(name, type, getter, setter, defaultValue = null) { return new Property(grok_Property(name, type, getter, setter, defaultValue)); }
    static int(name, getter, setter, defaultValue) { return Property.create(name, TYPE.INT, getter, setter, defaultValue); }
    static float(name, getter, setter, defaultValue) { return Property.create(name, TYPE.FLOAT, getter, setter, defaultValue); }
    static string(name, getter, setter, defaultValue) { return Property.create(name, TYPE.STRING, getter, setter, defaultValue); }
}

export class SemanticValue {
    constructor(d) { this.d = d; }

    static fromValueType(value, semType) { return new SemanticValue(grok_SemanticValue(value, semType)); }

    get value() { return grok_SemanticValue_Get_Value(this.d); }
    set value(x) { grok_SemanticValue_Set_Value(this.d, x); }

    get semType() { return grok_SemanticValue_Get_SemType(this.d); }
    set semType(x) { grok_SemanticValue_Set_SemType(this.d, x); }
}

export class DateTime {
    constructor(d) { this.d = d; }

    static fromDate(date) { return DateTime.fromMillisecondsSinceEpoch(date.getTime()); }
    static fromMillisecondsSinceEpoch(millisecondsSinceEpoch) {
        return new DateTime(grok_DateTime_FromMillisecondsSinceEpoch(millisecondsSinceEpoch));
    }
}
