const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: { day01: "./src/day01.ts", index: "./src/index.ts" },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(glsl|vs|fs)$/,
        loader: "ts-shader-loader",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Genuary 2025",
      filename: "index.html",
      template: "src/index.html",
    }),
    new HtmlWebpackPlugin({
      title: "Day 01",
      filename: "day01.html",
      template: "src/day01.html",
    }),
    new HtmlWebpackPlugin({
      title: "Day 02",
      filename: "day02.html",
      template: "src/day02.html",
    }),
  ],
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  mode: "production",
};
