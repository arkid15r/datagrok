const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    package: './src/package.ts',
  },
  resolve: {
    extensions: ['.wasm', '.mjs', '.js', '.json', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {test: /\.tsx?$/, loader: 'ts-loader'},
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
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
    'wu': 'wu',
  },
  output: {
    filename: '[name].js',
    library: 'compute',
    libraryTarget: 'var',
    path: path.resolve(__dirname, 'dist'),
  },
};
