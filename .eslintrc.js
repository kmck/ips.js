module.exports = {
  extends: [
    'airbnb-base'
  ],
  parser: 'babel-eslint',
  env: {
    es6: true
  },
  overrides: [{
    files: ['*.test.*'],
    env: {
      jest: true
    }
  }],
  rules: {
    'class-methods-use-this': 'off',
    'max-len': 'off',
    'no-bitwise': 'off',
    'no-plusplus': 'off',
    'no-useless-computed-key': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/extensions': ['error', 'always', {
      js: 'never',
      mjs: 'never',
    }],
    'import/prefer-default-export': 'off',
  },
};
