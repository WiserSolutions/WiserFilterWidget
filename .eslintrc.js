module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: 'eslint:recommended',
  globals: {
    $: false,
    $$: false,
    $$get: false,
    _: false,
    mod: false,
    prism: false
  },
  parserOptions: {
    ecmaVersion: 7,
    sourceType: 'script'
  },
  rules: {
    'eol-last': ['error', 'always'],
    'indent': ['error', 2, { 'SwitchCase': 1 }],
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-useless-rename': 'error',
    'no-var': ['error'],
    'object-shorthand': ['error', 'always'],
    'prefer-template': 'error',
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'semi': ['error', 'always']
  }
};
