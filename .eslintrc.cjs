module.exports = {
	root: true,
	env: {
		node: true,
		es2022: true,
	},
	extends: ['@10up/eslint-config/node'],
	parserOptions: {
		sourceType: 'module',
	},
	settings: {
		'import/resolver': {
			node: {
				extensions: ['.js', '.mjs'],
			},
		},
	},
	rules: {
		'import/extensions': [
			'error',
			'always',
			{
				js: 'always',
				mjs: 'always',
			},
		],
	},
};
