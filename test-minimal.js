const { app } = require('electron');

app.on('ready', () => {
  console.log('App is ready');
});

app.on('window-all-closed', () => {
  app.quit();
}); 