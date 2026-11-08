// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // New in eslint-config-expo 56. Existing screens load data in effects;
    // warn until they are refactored rather than failing lint.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
