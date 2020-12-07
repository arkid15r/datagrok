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
        "openchemlib/full.js": "OCL",
        "rxjs": "rxjs",
        "rxjs/operators": "rxjs.operators"
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ]
    },
    output: {
        filename: '[name].js',
        library: 'viewers',
        libraryTarget: 'var',
        path: path.resolve(__dirname, 'dist'),
    },
};
