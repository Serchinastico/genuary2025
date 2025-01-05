import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import { TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const numberOfPages = 4;
const pageNames = Array.from({ length: numberOfPages }, (_, i) => `${String(i + 1).padStart(2, "0")}`);
const pageFiles = pageNames.map((page) => {
  const hasSpecificHtmlFile = fs.existsSync(`./src/days/${page}/index.html`);
  return {
    name: page,
    htmlTemplate: hasSpecificHtmlFile ? `./src/days/${page}/index.html` : "./src/days/base/index.html",
    htmlFile: `${page}.html`,
    tsFile: `./src/days/${page}/index.ts`,
  };
});

const config: webpack.Configuration = {
  entry: {
    index: "./src/index.ts",
    ...Object.fromEntries(pageFiles.map(({ tsFile, name }) => [name, tsFile])),
  },
  devtool: "source-map",
  module: {
    rules: [
      { test: /\.ts$/, use: "ts-loader", exclude: /node_modules/ },
      { test: /\.(glsl|vs|fs)$/, loader: "ts-shader-loader" },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.json" })],
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
      templateParameters: { numberOfPages },
    }),
    ...pageFiles.map(
      ({ htmlTemplate, htmlFile, name }) =>
        new HtmlWebpackPlugin({
          inject: true,
          template: htmlTemplate,
          filename: htmlFile,
          title: name,
          chunks: [name],
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

export default config;
