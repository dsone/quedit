import 'alpinejs';
import Notify from './components/Notify';
import Statement from './components/Statement';
import Modal from './components/Modal';

import { EditorState, EditorView, codeMirrorSetup } from "./components/CodeMirrorSetup";
import { StateField } from '@codemirror/state';
import { showTooltip } from "@codemirror/tooltip";

window.notify = Notify;
window.App = (function() {
	return new function() {
		this.start = (fileSelector, filterSelector, codeInput, modalTemplateRemove, modalTemplateAdd) => {
			let data = {
				codeEditor: undefined,
				statement: new Statement({ notification: Notify }),
				statementObject: undefined,
				tableColumns: [ ],
				filterText: false,		// bool, on selectColumn this is true, then the CM change plugin below sets the cm text to the values
				filteredView: false,	// name of column to filter by
				resetFilter: false,
				editorDirty: false,		// when user switches the column tables a lot and changes values - make content of editor dirty->need to set column values, editor is dirty when this value is !== false, it gets the changed column
				modalRemove: new Modal({ template: document.querySelector(modalTemplateRemove) }),
				modalAdd: new Modal({
						template: document.querySelector(modalTemplateAdd), 
						// this is the config object in the context of these callbacks 
						onShow: function() {
							this.domModal.querySelector('.js-input').value = '';
							this.domModal.querySelector('.js-input-2').value = '';
							this.domModal.querySelector('.js-input').focus();
						},
						onConfirm: function() {
							let newColumnName = this.domModal.querySelector('.js-input').value;
							let nonEmptyAndAvailable = newColumnName !== '';
							if (!nonEmptyAndAvailable) {
								this.domModal.querySelector('.js-input').focus();
							}

							if (data.statementObject.isColumnAvailable(newColumnName)) {
								nonEmptyAndAvailable = false;
								this.domModal.querySelector('.js-input').focus();
								notify.danger('Add column failed', 'The name is already in use');
							}

							return nonEmptyAndAvailable;
						},
						onResolve: function(accepted) {
							return [ accepted, this.domModal.querySelector('.js-input').value, this.domModal.querySelector('.js-input-2').value ];
						}
					}),
			};

			let cm = {
				setText: text => {
					data.codeEditor.dispatch({
						changes: { from: 0, to: data.codeEditor.state.doc.length, insert: text }
					});
				},
				getCurrentLine: () => data.codeEditor.state.doc.lineAt(data.codeEditor.state.selection.main.head),
				getCaretPosition: () => data.codeEditor.state.selection.main.head,
				setCaretPosition: offset => data.codeEditor.dispatch({ selection: { anchor: offset }, scrollIntoView: true }),
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

							notify.warning('Update values failed', 'Reverting last changes');
						}

						data.editorDirty = false;
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
							} else if (data.filterText) {  // filter view, do not re-analyze, user clicks different columns
								data.filterText = false;
								if (data.editorDirty !== false) {
									if (!data.statementObject.updateValues(data.editorDirty[0], data.editorDirty[1])) {
										notify.warning('Update values failed', 'Reverting last changes');
									}
									data.editorDirty = false;
								}
							} else if (!!data.filteredView) {  // values are displayed for a given column and user edits values of a column
								// User changed a value, make editorDirty by remembering what column was changed
								// if user clicks on another column to filter by, the above data.filtertext is triggered
								// if user resets the filter by clicking active column, the cm.resetFilterView is invoked dealing with the update of values
								data.editorDirty = [ data.filteredView, data.codeEditor.state.doc.toJSON() ];
							} else {  // normal view - text changed, analyze content
								let scrollToTop = !(!!data.statementObject);  // when previously a valid doc existed - do not scroll to top
								data.statementObject = data.statement.createObject(transaction.newDoc.toJSON().join(''));
								if (data.statementObject) {
									data.tableColumns = data.statementObject.getColumns();
									console.log(data.tableColumns);

									// outside of alpine this is a hacky way of accessing data
									document.querySelector('body[x-data]').__x.$data.displayedTableColumns = data.tableColumns.slice(0);
									document.querySelector('body[x-data]').__x.$data.contextName = data.statementObject.getTable();

									scrollToTop && transaction.newDoc.toJSON().length > 27 && data.codeEditor.dispatch({ selection: { anchor: 0 }, scrollIntoView: true });
								} else {
									document.querySelector('body[x-data]').__x.$data.displayedTableColumns = [];
									document.querySelector('body[x-data]').__x.$data.contextName = 'QuEdit';
								}
							}
						}, 500);
					}

					return null;
				},
			});

			let toRemoveTooltip = undefined;
			let getCursorTooltips = state => {
				return state.selection.ranges.filter(range => range.empty).map(range => {
					let line = state.doc.lineAt(range.head);
					if (line.number > 1 && data.statementObject) {
						let posOnLine = range.head - line.from;
						let column = data.statementObject.getColumnAtPosition(posOnLine, line.text);
						if (column !== false) {
							clearTimeout(toRemoveTooltip);
							toRemoveTooltip = setTimeout(() => {
								try {
									document.querySelector('.cm-cursor-tooltip').remove();
								} catch (e) {
									//
								}
							}, 500);

							return {
								pos: range.head,
								above: true,
								strictSide: true,
								class: 'cm-cursor-tooltip',
								create: () => {
									let dom = document.createElement('div');
									dom.textContent = column;
									return { dom };
								}
							}
						}
					}

					return false;
				});
			};
			const tooltipExtension = StateField.define({
				// we won't use the actual StateField value, null or undefined is fine
				create: getCursorTooltips,
				update(tooltips, tr) {
					if (!tr.docChanged && !tr.selection) {
						return tooltips;
					}

					return getCursorTooltips(tr.state);
				},
				provide: f => showTooltip.computeN([f], state => state.field(f))
			});

			// Create CodeEditor instance
			data.codeEditor = new EditorView({
				state: EditorState.create({
					extensions: [ codeMirrorSetup, listenChangesExtension, tooltipExtension ],
					lineWrapping: true,
				}),
				parent: document.querySelector(codeInput)
			});

			return {
				// options
				clearButton: false,

				// x-text
				contextName: 'QuEdit',
				searchTableColumnsByText: '',	// Text to filter tableColumns by
				selectedColumn: '',				// a selected column to display the values for

				displayedTableColumns: [ ],		// List of the displayed table columns, manipulated by searchTableColumnsByText

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
						notify.danger('File too large', 'You can only open files up too 250 MiB size.');
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
							this.clearButton = false;

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
					if (column === this.selectedColumn) {
						this.selectedColumn = '';
						cm.resetFilterView();
						return;
					}

					this.selectedColumn = column;
					cm.setFilterView(this.selectedColumn);
				},

				/**
				 * Trashicon on a column was selected.
				 * Only available if data.statementObject is a valid instance.
				 * 
				 * @param	string	column		The column to remove.
				 */
				removeValuesByColumn(column) {
					if (data.tableColumns.length === 1) {
						notify.warning('Warning', `At least 1 column must be present, or your statement becomes invalid!`);
						return;
					}
					data.modalRemove.confirm(column).then((accepted) => {
						if (accepted) {
							let newColumns;

							if (newColumns = data.statementObject.removeColumn(column)) {
								data.tableColumns = newColumns;
								this.displayedTableColumns = data.tableColumns.slice(0);

								this.cacheSearchFilter = {};  // reset or deleted column might be displayed
								notify.success('Deleted', `'${ column }' was removed.`);
							} else {
								notify.danger('Error', `${ column } could not be removed, reverting.`);
							}

							data.resetFilter = true;  // trick codeEditor in not doing double the work
							cm.setText(data.statementObject.assemble());
						}
					});
				},

				addColumn() {
					if (this.selectedColumn.length > 0) { return; }

					data.modalAdd.show().then(param => {
						if (param[0] === true) {
							let oldStatement = data.statementObject.assemble();
							if (data.statementObject.addColumn(param[1], param[2])) {
								let statement = data.statementObject.assemble();
								if (statement !== undefined) {
									// reset existing filter
									if (this.searchTableColumnsByText.length > 0) {
										this.clearFilter();
									}

									// use new insert text for CM
									cm.setText(statement);
									return;
								}
							}

							cm.setText(oldStatement);
						}
					});
				},

				clearApp() {
					this.clearButton = false;
					this.contextName = 'QuEdit';
					this.searchTableColumnsByText = '';
					this.selectedColumn = '';
					this.displayedTableColumns = [];
					this.toFilterColumns = undefined;
					this.cacheSearchFilter = {};

					data.statementObject = undefined;
					data.tableColumns = [ ];
					data.filterText = false;
					data.filteredView = false;
					data.resetFilter = false;
					data.editorDirty = false;

					cm.setText('');
				}
			};
		}
	}
})();