#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2));
const getFiles = require('node-recursive-directory');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');
const archiver = require('archiver-promise');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

let mode = argv['_'][1];
let host = argv['_'][0];
let rebuild = argv['_'].includes('rebuild');

if (mode !== 'debug' && mode !=='deploy')
    return console.log('Mode must be either debug or deploy');

let debug = mode === 'debug';

let keys = {
    [host]: ''
};

//get key from keys file
if (fs.existsSync('upload.keys.json')) {
    keys = JSON.parse(fs.readFileSync('upload.keys.json'));
} else {
    fs.writeFileSync('upload.keys.json', JSON.stringify(keys));
}
let devKey = keys[host];
if (devKey === '')
   return console.log( 'Empty developer key. See upload.keys.json file.');


//check if package.json exists, get package name
let packageName = '';
if (!fs.existsSync('package.json'))
  return console.log('package.js doesn\'t exists');
else {
    let packageJson = JSON.parse(fs.readFileSync('package.json'));
    packageName = packageJson['name'];
}

process.on('beforeExit', async () => {
    let code = await processPackage()
    console.log(`Exiting with code ${code}`);
    process.exit(code);
});

async function processPackage() {
//get server timestamps
    let timestamps = {};
    if (debug) {
        try {
            timestamps = await (await fetch(`${host}/packages/dev/${devKey}/${packageName}/timestamps`)).json();
            if (timestamps['#type'] === 'ApiError') {
                console.log(timestamps.message);
                return 1;
            }
        } catch (error) {
            console.log(error);
            return 1;
        }
    }

    let zip = archiver('zip', {store: false});

//gather files
    const files = await getFiles('.', true);
    let localTimestamps = {};
    files.forEach((file) => {

        let fullPath = file.fullpath;
        let relativePath = path.relative(process.cwd(), fullPath);
        let canonicalRelativePath = relativePath.replace(/\\/g, '/');
        if (canonicalRelativePath.includes('/.'))
            return;
        if (canonicalRelativePath.startsWith('.'))
            return;
        if (relativePath.startsWith('node_modules'))
            return;
        if (relativePath.startsWith('dist') && rebuild)
            return;
        if (relativePath.startsWith('upload.keys.json'))
            return;
        if (relativePath === 'zip')
            return;
        let t = fs.statSync(fullPath).mtime.toUTCString();
        localTimestamps[canonicalRelativePath] = t;
        if (debug && timestamps[canonicalRelativePath] === t) {
            console.log(`Skipping ${canonicalRelativePath}`);
            return;
        }
        zip.append(fs.createReadStream(fullPath), {name: relativePath});
        console.log(`Adding ${relativePath}...`);
    });
    zip.append(JSON.stringify(localTimestamps), {name: 'timestamps.json'});

//upload
    let uploadPromise = new Promise((resolve, reject) => {
            fetch(`${host}/packages/dev/${devKey}/${packageName}?debug=${debug.toString()}&rebuild=${rebuild.toString()}`, {
                method: 'POST',
                body: zip
            }).then(body => body.json()).then(j => resolve(j)).catch(err => {
                reject(err);
            });
        }
    )
    await zip.finalize();

    try {
        let log = await uploadPromise;

        fs.unlinkSync('zip');
        if (log['#type'] === 'ApiError') {
            console.log(log['message']);
            console.log(log['innerMessage']);
            return 1;
        } else
            console.log(log);
    } catch (error) {
        console.log(error);
        return 1;
    }
    return 0;
}