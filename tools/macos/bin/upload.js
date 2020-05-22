#!/usr/bin/env node
const { spawn } = require("child_process");

let argv = require('minimist')(process.argv.slice(2));

let mode = argv['_'][1];
let host = argv['_'][0];

if (mode !== 'debug' && mode !=='deploy')
    throw 'Unknown mode: ' + mode;

const ls = spawn("dart", [`${__dirname}/upload.dart`, '-p', '.', '-r', host, mode]);

ls.stdout.on("data", data => {
    console.log(`${data}`);
});

ls.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
});

ls.on('error', (error) => {
    console.log(`error: ${error.message}`);
});
