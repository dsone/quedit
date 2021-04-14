export default function Insert() {
	this.insertText = '';

	this.config = {
		isValid: false,
	};

	/**
	 * Name of the table where values are inserted.
	 */
	this.tableName = '';
	/**
	 * The Array of columns of the statement.
	 */
	this.columns = [];
	this.mapColumnToIndex = {};

	/**
	 * The values to be inserted.
	 * The length of this property is equivalent to the amount of rows, because each SQL tupel is one entry:
	 * [ ['uid1', 'description1'], ['uid2', 'description2'] ]
	 */
	this.values = [];

	/**
	 * A link from column to value.
	 * Index based, meaning, "columnAtIndexY" inside columns maps to values a, b, ..., z.
	 */
	this.mapColumnsToValues = {};
}

/**
 * Resets the state of the instance to the initial one.
 */
Insert.prototype.reset = function() {
	this.insertText = '';
	this.tableName = '';
	this.columns = [];
	this.mapColumnToIndex = {};
	this.values = [];
	this.mapColumnsToValues = {};
	this.config = {
		isValid: false,
	};
};

/**
 * Only changed, whenever analyze is invoked.
 * 
 * @returns bool	Indicating, if previous statement was valid.
 */
Insert.prototype.isValid = function() {
	return this.config.isValid;
};

/**
 * Returns the cached insert statement.
 * 
 * @returns	string		The cached insert statement.
 */
Insert.prototype.getInsertStatement = function() {
	return this.insertText;
};

/**
 * Creates the new INSERT INTO statement.
 * Saves the result back into the instance.
 * 
 * @returns	mixed		The new INSERT statement, undefined on error.
 */
Insert.prototype.assemble = function() {
	try {
		let newFullStatement = 'INSERT INTO `' + this.tableName + '` (';
			newFullStatement += '`' + this.columns.join('`, `') + '`) VALUES \n';

		let values = [];
		let rows = this.values.length;  // see comment of this.values why this is used for rows
		for (let val = 0; val < rows; ++val) {
			let row = [];
			for (let col = 0; col < this.columns.length; ++col) {
				row.push(/*'`' + */this.mapColumnsToValues[ col ][ val ]/* + '`'*/);
			}

			values.push('(' + row.join(', ') + ')');
		}
		newFullStatement += values.join(', \n') + ';';

		this.insertText = newFullStatement;

		return newFullStatement;
	} catch (e) {
		console.error(e);

		return undefined;
	}
};

/**
 * Dismembers all the parts of the statement.
 * Creates indexes and maps.
 * 
 * @param	insertText	The text to anayte and take apart.
 * @returns bool		If true, valid statement, otherwise resets previous data.
 */
