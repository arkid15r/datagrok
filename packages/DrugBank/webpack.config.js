const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    package: './src/package.js'
  },
  devtool: 'inline-source-map',
  externals: {
    'datagrok-api/dg': 'DG',
    'datagrok-api/grok': 'grok',
    'datagrok-api/ui': 'ui',
    'openchemlib/full.js': 'OCL',
    'rxjs': 'rxjs',
    'rxjs/operators': 'rxjs.operators',
    'cash-dom': '$',
    'dayjs': 'dayjs',
  },
  output: {
    filename: '[name].js',
    library: 'drugbank',
    libraryTarget: 'var',
    path: path.resolve(__dirname, 'dist'),
  },
};
