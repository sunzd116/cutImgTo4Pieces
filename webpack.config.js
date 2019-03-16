const path = require('path');
const webpack = require('webpack'); //访问内置的插件
module.exports = {
  entry: {
    cut4Pieces : './src/index.js',
    excel_example : './src/test.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins:[
    new webpack.SourceMapDevToolPlugin({
      filename: '[name].js.map',
      append: '\n//# sourceMappingURL=../../dist/[url]',
    })
  ]
};