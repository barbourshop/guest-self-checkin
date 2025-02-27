describe('Square Configuration', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should use production membership key in production', () => {
    process.env.SQUARE_ENVIRONMENT = 'production';
    const { MEMBERSHIP_ATTRIBUTE_KEY } = require('../../src/server/config/square');
    expect(MEMBERSHIP_ATTRIBUTE_KEY).toBe('2025-membership');
  });

  it('should use test membership key in sandbox', () => {
    process.env.SQUARE_ENVIRONMENT = 'sandbox';
    const { MEMBERSHIP_ATTRIBUTE_KEY } = require('../../src/server/config/square');
    expect(MEMBERSHIP_ATTRIBUTE_KEY).toBe('2025-membership-test');
  });
});