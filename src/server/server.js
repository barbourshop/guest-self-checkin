const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env from cwd (where you ran "npm run prod") then project root
const cwdEnv = path.join(process.cwd(), '.env');
const projectRoot = path.resolve(__dirname, '..', '..');
const rootEnv = path.join(projectRoot, '.env');
dotenv.config({ path: cwdEnv });
dotenv.config({ path: rootEnv }); // cwd loaded first; root fills any missing

// Import routes
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const passRoutes = require('./routes/passRoutes');
const logger = require('./logger');
const errorHandler = require('./middleware/errorHandler');
const { SQUARE_API_CONFIG } = require('./config/square');

function log(message) {
  console.log(`[Server] ${message}`);
  logger.info(message);
}

if (process.env.USE_MOCK_SQUARE_SERVICE === 'true') {
  log('🧪 Using mock Square service (no real API calls)');
} else {
  log('🏭 Production: Real Square API');
  const u = process.env.SQUARE_API_URL;
  const t = process.env.SQUARE_ACCESS_TOKEN;
  log(`   SQUARE_ACCESS_TOKEN set: ${!!t}`);
  log(`   SQUARE_API_URL: ${u || '(not set — Square will fail)'}`);
  log(`   SQUARE_API_VERSION: ${process.env.SQUARE_API_VERSION || '(not set)'}`);
  if (!u) log('⚠️  SQUARE_API_URL not set in .env — must match API Explorer (sandbox vs production)');
  if (!t) log('⚠️  SQUARE_ACCESS_TOKEN not set in .env');
}
log('   Database: checkin.db');

log('Starting server...');

// Get the resources path
const resourcesPath = process.env.RESOURCES_PATH || './';
if (!resourcesPath) {
  log('ERROR: RESOURCES_PATH environment variable is not set');
  process.exit(1);
}

try {
  const app = express();
  const port = process.env.PORT || 3000;

  // Enable CORS for all routes
  app.use(cors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-action'],
    credentials: true
  }));

  // Handle OPTIONS requests explicitly
  app.options('*', cors());

  // Middleware
  app.use(express.json());
  
  // Routes
  app.use('/api/customers', customerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/passes', passRoutes);
  
  // Static files (optional when running with dev frontend - API still works without dist)
  const staticPath = path.join(resourcesPath, 'dist');
  let staticPathValid = false;
  try {
    const stats = fs.statSync(staticPath);
    if (stats.isDirectory() && fs.existsSync(path.join(staticPath, 'index.html'))) {
      staticPathValid = true;
      app.use(express.static(staticPath, {
        index: 'index.html',
        fallthrough: true,
        redirect: false
      }));
      app.get('*', (req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'), err => {
          if (err) {
            log(`Error serving index.html: ${err.message}`);
            res.status(500).send('Error serving application');
          }
        });
      });
    }
  } catch (err) {
    // dist not found - normal when using dev frontend (npm run prod = server + dev)
    log(`WARNING: Static path not found (${staticPath}). API only. Run 'npm run build' to serve the app from this server.`);
  }
  if (!staticPathValid) {
    app.get('/', (req, res) => {
      res.status(503).send('Frontend not built. Run npm run build, or use the dev server (npm run dev) with API proxy.');
    });
  }

  // Add error handling middleware last
  app.use(errorHandler);

  // Error handler
  function handleError(err) {
    log(`Fatal error: ${err.message}`);
    process.exit(1);
  }

  // Start server
  const server = app.listen(port, async () => {
    log(`Server is running on http://localhost:${port}`);
    
    // Check and refresh cache on boot if needed (non-blocking)
    if (process.env.USE_MOCK_SQUARE_SERVICE !== 'true') {
      try {
        const MembershipCache = require('./services/membershipCache');
        const membershipCache = new MembershipCache();
        
        // Check if cache needs refresh (non-blocking, runs in background)
        membershipCache.checkAndRefreshIfNeeded().then(refreshed => {
          if (refreshed) {
            log('✅ Cache refresh started automatically (cache was empty or >24 hours old)');
          } else {
            log('✅ Cache is fresh, no refresh needed');
          }
        }).catch(error => {
          log(`⚠️  Error checking cache on startup: ${error.message}`);
          // Don't fail startup if cache check fails
        });
      } catch (error) {
        log(`⚠️  Error initializing cache check on startup: ${error.message}`);
        // Don't fail startup if cache initialization fails
      }
    } else {
      log('⏭️  Skipping cache refresh check (mock service)');
    }
  }).on('error', handleError);

  // Handle termination
  ['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => {
      server.close(() => {
        log('Server closed');
        process.exit(0);
      });
    });
  });

  process.on('uncaughtException', (err) => {
    log(`Uncaught Exception: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Promise Rejection: ${reason}`);
    logger.error(reason);
    process.exit(1);
  });

} catch (err) {
  log(`Fatal error during startup: ${err.message}`);
  process.exit(1);
}
