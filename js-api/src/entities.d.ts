import {SEMTYPE, TYPE} from "./const";


/** @class
 * Base class for system objects stored in the database in a structured manner.
 * Contains base properties: id, name and path
 * */
export class Entity {

    /** Entity ID (GUID)
     *  @type {string} */
    get id(): string;

    set id(x: string)

    /** Entity name
     *  @type {string} */
    get name(): string

    set name(x: string)

    /** Entity path
     *  @type {string} */
    get path(): string
}

/**
 * Represents a user of the Datagrok platform.
 * @extends Entity
 * */
export class User extends Entity {

    /** First name
     * @type {string} */
    get firstName(): string

    /** Last name
     * @type {string} */
    get lastName(): string

    /** Email
     * @type {string} */
    get email(): string;

    /** Picture URL
     * @type {string} */
    get picture(): string

    /** Login
     *  @type {string} */
    get login(): string

    static fromId(id: string): User

    static current(): User

    /** */
    toMarkup(): string
}

/** Represents a function
 * @extends Entity
 * {@link https://datagrok.ai/help/overview/functions/function}
 * */
export class Func extends Entity {

    /** Returns {@link FuncCall} object in a stand-by state
     * @param {object} parameters
     * @returns {FuncCall} */
    prepare(parameters?: object | null): Function
}

/** Represents a project */
export class Project extends Entity {

    /** Entity name
     *  @type {string} */
    get description(): string

    get isDirty(): boolean

    get isEmpty(): boolean

    toMarkup(): string
}

/** Represents a data query
 * @extends Func
 * {@link https://datagrok.ai/help/access/data-query}
 * */
export class DataQuery extends Func {

    /** Query text
     *  @type {string} */
    get query(): string
}

/** Represents a data job
 * @extends Func
 * {@link https://datagrok.ai/help/access/data-job}
 * */
export class DataJob extends Func {
}

/** Represents a data connection
 * @extends Entity
 * {@link https://datagrok.ai/help/access/data-connection}
 * */
export class DataConnection extends Entity {

    /** Collection of parameters: server, database, endpoint, etc.
     *  @type {object} */
    get parameters(): object
}

/** Represents a predictive model
 * @extends Entity
 * {@link https://datagrok.ai/help/learn/predictive-modeling-info}
 * */
export class Model extends Entity {
}

/** @extends Entity
 * Represents a Jupyter notebook
 * {@link https://datagrok.ai/help/compute/jupyter-notebook}
 * */
export class Notebook extends Entity {
    /** Environment name
     * @type {string} */
    get environment(): string

    set environment(e: string)

    /** Create Notebook on server for edit.
     * @returns {Promise<string>} Current notebook's name */
    edit(): Promise<string>

    /** Converts Notebook to HTML code
     * @returns {Promise<string>} */
    toHtml(): Promise<string>
}

/** @extends Entity
 * Represents a Table metadata
 * */
export class TableInfo extends Entity {
    /** @constructs TableInfo */
    constructor(d: any)
}

/** @extends Entity
 * Represents a User Group
 * */
export class Group extends Entity {
    /** @constructs Group */
    constructor(d: any)
}

/** @extends Func
 * Represents a Script
 * */
export class Script extends Func {
    /** @constructs Script */
    constructor(d: any)
}

/** Represents connection credentials
 *  Usually it is a login and a password pair
 *  Passwords are stored in the secured credentials storage
 *  See also: {@link https://datagrok.ai/help/govern/security}
 *  */
export class Credentials extends Entity {
    constructor(d: any)

    /** Collection of parameters: login, password, API key, etc.
     *  @type {object} */
    get parameters(): object
}

/** Represents a script environment */
export class ScriptEnvironment extends Entity {
    constructor(d: any)

    /** Environment yaml file content
     * @type {string} */
    get environment(): string

    /** Create instance of ScriptEnvironment
     * @param {string} name
     * @returns {ScriptEnvironment}
     * */
    static create(name: string): ScriptEnvironment

    /** Setup environment */
    setup(): Promise<void>
}

/**
 * Represents a package, which is a unit of distribution of content in the Datagrok platform.
 */
export class Package {
    webRoot?: HTMLElement

    //TODO: webroot?
    constructor(webRoot?: HTMLElement)

    /** Override init() method to provide package-specific initialization.
     * It is guaranteed to get called exactly once before the execution of any function below.
     * */

    /*async*/
    init(): Promise<null>

    /** Returns credentials for package
     * @returns {Promise<Credentials>} */
    getCredentials(): Promise<Credentials>
}

