const { app, BrowserWindow, Tray, Menu, shell, Notification } = require('electron');
const path = require('path');
const DiscordRPC = require('discord-rpc');
const express = require('express');

// Main server application
const server = express();
server.use(express.json());

// Set up the path for the Electron app icon
const iconPath = path.join(__dirname, '../icons/sigmalogo.ico');

let appIcon = null;
let mainWindow = null;
let rpcClient = null;

// Check if the application starts as a result of a Squirrel event
if(require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        width: 800,
        height: 600,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // Load the index.html of the app
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

// Create system tray & context menu
const createSystemTray = () => {
    appIcon = new Tray(iconPath);
    let contextMenu = Menu.buildFromTemplate([
        {
            label: 'sigma presence',
            click: () => shell.openExternal('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        },
        {
            label: 'Star us on Github!',
            click: () => shell.openExternal('https://github.com/SleepyDaniel/sigma-presence')
        },
        {
            label: 'Quit',
            click: () => app.quit()
        }
    ]);
    
    appIcon.setToolTip('sigma presence');
    appIcon.setContextMenu(contextMenu);
};

app.whenReady().then(() => {
    createWindow();
    createSystemTray();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

server.post('/api/makerpc', async (req, res) => {
  const { clientid, largeimage, smallimage, state, details } = req.body;

  // Ensure only one instance of the RPC client exists
  if (rpcClient) {
      rpcClient.destroy();
  }
  rpcClient = new DiscordRPC.Client({ transport: 'ipc' }); // Create a new RPC client instance

  try {
      // Register the client id with Discord RPC
      await DiscordRPC.register(clientid);
      
      // Login to the RPC client
      await rpcClient.login({ clientId: clientid });
      
      // Set the activity based on the form data
      await rpcClient.setActivity({
          state: state,
          details: details,
          largeImageKey: largeimage,
          smallImageKey: smallimage,
          largeImageText: "sigma presence",
          smallImageText: "https://github.com/SleepyDaniel/sigma-presence",
          instance: false,
      });

      const notif = new Notification({
          icon: iconPath,
          title: 'Started Rich Presence!',
          body: 'Rich Presence has been started!',
      });
      notif.show();

      // Respond successfully
      res.send({ status: "ok" });
  } catch (error) {
      console.error("Failed to start Rich Presence:", error);
      res.status(500).send({ status: "error", message: "Failed to initialize rich presence." });
  }
});

server.post('/api/stoprpc', async (req, res) => {
  if (rpcClient && !rpcClient.destroyed) {
      rpcClient.destroy();
      console.log("RPC Client destroyed.");
      rpcClient = null;
      res.send({ status: "ok" });
      const notif = new Notification({
          icon: iconPath,
          title: 'Stopped Rich Presence!',
          body: 'Rich Presence has been stopped! It may take some time to disappear in Discord.',
      });
      notif.show();
  } else {
      console.log("RPC was not active.");
      res.status(404).send({ status: "error", message: "Rich Presence was not active." });
  }
});
server.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
});