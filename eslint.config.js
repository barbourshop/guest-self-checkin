import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginSvelte from 'eslint-plugin-svelte';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      '**/.svelte-kit/**',
      '**/coverage/**',
      '**/generated/**',
      'apps/web/src/routes/+layout.svelte' // Svelte 5 runes {@render} not yet parsed by ESLint plugin
    ]
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
  },
  ...eslintPluginSvelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'a11y-autofocus': 'off',
      'a11y-label-has-associated-control': 'off',
      'a11y-click-events-have-key-events': 'off',
      'a11y-no-noninteractive-element-interactions': 'off',
      'a11y-no-static-element-interactions': 'off',
      'a11y-no-noninteractive-element-to-interactive-role': 'off',
      'svelte/valid-compile': ['error', { ignoreWarnings: true }],
    },
  },
);
