import Insert from './Insert';

export default function Statement(config) {
	if (!(this instanceof Statement)) {
		return new Statement(config);
	}

	this.config = {
		...{
			notification: undefined,
		},
		...config
	};
	this.object = undefined;
}

/**
 * Creates a notification.
 * 
 * @param	string	type				The type of notification, info, warning, success, danger.
 * @param	string	title 				The title of the notification.
 * @param	string	message				Optional body of the notifcation, cannot be an empty string, or it might not be displayed.
 * @param	int		autoRemoveDuration	Time for notification to be displayed.
 */
Statement.prototype.notify = function(type, title, message = ' ', autoRemoveDuration = 5000) {
	if (this.config.notification !== undefined) {
		if (typeof(this.config.notification[type] !== 'undefined')) {
			this.config.notification[type](title, message, { autoRemoveDuration });
		} else {
			this.config.notification(title, message, { autoRemoveDuration });
		}
	}
};

/**
 * 
 * @param	string	statement	A statement to analyze and convert into an object.
 * @returns	mixed				An Object instance corresponding with the input, undefined if invalid input.
 */
Statement.prototype.createObject = function(statement) {
	switch (statement.substr(0, 11).toLowerCase()) {
		case 'insert into':
			this.object = new Insert({ parent: this });
			if (!this.object.analyze(statement)) {
				this.object = undefined;
			}
		break;

		default:
			this.object = undefined;
		break;
	}

	return this.object;
}