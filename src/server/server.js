const path = require('path');

// Set up module resolution for production
if (process.env.NODE_ENV === 'production') {
  const appPath = process.resourcesPath;
  const nodeModulesPath = path.join(appPath, 'node_modules');
  
  // Add node_modules to the module paths
  require('module')._nodeModulePaths = function(from) {
    return [nodeModulesPath];
  };
  
  // Log the paths for debugging
  console.log('App path:', appPath);
  console.log('Node modules path:', nodeModulesPath);
}

const app = require('./app');
const net = require('net');

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next one
        server.close();
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });

    server.once('listening', () => {
      const port = server.address().port;
      server.close();
      resolve(port);
    });

    server.listen(startPort);
  });
}

async function startServer() {
  try {
    const port = await findAvailablePort(3000);
    console.log(`Found available port: ${port}`);
    
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      // Write the port to a file so the main process can read it
      require('fs').writeFileSync('server-port.txt', port.toString());
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();