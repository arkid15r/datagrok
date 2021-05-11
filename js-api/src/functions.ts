import {paramsToJs, toDart, toJs} from "./wrappers";
import {Type} from "./const";
import {Entity, Func} from "./entities";
import {DartWidget, ProgressIndicator, Widget} from "./widgets";
import {Column} from "./dataframe";
declare let grok: any;
declare let DG: any;
let api = <any>window;

/** Grok functions */
export class Functions {
  register(func: Func): void {
    api.grok_RegisterFunc(func);
  }

  registerParamFunc(name: string, type: Type, run: Function, check: boolean | null = null, description: string | null = null): void {
    api.grok_RegisterParamFunc(name, type, run, check, description);
  }

  call(name: string, parameters: object = {}, showProgress: boolean = false, progress: ProgressIndicator | null = null): Promise<any> {
    return new Promise((resolve, reject) => api.grok_CallFunc(name, parameters, (out: any) => resolve(toJs(out)), (err: any) => reject(err), showProgress, toDart(progress)));
  }

  eval(name: string): Promise<any> {
    return new Promise((resolve, reject) => api.grok_EvalFunc(name, function (out: any) {
      return resolve(toJs(out));
    }, (err: any) => reject(err)));
  }

  scriptSync(s: string): any {
    return toJs(api.grok_ScriptSync(s));
  }
}

export class Context {
  readonly d: any;
  constructor(d: any) {
    this.d = d;
  }

  static create(): Context {
    return toJs(api.grok_Context_Create());
  }

  setVariable(name: string, value: any): void {
    api.grok_Context_Set_Variable(this.d, name, toDart(value));
  }

  getVariable(name: string): any {
    return toJs(api.grok_Context_Get_Variable(this.d, name));
  }

}

/** Represents a function call
 * {@link https://datagrok.ai/help/overview/functions/function-call*}
 * */
export class FuncCall {
  private readonly d: any;
  constructor(d: any) {
    this.d = d;
  }

  get func(): Func { return toJs(api.grok_FuncCall_Get_Func(this.d)); }
  set func(func: Func) {api.grok_FuncCall_Get_Func(this.d, func.d)}

  /** Returns function call parameter value
   * @param {string} name
   * @returns {object} */
  getParamValue(name: string): any {
    return toJs(api.grok_FuncCall_Get_Param_Value(this.d, name));
  }

  get context(): Context { return toJs(api.grok_FuncCall_Get_Context(this.d)); }
  set context(context: Context) { api.grok_FuncCall_Set_Context(this.d, context.d); }

  getOutputParamValue(): any {
    return toJs(api.grok_FuncCall_Get_Output_Param_Value(this.d));
  }

  setParamValue(name: string, value: any): void {
    api.grok_FuncCall_Set_Param_Value(this.d, name, toDart(value));
  }

  /** Executes the function call
   * @param {boolean} showProgress
   * @param {ProgressIndicator} progress
   * @returns {Promise<FuncCall>} */
  call(showProgress: boolean = false, progress: ProgressIndicator | null = null): Promise<FuncCall> {
    return new Promise((resolve, reject) => api.grok_FuncCall_Call(this.d, (out: any) => resolve(toJs(out)), (err: any) => reject(err), showProgress, toDart(progress)));
  }

  getEditor(condensed?: boolean, showTableSelectors?: boolean): Promise<HTMLElement> {
    return new Promise((resolve, reject) => api.grok_FuncCall_Get_Editor(this.d, condensed, showTableSelectors, (out: any) => resolve(out), (err: any) => reject(err)));
  }
}

export function callFuncWithDartParameters<T>(f: (...params: any[]) => T, params: object): T {
  let jsParams = paramsToJs(params);
  return f.apply(null, jsParams);
}

export class StepEditor extends DartWidget {

  constructor(d: any) {
    super(d);
  }

  static create(): StepEditor {
    return toJs(api.grok_StepEditor_Create());
  }

  loadScript(script: String): Promise<void> {
    return new Promise((resolve, reject) => api.grok_StepEditor_LoadScript(this.d, script, (out: any) => resolve(toJs(out)), (err: any) => reject(err)));
  }

  toScript(): string {
    return api.grok_StepEditor_ToScript(this.d);
  }

}
