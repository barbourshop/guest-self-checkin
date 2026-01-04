module.exports = {
  roots: ['<rootDir>/src'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json'
      }
    ]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Use jsdom for frontend tests, node for backend tests
  testEnvironment: 'jsdom',
  // Override testEnvironment for backend tests
  testEnvironmentOptions: {
    // Default to jsdom, but can be overridden per test file
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  // Coverage configuration (for visibility, not strict thresholds)
  collectCoverageFrom: [
    'src/server/**/*.{js,ts}',
    '!src/server/**/*.test.{js,ts}',
    '!src/server/**/__tests__/**',
    '!src/server/**/__mocks__/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  // Projects for different test environments
  projects: [
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/src/**/*.spec.{ts,tsx}'],
      testPathIgnorePatterns: ['<rootDir>/src/server'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts']
    },
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/src/server/**/*.test.{js,ts}', '<rootDir>/src/server/**/*.spec.{js,ts}'],
      testEnvironment: 'node'
    }
  ]
};