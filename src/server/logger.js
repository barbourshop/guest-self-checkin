const fs = require('fs');
const path = require('path');

// Set up log streams
const logFile = process.env.LOG_FILE || path.join(process.cwd(), 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Log levels for filtering
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  ERROR: 2
};

// Current log level based on environment
const currentLogLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

function formatLogMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}\n`;
}

function shouldLog(level) {
  return LOG_LEVELS[level] >= currentLogLevel;
}

function log(level, message) {
  if (!shouldLog(level)) return;

  const logMessage = formatLogMessage(level, message);
  
  // Always write to log file
  logStream.write(logMessage);
  
  // In development or for errors, also log to console
  if (process.env.NODE_ENV !== 'production' || level === 'ERROR') {
    console.log(logMessage.trim());
  }
}

// Public logging methods
const logger = {
  debug: (message) => log('DEBUG', message),
  info: (message) => log('INFO', message),
  error: (message) => log('ERROR', message),
  metric: (message) => log('INFO', `[METRIC] ${message}`),
  request: (message) => log('DEBUG', `[REQUEST] ${message}`),
  
  // Cleanup method
  end: () => {
    logStream.end();
  }
};

module.exports = logger;

