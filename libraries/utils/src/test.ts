import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {Observable, Subscription} from 'rxjs';
import Timeout = NodeJS.Timeout;

export const tests: {
  [key: string]: {
    tests?: Test[], before?: () => Promise<void>, after?: () => Promise<void>,
    beforeStatus?: string, afterStatus?: string
  }
} = {};

const autoTestsCatName = 'Auto Tests';
const wasRegistered: {[key: string]: boolean} = {};
export let currentCategory: string;

export namespace assure {
  export function notNull(value: any, name?: string) {
    if (value == null)
      throw new Error(`${name == null ? 'Value' : name} not defined`);
  }
}

export interface TestOptions {
  timeout?: number;
  unhandledExceptionTimeout?: number;
  skipReason?: string;
}

export class TestContext {
  catchUnhandled = true;
  report = false;

  constructor(catchUnhandled?: boolean, report?: boolean) {
    if (catchUnhandled !== undefined) this.catchUnhandled = catchUnhandled;
    if (report !== undefined) this.report = report;
  };
}

export class Test {
  test: () => Promise<any>;
  name: string;
  category: string;
  options?: TestOptions;

  constructor(category: string, name: string, test: () => Promise<any>, options?: TestOptions) {
    this.category = category;
    this.name = name;
    options ??= {};
    options.timeout ??= 30000;
    this.options = options;
    this.test = async (): Promise<any> => {
      return new Promise(async (resolve, reject) => {
        let result = '';
        try {
          result = await test();
        } catch (e: any) {
          reject(e);
        }
        resolve(result);
      });
    };
  }
}

export async function testEvent<T>(event: Observable<T>,
  handler: (args: T) => void, trigger: () => void, ms: number = 0): Promise<string> {
  let sub: Subscription;
  return new Promise((resolve, reject) => {
    sub = event.subscribe((args) => {
      try {
        handler(args);
      } catch (e) {
        reject(e);
      }
      sub.unsubscribe();
      resolve('OK');
    });
    setTimeout(() => {
      sub.unsubscribe();
      // eslint-disable-next-line prefer-promise-reject-errors
      reject('timeout');
    }, ms);
    trigger();
  });
}

export function test(name: string, test: () => Promise<any>, options?: TestOptions): void {
  if (tests[currentCategory] == undefined)
    tests[currentCategory] = {};
  if (tests[currentCategory].tests == undefined)
    tests[currentCategory].tests = [];
  tests[currentCategory].tests!.push(new Test(currentCategory, name, test, options));
}

/* Tests two objects for equality, throws an exception if they are not equal. */
export function expect(actual: any, expected: any = true, error?: string): void {
  if (error)
    error = `${error}, `;
  else error = '';
  if (actual !== expected)
    throw new Error(`${error}Expected "${expected}", got "${actual}"`);
}

export function expectFloat(actual: number, expected: number, tolerance = 0.001, error?: string): void {
  const areEqual = Math.abs(actual - expected) < tolerance;
  expect(areEqual, true, `${error ?? ''} (tolerance = ${tolerance})`);
  if (!areEqual)
    throw new Error(`Expected ${expected}, got ${actual} (tolerance = ${tolerance})`);
}

export function expectTable(actual: DG.DataFrame, expected: DG.DataFrame, error?: string): void {
  const expectedRowCount = expected.rowCount;
  const actualRowCount = actual.rowCount;
  expect(actualRowCount, expectedRowCount, `${error ?? ''}, row count`);

  for (const column of expected.columns) {
    const actualColumn = actual.columns.byName(column.name);
    if (actualColumn == null)
      throw new Error(`Column ${column.name} not found`);
    if (actualColumn.type != column.type)
      throw new Error(`Column ${column.name} type expected ${column.type} got ${actualColumn.type}`);
    for (let i = 0; i < expectedRowCount; i++) {
      const value = column.get(i);
      const actualValue = actualColumn.get(i);
      if (column.type == DG.TYPE.FLOAT)
        expectFloat(actualValue, value, 0.0001, error);
      else if (column.type == DG.TYPE.DATE_TIME)
        expect(actualValue.isSame(value), true, error);
      else
        expect(actualValue, value, error);
    }
  }
}

