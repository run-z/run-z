module.exports = {
  root: true,
  ignorePatterns: ['bin/', 'node_modules/', 'dist/', 'target/', 'd.ts/', '*.d.ts'],
  extends: [
    '@run-z',
  ],
  overrides: [
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      env: {
        node: true,
      },
    },
    {
      files: ['*.ts'],
      extends: [
        '@run-z/eslint-config/typescript',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
      },
      env: {
        browser: true,
      },
    },
    {
      files: ['*.spec.ts'],
      extends: [
        '@run-z/eslint-config/jest',
      ],
      parserOptions: {
        project: './tsconfig.spec.json',
      },
    },
  ],
};
