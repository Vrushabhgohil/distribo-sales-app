// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: [
      'dist/*',
      'inspect-supabase.js',
      '.expo/*',
      'supabase/tests/*',
      '*.config.js',
    ],
  },
  expoConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
]);
