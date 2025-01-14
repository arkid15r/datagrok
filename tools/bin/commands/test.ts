import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';
import {Browser, Page} from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import yaml from 'js-yaml';
import * as utils from '../utils/utils';
import * as color from '../utils/color-utils';
import * as testUtils from '../utils/test-utils';


export function test(args: TestArgs): boolean {
  const options = Object.keys(args).slice(1);
  const commandOptions = ['host', 'csv', 'gui', 'catchUnhandled',
    'report', 'skip-build', 'skip-publish', 'category', 'record'];
  const nArgs = args['_'].length;
  const curDir = process.cwd();
  const grokDir = path.join(os.homedir(), '.grok');
  const confPath = path.join(grokDir, 'config.yaml');

  if (nArgs > 1 || options.length > commandOptions.length || (options.length > 0 &&
    !options.every(op => commandOptions.includes(op))))
    return false;

  if (!utils.isPackageDir(curDir)) {
    color.error('File `package.json` not found. Run the command from the package directory');
    return false;
  }

  if (!fs.existsSync(confPath)) {
    color.error(`File \`${confPath}\` not found. Run \`grok config\` to set up the config file`);
    return false;
  }

  const config = yaml.load(fs.readFileSync(confPath, { encoding: 'utf-8' })) as utils.Config;

  if (args.host) {
    if (args.host in config.servers) {
      process.env.HOST = args.host;
      console.log('Environment variable `HOST` is set to', args.host);
    } else {
      color.error(`Unknown server alias. Please add it to ${confPath}`);
      return false;
    }
  } else if (config.default) {
    process.env.HOST = config.default;
    console.log('Environment variable `HOST` is set to', config.default);
  }

  const packageData = JSON.parse(fs.readFileSync(path.join(curDir, 'package.json'), { encoding: 'utf-8' }));
  if (packageData.name) {
    process.env.TARGET_PACKAGE = utils.kebabToCamelCase(utils.removeScope(packageData.name));
    console.log('Environment variable `TARGET_PACKAGE` is set to', process.env.TARGET_PACKAGE);
  } else {
    color.error('Invalid package name. Set the `name` field in `package.json`');
    return false;
  }

  if (args['skip-build']) {
    if (args['skip-publish'])
      test();
    else
      publish(test);
  } else {
    build(args['skip-publish'] ? test : () => publish(test));
  }

  function build(callback: Function): void {
    exec('npm run build', (err, stdout, stderr) => {
      color.info(`Building package...`);
      if (err) {
        console.log(stdout);
        throw err;
      } else {
        console.log(stdout);
        color.warn(stderr);
      }
      callback();
    });
  }

  function publish(callback: Function): void {
    exec(`grok publish ${process.platform === 'win32' ? '%HOST%' : '${HOST}'}`, (err, stdout, stderr) => {
      color.info(`Publishing package "${process.env.TARGET_PACKAGE}" to ${process.env.HOST}...`);
      if (err)
        throw err;
      else {
        console.log(stdout);
        color.warn(stderr);
      }
      callback();
    });
  }

  function test(): void {
    color.info('Starting tests...');
    const P_START_TIMEOUT: number = 3600000;
    let browser: Browser;
    let page: Page;
    let recorder: PuppeteerScreenRecorder;
    type resultObject = { failReport: string, skipReport: string, passReport: string, failed: boolean, csv?: string };

    function init(timeout: number): Promise<void> {
      const params = Object.assign({}, testUtils.defaultLaunchParameters);
      if (args.gui)
        params['headless'] = false;
      return testUtils.runWithTimeout(timeout, async () => {
        try {
          let out = await testUtils.getBrowserPage(puppeteer, params);
          browser = out.browser;
          page = out.page;
          recorder = new PuppeteerScreenRecorder(page, testUtils.recorderConfig);
        } catch (e) {
          throw e;
        }
      })
    }

    function runTest(timeout: number, options: {category?: string, catchUnhandled?: boolean,
      report?: boolean, record?: boolean} = {}): Promise<resultObject> {
      return testUtils.runWithTimeout(timeout, async () => {
        let consoleLog: string = '';
        if (options.record) {
          await recorder.start('./test-record.mp4');
          page.on('console', msg => consoleLog += `CONSOLE LOG ENTRY: ${msg.text()}\n`);
          page.on('pageerror', error => {
            consoleLog += `CONSOLE LOG ERROR: ${error.message}\n`;
          });
          page.on('response', response => {
            consoleLog += `CONSOLE LOG REQUEST: ${response.status()}, ${response.url()}\n`;
          });
        }
        const targetPackage: string = process.env.TARGET_PACKAGE ?? '#{PACKAGE_NAMESPACE}';
        console.log(`Testing ${targetPackage} package...\n`);

        let r: resultObject = await page.evaluate((targetPackage, options, testContext): Promise<resultObject> => {
          return new Promise<resultObject>((resolve, reject) => {            
            (<any>window).grok.functions.call(`${targetPackage}:test`, {
              'category': options.category,
              'testContext': testContext,
            }).then((df: any) => {
              let failed = false;
              let skipReport = '';
              let passReport = '';
              let failReport = '';

              if (df == null) {
                failed = true;
                failReport = `Fail reason: No package tests found${options.category ? ` for category "${options.category}"` : ''}`;
                resolve({failReport, skipReport, passReport, failed});
              }

              const cStatus = df.columns.byName('success');
              const cSkipped = df.columns.byName('skipped');
              const cMessage = df.columns.byName('result');
              const cCat = df.columns.byName('category');
              const cName = df.columns.byName('name');
              const cTime = df.columns.byName('ms');
              for (let i = 0; i < df.rowCount; i++) {
                if (cStatus.get(i)) {
                  if (cSkipped.get(i)) {
                    skipReport += `Test result : Skipped : ${cTime.get(i)} : ${targetPackage}.${cCat.get(i)}.${cName.get(i)} : ${cMessage.get(i)}\n`;
                  } else {
                    passReport += `Test result : Success : ${cTime.get(i)} : ${targetPackage}.${cCat.get(i)}.${cName.get(i)} : ${cMessage.get(i)}\n`;
                  }
                } else {
                  failed = true;
                  failReport += `Test result : Failed : ${cTime.get(i)} : ${targetPackage}.${cCat.get(i)}.${cName.get(i)} : ${cMessage.get(i)}\n`;
                }
              }
              const csv = df.toCsv();
              resolve({failReport, skipReport, passReport, failed, csv});
            }).catch((e: any) => reject(e));
          });
        }, targetPackage, options, new testUtils.TestContext(options.catchUnhandled, options.report));

        if (options.record) {
          await recorder.stop();
          fs.writeFileSync('./test-console-output.log', consoleLog)
        }
        return r;
      });
    }

    (async () => {
      try {
        await init(P_START_TIMEOUT);
        color.success('Initialization completed.');
      } catch (e) {
        color.error('Initialization failed.');
        throw e;
      }

      const r = await runTest(7200000, { category: args.category,
        catchUnhandled: args.catchUnhandled, report: args.report, record: args.record });

      if (r.csv && args.csv) {
        fs.writeFileSync(path.join(curDir, 'test-report.csv'), r.csv, 'utf8');
        color.info('Saved `test-report.csv`\n');
      }

      if (r.passReport)
        console.log(r.passReport);

      if (r.skipReport)
        console.log(r.skipReport);

      if (r.failed) {
        console.log(r.failReport);
        color.fail('Tests failed.');
        testUtils.exitWithCode(1);
      } else {
        color.success('Tests passed.');
        testUtils.exitWithCode(0);
      }

      //@ts-ignore
      if (browser != null)
        await browser.close();
    })();
  }

  return true;
}

interface TestArgs {
  _: string[],
  category?: string,
  host?: string,
  csv?: boolean,
  gui?: boolean,
  catchUnhandled?: boolean,
  report?: boolean,
  record?: boolean,
  'skip-build'?: boolean,
  'skip-publish'?: boolean,
}
