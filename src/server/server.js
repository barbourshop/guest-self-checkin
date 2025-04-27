const express = require('express');
const path = require('path');
const fs = require('fs');

// Set up logging
const logFile = process.env.LOG_FILE || path.join(process.cwd(), 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [Server] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
}

console.log('Server process starting...');
log(`Log file: ${logFile}`);

// Set up module resolution for production
if (process.env.NODE_ENV === 'production') {
  const appPath = process.resourcesPath;
  const nodeModulesPath = path.join(appPath, 'node_modules');
  
  console.log('Production mode detected');
  console.log('App path:', appPath);
  console.log('Node modules path:', nodeModulesPath);
  
  // Add node_modules to the module paths
  require('module')._nodeModulePaths = function(from) {
    return [nodeModulesPath];
  };
}

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

// API routes
app.get('/api/status', (req, res) => {
  log('Status check received');
  res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  log(`Server is running on http://localhost:${port}`);
  // Write the port to a file in the correct location based on environment
  const portFilePath = process.env.NODE_ENV === 'production' 
    ? path.join(process.resourcesPath, 'server-port.txt')
    : 'server-port.txt';
  require('fs').writeFileSync(portFilePath, port.toString());
});

// Handle process termination
process.on('SIGTERM', () => {
  log('Received SIGTERM signal');
  logStream.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT signal');
  logStream.end();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`);
  logStream.end();
  process.exit(1);
});