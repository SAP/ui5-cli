const config = {
	/**
	 * We only need dependency checking at the moment,
	 * so all checks except for dependencies are turned off.
	 */
	rules: {
		files: "off",
		duplicates: "off",
		classMembers: "off",
		unlisted: "off",
		binaries: "off",
		unresolved: "off",
		catalog: "off",
		exports: "off",
		types: "off",
		enumMembers: "off",
	},

	ignoreDependencies: [
		/**
		 * The package.json files of all @ui5/* packages are dynamically required for the "version" command
		 * (See packages/cli/lib/cli/commands/versions.js)
		 * Only @ui5/fs is not used anywhere else in the CLI package, so we need to ignore it here
		 */
		"@ui5/fs",

		/**
		 * Used as jsdoc template in package.json script, which is not detected
		 */
		"docdash",

		/**
		 * Used via nyc ava --node-arguments="--experimental-loader=@istanbuljs/esm-loader-hook"
		 * which is not detected by knip as a usage of this package
		 */
		"@istanbuljs/esm-loader-hook"
	],

	entry: ["lib/cli/commands/*.js", "lib/framework/*.js"]
};

export default config;
