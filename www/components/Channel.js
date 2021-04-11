let channel = function() {
	let observer = { }; // private
	let s = { };

	/**
	 * Registers a function to a specific id to listen on.
	 * If global is provided, it's a globally accessible event.
	 * Send a notification with global=true accordingly.
	 * 
	 * @param   string  id      A unique key to register as event.
	 * @param   funcion cb      A function to call.
	 */
	s.register = (id, cb) => {
		if (typeof(observer[id]) === 'undefined') {
			observer[id] = [];
		}
		observer[id].push(cb);
	};

	/**
	 * Notifies all functions registered for specific id.
	 * 
	 * @param   string  id      The event to notify.
	 * @param   mixed   msg     Data that is to be send to the callback registered for this id.
	 */
	s.notify = (id, msg) => {
		if (typeof(observer[id]) !== 'undefined') {
			return Promise.all(
				observer[id].map(cb => cb(msg))
			);
		}
	};

	return s;
};

(function() {
	if (typeof define === 'function' && define.amd)
		define('channel', function () { return channel; });
	else if (typeof module !== 'undefined' && module.exports)
		module.exports = channel;
	else
		window.channel = channel;
})();