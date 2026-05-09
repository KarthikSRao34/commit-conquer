// Runs once before all test suites
export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
}