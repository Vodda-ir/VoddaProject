import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const ignores = [
  'node_modules/**',
  '.next/**',
  'out/**',
  'build/**',
  'next-env.d.ts',
  'examples/**',
  'skills/**',
  'native/**',
  'tool-results/**',
  'upload/**',
  'download/**',
  'tests/**',
  '*.config.js',
];

export default [
  { ignores },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // Real errors worth blocking on (syntax-level issues that survive builds).
      'no-const-assign': 'error',
      'no-new-symbol': 'error',
      'no-this-before-super': 'error',
      'no-use-before-define': 'off',
      'no-irregular-whitespace': 'warn',
      'no-debugger': 'warn',
      'no-empty': 'off',
      'no-unused-vars': 'off',
      'prefer-const': 'off',
    },
  },
];
