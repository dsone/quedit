/**
 * Helper class to keep track on the last displayed notification.
 * Preventing duplicates being displayed for a certain amount of time.
 * Unless another notification was displayed in the meantime.
 * Implemented with a Singleton pattern since Notify is not instantiated.
 */
let NotificationStatus = (function () {
	let instance;

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

function Notify(title = 'title', text = 'text', cfg = {}) {
	let status = NotificationStatus.getInstance();
	if (status.last(text)) { return; }

	let config = {
		...{
			// Title of the notification
			title: title,
			// Message content
			text: text,
			// Type of notifcation, info, warning, danger, success
			type: 'info',
			// the container holding all notification items
			notificationsContainer: document.querySelector('.notifications'),
			// Auto removing notification after this, in ms
			autoRemoveDuration: 3000,
			// fadein/-out animation time
			animationDuration: 800,
			// the template for notifications to use
			templateHTML: document.querySelector('#notification-item').innerHTML,
			// class for opening animation
			openingAnimationClass: 'fadeInDown',
			// class for closing animation
			closingAnimationClass: 'fadeOutRight',
			// close btn hover:color for info and warning
			warningInfoCloseColor: 'text-gray-500',
			// close bnt hover:color for danger and success
			dangerSuccessCloseColor: 'text-gray-200',
		},
		...cfg
	};
	
	let timerClose = undefined;
	let timerFadeIn = undefined;

	let _div = document.createElement('div');
	let tmpl = config.templateHTML.slice(0);

	_div.innerHTML = tmpl;
	_div = _div.firstElementChild;
	_div.classList.add('is-' + config.type, config.openingAnimationClass);
	
	_div.addEventListener('click', e => {
		if (timerClose !== undefined) {
			timerClose = clearTimeout(timerClose);
		}
		if (timerFadeIn !== undefined) {
			timerFadeIn = clearTimeout(timerFadeIn);
		}
		
		_div.classList.add(config.closingAnimationClass);
		setTimeout(function() {
			_div.remove();
		}, config.animationDuration+50);
	});

	_div.addEventListener('mouseover', function(e) {
		if (timerClose !== undefined) {
			timerClose = clearTimeout(timerClose);
		}
	});
	_div.addEventListener('mouseleave', function(e) {
		timerClose = setTimeout(function() {
			_div.click();
		}, config.autoRemoveDuration);
	});

	let closeBtn = [ ..._div.querySelectorAll('[n-close]') ];
		closeBtn.forEach(btn => {
			btn.innerHTML = 'x';

			btn.classList.add((config.type === 'warning' || config.type === 'info' ? `group-hover:${ config.warningInfoCloseColor }` : `group-hover:${ config.dangerSuccessCloseColor }`));

			btn.addEventListener('click', e => {
				_div.click();
			});
		});

	[ 'title', 'text' ].forEach(key => {
		let el = _div.querySelector(`[n-${ key }]`);
		el && (el.innerHTML = config[key]);
	});

	let icon = _div.querySelector(`[n-type-${ config.type }]`);
	icon && icon.classList.remove('hidden');

	!!config.notificationsContainer && config.notificationsContainer.prepend(_div);

	timerFadeIn = setTimeout(function() {
		_div.classList.remove(config.openingAnimationClass);
	}, config.animationDuration+50);

	// start timer to close automatically after 5s
	_div.dispatchEvent(new Event('mouseleave'));
}


// Creating shorthands in a hacky way
let wrappedNotify = (() => {
	Notify.danger = function(title = 'title', text = 'text', cfg = {}) {
		return Notify(title, text, { type: 'danger', ...cfg });
	};
	Notify.info = function(title = 'title', text = 'text', cfg = {}) {
		return Notify(title, text, { type: 'info', ...cfg });
	};
	Notify.success = function(title = 'title', text = 'text', cfg = {}) {
		return Notify(title, text, { type: 'success', ...cfg });
	};
	Notify.warning = function(title = 'title', text = 'text', cfg = {}) {
		return Notify(title, text, { type: 'warning', ...cfg });
	};

	return Notify;
})();

export default wrappedNotify;