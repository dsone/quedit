module.exports = {
	purge: [],
	theme: {
		extend: {
			spinner: (theme) => ({
				default: {
					color: '#55B492', // primary-500 color
					size: '1em',	  // size of the spinner (used for both width and height)
					border: '2px',	  // border-width of the spinner (shouldn't be bigger than half the spinner's size)
					speed: '750ms',	  // the speed at which the spinner should rotate
				},
				bright: {
					color: '#EEF8F4', // secondary-100 color
					size: '1em',
					border: '2px',
					speed: '750ms',
				}
				// md: {
				//   color: theme('colors.red.500', 'red'),
				//   size: '2em',
				//   border: '2px',
				//   speed: '500ms',
				// },
			}),
			boxShadow: {
				default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
				sm: '0 1px 3px -1px rgba(0, 0, 0, 0.1), 0 2px 2px -1px rgba(0, 0, 0, 0.05)',
				md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
				xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				'2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
				inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
				outline: '0 0 0 3px rgba(66, 153, 225, 0.5)',
				none: 'none',
			},
			opacity: {
				'0': '0',
				'25': '0.25',
				'50': '0.5',
				'75': '0.75',
				'80': '0.8',
				'90': '0.9',
				'95': '0.95',
				'100': '1',
			},
		},
	},
	variants: {
		display: ['group-hover'],
	},
	plugins: [
		require('tailwindcss-spinner')(),
	],
}
