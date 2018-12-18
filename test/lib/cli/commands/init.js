const {test} = require("ava");
const sinon = require("sinon");
const initCommand = require("../../../../lib/cli/commands/init");
const path = require("path");
// const init = require("../../../../lib/init/init");
// const jsYaml = require("js-yaml");
// const fs = require("fs");

test.serial("ui5.yaml exists", async (t) => {
	const bExists = await initCommand.fileExists(
		path.join("test", "fixtures", "init", "application", "ui5.yaml")
	);
	t.is(bExists, true, "ui5.yaml was found");
});

// test.serial("Writes ui5.yaml to fs", async (t) => {
// 	const pathResolveStub = sinon.stub(path, "resolve").resolves("project/ui5.yaml");
// 	const fileExistsStub = sinon.stub(initCommand, "fileExists").resolves(false);
// 	const initStub = sinon.stub(init, "init").resolves(true);
// 	const safeDumpYamlStub = sinon.stub(jsYaml, "safeDump").resolves("specVersion: 0");
// 	const fsWriteFileStub = sinon.stub(fs, "writeFile").resolves(true);

// 	await initCommand.handler();
// 	t.is(fsWriteFileStub.getCall(0).args, "bla", "Writes ui5.yaml to fs");

// 	fileExistsStub.restore();
// 	pathResolveStub.restore();
// 	initStub.restore();
// 	safeDumpYamlStub.restore();
// 	fsWriteFileStub.restore();
// });

test.serial("Error: throws if ui5.yaml already exists", async (t) => {
	const fileExistsStub = sinon.stub(initCommand, "fileExists").resolves(true);
	const processExitStub = sinon.stub(process, "exit");

	await initCommand.handler();
	t.is(processExitStub.getCall(0).args[0], 1, "killed process on error using process.exit(1)");

	fileExistsStub.restore();
	processExitStub.restore();
});
