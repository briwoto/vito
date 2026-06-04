// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.ts'],
		rules: {
			// Tab indentation
			'indent': ['error', 'tab'],

			// Mandatory type hints
			'@typescript-eslint/explicit-function-return-type': ['error', {
				allowExpressions: false,
				allowTypedFunctionExpressions: false,
			}],
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/typedef': ['error', {
				arrowParameter: true,
				memberVariableDeclaration: true,
				parameter: true,
				propertyDeclaration: true,
			}],
		},
	},
	{
		ignores: ['node_modules/**', 'dist/**', 'playwright-report/**', 'test-results/**', 'features/**/*.spec.js'],
	},
);
