import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', '.mermaid-feasibility-dist/**', 'packages/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  // Runtime test doubles retain flexible structures to exercise malformed input.
  { files: ['tests/**/*.test.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
);
