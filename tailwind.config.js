module.exports = {
	mode: 'jit',
	purge: [
		'./www/**/*.html',
		'./www/dist/js/*.js',
		'./www/src/js/**/*.js',
	],
	theme: {
		extend: {
			boxShadow: {
				DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
				sm: '0 1px 3px -1px rgba(0, 0, 0, 0.1), 0 2px 2px -1px rgba(0, 0, 0, 0.05)',
				md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
				xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				'2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
				inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
				outline: '0 0 0 3px rgba(66, 153, 225, 0.5)',
				none: 'none',
			},
			colors: {
				transparent: 'transparent',
				current: 'currentColor',

				black: '#000',
				white: '#fff',

				gray: {
					100: '#f7fafc',
					200: '#edf2f7',
					300: '#e2e8f0',
					400: '#cbd5e0',
					500: '#a0aec0',
					600: '#718096',
					700: '#4a5568',
					800: '#2d3748',
					900: '#1a202c',
				},
				red: {
					100: '#fff5f5',
					200: '#fed7d7',
					300: '#feb2b2',
					400: '#fc8181',
					500: '#f56565',
					600: '#e53e3e',
					700: '#c53030',
					800: '#9b2c2c',
					900: '#742a2a',
				},
				yellow: {
					100: '#fffff0',
					200: '#fefcbf',
					300: '#faf089',
					400: '#f6e05e',
					500: '#ecc94b',
					600: '#d69e2e',
					700: '#b7791f',
					800: '#975a16',
					900: '#744210',
				},
				green: {
					100: '#f0fff4',
					200: '#c6f6d5',
					300: '#9ae6b4',
					400: '#68d391',
					500: '#48bb78',
					600: '#38a169',
					700: '#2f855a',
					800: '#276749',
					900: '#22543d',
				},
				blue: {
					100: '#ebf8ff',
					200: '#bee3f8',
					300: '#90cdf4',
					400: '#63b3ed',
					500: '#4299e1',
					600: '#3182ce',
					700: '#2b6cb0',
					800: '#2c5282',
					900: '#2a4365',
				},
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
		padding: [ 'group-hover' ],
	},
	plugins: [
	],
}
