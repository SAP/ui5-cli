const {nodeResolve} = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const json = require("@rollup/plugin-json");

module.exports = {
	input: "./bin/ui5.js",
	output: [
		{
			file: "./bin-dist/ui5.js",
			format: "cjs",
			exports: "default"
		}
	],
	plugins: [
		nodeResolve(),
		commonjs({
			ignore: [
				// Dynamic require statements / import-lazy
				"import-local",
				"update-notifier",

				// Strange runtime error
				"readable-stream",

				// Contain circular dependencies
				"yargs",
				"semver"
			],
			dynamicRequireTargets: [
				// See bin/ui5.js: cli.commandDir("../lib/cli/commands");
				"./lib/cli/commands/*"
			]
		}),
		json()
	],
	external: [
		// Native Node.js modules
		"path", "child_process", "util", "fs", "module", "assert",
		"os", "tty", "events", "stream", "buffer"
	]
};
