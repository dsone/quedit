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
				filterText: false,		// bool, on selectColumn this is true, then the CM change plugin below sets the cm text to the values
				filteredView: false,	// name of column to filter by
				resetFilter: false,
			};

			let cm = {
				setText: text => {
					data.codeEditor.dispatch({
						changes: { from: 0, to: data.codeEditor.state.doc.length, insert: text }
					});
				},
				getCurrentLine: () => data.codeEditor.state.doc.lineAt(data.codeEditor.state.selection.main.head),
				getCaretPosition: () => data.codeEditor.state.selection.main.head,
				setCaretPosition: offset => data.codeEditor.state.selection.main.head = 0,
				setFilterView: column => {
					if (data.statementObject) {
						data.filteredView = column;

						data.filterText = true;  // indicate we're going to filter in listenChangesExtension
						cm.setText(data.statementObject.getValuesByColumn(column).join('\n'));
					}
				},
				resetFilterView: () => {
					if (data.statementObject) {
						data.resetFilter = true;

						// get current filtered text
						let rows = data.codeEditor.state.doc.toJSON();

						// change existing values
						if (data.statementObject.updateValues(data.filteredView, rows)) {
							data.filteredView = false;
							data.filterText = false;

							// assemble new full string
							let statement = data.statementObject.assemble();
							if (statement !== undefined) {
								// use new insert text for CM
								cm.setText(statement);
							} else {
								cm.setText('error');
							}
						} else {
							data.filteredView = false;
							data.filterText = false;
							cm.setText(data.statementObject.assemble());

							notify('Update values failed', 'Reverting filtered changes', 'warning');
						}
					}
				}
			};

			let toChangesUpdate = undefined;
			const listenChangesExtension = StateField.define({
				// we won't use the actual StateField value, null or undefined is fine
				create: () => null,
				update: (value, transaction) => {
					if (transaction.docChanged) {
						clearTimeout(toChangesUpdate);
						toChangesUpdate = setTimeout(() => {
							if (data.resetFilter) {
								data.resetFilter = false;
								return;
							} else if (data.filterText) {  // filter view, do not re-analyze
								data.filterText = false;
								return;
							} else if (!!data.filteredView) {  // values are displayed for a given column
								// nothing to do here
								return;
							} else {  // normal view - text changed, analyze content
								let scrollToTop = !(!!data.statementObject);  // when previously a valid doc existed - do not scroll to top
								data.statementObject = data.statement.createObject(transaction.newDoc.toJSON().join(''));
								if (data.statementObject) {
									data.tableColumns = data.statementObject.getColumns();

									// outside of alpine this is a hacky way of accessing data
									document.querySelector('body[x-data]').__x.$data.displayedTableColumns = data.tableColumns.slice(0);
									document.querySelector('body[x-data]').__x.$data.contextName = data.statementObject.getTable();

									scrollToTop && data.codeEditor.dispatch({ selection: { anchor: 0 }, scrollIntoView: true });
								} else {
									document.querySelector('body[x-data]').__x.$data.displayedTableColumns = [];
									document.querySelector('body[x-data]').__x.$data.contextName = 'QuEdit';
								}
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
				contextName: 'QuEdit',
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

					cm.resetFilterView();
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

					cm.setFilterView(this.searchTableColumnsByText);
					this.filterColumns();
				},

				clearApp() {
					this.clearButton = false;
					this.contextName = 'QuEdit';
					this.searchTableColumnsByText = '';
					this.displayedTableColumns = [];
					this.toFilterColumns = undefined;
					this.cacheSearchFilter = {};

					cm.setText('');
				}
			};
		}
	}
})();