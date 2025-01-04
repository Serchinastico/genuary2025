const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const numberOfPages = 3;
const pages = Array.from({ length: numberOfPages }, (_, i) => `day${String(i + 1).padStart(2, "0")}`);

module.exports = {
  entry: {
    index: "./src/index.ts",
    ...pages.reduce((config, page) => {
      config[page] = `./src/${page}.ts`;
      return config;
    }, {}),
  },
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
    ...pages.map(
      (page) =>
        new HtmlWebpackPlugin({
          inject: true,
          template: `src/${page}.html`,
          filename: `${page}.html`,
          title: page,
          chunks: [page],
        })
    ),
  ],
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  mode: "production",
};
