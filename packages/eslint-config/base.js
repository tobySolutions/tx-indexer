import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**", "eslint.config.js"],
  },
];

/**
 * A shared ESLint configuration with TypeScript project references.
 * Use this for TypeScript projects that need type-aware linting.
 *
 * @param {string} tsconfigRootDir - The root directory for tsconfig.json
 * @returns {import("eslint").Linter.Config[]}
 */
export function createConfig(tsconfigRootDir) {
  return [
    ...config,
    {
      languageOptions: {
        parserOptions: {
          project: true,
          tsconfigRootDir,
        },
      },
    },
  ];
}
