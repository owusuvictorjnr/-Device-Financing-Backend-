module.exports = {
root: true,
parser: '@typescript-eslint/parser',
parserOptions: {
project: './tsconfig.json',
tsconfigRootDir: __dirname,
sourceType: 'module',
},
plugins: [
'@typescript-eslint',
'prettier',
'import',
'unused-imports'
],
extends: [
'eslint:recommended',
'plugin:@typescript-eslint/recommended',
'plugin:prettier/recommended'
],
env: {
node: true,
es2023: true,
jest: true,
},
rules: {
// Type Safety
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/explicit-module-boundary-types': 'error',
'@typescript-eslint/strict-boolean-expressions': 'error',
'@typescript-eslint/no-unsafe-assignment': 'error',
'@typescript-eslint/no-unsafe-call': 'error',
'@typescript-eslint/no-unsafe-member-access': 'error',
'@typescript-eslint/no-unsafe-return': 'error',
'@typescript-eslint/explicit-function-return-type': ['error'],

```
// Code Quality
'unused-imports/no-unused-imports-ts': 'error',
'import/order': [
  'error',
  {
    groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
    'newlines-between': 'always',
  },
],
'no-console': ['error', { allow: ['warn', 'error'] }],
'no-var': 'error',
'prefer-const': 'error',
'eqeqeq': ['error', 'always'],

// Prettier integration
'prettier/prettier': ['error', { singleQuote: true, semi: true }],

// NestJS specific
'@typescript-eslint/no-empty-function': 'warn',
'@typescript-eslint/ban-types': 'error',
```

},
};
