const logger = require('../logger');

/**
 * Logs each /api request when API_REQUEST_LOG=1 or when spawned with ELECTRON_RUN_AS_NODE=1
 * (Electron main sets the latter for the child server). Helps debug "fetch failed" on target machines.
 */
function shouldLog() {
  return (
    process.env.API_REQUEST_LOG === '1' ||
    process.env.API_REQUEST_LOG === 'true' ||
    process.env.ELECTRON_RUN_AS_NODE === '1'
  );
}

function apiRequestLog() {
  if (!shouldLog()) {
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    if (!req.path.startsWith('/api')) {
      return next();
    }

    const start = Date.now();
    const startedAt = new Date().toISOString();

    let logged = false;
    const logOnce = (statusCode) => {
      if (logged) return;
      logged = true;
      const ms = Date.now() - start;
      const code = statusCode || res.statusCode || 0;
      const line = `[api] ${startedAt} ${req.method} ${req.originalUrl} -> ${code} ${ms}ms`;
      if (code >= 500) {
        logger.error(line);
      } else if (code >= 400) {
        logger.info(`${line} (client error)`);
      } else {
        logger.info(line);
      }
    };

    res.on('finish', () => logOnce(res.statusCode));
    res.on('close', () => {
      if (!logged && !res.writableEnded) {
        logged = true;
        logger.warn(
          `[api] ${startedAt} ${req.method} ${req.originalUrl} -> connection aborted (${Date.now() - start}ms)`
        );
      }
    });

    next();
  };
}

module.exports = { apiRequestLog, shouldLog };
