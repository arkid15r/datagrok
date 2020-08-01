import {Script} from "./entities";
import {ProgressIndicator} from "./widgets";

/** Grok functions */
export class Functions {
    register(func: any): void

    registerParamFunc(name: string, type: string, run: any, check?: any, description?: string): void

    call(name: string, parameters?: Object, showProgress?: boolean, progress?: number | null): Promise<any>;

    eval(name: string): Promise<any>;

    scriptSync(s: Script): any
}

/** Represents a function call
 * {@link https://datagrok.ai/help/overview/functions/function-call*}
 * */
export class FuncCall {
    constructor(d: any)

    /** Returns function call parameter value
     * @param {string} name
     * @returns {object} */
    getParamValue(name: string): Object

    /** Executes the function call
     * @param {boolean} showProgress
     * @param {ProgressIndicator} progress
     * @returns {Promise<FuncCall>} */
    call(showProgress?: boolean, progress?: ProgressIndicator | null): Promise<FuncCall>
}

export function callFuncWithDartParameters<T>(f: (...params: any[]) => T, params: any): T;