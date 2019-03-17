const path = require('path');
module.exports = {
  entry: {
    cut4Pieces : './src/index.js',
  },
  output: {
    filename: 'cut4Pieces.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
    umdNamedDefine: true,
    library: 'cut4Pieces',
  },
};