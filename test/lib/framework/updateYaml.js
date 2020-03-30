const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");

const fs = require("fs");
const path = require("path");

let updateYaml;

test.beforeEach((t) => {
	t.context.fsReadFileStub = sinon.stub(fs, "readFile");
	t.context.fsWriteFileStub = sinon.stub(fs, "writeFile").yieldsAsync(null);

	updateYaml = mock.reRequire("../../../lib/framework/updateYaml");
});

test.afterEach.always(() => {
	mock.stopAll();
	sinon.restore();
});

test.serial("Should update single document", async (t) => {
	t.context.fsReadFileStub.yieldsAsync(null, `
metadata:
  name: my-project
framework:
  name: SAPUI5
  version: 1.0.0
`);

	await updateYaml({
		project: {
			path: "my-project",
			metadata: {"name": "my-project"}
		},
		data: {
			framework: {
				name: "OpenUI5",
				version: "1.76.0"
			}
		}
	});

	t.is(t.context.fsWriteFileStub.callCount, 1, "fs.writeFile should be called once");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[0], path.join("my-project", "ui5.yaml"),
		"writeFile should be called with expected path");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[1], `
metadata:
  name: my-project
framework:
  name: OpenUI5
  version: "1.76.0"
`, "writeFile should be called with expected content");
});

test.serial("Should update first document", async (t) => {
	t.context.fsReadFileStub.yieldsAsync(null, `
specVersion: "2.0"
metadata:
  name: my-project
framework:
  name: SAPUI5
  version: 1.0.0
---
specVersion: "1.0"
kind: extension
metadata:
  name: my-extension
type: project-shim
shims:
  configurations: {}
`);

	await updateYaml({
		project: {
			path: "my-project",
			metadata: {"name": "my-project"}
		},
		data: {
			framework: {
				name: "OpenUI5",
				version: "1.76.0"
			}
		}
	});

	t.is(t.context.fsWriteFileStub.callCount, 1, "fs.writeFile should be called once");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[0], path.join("my-project", "ui5.yaml"),
		"writeFile should be called with expected path");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[1], `
specVersion: "2.0"
metadata:
  name: my-project
framework:
  name: OpenUI5
  version: "1.76.0"
---
specVersion: "1.0"
kind: extension
metadata:
  name: my-extension
type: project-shim
shims:
  configurations: {}
`, "writeFile should be called with expected content");
});


test.serial("Should update second document", async (t) => {
	t.context.fsReadFileStub.yieldsAsync(null, `
specVersion: "1.0"
kind: extension
metadata:
  name: my-extension
type: project-shim
shims:
  configurations: {}
framework:
  name: SAPUI5
  version: 1.0.0
---
specVersion: "2.0"
metadata:
  name: my-project
framework:
  name: SAPUI5
  version: 1.0.0
`);

	await updateYaml({
		project: {
			path: "my-project",
			metadata: {"name": "my-project"}
		},
		data: {
			framework: {
				name: "OpenUI5",
				version: "1.76.0"
			}
		}
	});

	t.is(t.context.fsWriteFileStub.callCount, 1, "fs.writeFile should be called once");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[0], path.join("my-project", "ui5.yaml"),
		"writeFile should be called with expected path");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[1], `
specVersion: "1.0"
kind: extension
metadata:
  name: my-extension
type: project-shim
shims:
  configurations: {}
framework:
  name: SAPUI5
  version: 1.0.0
---
specVersion: "2.0"
metadata:
  name: my-project
framework:
  name: OpenUI5
  version: "1.76.0"
`, "writeFile should be called with expected content");
});


test.serial("Should add new object to document", async (t) => {
	t.context.fsReadFileStub.yieldsAsync(null, `
metadata:
  name: my-project`);

	await updateYaml({
		project: {
			path: "my-project",
			metadata: {"name": "my-project"}
		},
		data: {
			framework: {
				name: "OpenUI5",
				version: "1.76.0"
			}
		}
	});

	t.is(t.context.fsWriteFileStub.callCount, 1, "fs.writeFile should be called once");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[0], path.join("my-project", "ui5.yaml"),
		"writeFile should be called with expected path");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[1], `
metadata:
  name: my-project
framework:
  name: OpenUI5
  version: "1.76.0"

`, "writeFile should be called with expected content");
});

test.serial("Should add new property to document", async (t) => {
	t.context.fsReadFileStub.yieldsAsync(null, `
metadata:
  name: my-project
framework:
  name: OpenUI5
`);

	await updateYaml({
		project: {
			path: "my-project",
			metadata: {"name": "my-project"}
		},
		data: {
			framework: {
				name: "OpenUI5",
				version: "1.76.0"
			}
		}
	});

	t.is(t.context.fsWriteFileStub.callCount, 1, "fs.writeFile should be called once");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[0], path.join("my-project", "ui5.yaml"),
		"writeFile should be called with expected path");
	t.deepEqual(t.context.fsWriteFileStub.getCall(0).args[1], `
metadata:
  name: my-project
framework:
  name: OpenUI5
  version: "1.76.0"
`, "writeFile should be called with expected content");
});


test.serial("Should validate YAML before writing file", async (t) => {
	t.context.fsReadFileStub.yieldsAsync(null, `
metadata:
  name: my-project
framework: { name: "SAPUI5" }
`); // Using JSON object notation is currently not supported

	const error = await t.throwsAsync(updateYaml({
		project: {
			path: "my-project",
			metadata: {"name": "my-project"}
		},
		data: {
			framework: {
				name: "SAPUI5",
				version: "1.76.0"
			}
		}
	}));

	t.is(error.message,
		"Failed to update YAML file: bad indentation of a mapping entry in \"my-project/ui5.yaml\" at line 5, column 14:\n" +
		"                 version: \"1.76.0\"\n" +
		"                 ^"
	);
	t.is(t.context.fsWriteFileStub.callCount, 0, "fs.writeFile should not be called");
});
