module.exports = {
  roots: ['<rootDir>/tests'],
  testMatch: ['**/test/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  coveragePathIgnorePatterns: ['/node_modules/', '/examples/'],
  collectCoverageFrom: [
    '<rootDir>/lib/**/*.{js,ts}',
    '!**/*.module.{js,ts}',
    '!**/*.core-module.{js,ts}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  preset: 'ts-jest',
};
