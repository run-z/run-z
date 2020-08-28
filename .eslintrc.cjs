module.exports = {
  root: true,
  ignorePatterns: ['bin/', 'node_modules/', 'dist/', 'target/', 'd.ts/', '*.d.ts'],
  extends: [
    '@proc7ts',
  ],
  overrides: [
    {
      files: ['*.js', '*.cjs'],
      env: {
        node: true,
      },
    },
    {
      files: ['*.ts'],
      extends: [
        '@proc7ts/eslint-config/typescript',
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
        '@proc7ts/eslint-config/jest',
      ],
      parserOptions: {
        project: './tsconfig.spec.json',
      },
    },
  ],
};
