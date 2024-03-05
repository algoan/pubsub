/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.spec.json',
      },
    ],
  },
  testEnvironment: 'node',
  testMatch: ['**/*.+(test|spec).ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['./src/**/*.ts'],
  resetMocks: true,
  globalSetup: './test/setup.js',
  globalTeardown: './test/teardown.js',
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 0,
    },
  },
};
