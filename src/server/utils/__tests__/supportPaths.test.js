const path = require('path');
const { getSupportPaths } = require('../supportPaths');

describe('supportPaths', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns desktop paths when ELECTRON_USER_DATA is set', () => {
    process.env.ELECTRON_USER_DATA = '/data/front-desk-app';
    process.env.CHECKIN_LOG_DIR = '/data/front-desk-app/logs';

    const paths = getSupportPaths();

    expect(paths.userDataDir).toBe('/data/front-desk-app');
    expect(paths.appLogFile).toBe(path.join('/data/front-desk-app/logs', 'app.log'));
    expect(paths.checkinBackupDir).toBe(path.join('/data/front-desk-app/logs', 'checkins'));
    expect(paths.databaseFile).toBe(path.join('/data/front-desk-app', 'checkin.db'));
  });

  it('falls back to cwd logs when not in Electron', () => {
    delete process.env.ELECTRON_USER_DATA;
    delete process.env.CHECKIN_LOG_DIR;

    const paths = getSupportPaths();

    expect(paths.userDataDir).toBeNull();
    expect(paths.checkinBackupDir).toBe(path.join(process.cwd(), 'logs', 'checkins'));
  });
});
