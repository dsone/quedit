/**
 * Helper class to keep track on the last displayed notification.
 * Preventing duplicates being displayed for a certain amount of time.
 * Unless another notification was displayed in the meantime.
 * Implemented with a Singleton pattern since Notify is not instantiated.
 */
let NotificationStatus = (function () {
	var instance;
 
	function createInstance() {
		let NotificationStatus = function() {
			this.lastNotify = '';
			this.threshold = undefined;
		};
		NotificationStatus.prototype.last = function(msg) {
			this.timer(msg);

			let oldValue = this.lastNotify;
			return this.lastNotify = msg, oldValue === msg;
		};
		// Resets timer if necessary, or starts it
		NotificationStatus.prototype.timer = function(msg) {
			if (!this.threshold) {
				this.threshold = setTimeout(() => {
					this.lastNotify = '';
					this.threshold = undefined;
				}, 3000);
			} else if (msg != this.lastNotify) {
				this.threshold = clearTimeout(this.threshold);
				this.timer();
			}
		};

		return new NotificationStatus();
	}
 
	return {
		getInstance: function() {
			if (!instance) {
				instance = createInstance();
			}
			return instance;
		}
	};
})();

// for purgecss not removing the notify classes
let ___ignore = 'is-danger is-warning is-info is-success';
export default function Notify(title, message, type, duration) {
	let status = NotificationStatus.getInstance();
	if (status.last(message)) { return; }

	duration = Math.max(900, duration || 3000);  // <900 might be problematic due to the animations
	let timerClose = undefined;
	// notification container, holding all elements
	let tile = document.createElement('div');
		tile.classList.add('notification', 'notification-item', 'is-' + type, 'animated', 'fast', 'fadeInDown', 'group');
		tile.addEventListener('click', function(e) {
			if (timerClose !== undefined) {
				timerClose = clearTimeout(timerClose);
			}
			if (timerFadeIn !== undefined) {
				timerFadeIn = clearTimeout(timerFadeIn);
			}

			tile.classList.add('fadeOutRight');
			setTimeout(function() {
				tile.remove();
			}, 900);
		});
		tile.addEventListener('mouseover', function(e) {
			if (timerClose !== undefined) {
				timerClose = clearTimeout(timerClose);
			}
		});
		tile.addEventListener('mouseleave', function(e) {
			timerClose = setTimeout(function() {
				tile.click();
			}, duration);
		});

   // The button to prematurely close the notification;
	let btn = document.createElement('button');
		btn.classList.add('n-remove', (type === 'warning' || type === 'info' ? 'group-hover:text-gray-500' : 'group-hover:text-gray-200'));
		btn.innerHTML = 'x';
		btn.addEventListener('click', function(e) {
			tile.click();
		});
	tile.appendChild(btn);

	// Title for the notification
	let header = document.createElement('h3');
		header.classList.add('n-title');
		header.innerText = title;
	tile.appendChild(header);

	// Text node, aka message
	let text = document.createElement('div');
		text.classList.add('n-text');
		text.innerHTML = message;
	tile.appendChild(text);

	// Add it to global notification container
	document.querySelector('.notifications').prepend(tile);
	let timerFadeIn = setTimeout(function() {
		tile.classList.remove('fadeInDown');
	}, 900);  // animation runs for 800ms (due to .fast), but rendering might need a ms more to prevent "jumping" of element

	// start timer to close automatically after 5s by triggering mouseleave event
	tile.dispatchEvent(new Event('mouseleave'));
}