import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**']
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'prisma/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2024
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-control-regex': 'off',
      'no-case-declarations': 'off'
    }
  },
  {
    files: ['src/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-control-regex': 'off',
      'no-case-declarations': 'off'
    }
  }
];
