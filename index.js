const { app, BrowserWindow, ipcMain } = require('electron');

function createWindow() {
	// Erstelle das Browser-Fenster.
	let win = new BrowserWindow({
		width: 1500, height: 800,
		minWidth: 1500, minHeight: 800,
		maxWidth: 1500,
		webPreferences: {
			nodeIntegration: true
		}
	});
	
	// und lade die index.html der App.
	win.loadFile('./www/index.html');

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
	// Unter macOS ist es üblich, für Apps und ihre Menu Bar
	// aktiv zu bleiben, bis der Nutzer explizit mit Cmd + Q die App beendet.
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// Unter macOS ist es üblich ein neues Fenster der App zu erstellen, wenn
	// das Dock Icon angeklickt wird und keine anderen Fenster offen sind.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

const ipc = require('electron').ipcMain;
/*ipc.on('synMessage', (event, args) => {
	console.log(args);
	event.returnValue = 'Main said I received your Sync message';
});*/

ipc.on('filePick', (event, filePath) => {
	console.log(`${ (new Date()).toLocaleTimeString() }: Event filePick received,`, filePath);

	event.sender.send('rFilePick', { error: true, message: '' });
});

ipc.on('tablePick', (event, tableName) => {
	console.log(`${ (new Date()).toLocaleTimeString() }: Event tablePick received,`, tableName);


});