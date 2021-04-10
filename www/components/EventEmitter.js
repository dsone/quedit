window.EventEmitter = (function() {
	let listener = {};

	return new function() {
		const ipc = require('electron').ipcRenderer;

		this.send = (eventName, data) => {
			ipc.send(eventName, data);
		};
		this.sendSync = (eventName, data) => {
			return ipc.sendSync(eventName, data)
		};

		this.listen = (eventName, callback) => {
			if (typeof(listener[eventName]) === 'undefined') {
				listener[eventName] = [];

				ipc.on(eventName, (event, args) => {
					listener[eventName].forEach(cb => {
						cb(event, args);
					});
				});
			}

			listener[eventName].push(callback);
		};
	};
})();
/*
const ipc = require('electron').ipcRenderer,
	  syncBtn  = document.querySelector('#syncBtn'),
	  asyncBtn = document.querySelector('#asyncBtn');

let replyDiv = document.querySelector('#reply');
syncBtn.addEventListener('click', () => {
	let reply = ipc.sendSync('synMessage','A sync message to main');
	replyDiv.innerHTML = reply;
});

asyncBtn.addEventListener('click', () => {
	ipc.send('aSynMessage','A async message to main')
});

ipc.on('asynReply', (event, args) => {
	replyDiv.innerHTML = args;
});*/

/*const syncBtn  = document.querySelector('#syncBtn'),
	  asyncBtn = document.querySelector('#asyncBtn');
let replyDiv = document.querySelector('#reply');

syncBtn.addEventListener('click', () => {
	replyDiv.innerHTML = EventEmitter.sendSync('synMessage','A sync message to main');
});

EventEmitter.listen('asynReply', (event, args) => {
	replyDiv.innerHTML = args;
});

asyncBtn.addEventListener('click', () => {
	EventEmitter.send('aSynMessage','A async message to main');
});*/