const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

const COLOR_HEX = '^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$';

module.exports = defineConfig([
  globalIgnores(['.claude/**', '.expo/**', '.scaffold-tmp/**', 'coverage/**', 'dist/**']),
  expoConfig,
  {
    rules: {
      complexity: ['error', 10],
      'max-lines-per-function': ['error', 50],
      'max-depth': ['error', 3],
      'max-lines': ['error', 300],
      'no-console': 'error',
      eqeqeq: 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${COLOR_HEX}/]`,
          message: 'Colores solo desde los tokens de src/theme/palette.json (sin hex sueltos).',
        },
      ],
    },
  },
  {
    files: ['*.config.js', '*.config.mjs', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['jest.setup*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['__tests__/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.jest },
    rules: { 'max-lines-per-function': 'off' },
  },
]);
