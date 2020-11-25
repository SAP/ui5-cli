const test = require("ava");
const path = require("path");
const execa = require("execa");
const sinon = require("sinon");
const pkg = require("../../../../package.json");
const ui5Cli = path.join(__dirname, "..", "..", "..", "..", "bin", "ui5.js");
const ui5 = (args, options = {}) => execa(ui5Cli, args, options);

test.beforeEach((t) => {
	t.context.consoleLogStub = sinon.stub(console, "log");
	t.context.processExitStub = sinon.stub(process, "exit");
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
	t.deepEqual(stdoutLines[0], "Command Failed:", "Correct first log line");
	// Error message itself originates from yargs and is therefore not asserted
	t.deepEqual(stdoutLines[stdoutLines.length - 1], `See 'ui5 --help' or 'ui5 build --help' for help`,
		"Correct last log line");

	t.deepEqual(err.exitCode, 1, "Process was exited with code 1");
});

test.serial("Exception error handling", async (t) => {
	// This test depends on the init command throwing on projects that already have a ui5.yaml

	const err = await t.throwsAsync(ui5(["init"], {
		cwd: path.join(__dirname, "..", "..", "..", "fixtures", "init", "application")
	}));

	const stdoutLines = err.stdout.split("\n");
	t.deepEqual(stdoutLines[1], "⚠️  Process Failed With Error", "Correct error log");
	t.deepEqual(stdoutLines[3], "Error Message:", "Correct error log");
	t.deepEqual(stdoutLines[4], "Initialization not possible: ui5.yaml already exists", "Correct error log");
	t.deepEqual(stdoutLines[stdoutLines.length - 1],
		"For details, execute the same command again with an additional '--verbose' parameter",
		"Correct last log line");

	t.deepEqual(err.exitCode, 1, "Process was exited with code 1");
});

test.serial("Exception error handling with verbose logging", async (t) => {
	// This test depends on the init command throwing on projects that already have a ui5.yaml

	const err = await t.throwsAsync(ui5(["init", "--verbose"], {
		cwd: path.join(__dirname, "..", "..", "..", "fixtures", "init", "application")
	}));

	const stdoutLines = err.stdout.split("\n");
	t.deepEqual(stdoutLines[1], "⚠️  Process Failed With Error", "Correct error log");
	t.deepEqual(stdoutLines[3], "Error Message:", "Correct error log");
	t.deepEqual(stdoutLines[4], "Initialization not possible: ui5.yaml already exists", "Correct error log");
	t.deepEqual(stdoutLines[6], "Stack Trace:", "Correct error log");
	t.deepEqual(stdoutLines[7], "Error: Initialization not possible: ui5.yaml already exists", "Correct error log");

	t.deepEqual(stdoutLines[stdoutLines.length - 1],
		"If you think this is an issue of the UI5 Tooling, you might " +
		"report it using the following URL: https://github.com/SAP/ui5-tooling/issues/new/choose",
		"Correct last log line");

	t.deepEqual(err.exitCode, 1, "Process was exited with code 1");
});

test.serial.cb("Unexpected error handling", (t) => {
	const {consoleLogStub, processExitStub} = t.context;

	require("../../../../lib/cli/commands/base");
	const yargs = require("yargs");

	yargs.command("foo", "This task fails with a TypeError", () => {}, async () => {
		null.foo(); // Causes a TypeError
	});

	processExitStub.callsFake(() => {
		try {
			t.deepEqual(consoleLogStub.getCall(1).args, ["⚠️  Process Failed With Error"], "Correct error log");
			t.deepEqual(consoleLogStub.getCall(3).args, ["Error Message:"], "Correct error log");
			t.deepEqual(consoleLogStub.getCall(4).args,
				["Cannot read property 'foo' of null"], "Correct error log");
			t.deepEqual(consoleLogStub.getCall(6).args, ["Stack Trace:"], "Correct error log");
			t.is(consoleLogStub.getCall(7).args.length, 1);
			t.true(consoleLogStub.getCall(7).args[0]
				.startsWith("TypeError: Cannot read property 'foo' of null\n"), "Correct error log");

			t.deepEqual(consoleLogStub.getCall(consoleLogStub.callCount - 1).args,
				["If you think this is an issue of the UI5 Tooling, you might " +
				"report it using the following URL: https://github.com/SAP/ui5-tooling/issues/new/choose"],
				"Correct last log line");

			t.deepEqual(processExitStub.getCall(0).args, [1], "Process was exited with code 1");

			t.end();
		} catch (err) {
			t.end(err);
		}
	});

	yargs.parse(["foo"]);
});

test.serial("ui5 --no-update-notifier", async (t) => {
	const {stdout, failed} = await ui5(["versions", "--no-update-notifier"]);
	t.regex(stdout, /@ui5\/cli:/, "Output includes version information");
	t.false(failed, "Command should not fail");
});
