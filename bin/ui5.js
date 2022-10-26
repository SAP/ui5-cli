#!/usr/bin/env node

// The following block should be compatible to as many Node.js versions as possible
/* eslint-disable no-var */
var pkg = require("../package.json");
var semver;
try {
	semver = require("semver");
} catch (err) {
	// SyntaxError indicates an outdated Node.js version
	if (err.name !== "SyntaxError") {
		throw err;
	}
}
var nodeVersion = process.version;
/* eslint-enable no-var */
if (
	pkg.engines && pkg.engines.node &&
	(!semver || !semver.satisfies(nodeVersion, pkg.engines.node, {includePrerelease: true}))
) {
	console.log("==================== UNSUPPORTED NODE.JS VERSION ====================");
	console.log("You are using an unsupported version of Node.js");
	console.log("Detected version " + nodeVersion + " but " + pkg.name + " requires " + pkg.engines.node);
	console.log("");
	console.log("=> Please upgrade to a supported version of Node.js to use this tool");
	console.log("=====================================================================");
	process.exit(1);
} else {
	if (semver) {
		if (semver.prerelease(nodeVersion)) {
			console.log("====================== UNSTABLE NODE.JS VERSION =====================");
			console.log("You are using an unstable version of Node.js");
			console.log("Detected Node.js version: " + nodeVersion);
			console.log("");
			console.log("=> Please note that an unstable version might cause unexpected");
			console.log("   behavior. For productive use please consider using a stable");
			console.log("   version of Node.js! For the release policy of Node.js, see");
			console.log("   https://nodejs.org/en/about/releases");
			console.log("=====================================================================");
		} else if (semver.satisfies(nodeVersion, "< 14.16 || ^15 || ^17")) {
			console.log("================ NODE.JS VERSION REACHED END OF LIFE ================");
			console.log("You are using a version of Node.js that reached its end of life, see:");
			console.log("https://github.com/nodejs/release#end-of-life-releases");
			console.log("");
			console.log("Detected Node.js version: " + nodeVersion);
			console.log("");
			console.log("There might also be a newer version of @ui5/cli available at:");
			console.log("https://www.npmjs.com/package/@ui5/cli");
			console.log("");
			console.log("=> Please upgrade to a supported version of Node.js and make sure to");
			console.log("   use the latest version of @ui5/cli");
			console.log("=====================================================================");
		}
	}
	// Timeout is required to log info when importing from local installation
	setTimeout(async () => {
		if (!process.env.UI5_CLI_NO_LOCAL) {
			const importLocal = require("import-local");
			// Prefer a local installation of @ui5/cli.
			// This will invoke the local CLI, so no further action required
			if (importLocal(__filename)) {
				if (process.argv.includes("--verbose")) {
					console.info(`INFO: This project contains an individual ${pkg.name} installation which ` +
					"will be used over the global one.");
					console.info("See https://github.com/SAP/ui5-cli#local-vs-global-installation for details.");
					console.info("");
				} else {
					console.info(`INFO: Using local ${pkg.name} installation`);
					console.info("");
				}
				return;
			}
		}

		// Only import update-notifier when it's not disabled
		// See https://github.com/yeoman/update-notifier/blob/3046d0f61a57f8270291b6ab271f8a12df8421a6/update-notifier.js#L57-L60
		// The "is-ci" check is not executed, but will be checked by update-notifier itself then
		const NO_UPDATE_NOTIFIER = "--no-update-notifier";
		const disableUpdateNotifier =
			"NO_UPDATE_NOTIFIER" in process.env ||
			process.env.NODE_ENV === "test" ||
			process.argv.includes(NO_UPDATE_NOTIFIER);

		// Update notifier requires dynamic imports (ES Module) and therefore is loaded via a separate file
		if (
			!disableUpdateNotifier &&

			// Check for minimum supported Node.js version of update-notifier v6
			// See https://github.com/yeoman/update-notifier/blob/3046d0f61a57f8270291b6ab271f8a12df8421a6/package.json#L16
			semver.satisfies(nodeVersion, ">=14.16", {includePrerelease: true})
		) {
			const updateNotifier = require("../lib/cli/update-notifier");
			await updateNotifier({pkg});
		}
		// Remove --no-update-notifier from argv as it's not known to yargs, but we still want to support using it
		if (process.argv.includes(NO_UPDATE_NOTIFIER)) {
			process.argv = process.argv.filter((v) => v !== NO_UPDATE_NOTIFIER);
		}

		const cli = require("yargs");

		cli.parserConfiguration({
			"parse-numbers": false
		});

		// Explicitly set CLI version as the yargs default might
		// be wrong in case a local CLI installation is used
		// Also add CLI location
		const version = `${pkg.version} (from ${__filename})`;
		require("../lib/cli/version").set(version);
		cli.version(version);

		// Explicitly set script name to prevent windows from displaying "ui5.js"
		cli.scriptName("ui5");

		// CLI modules
		cli.commandDir("../lib/cli/commands");

		// Format terminal output to full available width
		cli.wrap(cli.terminalWidth());

		// yargs registers a get method on the argv property.
		// The property needs to be accessed to initialize everything.
		cli.argv;
	}, 0);
}
