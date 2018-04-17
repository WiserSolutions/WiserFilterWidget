module.exports = {
  env: {
    browser: true,
    es6: false
  },
  extends: 'eslint:recommended',
  globals: {
    $: false,
    $$: false,
    _: false,
    prism: false
  },
  parserOptions: {
    ecmaVersion: 5,
    sourceType: 'script'
  },
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  }
};
