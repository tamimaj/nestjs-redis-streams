module.exports = {

  roots: [
    "<rootDir>/lib"
  ],
  testMatch: [
    "**/test/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  preset: 'ts-jest',
  collectCoverage: process.env.NODE_ENV != 'Production',
};