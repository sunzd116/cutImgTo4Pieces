const path = require('path');

module.exports = {
  entry: {
    cut4Pieces : './src/index.js',
    // example : './src/test.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  }
};