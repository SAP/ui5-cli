const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");
const fsHelper = require("../../../lib/utils/fsHelper");
const fs = require("fs");

async function assertCreate(t, {name, metaInformation, project, expectedMessage, expectedPath,
	expectedOutput, expectedCallCount}) {
	const {fsWriteFileStub} = t.context;
	const {create} = mock.reRequire("../../../lib/framework/create");

	const {statusMessage} = await create({name, metaInformation, project});

	t.is(fsWriteFileStub.callCount, expectedCallCount, "Write function should not or once be called");
	if (expectedCallCount != 0) {
		t.deepEqual(fsWriteFileStub.getCall(0).args[0], expectedPath,
			"Write function should be called with expected path as argument");
		t.deepEqual(fsWriteFileStub.getCall(0).args[1], expectedOutput,
			"Write function should be called with expected output as argument");
	}
	t.is(statusMessage, expectedMessage,
		"statusMessage should be expectedMessage");
}

async function assertFailingCreate(t, {name, metaInformation, project, expectedMessage, expectedCallCount}) {
	const {fsWriteFileStub} = t.context;
	const {create} = mock.reRequire("../../../lib/framework/create");
	const exception = await t.throwsAsync(create({name, metaInformation, project}));

	t.is(fsWriteFileStub.callCount, expectedCallCount, "Write function should not be called");
	t.is(exception.message, expectedMessage, "Create framework should throw expected error");
}

test.beforeEach((t) => {
	t.context.existsStub = sinon.stub(fsHelper, "exists");
	t.context.fsMkDirStub = sinon.stub(fs, "mkdir").yieldsAsync(null);
	t.context.fsWriteFileStub = sinon.stub(fs, "writeFile").yieldsAsync(null);


	t.context.consoleLogStub = sinon.stub(console, "log");
});

test.afterEach.always(() => {
	mock.stopAll();
	sinon.restore();
});

