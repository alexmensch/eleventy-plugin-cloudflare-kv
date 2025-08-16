import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      // Possible Errors
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-prototype-builtins": "error",
      "no-template-curly-in-string": "error",

      // Best Practices
      eqeqeq: "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "consistent-return": "error",
      curly: ["error", "all"],
      "prefer-promise-reject-errors": "error",

      // Node.js specific
      "no-process-exit": "error",
      "no-path-concat": "error",

      // Modern JavaScript
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "prefer-template": "error",

      // Stylistic Issues
      indent: ["error", 2],
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "comma-dangle": ["error", "never"],
      "no-trailing-spaces": "error",
      "eol-last": "error",
      "brace-style": ["error", "1tbs"]
    }
  },
  {
    files: ["test/**/*.cjs"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.node,
        ...globals.mocha
      }
    }
  }
];
