import { highlightSpecialChars, drawSelection, highlightActiveLine, keymap } from '@codemirror/view';
export { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
export { EditorState } from '@codemirror/state';
import { history, historyKeymap } from '@codemirror/history';
import { foldGutter, foldKeymap } from '@codemirror/fold';
import { lineNumbers } from '@codemirror/gutter';
import { defaultKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/matchbrackets';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/closebrackets';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { rectangularSelection } from '@codemirror/rectangular-selection';
import { defaultHighlightStyle } from '@codemirror/highlight';
import { lintKeymap } from '@codemirror/lint';

/// Changed basicSetup to include...
///
/// - [the default command bindings](#commands.defaultKeymap)
/// - [line numbers](#gutter.lineNumbers)
/// - [special character highlighting](#view.highlightSpecialChars)
/// - [the undo history](#history.history)
/// - [a fold gutter](#fold.foldGutter)
/// - [custom selection drawing](#view.drawSelection)
/// - [multiple selections](#state.EditorState^allowMultipleSelections)
/// - [the default highlight style](#highlight.defaultHighlightStyle) (as fallback)
/// - [bracket matching](#matchbrackets.bracketMatching)
/// - [bracket closing](#closebrackets.closeBrackets)
/// - [autocompletion](#autocomplete.autocompletion)
/// - [rectangular selection](#rectangular-selection.rectangularSelection)
/// - [active line highlighting](#view.highlightActiveLine)
/// - [selection match highlighting](#search.highlightSelectionMatches)
/// - [search](#search.searchKeymap)
/// - [linting](#lint.lintKeymap)
///
/// (You'll probably want to add some language package to your setup
/// too.)
const codeMirrorSetup = [
	lineNumbers(),
	highlightSpecialChars(),
	history(),
	foldGutter(),
	drawSelection(),
	EditorState.allowMultipleSelections.of(true),
	defaultHighlightStyle.fallback,
	bracketMatching(),
	closeBrackets(),
	autocompletion(),
	rectangularSelection(),
	highlightActiveLine(),
	highlightSelectionMatches(),
	keymap.of([
		...closeBracketsKeymap,
		...defaultKeymap,
		...searchKeymap,
		...historyKeymap,
		...foldKeymap,
		...completionKeymap,
		...lintKeymap
	])
];

export { codeMirrorSetup };