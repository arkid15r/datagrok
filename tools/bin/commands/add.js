const fs = require('fs');
const path = require('path');
const help = require('../ent-helpers.js');
const utils = require('../utils.js');

module.exports = {
  add: add
};

function add(args) {
  const nOptions = Object.keys(args).length - 1;
  const nArgs = args['_'].length;
  if (nArgs < 2 || nArgs > 5 || nOptions > 0) return false;
  const entity = args['_'][1];

  const curDir = process.cwd();
  const curFolder = path.basename(curDir);
  const srcDir = path.join(curDir, 'src');
  const jsPath = path.join(srcDir, 'package.js');
  const tsPath = path.join(srcDir, 'package.ts');
  const detectorsPath = path.join(curDir, 'detectors.js');
  const scriptsDir = path.join(curDir, 'scripts');
  const queryDir = path.join(curDir, 'queries');
  const queryPath = path.join(queryDir, 'queries.sql');
  const connectDir = path.join(curDir, 'connections');
  const packagePath = path.join(curDir, 'package.json');

  // Package directory check
  if (!fs.existsSync(packagePath)) return console.log('`package.json` not found');
  try {
    const package = JSON.parse(fs.readFileSync(packagePath));
    if (package.friendlyName !== curFolder && package.fullName !== curFolder) {
      return console.log('The package name differs from the one in `package.json`');
    }
  } catch (error) {
    console.error(`Error while reading ${packagePath}:`)
    console.error(error);
  }

  // TypeScript package check
  const ts = fs.existsSync(path.join(curDir, 'tsconfig.json'));
  const packageEntry = ts ? tsPath : jsPath;
  const ext = ts ? '.ts' : '.js';

  function validateName(name) {
    if (!/^([A-Za-z])+([A-Za-z\d])*$/.test(name)) {
      return console.log('The name may only include letters and numbers. It cannot start with a digit');
    }
    return true;
  }

  function insertName(name, data) {
    for (let repl of ['NAME', 'NAME_TITLECASE', 'NAME_LOWERCASE']) {
      data = utils.replacers[repl](data, name);
    }
    return data;
  }

  function createPackageEntryFile() {
    if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir);
    if (!fs.existsSync(packageEntry)) {
      var contents = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'package-template', 'src', 'package.js'), 'utf8');
      fs.writeFileSync(packageEntry, contents, 'utf8');
    }
  }

  switch (entity) {
    case 'script':
      if (nArgs < 4 || nArgs > 5) return false;
      let lang = args['_'][2];
      var name = args['_'][3];
      if (nArgs === 5) {
        var tag = args['_'][2];
        lang = args['_'][3];
        name = args['_'][4];
      }
      if (!Object.keys(utils.scriptLangExtMap).includes(lang)) {
        console.log('Unsupported language:', lang);
        console.log('You can add a script in one of the following languages:');
        console.log(Object.keys(utils.scriptLangExtMap).join(', '));
        return false;
      }

      // Script name check
      if (!validateName(name)) return false;

      if (tag && tag !== 'panel') return console.log('Currently, you can only add the `panel` tag');

      // Create the folder `scripts` if it doesn't exist yet
      if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir);

      let scriptPath = path.join(scriptsDir, name + '.' + utils.scriptLangExtMap[lang]);
      if (fs.existsSync(scriptPath)) {
        return console.log(`The file with the script already exists: ${scriptPath}`);
      }

      // Copy the script template
      let templatePath = path.join(path.dirname(path.dirname(__dirname)), 'script-template')
      templatePath = path.join(templatePath, lang + '.' + utils.scriptLangExtMap[lang]);
      var contents = fs.readFileSync(templatePath, 'utf8');
      if (tag) {
        let ind = contents.indexOf('tags: ') + 6;
        contents = contents.slice(0, ind) + 'panel, ' + contents.slice(ind);
      }
      fs.writeFileSync(scriptPath, insertName(name, contents), 'utf8');

      // Provide a JS wrapper for the script
      console.log(help.script(name, curFolder));
      break;

    case 'app':
      if (nArgs !== 3) return false;

      // App name check
      var name = args['_'][2];
      if (!validateName(name)) return false;

      // Create src/package.js if it doesn't exist yet
      createPackageEntryFile();

      // Add an app template to package.js
      let app = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'entity-template', 'app.js'), 'utf8');
      fs.appendFileSync(packageEntry, insertName(name, app));
      console.log(help.app(name));
      break;

    case 'function':
      if (nArgs < 3 || nArgs > 4) return false;

      var name = args['_'][2];
      if (nArgs === 4) {
        var tag = args['_'][2];
        name = args['_'][3];
      }

      if (!validateName(name)) return false;

      if (tag && tag !== 'panel' && tag !== 'init') {
        return console.log('Currently, you can only add the `panel` or `init` tag');
      }

      // Create src/package.js if it doesn't exist yet
      createPackageEntryFile();

      // Add a function to package.js
      let filename = tag === 'panel' ? 'panel' + ext :
      tag === 'init' ? 'init.js' : 'function' + ext;
      let func = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'entity-template', filename), 'utf8');
      fs.appendFileSync(packageEntry, insertName(name, func));

      console.log(help.func(name, tag === 'panel'));
      break;
    case 'connection':
      if (nArgs !== 3) return false;
      name = args['_'][2];

      // Connection name check
      if (!validateName(name)) return false;

      // Create the `connections` folder if it doesn't exist yet
      if (!fs.existsSync(connectDir)) fs.mkdirSync(connectDir);

      let connectPath = path.join(connectDir, `${name}.json`);
      if (fs.existsSync(connectPath)) {
        return console.log(`The connection file already exists: ${connectPath}`);
      }

      var connection = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'entity-template', 'connection.json'), 'utf8');
      fs.writeFileSync(connectPath, insertName(name, connection), 'utf8');
      console.log(help.connection(name));
      break;

    case 'query':
      if (nArgs !== 3) return false;

      // Query name check
      var name = args['_'][2];
      if (!validateName(name)) return false;

      // Create the `queries` folder if it doesn't exist yet
      if (!fs.existsSync(queryDir)) fs.mkdirSync(queryDir);

      // Add a query to queries.sql
      let query = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'entity-template', 'queries.sql'), 'utf8');
      var contents = insertName(name, query);
      if (fs.existsSync(connectDir) && fs.readdirSync(connectDir).length !== 0) {
        // Use the name of the first found connection
        var connection = fs.readdirSync(connectDir).find(c => /.+\.json$/.test(c)).slice(0, -5);
      } else {
        // Create the default connection file
        if (!fs.existsSync(connectDir)) fs.mkdirSync(connectDir);
        var connection = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
          'entity-template', 'connection.json'), 'utf8');
        fs.writeFileSync(path.join(connectDir, 'connection.json'), insertName('connection', connection), 'utf8');
        var connection = 'connection';
      }
      contents = contents.replace('#{CONNECTION}', connection);
      fs.appendFileSync(queryPath, contents);
      console.log(help.query(name));
      break;

    case 'view':
      if (nArgs !== 3) return false;

      // View name check
      var name = args['_'][2];
      if (!validateName(name)) return false;
      if (!name.endsWith('View')) {
        console.log("For consistency reasons, we recommend postfixing classes with 'View'");
      }

      // Create src/package.js if it doesn't exist yet
      createPackageEntryFile();

      // Add a new JS file with a view class
      let viewPath = path.join(srcDir, utils.camelCaseToKebab(name) + ext);
      if (fs.existsSync(viewPath)) {
        return console.log(`The view file already exists: ${viewPath}`);
      }
      let viewClass = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'entity-template', 'view-class' + ext), 'utf8');
      fs.writeFileSync(viewPath, insertName(name, viewClass), 'utf8');

      // Add a view function to package.js
      let view = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'entity-template', 'view.js'), 'utf8');
      var contents = insertName(name, "import {#{NAME}} from './#{NAME_LOWERCASE}';\n");
      contents += fs.readFileSync(packageEntry, 'utf8');
      contents += insertName(name, view);
      fs.writeFileSync(packageEntry, contents, 'utf8');
      console.log(help.view(name));
      break;

    case 'viewer':
      if (nArgs !== 3) return false;

      // Viewer name check
      var name = args['_'][2];
      if (!validateName(name)) return false;
      if (!name.endsWith('Viewer')) {
        console.log("For consistency reasons, we recommend postfixing classes with 'Viewer'");
      }

      // Create src/package.js if it doesn't exist yet
      createPackageEntryFile();

      // Add a new JS file with a viewer class
      let viewerPath = path.join(srcDir, utils.camelCaseToKebab(name) + ext);
      if (fs.existsSync(viewerPath)) {
        return console.log(`The viewer file already exists: ${viewerPath}`);
      }
      let viewerClass = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'entity-template', 'viewer-class' + ext), 'utf8');
      fs.writeFileSync(viewerPath, insertName(name, viewerClass), 'utf8');


      // Add a viewer function to package.js
      let viewer = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'entity-template', 'viewer.js'), 'utf8');
      var contents = insertName(name, "import {#{NAME}} from './#{NAME_LOWERCASE}';\n");
      contents += fs.readFileSync(packageEntry, 'utf8');
      contents += insertName(name, viewer);
      fs.writeFileSync(packageEntry, contents, 'utf8');
      console.log(help.viewer(name));
      break;
    case 'detector':
      if (nArgs !== 3) return false;
      var name = args['_'][2];

      if (!fs.existsSync(detectorsPath)) {
        let temp = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
          'package-template', 'detectors.js'), 'utf8');
        temp = utils.replacers['PACKAGE_DETECTORS_NAME'](temp, curFolder);
        fs.writeFileSync(detectorsPath, temp, 'utf8');
      }

      let detector = fs.readFileSync(path.join(path.dirname(path.dirname(__dirname)),
        'entity-template', 'sem-type-detector.js'), 'utf8');
      var contents = fs.readFileSync(detectorsPath, 'utf8');
      let idx = contents.search(/(?<=PackageDetectors extends DG.Package\s*{\s*(\r\n|\r|\n)).*/);
      if (idx === -1) return console.log('Detectors class not found'); 
      contents = contents.slice(0, idx) + detector + contents.slice(idx);

      for (let repl of ['NAME', 'NAME_PREFIX', 'PACKAGE_DETECTORS_NAME']) {
        contents = utils.replacers[repl](contents, name);
      }

      fs.writeFileSync(detectorsPath, contents, 'utf8');
      console.log(help.detector(name));
      break;
    default:
      return false;
  }
  return true;
}
