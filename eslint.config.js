import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const untrustedHtml = [
  { property: 'innerHTML', message: 'Render untrusted text as text only.' },
  { property: 'outerHTML', message: 'Render untrusted text as text only.' },
  { property: 'insertAdjacentHTML', message: 'Render untrusted text as text only.' },
];

export default defineConfig(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.worktrees/**', '.superpowers/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-properties': ['error', ...untrustedHtml],
      'no-restricted-syntax': ['error', {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: 'Render untrusted text as text only.',
      }],
    },
  },
  {
    files: ['src/shared/**', 'src/engine/**', 'src/bots/**'],
    rules: {
      'no-console': 'error',
      'no-restricted-properties': ['error', ...untrustedHtml,
        { object: 'Math', property: 'random', message: 'Use the seeded RNG in src/engine/rng.ts.' },
        { object: 'Date', property: 'now', message: 'Time comes in as an argument.' }],
      'no-restricted-syntax': ['error', { selector: "NewExpression[callee.name='Date']", message: 'Time comes in as an argument.' }],
      'no-restricted-globals': ['error', 'fetch', 'setTimeout', 'setInterval', 'process'],
      'no-restricted-imports': ['error', { patterns: ['node:*', 'fs', 'path', 'socket.io', 'socket.io-client'] }],
    },
  },
);
