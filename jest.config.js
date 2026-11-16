/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 y worklets: resolvedor de la documentación + `setUpTests()` en jest.setup.js (D51).
  resolver: 'react-native-reanimated/jest/resolver',
  setupFiles: ['<rootDir>/jest.setup-antes.js', 'react-native-gesture-handler/jestSetup'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    'src/repositories/**/*.{ts,tsx}',
    'src/api/**/*.{ts,tsx}',
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};
