const { defineConfig, configDefaults } = require('vitest/config');

module.exports = defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
    passWithNoTests: true,
  },
});
