// Flat ESLint config (ESLint 9 + typescript-eslint v8). Shared base for the
// monorepo; backend/ and mobile/ can extend or add their own configs later.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/web-build/**',
      '**/android/**',
      '**/ios/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The `string & {}` literal-union trick in this file needs an empty object type.
    files: ['shared/types/Notification.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
);
