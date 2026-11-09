// Pure TypeScript logic only. jest-expo's preset crashes on Expo's winter runtime,
// so util tests run on plain Babel; add a jest-expo project when component tests arrive.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      { babelrc: false, configFile: false, presets: ['@babel/preset-typescript', ['@babel/preset-env', { targets: { node: 'current' } }]] },
    ],
  },
};
