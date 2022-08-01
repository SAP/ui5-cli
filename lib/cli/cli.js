import updateNotifier from "update-notifier";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import version from "./version.js";
import add from "./commands/add.js";

export default async (pkg) => {
	updateNotifier({
		pkg,
		updateCheckInterval: 1000 * 60 * 60 * 24, // 1 day
		shouldNotifyInNpmScript: true
	}).notify();
	// Remove --no-update-notifier from argv as it's not known to yargs, but we still want to support using it
	const NO_UPDATE_NOTIFIER = "--no-update-notifier";
	if (process.argv.includes(NO_UPDATE_NOTIFIER)) {
		process.argv = process.argv.filter((v) => v !== NO_UPDATE_NOTIFIER);
	}


	const cli = yargs(hideBin(process.argv));
	cli.parserConfiguration({
		"parse-numbers": false
	});

	// Explicitly set CLI version as the yargs default might
	// be wrong in case a local CLI installation is used
	// Also add CLI location
	const pkgVersion = `${pkg.version} (from ${import.meta.url})`;

	version.set(pkgVersion);
	cli.version(pkgVersion);

	// Explicitly set script name to prevent windows from displaying "ui5.js"
	cli.scriptName("ui5");

	// CLI modules
	/* YError: loading a directory of commands is not supported yet for ESM
	cli.commandDir("../lib/cli/commands"); */

	cli.command(add);

	// Format terminal output to full available width
	cli.wrap(cli.terminalWidth());

	// yargs registers a get method on the argv property.
	// The property needs to be accessed to initialize everything.
	cli.argv;
};
