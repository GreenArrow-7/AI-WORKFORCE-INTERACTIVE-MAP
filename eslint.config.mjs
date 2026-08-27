import { FlatCompat } from '@eslint/eslintrc';

/**
 * Flat config. `eslint-config-next` still ships eslintrc-style, so it is bridged
 * through FlatCompat rather than imported directly.
 *
 * Lint runs as its own step (`npm run lint`) and in CI. It is not part of
 * `next build` — a style rule should not be able to block a deploy, and Next's
 * own ESLint patching does not work with ESLint 9.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'coverage/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // The domain layer is fully typed; `any` is a defect, not a shortcut.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];

export default config;
