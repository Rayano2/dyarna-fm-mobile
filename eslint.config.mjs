import expoConfig from 'eslint-config-expo/flat.js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import unicornPlugin from 'eslint-plugin-unicorn';

export default [
  ...expoConfig,
  unicornPlugin.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      // Requires parens around nested ternaries, but prettier strips those
      // parens on every commit (lint-staged runs eslint --fix then prettier),
      // so the rule's fix can never survive. Prettier owns ternary formatting.
      'unicorn/no-nested-ternary': 'off',
      // Wants uppercase hex digits (0xFF); prettier lowercases them (0xff) on
      // every commit, so the two can never agree. Prettier owns literal casing.
      'unicorn/number-literal-case': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/filename-case': 'off',
      // eslint-plugin-import (pulled by expo config) can't parse import-attributes
      // syntax in some dependencies. Disable checks that cross package boundaries.
      'import/namespace': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3}){1,2}$/]',
          message: 'Raw hex colors not allowed in components — use theme tokens.',
        },
      ],
      // Feature boundary: only the barrel (src/features/<name>/index.ts) is
      // public. Intra-feature imports must be relative, so this never fires
      // inside a feature's own files.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // The is-urgent / format-ticket-number exceptions keep those
              // pure helpers importable by node-tested modules (president's
              // compute-insights, notifications' notification-meta) without
              // dragging React Native components in through the barrel — and,
              // for notifications, without creating a
              // tickets -> shell -> notifications -> tickets import cycle.
              regex:
                '^(?!@/features/tickets/lib/(is-urgent|format-ticket-number)$)@/features/[^/]+/.+',
              message:
                "Deep feature imports are forbidden — import from the feature barrel ('@/features/<name>') instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.mjs'],
    rules: {
      'import/namespace': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    files: ['src/shared/theme/**/*', '**/*.test.*', '**/*.config.*'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    ignores: [
      'node_modules',
      '.expo',
      'ios',
      'android',
      'dist',
      'babel.config.js',
      'metro.config.js',
      'commitlint.config.js',
      '*.config.js',
      'plugins/**',
      'scripts/**',
    ],
  },
];
