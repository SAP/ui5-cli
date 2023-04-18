import test from "ava";
import sinon from "sinon";
import esmock from "esmock";
const {default: fs} = await import("graceful-fs");

function getDefaultArgv() {
	// This has been taken from the actual argv object yargs provides
	return {
		"_": ["build"],
		"loglevel": "info",
		"log-level": "info",
		"logLevel": "info",
		"perf": false,
		"silent": false,
		"include-all-dependencies": false,
		"all": false,
		"a": false,
		"includeAllDependencies": false,
		"create-build-manifest": false,
		"createBuildManifest": false,
		"dest": "./dist",
		"clean-dest": false,
		"cleanDest": false,
		"experimental-css-variables": false,
		"experimentalCssVariables": false,
		"$0": "ui5"
	};
}

test.beforeEach(async (t) => {
	t.context.argv = getDefaultArgv();

	t.context.builder = sinon.stub().resolves();
	t.context.consoleLog = sinon.stub(console, "log");
	t.context.promisifyStub = sinon.stub();

	t.context.promisifyStub
		.withArgs(fs.readFile)
		.returns(() => JSON.stringify({mavenSnapshotEndpointUrl: "__url__"}));

	t.context.promisifyStub.withArgs(fs.writeFile).returns(() => {});

	t.context.config = await esmock.p("../../../../lib/cli/commands/config.js", {
		"node:util": {
			"promisify": t.context.promisifyStub
		},
	});
});

test.afterEach.always((t) => {
	sinon.restore();
	esmock.purge(t.context.config);
});

test.serial("ui5 config list", async (t) => {
	const {config, argv, consoleLog} = t.context;

	argv["_"] = ["list"];
	await config.handler(argv);

	t.true(consoleLog.getCall(0).args[0].startsWith("Listing properties from "), "Lists properties via console.log");
});

test.serial("ui5 config get", async (t) => {
	const {config, argv, consoleLog} = t.context;

	argv["_"] = ["get"];
	argv["key"] = "mavenSnapshotEndpointUrl";
	await config.handler(argv);

	t.true(
		consoleLog.getCall(0)
			.args[0].startsWith("Getting property "),
		"Getting key from config file"
	);
});

test.serial("ui5 config set", async (t) => {
	const {config, argv, consoleLog} = t.context;

	argv["_"] = ["set"];
	argv["key"] = "mavenSnapshotEndpointUrl";
	argv["value"] = "https://_snapshot_endpoint_";
	await config.handler(argv);

	t.true(
		consoleLog.getCall(0)
			.args[0].startsWith("Set property "),
		"Setting value into file"
	);
});

test.serial("ui5 config set empty value should delete", async (t) => {
	const {config, argv, consoleLog} = t.context;

	argv["_"] = ["set"];
	argv["key"] = "mavenSnapshotEndpointUrl";
	argv["value"] = "";
	await config.handler(argv);

	t.true(
		consoleLog.getCall(0)
			.args[0].startsWith("Set property "),
		"Setting value into file"
	);
});

test.serial("ui5 config invalid key", async (t) => {
	const {config, argv} = t.context;

	argv["_"] = ["set"];
	argv["key"] = "_invalid_key_";
	argv["value"] = "https://_snapshot_endpoint_";

	await t.throwsAsync(config.handler(argv), {
		message:
			"The provided key is not part of the .ui5rc allowed options: mavenSnapshotEndpointUrl",
	});
});

