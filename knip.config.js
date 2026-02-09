const config = {
	/**
	 * As we currently only need unused dependency checks, we disable all checks except for that
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
		"@ui5/*",
		"docdash",
		"@istanbuljs/esm-loader-hook",
		"data-with-position",
		"js-yaml",
		"open",
		"pretty-hrtime",
		"jsdoc",
	],
};

export default config;