Insert.prototype.analyze = function(insertText) {
	this.insertText = insertText;
	let text = insertText;
	let reInsert = /INSERT\sINTO\s`(.+?)`\s+\((.+?)\)\s+VALUES\s?(.*)/gims;

	let matched = reInsert.exec(text);
	if (!matched) {
		this.reset();

		return false;
	}

	try {
		// get parts
		let [ , table, columns, values ] = [ ...matched ];
		this.tableName = table;

		// Columns
		columns = columns.split(',');
		this.mapColumnToIndex = {};
		for (let i = 0; i < columns.length; ++i) {
			columns[ i ] = columns[ i ].trim().replace(/`/g, '').trim();

			this.mapColumnToIndex[ columns[ i ] ] = i;
		}
		this.columns = columns;

		// Values, remove leading and closing brackets
		values = values.trim();

		let foundTuples = [],
			openTuple = false;

		let curVal = '',
			foundValues = [],
			openValue = false;
		for (let i = 0; i < values.length; ++i) {
			if ( (!openTuple && (values[i] === ',' || values[i].match(/\s/s))) || (openTuple && openValue === false && (values[i] === ',' || values[i].match(/\s/s))) ) {
				continue;  // skip comma and whitespace between tuples
			}

			// opening bracket of new tuple
			if (!openTuple && values[i] === '(') {
				openTuple = true;
				continue;
			}
			// closing bracket of current tuple, while no open value or open value was empty
			if (openTuple && (openValue === false || openValue === '') && values[i] === ')') {
				if (openValue === '') {  // int or null as a value at the end
					foundValues.push(curVal);
					curVal = '';
					openValue = false;
				}

				openTuple = false;
				foundTuples.push(foundValues.slice(0));
				foundValues.length = 0;
				continue;
			}

			// currently open value and the next char is a closing char the same as it was opened - but not escaped
			// or there was no '"` as beginning then comma is the separator
			if (openTuple && openValue !== false && ((values[i] === openValue && values[i-1] !== '\\') || (values[i] === ',' && openValue === '') )) {
				if (openValue !== '') {
					curVal += values[i];
				}
				foundValues.push(curVal.trim());
				curVal = '';
				openValue = false;
				continue;
			}
			if (openTuple && openValue === false && (values[i] === "'" || values[i] === '"' || values[i] === '`')) {
				openValue = values[i];
				curVal += values[i];
				continue;
			}
			if (openValue === false) {
				openValue = '';
			}

			curVal += values[i];
		}

		this.mapColumnsToValues = {};
		for (let i = 0; i < foundTuples.length; ++i) {
			for (let j = 0; j < foundTuples[ i ].length; ++j) {
				let colIndex = this.mapColumnToIndex[ columns[ j ] ];

				if (typeof(this.mapColumnsToValues[ colIndex ]) === 'undefined') {
					this.mapColumnsToValues[ colIndex ] = [];
				}

				this.mapColumnsToValues[ colIndex ].push(foundTuples[ i ][ j ]);
			}
		}
		this.values = foundTuples;

		this.config.isValid = true;
		return true;
	} catch (e) {
		console.error(e);
		this.reset();

		return false;
	}
};

/**
 * Gets the target table name.
 * 
 * @returns	string	The name of the table the query has as a target.
 */
Insert.prototype.getTable = function() {
	return this.tableName;
};

/**
 * Returns the available columns, sorted ascending.
 * 
 * @returns	Array	A sorted Array of columns, empty if not yet set.
 */
Insert.prototype.getColumns = function() {
	return this.columns.slice(0).sort();
};

/**
 * 
 * @param	string	column	Name of the column to get all the values of.
 * @returns Array			An array of values, can be empty, if invalid column requested.
 */
Insert.prototype.getValuesByColumn = function(column) {
	let colIndex = this.mapColumnToIndex[ column ];

	if (colIndex === undefined || this.mapColumnsToValues[ colIndex ] === undefined) {
		return [];
	}

	let values = [];
	for (let i = 0; i < this.mapColumnsToValues[ colIndex ].length; ++i) {
		values.push(this.mapColumnsToValues[ colIndex ][ i ]);
	}

	return values;
};

/**
 * 
 * @param	string	column	The name of the column to update a value of.
 * @param	int		row		The row of the value to update, 0 based!
 * @param	mixed	value	The new value to set.
 * @returns	bool			True on success, false otherwise.
 */
Insert.prototype.updateValue = function(column, row, value) {
	try {
		let colIndex = this.mapColumnToIndex[column];
		if (colIndex === undefined || this.mapColumnsToValues[ colIndex ] === undefined) {
			return false;
		}

		let newValue = value/*.replace(/^(`|'|")|(`|'|")$/g, '')*/.trim();
		// Update the value
		this.values[ row ][ colIndex ] = newValue;
		// Update the map of columX => [ value1, value2 ]
		this.mapColumnsToValues[ colIndex ][ row ] = newValue;

		return true;
	} catch (e) {
		console.error(e);

		return false;
	}
};

/**
 * Similar to `updateValue` only for all values of a specific column.
 * 
 * @param	string	column	Name of the column to update values of.
 * @param	Array	values	An array of new values for the column.
 * @returns	bool			True on success, false otherwise.
 */
Insert.prototype.updateValues = function(column, values) {
	try {
		let colIndex = this.mapColumnToIndex[ column ];
		if (colIndex === undefined || this.mapColumnsToValues[ colIndex ] === undefined) {
			return false;
		}

		// Check for correct count of values
		let rows = values.length;
		if (this.values.length !== rows) {
			return false;
		}

		for (let i = 0; i < rows; ++i) {
			let newValue = values[ i ]/*.replace(/^(`|'|")|(`|'|")$/g, '')*/.trim();

			// Update the value
			this.values[ i ][ colIndex ] = newValue;
			// Update the map of columX => [ value1, value2 ]
			this.mapColumnsToValues[ colIndex ][ i ] = newValue;
		}

		return true;
	} catch (e) {
		console.error(e);

		return false;
	}
};