export function expectObject(actual: { [key: string]: any }, expected: { [key: string]: any }) {
  for (const [expectedKey, expectedValue] of Object.entries(expected)) {
    if (!actual.hasOwnProperty(expectedKey))
      throw new Error(`Expected property "${expectedKey}" not found`);

    const actualValue = actual[expectedKey];
    if (actualValue instanceof Array && expectedValue instanceof Array)
      expectArray(actualValue, expectedValue);
    else if (actualValue instanceof Object && expectedValue instanceof Object)
      expectObject(actualValue, expectedValue);
    else if (Number.isFinite(actualValue) && Number.isFinite(expectedValue))
      expectFloat(actualValue, expectedValue);
    else if (actualValue != expectedValue)
      throw new Error(`Expected (${expectedValue}) for key '${expectedKey}', got (${actualValue})`);
  }
}

export function expectArray(actual: ArrayLike<any>, expected: ArrayLike<any>) {
  const actualLength = actual.length;
  const expectedLength = expected.length;

  if (actualLength != expectedLength) {
    throw new Error(`Arrays are of different length: actual array length is ${actualLength} ` +
      `and expected array length is ${expectedLength}`);
  }

  for (let i = 0; i < actualLength; i++) {
    if (actual[i] instanceof Array && expected[i] instanceof Array)
      expectArray(actual[i], expected[i]);
    else if (actual[i] instanceof Object && expected[i] instanceof Object)
      expectObject(actual[i], expected[i]);
    else if (actual[i] != expected[i])
      throw new Error(`Expected ${expected[i]} at position ${i}, got ${actual[i]}`);
  }
}

/* Defines a test suite. */
export function category(category: string, tests: () => void): void {
  currentCategory = category;
  tests();
}

/* Defines a function to be executed before the tests in this category are executed. */
export function before(before: () => Promise<void>): void {
  if (tests[currentCategory] == undefined)
    tests[currentCategory] = {};
  tests[currentCategory].before = before;
}

/* Defines a function to be executed after the tests in this category are executed. */
export function after(after: () => Promise<void>): void {
  if (tests[currentCategory] == undefined)
    tests[currentCategory] = {};
  tests[currentCategory].after = after;
}

function addNamespace(s: string, f: DG.Func): string {
  return s.replace(new RegExp(f.name, 'gi'), f.nqName);
}

export async function initAutoTests(packageId: string, module?: any) {
  if (wasRegistered[packageId]) return;
  const moduleTests = module ? module.tests : tests;
  if (moduleTests[autoTestsCatName] !== undefined) {
    wasRegistered[packageId] = true;
    return;
  }
  const moduleAutoTests = [];
  const packFunctions = await grok.dapi.functions.filter(`package.id = "${packageId}"`).list();
  for (const f of packFunctions) {
    const tests = f.options['test'];
    if (!(tests && Array.isArray(tests) && tests.length)) continue;
    for (let i = 0; i < tests.length; i++) {
      moduleAutoTests.push(new Test(autoTestsCatName, tests.length === 1 ? f.name : `${f.name} ${i + 1}`, async () => {
        const res = await grok.functions.eval(addNamespace(tests[i], f));
        // eslint-disable-next-line no-throw-literal
        if (res !== true) throw `Failed: ${tests[i]}`;
      }));
    }
  }
  wasRegistered[packageId] = true;
  if (!moduleAutoTests.length) return;
  moduleTests[autoTestsCatName] = {tests: moduleAutoTests};
}

export async function runTests(options?: {category?: string, test?: string, testContext?: TestContext}) {
  const package_ = grok.functions.getCurrentCall()?.func?.package;
  await initAutoTests(package_.id);
  const results: { category?: string, name?: string, success: boolean,
                   result: string, ms: number, skipped: boolean }[] = [];
  console.log(`Running tests`);
  options ??= {};
  options!.testContext ??= new TestContext();
  grok.shell.lastError = '';
  for (const [key, value] of Object.entries(tests)) {
    if (options?.category != undefined) {
      if (!key.toLowerCase().startsWith(options?.category.toLowerCase()))
        continue;
    }
    console.log(`Started ${key} category`);
    try {
      if (value.before)
        await value.before();
    } catch (x: any) {
      value.beforeStatus = x.toString();
    }
    const t = value.tests ?? [];
    const res = [];
    for (let i = 0; i < t.length; i++)
      res.push(await execTest(t[i], options?.test));
    const data = (await Promise.all(res)).filter((d) => d.result != 'skipped');
    try {
      if (value.after)
        await value.after();
    } catch (x: any) {
      value.afterStatus = x.toString();
    }
    if (value.afterStatus)
      data.push({category: key, name: 'init', result: value.afterStatus, success: false, ms: 0, skipped: false});
    if (value.beforeStatus)
      data.push({category: key, name: 'init', result: value.beforeStatus, success: false, ms: 0, skipped: false});
    results.push(...data);
  }
  if (options.testContext.catchUnhandled) {
    await delay(1000);
    if (grok.shell.lastError.length > 0) {
      results.push({
        category: 'Unhandled exceptions',
        name: 'exceptions',
        result: grok.shell.lastError, success: false, ms: 0, skipped: false
      });
    }
  }
  if (options.testContext.report) {
    const logger = new DG.Logger();
    const successful = results.filter((r) => r.success).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.success);
    const description = 'Package @package tested: @successful successful, @skipped skipped, @failed failed tests';
    const params = {
      successful: successful,
      skipped: skipped,
      failed: failed.length,
      package: package_
    };
    for (const r of failed) Object.assign(params, {[`${r.category} | ${r.name}`]: r.result});
    logger.log(description, params, 'package-tested');
  }
  return results;
}

