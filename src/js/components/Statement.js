import Insert from './Insert';

export default function Statement(config) {
	if (!(this instanceof Statement)) {
		return new Statement(config);
	}

	this.object = undefined;

	return new Proxy(this, {
		get: function(obj, field) {
			if (field in obj) {
				return obj[field];
			}

			if (!obj.object) {
				return undefined;
			}

			if (field in obj.object) {
				return typeof(obj.object[field]) !== 'function' ? obj.object[field] : obj.object[field]();
			}

			return undefined;
		}
	});
}

Statement.prototype.createObject = function(statement) {
	switch (statement.substr(0, 11).toLowerCase()) {
		case 'insert into':
			this.object = new Insert();
			this.object.analyze(statement);
			if (!this.object.isValid()) {
				this.object = undefined;
			}
		break;

		default:
			this.object = undefined;
		break;
	}

	return this.object;
}