const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");
const fsHelper = require("../../../../lib/utils/fsHelper");
const init = require("../../../../lib/init/init");
const jsYaml = require("js-yaml");
const fs = require("fs");
const createFramework = require("../../../../lib/framework/create");

const ui5Yaml = `
	specVersion: '0.1'
	metadata:
	name: sample-app
	type: application`;

const ui5YamlPath = "./ui5.yaml";
const webappPath = "./webapp";

test.beforeEach((t) => {
	t.context.fsHelperStub = sinon.stub(fsHelper, "exists");
	t.context.safeDumpYamlStub = sinon.stub(jsYaml, "safeDump").returns(ui5Yaml);
	t.context.fsWriteFileStub = sinon.stub(fs, "writeFile");

	t.context.consoleLogStub = sinon.stub(console, "log");
});

test.afterEach.always(() => {
	mock.stopAll();
	sinon.restore();
});

test.serial("Writes ui5.yaml to fs with manifest, type application", async (t) => {
	const {fsHelperStub, fsWriteFileStub, consoleLogStub} = t.context;

	const expectedConsoleLog = [
		`Wrote ui5.yaml to ${ui5YamlPath}:\n`,
		ui5Yaml
	];
	const projectConfig = {
		type: "application"
	};

	fsHelperStub.withArgs(ui5YamlPath).resolves(false);
	fsHelperStub.withArgs(`${webappPath}/manifest.json`).resolves(false);
	fsWriteFileStub.callsArgWith(2);
	sinon.stub(init, "init").resolves(projectConfig);
	const frameworkCreateManifestStub = sinon.stub(createFramework, "createManifest");

	mock("path", {resolve: (path) => {
		if (path == "./ui5.yaml") {
			return ui5YamlPath;
		} else if (path == "./webapp") {
			return webappPath;
		}
		return undefined;
	}});

	const initCommand = mock.reRequire("../../../../lib/cli/commands/init");

	await initCommand.handler({
		namespace: "my.app"
	});

	t.is(frameworkCreateManifestStub.callCount, 1, "Create Manifest function should be called");
	t.deepEqual(frameworkCreateManifestStub.getCall(0).args, [
		{
			namespace: "my.app",
			project: projectConfig,
			savePath: webappPath
		}
	], "Create function should be called with expected args");

	t.is(fsWriteFileStub.getCall(0).args[0], ui5YamlPath, "Passes yaml path to write the yaml file to");
	t.is(fsWriteFileStub.getCall(0).args[1], ui5Yaml, "Passes yaml content to write to fs");

	t.is(consoleLogStub.callCount, 2,
		"console.log should be called 2 times");
	expectedConsoleLog.forEach((expectedLog, i) => {
		t.deepEqual(t.context.consoleLogStub.getCall(i).args, [expectedLog],
			"console.log should be called with expected string on call index " + i);
	});
});

test.serial("Error: throws if ui5.yaml already exists", async (t) => {
	const {fsHelperStub} = t.context;
	fsHelperStub.resolves(true);

	const initCommand = mock.reRequire("../../../../lib/cli/commands/init");
	await t.throwsAsync(initCommand.handler(), {
		message: "Initialization not possible: ui5.yaml already exists"
	});
});