/**
 * Override this class, and {@link register} an instance to integrate the platform with custom
 * types and objects.
 *
 * Samples: {@link https://public.datagrok.ai/js/samples/ui/meta/meta}
 * */
export class JsEntityMeta {

    /** Type of the object that this meta handles. */
    get type(): string

    static register(meta: JsEntityMeta): void

    /**
     * Override this method to check whether this meta class should handle the specified object.
     * @param x - specified object.
     * @returns {boolean}
     * */
    isApplicable(x: any): boolean

    /** String representation of the [item], by default item.toString().
     * @param x - item
     * @returns {string} */
    getCaption(x: any): string

    /** Renders icon for the item.
     * @param x - item
     * @returns {Element} */
    renderIcon(x: any): HTMLDivElement

    /** Renders markup for the item.
     * @param x - item
     * @returns {Element} */
    renderMarkup(x: any): HTMLDivElement

    /** Renders tooltip for the item.
     * @param x - item
     * @returns {Element} */
    renderTooltip(x: any): HTMLDivElement

    /** Renders card div for the item.
     * @param x - item
     * @returns {Element} */
    renderCard(x: any): HTMLDivElement

    /** Renders properties list for the item.
     * @param x - item
     * @returns {Element} */
    renderProperties(x: any): HTMLDivElement

    /** Renders view for the item.
     * @param x - item
     * @returns {Element} */
    renderView(x: any): HTMLDivElement

    /** Gets called once upon the registration of meta export class. */
    init(): void

    /**
     * Registers a function that takes applicable objects an the only argument.
     * It will be suggested to run in the context menu for that object, and
     * also in the "Actions" pane on the property panel.
     *
     * Samples: {@link https://public.datagrok.ai/js/samples/ui/docking/docking}
     *
     * @param {string} name - function name
     * @param run - a function that takes exactly one parameter
     * */
    registerParamFunc(name: string, run: (params: any) => void): void;
}


type PropertyGetter = (item: any) => any
type PropertySetter = (item: any) => void

/**
 * Strongly-typed property associated with an object.
 * Used for reflection, serialization, UI generation, and other introspection-dependent tasks.
 *
 * Samples:
 */
export class Property {
    constructor(d: any)

    /** Property getter is a function that acccepts one parameter (item)
     * and returns the property value. */
    get get(): PropertyGetter

    set get(x: PropertyGetter)

    /** Property setter */
    get set(): PropertySetter

    set set(x: PropertySetter);

    /** Property name
     *  @type {string} */
    get name(): string

    set name(s: string)

    /** Property type
     *  @type {string} */
    get propertyType(): string

    set propertyType(s: string)

    /** Semantic type
     *  @type {string} */
    get semType(): SEMTYPE | string

    set semType(s: SEMTYPE | string)

    /** Description */
    get description(): string

    set description(s: string)

    /** Default value */
    get defaultValue(): any

    set defaultValue(s: any)

    /** List of possible values of that property.
     *  PropertyGrid will use it to populate combo boxes.
     *  @returns ArrayList<string>*/
    get choices(): string[]

    set choices(x: string[])

    /** Creates a property
     * @param {string} name
     * @param {TYPE|Type} type
     * @param {function} getter
     * @param {function} setter
     * @param {object} defaultValue
     * @returns Property*/
    static create(name: string, type: TYPE | string,
                  getter: PropertyGetter, setter: PropertySetter,
                  defaultValue?: any | null): Property

    /** Creates an integer property
     * @param {string} name
     * @param {function} getter
     * @param {function} setter
     * @param {object} defaultValue
     * @returns Property*/
    static int(name: string, getter: PropertyGetter, setter: PropertySetter, defaultValue?: number | null): Property

    /** Creates a float property
     * @param {string} name
     * @param {function} getter
     * @param {function} setter
     * @param {object} defaultValue
     * @returns Property*/
    static float(name: string, getter: PropertyGetter, setter: PropertySetter, defaultValue: number | null): Property

    /** Creates a string property
     * @param {string} name
     * @param {function} getter
     * @param {function} setter
     * @param {object} defaultValue
     * @returns Property*/
    static string(name: string, getter: PropertyGetter, setter: PropertySetter, defaultValue: string | null): Property
}

export class SemanticValue {
    constructor(d: any)

    get value(): any

    set value(x: any)

    get semType(): SEMTYPE

    set semType(x: SEMTYPE)

    static fromValueType(value: any, semType: SEMTYPE): SemanticValue
}

export class DateTime {
    constructor(d: any)

    static fromDate(date: Date): DateTime

    static fromMillisecondsSinceEpoch(millisecondsSinceEpoch: number): DateTime
}