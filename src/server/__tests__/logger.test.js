const logger = require('../logger');

describe('logger', () => {
  it('exposes warn for membership cache fallbacks', () => {
    expect(typeof logger.warn).toBe('function');
    expect(() => logger.warn('test warning')).not.toThrow();
  });
});
