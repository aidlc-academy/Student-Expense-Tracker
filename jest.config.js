/** @type {import('jest').Config} */
const config = {
  // Use the node test environment (no DOM needed for unit/property tests)
  testEnvironment: "node",

  // Point Jest at the unit tests directory
  testMatch: ["<rootDir>/tests/unit/**/*.test.js"],

  // Transform nothing — rely on --experimental-vm-modules for native ESM
  transform: {},
};

export default config;
