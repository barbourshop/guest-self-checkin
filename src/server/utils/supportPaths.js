const path = require('path');

function getSupportPaths() {
  const userDataDir = process.env.ELECTRON_USER_DATA || null;
  const logsDir = userDataDir ? path.join(userDataDir, 'logs') : null;
  const checkinBackupDir = process.env.CHECKIN_LOG_DIR
    ? path.join(process.env.CHECKIN_LOG_DIR, 'checkins')
    : logsDir
      ? path.join(logsDir, 'checkins')
      : path.join(process.cwd(), 'logs', 'checkins');

  const appLogFile = logsDir ? path.join(logsDir, 'app.log') : null;
  const databaseFile = userDataDir ? path.join(userDataDir, 'checkin.db') : null;

  return {
    userDataDir,
    logsDir,
    checkinBackupDir,
    appLogFile,
    databaseFile
  };
}

module.exports = { getSupportPaths };