async function execTest(t: Test, predicate: string | undefined) {
  let r: { category?: string, name?: string, success: boolean, result: string, ms: number, skipped: boolean };
  const filter = predicate != undefined && (!t.name.toLowerCase().startsWith(predicate.toLowerCase()));
  const skip = t.options?.skipReason || filter;
  const skipReason = filter ? 'skipped' : t.options?.skipReason;
  if (!skip)
    console.log(`Started ${t.category} ${t.name}`);
  const start = new Date();
  try {
    if (skip)
      r = {success: true, result: skipReason!, ms: 0, skipped: true};
    else
      r = {success: true, result: await t.test() ?? 'OK', ms: 0, skipped: false};
  } catch (x: any) {
    r = {success: false, result: x.toString(), ms: 0, skipped: false};
  }
  const stop = new Date();
  // @ts-ignore
  r.ms = stop - start;
  if (!skip)
    console.log(`Finished ${t.category} ${t.name} for ${r.ms} ms`);
  r.category = t.category;
  r.name = t.name;
  return r;
}

/* Waits [ms] milliseconds */
export async function delay(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function awaitCheck(checkHandler: () => boolean,
  error: string = 'Timeout exceeded', wait: number = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error(error));
    }, wait);
    // @ts-ignore
    const interval: Timeout = setInterval(() => {
      if (checkHandler()) {
        clearInterval(interval);
        resolve();
      }
    }, 50);
  });
}

export function isDialogPresent(dialogTitle: string): boolean {
  for (let i = 0; i < DG.Dialog.getOpenDialogs().length; i++) {
    if (DG.Dialog.getOpenDialogs()[i].title == dialogTitle)
      return true;
  }
  return false;
}

export async function testViewer(v: string, df: DG.DataFrame, detectSemanticTypes: boolean = false): Promise<void> {
  if (detectSemanticTypes) await grok.data.detectSemanticTypes(df);
  const tv = grok.shell.addTableView(df);
  const viewerName = `[name=viewer-${v.replace(/\s+/g, '-')} i]`;
  const selector = `${viewerName} canvas,${viewerName} svg,${viewerName} img,
    ${viewerName} input,${viewerName} h1,${viewerName} a`;
  const res = [];
  try {
    let viewer = tv.addViewer(v);
    await awaitCheck(() => document.querySelector(selector) !== null,
      'cannot load viewer', 3000);
    res.push(Array.from(tv.viewers).length);
    Array.from(df.row(0).cells).forEach((c) => c.value = null);
    df.rows.select((row) => row.idx > 1 && row.idx < 7);
    for (let i = 7; i < 12; i++) df.filter.set(i, false);
    df.currentRowIdx = 1;
    const props = viewer.getOptions(true).look;
    const newProps: Record<string, boolean> = {};
    Object.keys(props).filter((k) => typeof props[k] === 'boolean').forEach((k) => newProps[k] = !props[k]);
    viewer.setOptions(newProps);
    await delay(250);
    const layout = tv.saveLayout();
    const oldProps = viewer.getOptions().look;
    tv.resetLayout();
    res.push(Array.from(tv.viewers).length);
    tv.loadLayout(layout);
    await awaitCheck(() => document.querySelector(selector) !== null,
      'cannot load viewer from layout', 3000);
    await delay(250);
    res.push(Array.from(tv.viewers).length);
    viewer = Array.from(tv.viewers).find((v) => v.type !== 'Grid')!;
    expectArray(res, [2, 1, 2]);
    expect(JSON.stringify(viewer.getOptions().look), JSON.stringify(oldProps));
  } finally {
    tv.close();
    grok.shell.closeTable(df);
  }
}
