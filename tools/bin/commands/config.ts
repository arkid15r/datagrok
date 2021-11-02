import fs from 'fs';
import inquirer from 'inquirer';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import { validateConf } from '../validators/config-validator';
import { Config, Indexable } from '../utils/utils';


const confTemplateDir = path.join(path.dirname(path.dirname(__dirname)), 'config-template.yaml');
const confTemplate = yaml.load(fs.readFileSync(confTemplateDir, { encoding: 'utf-8' }));

const grokDir = path.join(os.homedir(), '.grok');
const confPath = path.join(grokDir, 'config.yaml');

function validateKey(key: string) {
  if (!key || /^([A-Za-z\d-])+$/.test(key)) {
    return true;
  } else {
    return 'Developer key may only include letters, numbers, or hyphens';
  }
}

function generateKeyQ(server: string, url: string): Indexable {
  const origin = (new URL(url)).origin;
  const question = {
    name: server,
    type: 'input',
    message: `Developer key (get it from ${origin}/u):`,
    validate: validateKey
  };
  if (server.startsWith('local')) {
    question.message = `Developer key for ${origin}`;
  }
  return question;
}

export function config(args: { _: string[], reset?: boolean }) {
  const nOptions = Object.keys(args).length - 1;
  if (args['_'].length === 1 && (nOptions < 1 || nOptions === 1 && args.reset)) {
    if (!fs.existsSync(grokDir)) {
      fs.mkdirSync(grokDir);
    }
    if (!fs.existsSync(confPath) || args.reset) {
      fs.writeFileSync(confPath, yaml.dump(confTemplate));
    }
    const config = yaml.load(fs.readFileSync(confPath, { encoding: 'utf-8' })) as Config;
    console.log(`Your config file (${confPath}):`);
    console.log(config);
    const valRes = validateConf(config);
    if (!config || !valRes.value) {
      console.log(valRes.message);
      return false;
    }
    if (valRes.warnings!.length) console.log(valRes.warnings!.join('\n')); 
    (async () => {
      try {
        const answers = await inquirer.prompt({
          name: 'edit-config',
          type: 'confirm',
          message: 'Do you want to edit it?',
          default: false
        });
        if (answers['edit-config']) {
          for (const server in config.servers) {
            const url = config['servers'][server]['url'];
            const question = generateKeyQ(server, url);
            question.default = config['servers'][server]['key'];
            const devKey: Indexable = await inquirer.prompt(question);
            config['servers'][server]['key'] = devKey[server];
          }
          const defaultServer = await inquirer.prompt({
            name: 'default-server',
            type: 'input',
            message: 'Your default server:',
            validate: function (server) {
              if (server in config.servers) {
                return true;
              } else {
                return 'Only one of the specified servers may be chosen as default';
              }
            },
            default: config.default
          });
          config.default = defaultServer['default-server'];
          fs.writeFileSync(confPath, yaml.dump(config));
        }
      } catch (err) {
        console.error('The file is corrupted. Please run `grok config --reset` to restore the default template');
        console.error(err);
        return false;
      }
    })()
    return true;
  }
}
