export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.spec.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transform: {},
  testTimeout: 30000,
};