const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    package: './src/package.ts'
  },
  resolve: {
    fallback: { "url": false },
    extensions: ['.wasm', '.mjs', '.js', '.json', '.ts', '.tsx']
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ],
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
    library: 'sequences1',
    libraryTarget: 'var',
    path: path.resolve(__dirname, 'dist'),
  },
};
