import 'alpinejs';
import Notify from './components/Notify';
import Statement from './components/Statement';

import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup";
import { StateField } from '@codemirror/state';

window.notify = Notify;

window.App = (function() {
	return new function() {
		this.start = (fileSelector, filterSelector, codeInput) => {
			let data = {
				codeEditor: undefined,
				statement: new Statement({}),
				statementObject: undefined,
				tableColumns: [ ],
			};

			let cm = {
				setText: text => {
					data.codeEditor.dispatch({
						changes: { from: 0, to: data.codeEditor.state.doc.length, insert: text }
					});
				},
				getCurrentLine: () => data.codeEditor.state.doc.lineAt(data.codeEditor.state.selection.main.head),
				getCaretPosition: () => data.codeEditor.state.selection.main.head,
			};

			let toChangesUpdate = undefined;
			const listenChangesExtension = StateField.define({
				// we won't use the actual StateField value, null or undefined is fine
				create: () => null,
				update: (value, transaction) => {
					if (transaction.docChanged) {
						clearTimeout(toChangesUpdate);
						toChangesUpdate = setTimeout(() => {
							data.statementObject = data.statement.createObject(transaction.newDoc.toJSON().join(''));
							if (data.statementObject) {
								data.tableColumns = data.statementObject.getColumns();
								this.displayedTableColumns = data.tableColumns.slice(0);

								console.log(this);
							}
						}, 250);
					}

					return null;
				},
			});

			// Create CodeEditor instance
			data.codeEditor = new EditorView({
				state: EditorState.create({
					extensions: [ basicSetup, listenChangesExtension ],
					lineWrapping: true,
				}),
				parent: document.querySelector(codeInput)
			});

			return {
				// options
				clearButton: false,

				// x-text
				contextName: 'SQLEdit',
				searchTableColumnsByText: '',  // Text to filter tableColumns by

				displayedTableColumns: [ ],  // List of the displayed table columns, manipulated by searchTableColumnsByText

				// DOM elements
				searchFilter: document.querySelector(filterSelector),
				openFileInput: document.querySelector(fileSelector),

				// delay timers
				toFilterColumns: undefined,

				// cache
				cacheSearchFilter: {},


				openFilePicker() {
					this.openFileInput.click();
				},

				loadFile() {
					// Picking a file that returns error, then picking again and clicking cancel and the value is empty
					if (this.openFileInput.value.length === 0) {
						return;
					}

					this.loadedFilePath = this.openFileInput.files[0].path;
					let reader = new FileReader();
					reader.onload = () => {
						cm.setText(reader.result);
					};

					if (this.openFileInput.files[0].size > 262_144_000) {
						notify('File too large', 'You can only open files up too 250 MiB size.', 'danger');
						return;
					}

					reader.readAsText(this.openFileInput.files[0]);
				},

				clearFilter() {
					this.searchTableColumnsByText = '';
					this.searchFilter.value = '';
					this.clearButton = false;
					this.displayedTableColumns = data.tableColumns.slice(0);
				},

				filterColumns() {
					// kill previous timer
					clearTimeout(this.toFilterColumns);
					this.toFilterColumns = setTimeout(() => {
						this.clearButton = true;
						this.searchTableColumnsByText = this.searchFilter.value;

						if (this.searchTableColumnsByText.length === 0) {
							this.displayedTableColumns = data.tableColumns.slice(0);

							return;
						} else if (typeof(this.cacheSearchFilter[this.searchTableColumnsByText]) !== 'undefined') {
							this.displayedTableColumns = this.cacheSearchFilter[this.searchTableColumnsByText].slice(0);

							return;
						}

						let reFilter = new RegExp(this.searchTableColumnsByText, 'i');
						this.displayedTableColumns = data.tableColumns.reduce((prevVal, curVal) => {
							if (curVal.match(reFilter)) {
								prevVal.push(curVal);
							}

							return prevVal;
						}, []);

						this.cacheSearchFilter[this.searchTableColumnsByText] = this.displayedTableColumns.slice(0);
					}, 200);
				},

				selectColumn(column) {
					if (column === this.searchFilter.value) { return; }

					this.searchFilter.value = column;
					this.searchTableColumnsByText = column;
					this.filterColumns();
				},

				clearApp() {
					this.clearButton = false;
					this.contextName = 'SQLEdit';
					this.searchTableColumnsByText = '';
					this.displayedTableColumns = [];
					this.toFilterColumns = undefined;
					this.cacheSearchFilter = {};

					cm.setText('');
				}
			};



			// ========================== old

			let mapColToValues = {};  // when inside return it's an empty proxy...

			return {
				// gui
				guiUpdateTO: undefined,

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
			};
		}
	}
})();