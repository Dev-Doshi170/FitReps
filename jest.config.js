module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react-dom$': '<rootDir>/shims/react-dom.js',
    '^@env$': '<rootDir>/__mocks__/env.ts',
    '^@gluestack-ui/themed$': '<rootDir>/__mocks__/gluestack-themed.tsx',
    '^@gluestack-ui/config$': '<rootDir>/__mocks__/gluestack-config.ts',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|react-redux|@reduxjs/toolkit|immer)',
  ],
};
