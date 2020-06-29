const webpack = require("webpack");

module.exports = {
  //   entry: "./src/js/scripts.js",
  // webpack-stream will provide the entry file. Incase we want to use multiple entry points we can use:
  //   entry: {
  //         scripts: "./src/js/scripts.js",
  //         app: "./src/js/app.js",
  //       },
  output: {
    filename: "scripts.bundle.js",
  },
  devtool: false,
  plugins: [
    new webpack.SourceMapDevToolPlugin({
      module: true,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            rootMode: "upward",
          },
        },
      },
    ],
  },
};
