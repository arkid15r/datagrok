import {paramsToJs, toDart, toJs} from "./wrappers";

/** Grok functions */
export class Functions {
  register(func) {
    grok_RegisterFunc(func);
  }

  registerParamFunc(name, type, run, check = null, description = null) {
    grok_RegisterParamFunc(name, type, run, check, description);
  }

  call(name, parameters = {}, showProgress = false, progress = null) {
    return new Promise((resolve, reject) => grok_CallFunc(name, parameters, (out) => resolve(toJs(out)), (err) => reject(err), showProgress, toDart(progress)));
  }

  eval(name) {
    return new Promise((resolve, reject) => grok_EvalFunc(name, function (out) {
      return resolve(toJs(out));
    }, (err) => reject(err)));
  }

  scriptSync(s) {
    return toJs(grok_ScriptSync(s), false);
  }
}

/** Represents a function call
 * {@link https://datagrok.ai/help/overview/functions/function-call*}
 * */
export class FuncCall {
  constructor(d) {
    this.d = d;
  }

  /** Returns function call parameter value
   * @param {string} name
   * @returns {object} */
  getParamValue(name) {
    return toJs(grok_FuncCall_Get_Param_Value(this.d, name));
  }

  /** Executes the function call
   * @param {boolean} showProgress
   * @param {ProgressIndicator} progress
   * @returns {Promise<FuncCall>} */
  call(showProgress = false, progress = null) {
    return new Promise((resolve, reject) => grok_FuncCall_Call(this.d, (out) => resolve(toJs(out)), (err) => reject(err), showProgress, toDart(progress)));
  }
}

export function callFuncWithDartParameters(f, params) {
  let jsParams = paramsToJs(params);
  return f.apply(null, jsParams);
}
