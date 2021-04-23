const { app, BrowserWindow, ipcMain } = require('electron');

function createWindow() {
	let win = new BrowserWindow({
		width: 1500, height: 800,
		minWidth: 800, minHeight: 600,
		
		webPreferences: {
			nodeIntegration: true
		},
		icon: __dirname + '/www/favicon.ico'
	});

	win.loadFile('./www/index.html');
	win.setAutoHideMenuBar(true);

	if (isDevMode) {
		win.webContents.openDevTools();
	}
}

const isDevMode = process.execPath.match(/[\\/]electron[\\/]/);
if (isDevMode) {
	require('electron-reload')(__dirname, {
		electron: require(`${ __dirname }/node_modules/electron`)
	});
}

app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// macOS dock icon click
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});