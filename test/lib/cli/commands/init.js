const {test} = require("ava");
const sinon = require("sinon");
const initCommand = require("../../../../lib/cli/commands/init");
const fsHelper = require("../../../../lib/utils/fsHelper");
const path = require("path");
const promisify = require("util").promisify;
const init = require("../../../../lib/init/init");
const jsYaml = require("js-yaml");
const fs = require("fs");

test.serial("Writes ui5.yaml to fs", async (t) => {
	const ui5YamlPath = "./ui5.yaml";
	const ui5Yaml = `
	specVersion: '0.1'
	metadata:
	name: sample-app
	type: application`;

	const pathStub = sinon.stub(path, "resolve").returns(ui5YamlPath);
	const fsHelperStub = sinon.stub(fsHelper, "exists").resolves(false);
	const initStub = sinon.stub(init, "init").resolves({});
	const safeDumpYamlStub = sinon.stub(jsYaml, "safeDump").returns(ui5Yaml);
	const fsWriteFileStub = sinon.stub(fs, "writeFile").callsArgWith(2);
	const lazyRequireStub = sinon.stub(initCommand, "lazyRequireDependencies").returns({
		fsHelper: fsHelper,
		init: init,
		promisify: promisify,
		path: path,
		fs: fs,
		jsYaml: jsYaml
	});

	await initCommand.handler({});

	t.is(fsWriteFileStub.getCall(0).args[0], ui5YamlPath, "Passes yaml path to write the yaml file to");
	t.is(fsWriteFileStub.getCall(0).args[1], ui5Yaml, "Passes yaml content to write to fs");

	fsHelperStub.restore();
	pathStub.restore();
	initStub.restore();
	safeDumpYamlStub.restore();
	fsWriteFileStub.restore();
	lazyRequireStub.restore();
});

// FIXME: stubbing process leads to errors, need to be fixed
// test.serial("Error: throws if ui5.yaml already exists", async (t) => {
// 	const fileExistsStub = sinon.stub(fsHelper, "exists").resolves(true);
// 	const processExitStub = sinon.stub(process, "exit");

// 	await initCommand.handler();
// 	t.is(processExitStub.getCall(0).args[0], 1, "killed process on error using process.exit(1)");

// 	fileExistsStub.restore();
// 	processExitStub.restore();
// });
