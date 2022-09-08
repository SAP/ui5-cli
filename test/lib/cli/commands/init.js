import test from "ava";
import sinon from "sinon";
import initCommand from "../../../../lib/cli/commands/init";
import fsHelper from "../../../../lib/utils/fsHelper";
import init from "../../../../lib/init/init";
import esmock from "esmock";
import jsYaml from "js-yaml";
import fs from "fs";

test.afterEach.always((t) => {
	sinon.restore();
});

test.serial("Writes ui5.yaml to fs", async (t) => {
	const ui5YamlPath = "./ui5.yaml";
	const ui5Yaml = `
	specVersion: '0.1'
	metadata:
	name: sample-app
	type: application`;

	mock("path", {resolve: () => ui5YamlPath});
	sinon.stub(fsHelper, "exists").resolves(false);
	sinon.stub(init, "init").resolves({});
	sinon.stub(jsYaml, "dump").returns(ui5Yaml);
	const fsWriteFileStub = sinon.stub(fs, "writeFile").callsArgWith(2);

	await initCommand.handler({});

	t.is(fsWriteFileStub.getCall(0).args[0], ui5YamlPath, "Passes yaml path to write the yaml file to");
	t.is(fsWriteFileStub.getCall(0).args[1], ui5Yaml, "Passes yaml content to write to fs");
});

test.serial("Error: throws if ui5.yaml already exists", async (t) => {
	sinon.stub(fsHelper, "exists").resolves(true);

	await t.throwsAsync(initCommand.handler(), {
		message: "Initialization not possible: ui5.yaml already exists"
	});
});
