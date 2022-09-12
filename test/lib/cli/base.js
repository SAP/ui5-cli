import test from "ava";
import path from "path";
import execa from "execa";
import sinon from "sinon";
import chalk from "chalk";
import {fileURLToPath} from "url";
import {readFileSync} from "fs";

const pkgJsonPath = fileURLToPath(new URL("../../../package.json", import.meta.url));
const pkg = JSON.parse(readFileSync(pkgJsonPath));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ui5Cli = path.join(__dirname, "..", "..", "..", "bin", "ui5.js");
const ui5 = (args, options = {}) => execa(ui5Cli, args, options);

test.beforeEach((t) => {
	t.context.consoleLogStub = sinon.stub(console, "log");
});

test.afterEach.always(() => {
	sinon.restore();
});

test.serial("ui5 --version", async (t) => {
	const {stdout} = await ui5(["--version"]);
	t.is(stdout, `${pkg.version} (from ${ui5Cli})`);
});

test.serial("ui5 -v", async (t) => {
	const {stdout} = await ui5(["-v"]);
	t.is(stdout, `${pkg.version} (from ${ui5Cli})`);
});

test.serial("Yargs error handling", async (t) => {
	const err = await t.throwsAsync(ui5(["invalidcomands"]));

	const stdoutLines = err.stdout.split("\n");
	t.is(stdoutLines[0], "Command Failed:", "Correct first log line");
	// Error message itself originates from yargs and is therefore not asserted
	t.is(stdoutLines[stdoutLines.length - 1], `See 'ui5 --help' or 'ui5 build --help' for help`,
		"Correct last log line");

	t.is(err.exitCode, 1, "Process was exited with code 1");
});

test.serial("Exception error handling", async (t) => {
	// This test depends on the init command throwing on projects that already have a ui5.yaml

	const err = await t.throwsAsync(ui5(["init"], {
		cwd: path.join(__dirname, "..", "..", "fixtures", "init", "application")
	}));

	const stdoutLines = err.stdout.split("\n");
	t.is(stdoutLines[1], "⚠️  Process Failed With Error", "Correct error log");
	t.is(stdoutLines[3], "Error Message:", "Correct error log");
	t.is(stdoutLines[4], "Initialization not possible: ui5.yaml already exists", "Correct error log");
	t.is(stdoutLines[stdoutLines.length - 1],
		"For details, execute the same command again with an additional '--verbose' parameter",
		"Correct last log line");

	t.is(err.exitCode, 1, "Process was exited with code 1");
});

test.serial("Exception error handling with verbose logging", async (t) => {
	// This test depends on the init command throwing on projects that already have a ui5.yaml

	const err = await t.throwsAsync(ui5(["init", "--verbose"], {
		cwd: path.join(__dirname, "..", "..", "fixtures", "init", "application")
	}));

	const stdoutLines = err.stdout.split("\n");
	t.is(stdoutLines[1], "⚠️  Process Failed With Error", "Correct error log");
	t.is(stdoutLines[3], "Error Message:", "Correct error log");
	t.is(stdoutLines[4], "Initialization not possible: ui5.yaml already exists", "Correct error log");
	t.is(stdoutLines[6], "Stack Trace:", "Correct error log");
	t.is(stdoutLines[7], "Error: Initialization not possible: ui5.yaml already exists", "Correct error log");

	t.deepEqual(stdoutLines[stdoutLines.length - 1],
		"If you think this is an issue of the UI5 Tooling, you might " +
		"report it using the following URL: https://github.com/SAP/ui5-tooling/issues/new/choose",
		"Correct last log line");

	t.is(err.exitCode, 1, "Process was exited with code 1");
});

// TODO: Test succeeds but ava complains about an Unhandled rejection regarding the TypeError("Cannot do this")
// Its unclear where this happens and how it can be solved.
// yargs seems to add a .catch handler to the handler promise and then calls our .fail callback which does not
// re-throw the error.
// It has been tested manually with the CLI, and the console log output looked as expected.
test.serial.skip("Unexpected error handling", async (t) => {
	const {consoleLogStub} = t.context;

	const processExit = new Promise((resolve) => {
		const processExitStub = sinon.stub(process, "exit");
		processExitStub.callsFake((errorCode) => {
			processExitStub.restore();
			setTimeout(() => {
				resolve(errorCode);
			});
		});
	});

	const {default: base} = await import("../../lib/cli/base.js");
	const {default: yargs} = await import("yargs");

	const cli = yargs();

	base(cli);

	cli.command({
		command: "foo",
		describe: "This task fails with a TypeError",
		handler: async function() {
			process.stdout.write("handler called ");
			throw new TypeError("Cannot do this");
		}
	});

	cli.parse(["foo"]);

	const errorCode = await processExit;

	t.is(errorCode, 1, "Should exit with error code 1");
	t.deepEqual(consoleLogStub.getCall(1).args, [chalk.bold.red("⚠️  Process Failed With Error")], "Correct error log");
	t.deepEqual(consoleLogStub.getCall(3).args, [chalk.underline("Error Message:")], "Correct error log");
	t.deepEqual(consoleLogStub.getCall(4).args,
		["Cannot do this"], "Correct error log");
	t.deepEqual(consoleLogStub.getCall(6).args, [chalk.underline("Stack Trace:")], "Correct error log");
	t.is(consoleLogStub.getCall(7).args.length, 1);
	t.true(consoleLogStub.getCall(7).args[0]
		.startsWith("TypeError: Cannot do this"), "Correct error log");

	t.deepEqual(consoleLogStub.getCall(consoleLogStub.callCount - 1).args,
		[chalk.dim(
			`If you think this is an issue of the UI5 Tooling, you might report it using the ` +
			`following URL: `) +
			chalk.dim.bold.underline(`https://github.com/SAP/ui5-tooling/issues/new/choose`)],
		"Correct last log line");
});

test.serial("ui5 --no-update-notifier", async (t) => {
	const {stdout, failed} = await ui5(["versions", "--no-update-notifier"]);
	t.regex(stdout, /@ui5\/cli:/, "Output includes version information");
	t.false(failed, "Command should not fail");
});
