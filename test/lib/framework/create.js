const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");
const fsHelper = require("../../../lib/utils/fsHelper");
const fs = require("fs");

async function assertCreateComponent(t, {name, metaInformation, project, expectedMessage, expectedPath,
	expectedOutput, expectedCallCount}) {
	const {fsWriteFileStub} = t.context;
	const createFramework = mock.reRequire("../../../lib/framework/create");

	const {statusMessage} = await createFramework({name, metaInformation, project});

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

async function assertCreateRoute(t, {name, metaInformation, project, expectedMessage, expectedPath,
	manifest, expectedManifest, expectedCallCount}) {
	const {fsWriteFileStub} = t.context;
	const fsReadFileStub = sinon.stub(fs, "readFile").yieldsAsync(null, manifest);

	const createFramework = mock.reRequire("../../../lib/framework/create");

	const {statusMessage} = await createFramework({name, metaInformation, project});

	t.is(fsWriteFileStub.callCount, expectedCallCount, "Write function should be called");
	t.deepEqual(fsWriteFileStub.getCall(0).args[0], expectedPath,
		"Write function should be called with expected path as argument");
	t.deepEqual(fsWriteFileStub.getCall(0).args[1], expectedManifest,
		"Write function should be called with expected output as argument");
	t.is(statusMessage, expectedMessage,
		"statusMessage should be expectedMessage");

	fsReadFileStub.restore();
}

async function assertFailingCreateComponent(t, {name, metaInformation, project, expectedMessage, expectedCallCount}) {
	const {fsWriteFileStub} = t.context;
	const createFramework = mock.reRequire("../../../lib/framework/create");
	const exception = await t.throwsAsync(createFramework({name, metaInformation, project}));

	t.is(fsWriteFileStub.callCount, expectedCallCount, "Write function should not be called");
	t.is(exception.message, expectedMessage, "Create framework should throw expected error");
}

async function assertFailingCreateRoute(t, {name, metaInformation, project, manifest,
	expectedMessage, expectedCallCount}) {
	const {fsWriteFileStub} = t.context;
	const fsReadFileStub = sinon.stub(fs, "readFile").yieldsAsync(null, manifest);
	const createFramework = mock.reRequire("../../../lib/framework/create");
	const exception = await t.throwsAsync(createFramework({name, metaInformation, project}));

	t.is(fsWriteFileStub.callCount, expectedCallCount, "Write function should not be called");
	t.is(exception.message, expectedMessage, "Create framework should throw expected error");

	fsReadFileStub.restore();
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
	fsMkDirStub.yieldsAsync(new Error("EPERM: operation not permitted, mkdir 'C:\\'"));

	await assertFailingCreateComponent(t, {
		name: "test",
		expectedMessage: "Failed to create component: EPERM: operation not permitted, mkdir 'C:\\'.",
		metaInformation: {
			controller: true,
			type: "view",
			webappPath: "webappPath"
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

	await assertFailingCreateRoute(t, {
		name: "test",
		expectedMessage: "Route for Test does already exist",
		metaInformation: {
			route: true,
			controller: false,
			type: "view",
			webappPath: "webappPath"
		},
		project: project,
		manifest: manifest,
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

	await assertFailingCreateRoute(t, {
		name: "test",
		expectedMessage: "No valid manifest. 'routes' or 'targets' is missing",
		metaInformation: {
			route: true,
			controller: false,
			type: "view",
			webappPath: "webappPath"
		},
		project: project,
		manifest: manifest,
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

	await assertFailingCreateRoute(t, {
		name: "test",
		expectedMessage: "No valid manifest. 'sap.ui5' object is missing",
		metaInformation: {
			route: true,
			controller: false,
			type: "view",
			webappPath: "webappPath"
		},
		project: project,
		manifest: manifest,
		expectedCallCount: 0
	});
});

test.serial("Return message on undefined metaInformation", async (t) => {
	const project = {};

	await assertCreateComponent(t, {
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

	await assertCreateComponent(t, {
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

	await assertCreateComponent(t, {
		name: "test",
		expectedMessage: "View Test already exists",
		metaInformation: {
			route: false,
			type: "view",
			webappPath: "webappPath"
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

	await assertCreateComponent(t, {
		name: "test",
		expectedMessage: "Control Test already exists",
		metaInformation: {
			route: false,
			type: "control",
			webappPath: "webappPath"
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
`<mvc:View\r
    xmlns:mvc="sap.ui.core.mvc">\r
</mvc:View>`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath/view").resolves(false);

	await assertCreateComponent(t, {
		name: "test",
		expectedMessage: "view",
		metaInformation: {
			route: false,
			controller: false,
			type: "view",
			webappPath: "webappPath"
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
`<mvc:View\r
    controllerName="xy.controller.Test"\r
	xmlns:m="sap.m"\r
    xmlns:mvc="sap.ui.core.mvc">\r
</mvc:View>`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath/controller/Test.controller.js").resolves(true);
	existsStub.withArgs("webappPath/view").resolves(true);

	await assertCreateComponent(t, {
		name: "test",
		expectedMessage: "view",
		metaInformation: {
			route: false,
			controller: true,
			namespaceList: [{name: "sap.m"}],
			type: "view",
			webappPath: "webappPath"
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
	existsStub.withArgs("webappPath/controller").resolves(true);

	await assertCreateComponent(t, {
		name: "test",
		expectedMessage: "controller",
		metaInformation: {
			moduleList: [{name: "Module1"}, {name: "test/Module2"}],
			type: "controller",
			webappPath: "webappPath"
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
`sap.ui.define([\r
	"sap/ui/core/Control"\r
], function (Control) {\r
	"use strict";\r
	return Control.extend("xy.control.Test", {\r
		metadata : {\r
		},\r
		init : function () {\r
		},\r
		renderer : function (oRenderManager, oControl) {\r
		}\r
	});\r
});`;

	existsStub.withArgs("webappPath/control/Test.control.js").resolves(false);
	existsStub.withArgs("webappPath/control/Test.js").resolves(false);
	existsStub.withArgs("webappPath/control").resolves(true);

	await assertCreateComponent(t, {
		name: "test",
		expectedMessage: "control",
		metaInformation: {
			type: "control",
			webappPath: "webappPath"
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

	await assertCreateRoute(t, {
		name: "test",
		expectedMessage: "route",
		metaInformation: {
			route: true,
			type: "view",
			webappPath: "webappPath"
		},
		project: project,
		manifest: manifest,
		expectedPath: "webappPath/manifest.json",
		expectedManifest: expectedManifest,
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

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(true);

	await assertCreateRoute(t, {
		name: "test",
		expectedMessage: "route",
		metaInformation: {
			route: true,
			type: "view",
			webappPath: "webappPath"
		},
		project: project,
		manifest: manifest,
		expectedPath: "webappPath/manifest.json",
		expectedManifest: expectedManifest,
		expectedCallCount: 1
	});
});
