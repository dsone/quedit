import 'alpinejs';
import Notify from './components/Notify';
window.notify = Notify;

window.App = (function() {
	return new function() {
		this.start = (fileSelector, filterSelector, textInput) => {
			let mapColToValues = {};  // when inside return it's an empty proxy...

			return {
				// gui
				guiUpdateTO: undefined,

				// Filepicker
				fullStatement: '',
				fileInput: document.querySelector(fileSelector),
				textInput: document.querySelector(textInput),
				loadedFilePath: undefined,
				textContent: 'INSERT INTO `test` (`uid`, `uid2`) VALUES (`1`, `2`), (`3`, `4`),\n\
(`5`, `6`),\n\
(`7`, `8`),\n\
(`9`, `10`);',

				// x-text
				tableName: 'Table',

				// Database - Tables
				dbColumns: [],  // collection of value rows
				filteredColumns: [],
				filterColumnsBy: '',
				inputFilterBy: document.querySelector(filterSelector),
				toDelayFilter: undefined,
				cachedFilters: {},

				setText(text) {
					this.textContent = text;
					this.textInput.value = this.textContent;
				},

				openFilePicker() {
					this.fileInput.click();
				},

				// Invoked by openFilePicker's click()
				loadFile() {
					// Picking a file that returns error, then picking again and clicking cancel and the value is empty
					if (this.fileInput.value.length === 0) {
						return;
					}

					this.loadedFilePath = this.fileInput.files[0].path;
					let reader = new FileReader();
					reader.onload = () => {
						let text = reader.result;
						this.setText(text);
						this.fullStatement = reader.result;
					};

					if (this.fileInput.files[0].size > 104_857_600) {
						notify('File too large', 'You can only open files up too 100 MiB size.', 'danger');
						return;
					}
					reader.readAsText(this.fileInput.files[0]);
				},

				filterColumns() {
					this.filterColumnsBy = this.inputFilterBy.value;

					clearTimeout(this.toDelayFilter);
					this.toDelayFilter = setTimeout(() => {
						if (this.filterColumnsBy.length > 3) {
							if (typeof(this.cachedFilters[this.filterColumnsBy]) === 'undefined') {
								const regex = new RegExp(this.filterColumnsBy);
								this.cachedFilters[this.filterColumnsBy] = this.dbColumns.reduce((prevVal, curVal) => {
									if (curVal.match(regex)) {
										prevVal.push(curVal);
									}
									return prevVal;
								}, []);
							}

							this.filteredColumns = this.cachedFilters[this.filterColumnsBy].slice(0);
						} else {
							if (this.filteredColumns.length !== this.dbColumns.length) {
								this.filteredColumns = this.dbColumns.slice(0);
							}
						}
						this.doGuiUpdate();
					}, 500);
				},

				selectColumn(column) {
					if (this.inputFilterBy.value.length > 0) {
						this.remapValues();
					}
					this.inputFilterBy.value = column;
					this.filterColumns();
				},

				remapValues() {
					let text = this.textInput.value.trim().split('\n');
					let rows = text.length;
					if (rows && rows === mapColToValues[this.inputFilterBy.value].length) {
						for (let i = 0; i < rows; ++i) {
							mapColToValues[this.inputFilterBy.value][i] = text[i];
						}

						let newFullStatement = 'INSERT INTO `' + this.tableName + '` (';
							newFullStatement += '`' + this.dbColumns.join('`, `') + '`) VALUES\n ';

						let values = [];
						// abusing rows.length here since that must fit the length of each mapColToValues[x] entry's length
						for (let val = 0; val < rows; ++val) {
							let row = [];
							for (let col = 0; col < this.dbColumns.length; ++col) {
								row.push('`' + mapColToValues[this.dbColumns[col]][val] + '`');
							}
							
							values.push('(' + row.join(', ') + ')');
						}
						newFullStatement += values.join(', \n') + ';';

						this.fullStatement = newFullStatement;
					} else {
						notify('Invalid row count', 'Too many or too less rows defined', 'danger');
					}
				},

				resetFilter() {
					if (this.inputFilterBy.value.length > 0 && typeof(mapColToValues[this.inputFilterBy.value]) === 'undefined') {
						this.inputFilterBy.value = '';
						this.filterColumns();
						return;
					}

					this.remapValues();
					this.inputFilterBy.value = '';
					this.setText(this.fullStatement);
					this.filterColumns();
				},

				doGuiUpdate() {
					if (this.filterColumnsBy.length === 0) {
						this.setText(this.textInput.value);

						// Split INSERT statement into pieces
						let text = this.textInput.value;
						let reInsert = /INSERT INTO `(.+?)`\s+\((.+?)\)\s+VALUES\s+(.*)/gims;

						let matched = reInsert.exec(text);
						if (!matched) {
							this.tableName = 'Table';
							return;
						}

						// get parts
						let [ , table, columns, values ] = [ ...matched ];
						this.tableName = table;

						// Prepare columns display in menu
						columns = columns.split(',');
						for (let i = 0; i < columns.length; ++i) {
							columns[i] = columns[i].replace(/`/g, '').trim();
						}
						this.dbColumns = columns;
						this.filteredColumns = columns;

						// save away map for col => values to quickly list all values for a certain value
						values = values.trim().replace(/^\(/, '').replace(/(\);|\))$/gims, '').replace(/\).+?\(/gims, '#;;#').split('#;;#');

						mapColToValues = {};
						for (let i = 0; i < values.length; ++i) {
							let vals = values[i].split(',');

							for (let j = 0; j < vals.length; ++j) {
								if (typeof(mapColToValues[columns[j]]) === 'undefined') {
									mapColToValues[columns[j]] = [];
								}
								mapColToValues[columns[j]].push(vals[j].replace(/`/g, '').trim());
							}
						}
					} else {
						if (typeof(mapColToValues[this.inputFilterBy.value]) !== 'undefined') {
							let text = '';
							for (let i = 0; i < mapColToValues[this.inputFilterBy.value].length; ++i) {
								text += mapColToValues[this.inputFilterBy.value][i] + "\n";
							}
							this.setText(text);
						}
					}
				},

				scheduleGuiUpdate() {
					// if non filtered and the change comes from paste/keyup in textarea - the original insert was changed
					if (this.filterColumnsBy.length === 0) {
						this.fullStatement = this.textInput.value;
					}
					clearTimeout(this.guiUpdateTO);
					this.guiUpdateTO = setTimeout(() => { this.doGuiUpdate(); }, 500);
				},

				handleChange() {
					if (this.filterColumnsBy.length === 0) {
						this.fullStatement = this.textInput.value.trim();
						this.scheduleGuiUpdate();
					}
				},

				clearApp() {
					this.guiUpdateTO = clearTimeout(this.guiUpdateTO);
					this.fullStatement = '';
					this.textContent = '';

					this.tableName = 'Table';

					this.dbColumns = [];
					this.filteredColumns = [];
					this.filterColumnsBy = '';

					this.toDelayFilter = clearTimeout(this.toDelayFilter);
					this.cachedFilters = {};

					this.textInput.value = '';
					this.inputFilterBy.value = '';
				}
			};
		}
	}
})();