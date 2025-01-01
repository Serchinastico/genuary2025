import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { ignores: ["webpack.config.js"] },
  { languageOptions: { globals: globals.browser } },
  eslintConfigPrettier,
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
