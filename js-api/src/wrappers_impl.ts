import {Property} from "./entities";
import {TYPE, TYPES_SCALAR} from "./const";
import {TypedEventArgs} from "./viewer";

/** Converts list of Dart objects to JavaScript objects by calling {@link toJs}
 * @param {object[]} params
 * @returns {object[]} - list of JavaScript objects */
export function paramsToJs(params: any): any {
  let result = <any>[];
  for (let i = 0; i < params.length; i++) {
    let type = (<any>window).grok_GetType(params[i]);
    if (type !== null && (!TYPES_SCALAR.has(type) || type === TYPE.LIST || type === TYPE.MAP))
      result.push(toJs(params[i]));
    else
      result.push(params[i]);
  }

  return result;
}


/**
 * Instantiates the corresponding JS handler for the Dart object [dart]. See also {@link toDart}
 * @param dart - Dart handle
 * @param {boolean} check - when true, throws an exception if the object can't be converted to JS.
 * @returns JavaScript wrapper for the Dart object
 * */
export function toJs(dart: any, check: boolean = false): any {
  let type = (<any>window).grok_GetType(dart);
  if (type === TYPE.MAP) {
    let wrapper = (<any>window).grok_GetWrapper(dart);
    for (let key in wrapper) {
      if (wrapper.hasOwnProperty(key)) {
        let type = (<any>window).grok_GetType(wrapper[key]);
        if (type !== null && (!TYPES_SCALAR.has(type) || type === TYPE.LIST || type === TYPE.MAP))
          wrapper[key] = toJs(wrapper[key]);
      }
    }
    return wrapper;
  } else if (type === TYPE.LIST) {
    return paramsToJs(dart);
  } else if (type === 'DG.TypedEventArgs')
    return new TypedEventArgs(dart);

  let wrapper = (<any>window).grok_GetWrapper(dart);
  if (wrapper != null)
    return wrapper;

  if (type === TYPE.PROPERTY)
    return new Property(dart);
  if (check)
    throw `Not supported type: ${type}`;

  return dart;
}

/** Extracts a Dart handle from the JavaScript wrapper. See also {@link toJs} */
export function toDart(x: any): any {
  if (x === undefined || x === null)
    return x;
  if (typeof x.toDart === 'function')
    return x.toDart();
  if (typeof x.dart !== 'undefined')
    return x.dart;
  return x;
}


