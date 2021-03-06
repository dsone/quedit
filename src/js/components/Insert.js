export default function Insert(config) {
	this.insertText = '';

	this.config = {
		...{
			isValid: false,
			parent: undefined,
		},
		...config
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
	this.mapColumnsToValues = [];
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
	this.mapColumnsToValues = [];
	this.config = {
		isValid: false,
		parent: this.config.parent,
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
				row.push(this.mapColumnsToValues[ col ][ val ]);
			}

			values.push('(' + row.join(', ') + ')');
		}
		newFullStatement += values.join(', \n') + ';';

		this.insertText = newFullStatement;

		return newFullStatement.slice(0);
	} catch (e) {
		this.config.parent.notify('danger', e);
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
	let reInsert = /INSERT\sINTO\s[`'" ]?(.+?)[`'" ]?\s+\((.+?)\)\s+VALUES\s?(.*(\)|;)$)/ims;
 
	let matched = reInsert.exec(text);
	if (!matched) {
		this.reset();

		return false;
	}

	let toInfo = undefined;
	try {
		let reCountInsert = /INSERT\sINTO\s[`'" ]?(.+?)[`'" ]?[`'"]\s+\((.+?)\)\s+VALUES\s?/gims;
		let countInserts = text.match(reCountInsert);
		if (countInserts && countInserts.length > 1) {
			for (let i = 0; i < countInserts.length-1; ++i) {
				if (countInserts[i].trim() != countInserts[i+1].trim()) {
					throw('Multiple incompatible INSERT statements found.')
				}
			}
		} else {
			countInserts = [];  // this way we can use .length either way
		}

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

		// Values
		// Remove multiple inserts
		if (countInserts.length > 1) {
			values = values.split(countInserts[0]).join('');

			// delay the info, in case mismatched value count triggers exception
			// if there's a LOT of text to parse, taking longer than ~XYms it's okay to first display the info
			toInfo = setTimeout(() => {
				this.config.parent.notify('info', 'Duplicate INSERT\'s detected', 'They will be ignored/removed on change.');
			}, 500);
		}
		// Remove leading and closing brackets
		values = values.trim();

		let foundTuples = [],
			openTuple = false;

		let curVal = '',
			foundValues = [],
			openValue = false;
		for (let i = 0; i < values.length; ++i) {
			if ( (!openTuple && !openValue && values[i] == ';') || (!openTuple && (values[i] === ',' || values[i].match(/\s/s))) || (openTuple && openValue === false && (values[i] === ',' || values[i].match(/\s/s))) ) {
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

		this.mapColumnsToValues = [];
		for (let i = 0; i < foundTuples.length; ++i) {
			if (foundTuples[i].length !== columns.length) {
				throw(`Found ${ foundTuples[i].length } values in row ${ i+1 }, ${ columns.length } values expected, abort!`);
			}

			for (let j = 0; j < foundTuples[ i ].length; ++j) {
				let colIndex = this.mapColumnToIndex[ columns[ j ] ];

				if (typeof(this.mapColumnsToValues[ colIndex ]) === 'undefined') {
					this.mapColumnsToValues[ colIndex ] = [];
				}

				this.mapColumnsToValues[ colIndex ].push(foundTuples[ i ][ j ]);
			}
		}
		this.values = foundTuples;
		if (foundTuples.length === 0) {
			return false;
		}

		this.config.isValid = true;
		return true;
	} catch (e) {
		clearTimeout(toInfo);
		this.config.parent.notify('danger', e);
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
	return this.columns.slice(0).sort((a, b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()));
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
 * Renames a column.
 * 
 * @param	string	oldColumn		The old column name.
 * @param	string	newColumn		The new column name.
 * @returns	boolean					Boolean indicating success.
 */
Insert.prototype.renameColumn = function(oldColumn, newColumn) {
	try {
		let colIndex = this.mapColumnToIndex[ oldColumn ];

		if (colIndex === undefined) {
			return false;
		}

		this.columns[ colIndex ] = newColumn;
		this.mapColumnToIndex[ newColumn ] = colIndex;
		delete this.mapColumnToIndex[ oldColumn ];

		return true;
	} catch (e) {
		this.config.parent.notify('danger', e);
		console.error(e);

		return false;
	}
};

/**
 * Removes an entire column, including their values.
 * 
 * @param	string	column	Name of the column to remove.
 * @returns mixed			Boolean false on error, Array with the new columns on success.
 */
Insert.prototype.removeColumn = function(column) {
	try {
		let colIndex = this.mapColumnToIndex[ column ];

		if (colIndex === undefined || this.mapColumnsToValues[ colIndex ] === undefined) {
			return false;
		}

		let newColumns = this.columns.slice(0);
			newColumns.splice(colIndex, 1);
		let newMapColumnToIndex = Object.assign({}, this.mapColumnToIndex);

		// Update index for columnName -> index-in-values
		for (let i = 0; i < newColumns.length; ++i) {
			if (newMapColumnToIndex[ newColumns[i] ] < colIndex) {
				continue;
			}

			newMapColumnToIndex[ newColumns[i] ] = newMapColumnToIndex[ newColumns[i] ] - 1;
		}

		let newValues = this.values.slice(0);
		// remove the column from each row
		for (let row = 0; row < newValues.length; ++row) {
			newValues[ row ].splice(colIndex, 1);
		}

		delete this.mapColumnToIndex[ column ];
		this.mapColumnsToValues.splice(colIndex, 1);

		this.values = newValues;
		this.columns = newColumns;
		this.mapColumnToIndex = newMapColumnToIndex;

		return this.columns.slice(0).sort();
	} catch (e) {
		this.config.parent.notify('danger', e);
		console.error(e);

		return false;
	}
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
		this.config.parent.notify('danger', e);
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
			let newValue = values[ i ].trim();

			// Update the value
			this.values[ i ][ colIndex ] = newValue;
			// Update the map of columX => [ value1, value2 ]
			this.mapColumnsToValues[ colIndex ][ i ] = newValue;
		}

		return true;
	} catch (e) {
		this.config.parent.notify('danger', e);
		console.error(e);

		return false;
	}
};

/**
 * Determines the column name within a values position.
 * 
 * @param	int		position		The position within the string.
 * @param	string	valueString		The string to analyze. 
 * @returns	mixed					Boolean false on error, ie column is invalid, the column name as a string otherwise.
 */
Insert.prototype.getColumnAtPosition = function(position, valueString) {
	try {

		let openTuple = false,
			openValue = false,
			valueIndex = -1;

		let str = valueString.trim().replace(/(;|,)$/, '');
		// end of beginning of string - no columns available
		if (position >= str.length || position === 0) {
			return false;
		}

		for (let pos = 0; pos < str.length; ++pos) {
			if ( (!openTuple && (str[pos] === ',' || str[pos].match(/\s/s))) || (openTuple && openValue === false && (str[pos] === ',' || str[pos].match(/\s/s))) ) {
				continue;
			}

			// opening bracket of new tuple
			if (!openTuple && str[pos] === '(') {
				openTuple = true;
				continue;
			}
			// closing bracket of current tuple, while no open value or open value was empty
			if (openTuple && (openValue === false || openValue === '') && str[pos] === ')') {
				if (openValue === '') {  // int or null as a value at the end
					openValue = false;
				}
				openTuple = false;
				continue;
			}

			// currently open value and the next char is a closing char the same as it was opened - but not escaped
			// or there was no '"` as beginning then comma is the separator
			if (openTuple && openValue !== false && ((str[pos] === openValue && str[pos-1] !== '\\') || (str[pos] === ',' && openValue === '') )) {
				openValue = false;
				if (pos >= position) {
					break;
				}
				continue;
			}

			if (openTuple && openValue === false && (str[pos] === "'" || str[pos] === '"' || str[pos] === '`')) {
				++valueIndex;
				openValue = str[pos];
				continue;
			}
			if (openValue === false) {
				++valueIndex;
				openValue = '';
			}

			// Specifically check at end, so "(3" with cursor before 3 will have 3 checked as openValue = '' -> ++valueIndex
			if (pos >= position) {
				if (!openTuple || openValue === false) {
					valueIndex = -1;
				}
				break;
			}
		}

		if (typeof(this.columns[valueIndex]) !== 'undefined') {
			return this.columns[valueIndex];
		}

		throw("Invalid column");
	} catch (e) {
		return false;
	}
};

/**
 * Check if the name of a column is currently present in a statement.
 * 
 * @param	string	nameOfColumn	Name of column to check.
 * @returns	bool					True if column is present in the statement, false otherwise.
 */
Insert.prototype.isColumnAvailable = function(nameOfColumn) {
	return typeof(this.mapColumnToIndex[ nameOfColumn ]) !== 'undefined';
};

/**
 * Adds a new column.
 * 
 * @param	string	columnName	The new column name to add.
 * @param	mixed	value		Optional new value, default is empty string.
 * @returns	bool				A boolean indicating success.
 */
Insert.prototype.addColumn = function(columnName, value = "NULL") {
	try {
		value = value.length > 0 ? value : "NULL";
		if (!value.match(/^NULL$/i) && value.match(/[a-zA-Z_]+/) !== null && !value.match(/`|"|'/)) {
			value = '"' + value + '"';
		}

		this.columns.push(columnName);
		this.mapColumnToIndex[columnName] = this.columns.length-1;

		this.mapColumnsToValues.push([]);
		for (let i = 0; i < this.values.length; ++i) {
			this.values[ i ].push(value);
			this.mapColumnsToValues[ this.mapColumnToIndex[columnName] ].push(value);
		}

		return true;
	} catch (e) {
		this.config.parent.notify('danger', e);
		console.error(e);

		return false;
	}
};