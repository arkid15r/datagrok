#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2), {
  alias: { k: 'key', h: 'help', r: 'recursive' },
});
const help = require('./commands/help').help;

const commands = {
  add: require('./commands/add').add,
  api: require('./commands/api').api,
  check: require('./commands/check').check,
  config: require('./commands/config').config,
  create: require('./commands/create').create,
  init: require('./commands/init').init,
  link: require('./commands/link').link,
  publish: require('./commands/publish').publish,
  test: require('./commands/test').test,
};

const command = argv['_'][0];
if (command in commands) {
  try {
    if (!commands[command](argv)) {
      console.log(help[command]);
    }
  } catch (err) {
    console.error(err);
    console.log(help[command]);
  }
} else {
  console.log(help.help);
}
