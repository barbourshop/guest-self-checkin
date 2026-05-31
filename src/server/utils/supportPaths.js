const fs = require('fs');
const path = require('path');

const SQUARE_TOKEN_FILENAME = 'square-access-token.txt';

function getSquareTokenFilePath() {
  if (!process.env.ELECTRON_USER_DATA) {
    return null;
  }
  return path.join(process.env.ELECTRON_USER_DATA, SQUARE_TOKEN_FILENAME);
}

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

  const squareTokenFile = getSquareTokenFilePath();

  return {
    userDataDir,
    logsDir,
    checkinBackupDir,
    appLogFile,
    databaseFile,
    squareTokenFile,
    hasSquareToken: squareTokenFile ? fs.existsSync(squareTokenFile) : false
  };
}

module.exports = { getSupportPaths, getSquareTokenFilePath, SQUARE_TOKEN_FILENAME };
