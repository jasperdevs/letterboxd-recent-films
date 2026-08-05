import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'coverage',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'scripts/*.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ['src/main.ts'],
		rules: {
			// Obsidian's rule treats "cursor" as the Cursor product; here it is the requested editor position.
			'obsidianmd/ui/sentence-case': 'off',
		},
	},
	{
		files: ['src/settings.ts'],
		rules: {
			// The current sample's imperative API preserves compatibility with the declared Obsidian 1.5 minimum.
			'obsidianmd/settings-tab/prefer-setting-definitions': 'off',
		},
	},
	{
		files: ['tests/**/*.ts', 'vitest.config.ts'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		rules: {
			'obsidianmd/no-nodejs-modules': 'off',
		},
	},
);