test.serial("Reject process on creating view", async (t) => {
	const {existsStub, fsMkDirStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	fsMkDirStub.yieldsAsync(new Error("EPERM: operation not permitted, mkdir 'C:\\'"));

	await assertFailingCreate(t, {
		name: "test",
		expectedMessage: "Failed to create component: EPERM: operation not permitted, mkdir 'C:\\'.",
		metaInformation: {
			controller: true,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedCallCount: 0
	});
});

test.serial("Reject process on create routing config, already exists", async (t) => {
	const {existsStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const manifest =
`{
    "sap.ui5": {
		"routing": {
			"routes": [
				{
					"pattern": "test",
					"name": "test",
					"target": "test"
				}
			],
			"targets": {
				"test": {
					"viewId": "test",
					"viewName": "Test"
				}
			}
		}

    }
}`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	sinon.stub(fs, "readFile").withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);

	await assertFailingCreate(t, {
		name: "test",
		expectedMessage: "Route for Test does already exist",
		metaInformation: {
			route: true,
			controller: false,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedCallCount: 0
	});
});

test.serial("Reject process on create routing config, target is missing", async (t) => {
	const {existsStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const manifest =
`{
    "sap.ui5": {
		"routing": {
			"routes": [
				{
					"pattern": "test",
					"name": "test",
					"target": "test"
				}
			]
		}
    }
}`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	sinon.stub(fs, "readFile").withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);

	await assertFailingCreate(t, {
		name: "test",
		expectedMessage: "No valid manifest. 'routes' or 'targets' is missing",
		metaInformation: {
			route: true,
			controller: false,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedCallCount: 0
	});
});

test.serial("Reject process on create routing config, 'sapui5' is missing", async (t) => {
	const {existsStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const manifest =
`{

}`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	sinon.stub(fs, "readFile").withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);

	await assertFailingCreate(t, {
		name: "test",
		expectedMessage: "No valid manifest. 'sap.ui5' object is missing",
		metaInformation: {
			route: true,
			controller: false,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedCallCount: 0
	});
});

test.serial("Return message on undefined metaInformation", async (t) => {
	const project = {};

	await assertCreate(t, {
		name: "test",
		metaInformation: undefined,
		project: project,
		expectedMessage: "No needed information provided",
		expectedPath: undefined,
		expectedOutput: undefined,
		expectedCallCount: 0
	});
});

test.serial("Return message on invalid type", async (t) => {
	const project = {};

	await assertCreate(t, {
		name: "test",
		metaInformation: {
			type: "xy"
		},
		project: project,
		expectedMessage: "No valid component type",
		expectedPath: undefined,
		expectedOutput: undefined,
		expectedCallCount: 0
	});
});

test.serial("Return message on existing view", async (t) => {
	const {existsStub} = t.context;
	const project = {};

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(true);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "View Test already exists",
		metaInformation: {
			route: false,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: undefined,
		expectedOutput: undefined,
		expectedCallCount: 0
	});
});

test.serial("Return message on existing control", async (t) => {
	const {existsStub} = t.context;
	const project = {};

	existsStub.withArgs("webappPath/control/Test.control.js").resolves(false);
	existsStub.withArgs("webappPath/control/Test.js").resolves(true);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Control Test already exists",
		metaInformation: {
			route: false,
			type: "control",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: undefined,
		expectedOutput: undefined,
		expectedCallCount: 0
	});
});

test.serial("Return view message on view created", async (t) => {
	const {existsStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const output =
`<mvc:View
    xmlns:mvc="sap.ui.core.mvc">
</mvc:View>`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	existsStub.withArgs("webappPath/view").resolves(false);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add new view to project",
		metaInformation: {
			route: false,
			controller: false,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/view/Test.view.xml",
		expectedOutput: output,
		expectedCallCount: 1
	});
});

test.serial("Return view message on view created with controller and namespace", async (t) => {
	const {existsStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const output =
`<mvc:View
    controllerName="xy.controller.Test"
	xmlns:m="sap.m"
    xmlns:mvc="sap.ui.core.mvc">
</mvc:View>`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath/controller/Test.controller.js").resolves(true);
	existsStub.withArgs("webappPath").resolves(true);
	existsStub.withArgs("webappPath/view").resolves(true);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add new view with corresponding controller to project",
		metaInformation: {
			route: false,
			controller: true,
			namespaceList: [{name: "sap.m"}],
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/view/Test.view.xml",
		expectedOutput: output,
		expectedCallCount: 1
	});
});

test.serial("Return controller message on controller created with modules", async (t) => {
	const {existsStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const output =
`sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"Module1",
	"test/Module2"
], function(Controller, Module1, Module2) {
	"use strict";
	return Controller.extend("xy.controller.Test", {
	});
});
`;

	existsStub.withArgs("webappPath/controller/Test.controller.js").resolves(false);
	existsStub.withArgs("webappPath/controller/Test.js").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	existsStub.withArgs("webappPath/controller").resolves(true);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add new controller to project",
		metaInformation: {
			moduleList: [{name: "Module1"}, {name: "test/Module2"}],
			type: "controller",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/controller/Test.controller.js",
		expectedOutput: output,
		expectedCallCount: 1
	});
});

test.serial("Return control message on control created", async (t) => {
	const {existsStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const output =
`sap.ui.define([
	"sap/ui/core/Control"
], function (Control) {
	"use strict";
	return Control.extend("xy.control.Test", {
		metadata : {
		},
		init : function () {
		},
		renderer : function (oRenderManager, oControl) {
		}
	});
});`;

	existsStub.withArgs("webappPath/control/Test.control.js").resolves(false);
	existsStub.withArgs("webappPath/control/Test.js").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	existsStub.withArgs("webappPath/control").resolves(true);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add new control to project",
		metaInformation: {
			type: "control",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/control/Test.js",
		expectedOutput: output,
		expectedCallCount: 1
	});
});

test.serial("Return route message on route for existing view created, no routing config", async (t) => {
	const {existsStub} = t.context;
	const project = {};

	const manifest =
`{
    "sap.ui5": {

    }
}`;

	const expectedManifest =
`{
    "sap.ui5": {
        "routing": {
            "routes": [
                {
                    "pattern": "test",
                    "name": "test",
                    "target": "test"
                }
            ],
            "targets": {
                "test": {
                    "viewId": "test",
                    "viewName": "Test"
                }
            }
        }
    }
}`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(true);
	sinon.stub(fs, "readFile").withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add route to view",
		metaInformation: {
			route: true,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/manifest.json",
		expectedOutput: expectedManifest,
		expectedCallCount: 1
	});
});

test.serial("Return route message on route for existing view created, have routing config", async (t) => {
	const {existsStub} = t.context;
	const project = {};

	const manifest =
`{
    "sap.ui5": {
		"routing": {

		}
    }
}`;

	const expectedManifest =
`{
    "sap.ui5": {
        "routing": {
            "routes": [
                {
                    "pattern": "test",
                    "name": "test",
                    "target": "test"
                }
            ],
            "targets": {
                "test": {
                    "viewId": "test",
                    "viewName": "Test"
                }
            }
        }
    }
}`;


	sinon.stub(fs, "readFile").withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(true);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add route to view",
		metaInformation: {
			route: true,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/manifest.json",
		expectedOutput: expectedManifest,
		expectedCallCount: 1
	});
});

test.serial("Return bootstrap message on bootstrap created", async (t) => {
	const {existsStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const manifest =
`{
    "sap.app": {
		"title": "test"
    }
}`;

	const output =
`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Test</title>
	<script
		id="sap-ui-bootstrap"
		src="resources/sap-ui-core.js"
		data-sap-ui-theme="sap_fancy_theme"
		data-sap-ui-resourceroots='{
			"xy": "./"
		}'
		data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"
		data-sap-ui-compatVersion="edge"
		data-sap-ui-async="true">
	</script>
</head>
<body class="sapUiBody" id="content">
	<div data-sap-ui-component data-name="xy" data-id="container" data-settings='{"id" : "xy"}'></div>
</body>
</html>`;

	existsStub.withArgs("webappPath/index.html").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	const fsReadFileStub = sinon.stub(fs, "readFile");
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
	fs.readFile.callThrough();
	// .withArgs(__dirname + `/../templates/bootstrap`, "utf8").calls

	await assertCreate(t, {
		name: undefined,
		expectedMessage: "Create bootstrap for project",
		metaInformation: {
			route: false,
			controller: false,
			theme: "sap_fancy_theme",
			type: "bootstrap",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/index.html",
		expectedOutput: output,
		expectedCallCount: 1
	});
});
