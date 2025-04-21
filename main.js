const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

app.on('ready', () => {
    // Start the server
    exec('node server.js', { cwd: __dirname }, (err, stdout, stderr) => {
        if (err) {
            console.error('❌ Failed to start server:', err);
        } else {
            console.log('✅ Server started:', stdout);
        }
    });

    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // Load the app's frontend
    mainWindow.loadFile('form.html');
});