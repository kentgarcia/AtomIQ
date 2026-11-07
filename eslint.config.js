// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Reanimated shared values (`sharedValue.value = ...`) are mutable by
      // design. The React Compiler immutability rule reports these writes as
      // false positives throughout the app's animation code.
      'react-hooks/immutability': 'off',
      // Existing screens seed/synchronise state from props, storage, and
      // navigation params inside effects. Keep these visible as warnings while
      // they are migrated to derived state in follow-up work.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
]);
