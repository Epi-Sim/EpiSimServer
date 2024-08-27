const path = require('path');

module.exports = {
  entry: {
    home: './src/js/entrypoints/home.tsx',
    setup: './src/js/entrypoints/setup.tsx',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'src/static/js'),
  },
  mode: 'development',
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/, // Include .ts and .tsx files
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader', // Use ts-loader for TypeScript files
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'] // Add .ts and .tsx extensions
  }
};