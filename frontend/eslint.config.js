import tsParser from "@typescript-eslint/parser";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import reactHooksPlugin from "eslint-plugin-react-hooks"; // Import the plugin
import unusedImportsPlugin from "eslint-plugin-unused-imports";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser, // Use TypeScript parser
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true, // Enable JSX if you're working with React
        },
      },
    },
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
      "react-refresh": reactRefreshPlugin,
      "react-hooks": reactHooksPlugin, // Add the react-hooks plugin
      "unused-imports": unusedImportsPlugin,
    },
    rules: {
      // React Hooks rules
      "react-hooks/rules-of-hooks": "error", // Checks the rules of hooks
      "react-hooks/exhaustive-deps": "warn", // Checks effect dependencies

      // Other rules
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];
