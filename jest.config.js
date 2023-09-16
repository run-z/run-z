export default {
  preset: 'ts-jest/presets/default-esm',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/spec/**',
    '!src/**/*.cli.ts', // Exclude CLI-specific functionality
    '!src/**/*.d.ts', // Exclude type definitions
    '!src/**/*.spec.ts', // Exclude tests
    '!src/**/index.ts',
    '!src/**/main.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'target/coverage',
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        suiteName: 'run-z',
        outputDirectory: './target/test-results',
        classNameTemplate: '{classname}: {title}',
        titleTemplate: '{classname}: {title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true',
      },
    ],
  ],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.spec.json',
        useESM: true,
      },
    ],
  },
};
