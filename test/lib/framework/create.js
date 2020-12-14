const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");
const path = require("path");
const fsHelper = require("../../../lib/utils/fsHelper");
const fs = require("fs");

function getFixturePath(fixtureName) {
	return path.join(__dirname, "..", "..", "fixtures", "templates", fixtureName);
}

async function assertCreate(t, {name, metaInformation, project, expectedMessage, expectedPath,
	expectedOutput, expectedManifest, expectedCallCount}) {
	const {fsWriteFileStub} = t.context;
	const {create} = mock.reRequire("../../../lib/framework/create");

	const {statusMessage} = await create({name, metaInformation, project});

	t.is(fsWriteFileStub.callCount, expectedCallCount, "Write function should not or once be called");
	if (expectedCallCount != 0) {
		if (expectedCallCount == 2) {
			t.deepEqual(fsWriteFileStub.getCall(0).args[1], expectedManifest,
				"Write function should be called with expected manifest as argument");
		}
		t.deepEqual(fsWriteFileStub.getCall(expectedCallCount-1).args[0], expectedPath,
			"Write function should be called with expected path as argument");
		t.deepEqual(fsWriteFileStub.getCall(expectedCallCount-1).args[1], expectedOutput,
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
	t.context.fsReadFileStub = sinon.stub(fs, "readFile");
	t.context.fsWriteFileStub = sinon.stub(fs, "writeFile").yieldsAsync(null);
	t.context.fsReadDirStub = sinon.stub(fs, "readdir");

	t.context.consoleLogStub = sinon.stub(console, "log");
});

test.afterEach.always(() => {
	mock.stopAll();
	sinon.restore();
});

test.serial("Reject process on creating view", async (t) => {
	const {existsStub, fsMkDirStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("view"), "utf-8"));
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

test.serial("Reject process on no webappPath", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath").resolves(false);
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("view"), "utf-8"));

	await assertFailingCreate(t, {
		name: "test",
		expectedMessage: "Failed to create component: Internal error.",
		metaInformation: {
			controller: false,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedCallCount: 0
	});
});

test.serial("Reject process on create routing config, already exists", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
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
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);

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
	const {existsStub, fsReadFileStub} = t.context;
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
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);

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
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const manifest =
`{

}`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);

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

test.serial("Return message on existing bootstrap", async (t) => {
	const {fsReadDirStub} = t.context;
	const project = {};

	fsReadDirStub.yieldsAsync(null, ["test.html"]);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Bootstrap for project already exists",
		metaInformation: {
			type: "bootstrap",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: undefined,
		expectedOutput: undefined,
		expectedCallCount: 0
	});
});

test.serial("Return i18n message on existing i18n", async (t) => {
	const {existsStub} = t.context;
	const project = {};

	existsStub.withArgs("webappPath/i18n/i18n.properties").resolves(true);

	await assertCreate(t, {
		name: undefined,
		expectedMessage: "Specific translation file for project already exists",
		metaInformation: {
			route: false,
			language: undefined,
			controller: false,
			theme: undefined,
			type: "i18n",
			savePath: "webappPath"
		},
		project: project,
		expectedCallCount: 0
	});
});

test.serial("Return view message on view created", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const output =
`<mvc:View
	xmlns="sap.m"
	xmlns:mvc="sap.ui.core.mvc">
	<Label text="Hello World!"/>
</mvc:View>`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	existsStub.withArgs("webappPath/view").resolves(false);
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("view"), "utf-8"));

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

test.serial("Return view message on view created with controller", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const output =
`<mvc:View
	controllerName="xy.controller.Test"
	xmlns="sap.m"
	xmlns:mvc="sap.ui.core.mvc">
	<Label text="Hello World!"/>
</mvc:View>`;

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath/controller/Test.controller.js").resolves(true);
	existsStub.withArgs("webappPath").resolves(true);
	existsStub.withArgs("webappPath/view").resolves(true);
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("view"), "utf-8"));

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add new view with corresponding controller to project",
		metaInformation: {
			route: false,
			controller: true,
			namespaceList: [],
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/view/Test.view.xml",
		expectedOutput: output,
		expectedCallCount: 1
	});
});

test.serial("Return view message on view created with controller and route", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const manifest =
`{
    "sap.ui5": {
		"routing": {

		}
    }
}`;

	const output =
`<mvc:View
	controllerName="xy.controller.Test"
	xmlns="sap.m"
	xmlns:mvc="sap.ui.core.mvc">
	<Label text="Hello World!"/>
</mvc:View>`;

	const expectedManifest = JSON.stringify({
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
	}, null, "\t");

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	existsStub.withArgs("webappPath/controller/Test.controller.js").resolves(true);
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("view"), "utf-8"));
	existsStub.withArgs("webappPath").resolves(true);
	existsStub.withArgs("webappPath/view").resolves(true);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add new view with corresponding controller and route to project",
		metaInformation: {
			route: true,
			controller: true,
			namespaceList: [],
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/view/Test.view.xml",
		expectedOutput: output,
		expectedManifest: expectedManifest,
		expectedCallCount: 2
	});
});

test.serial("Return view message on view as root created", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const manifest =
`{
    "sap.ui5": {

    }
}`;

	const output =
`<mvc:View
	xmlns="sap.m"
	xmlns:mvc="sap.ui.core.mvc">
	<Label text="Hello World!"/>
</mvc:View>`;

	const expectedManifest = JSON.stringify({
		"sap.ui5": {
			"rootView": {
				"viewName": "xy.view.Test",
				"type": "XML",
				"async": true,
				"id": "test"
			}
		}
	}, null, "\t");

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(false);
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("view"), "utf-8"));
	existsStub.withArgs("webappPath").resolves(true);
	existsStub.withArgs("webappPath/view").resolves(true);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add new view as root to project",
		metaInformation: {
			route: false,
			controller: false,
			namespaceList: [],
			rootView: true,
			type: "view",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/view/Test.view.xml",
		expectedOutput: output,
		expectedManifest: expectedManifest,
		expectedCallCount: 2
	});
});

test.serial("Return controller message on controller created with modules", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
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
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("controller"), "utf-8"));

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
	const {existsStub, fsReadFileStub} = t.context;
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
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("control"), "utf-8"));

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

test.serial("Return component message on default component created", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const output =
`sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";
	return UIComponent.extend("xy.Component", {
		metadata : {
			manifest: "json"
		},
		init : function () {
			UIComponent.prototype.init.apply(this, arguments);
		}
	});
});`;

	existsStub.withArgs("webappPath/Component.js").resolves(false);
	existsStub.withArgs("webappPath/manifest.json").resolves(true);
	existsStub.withArgs("webappPath").resolves(true);
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("component"), "utf-8"));

	await assertCreate(t, {
		expectedMessage: "Add new Component to project",
		metaInformation: {
			type: "component",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/Component.js",
		expectedOutput: output,
		expectedCallCount: 1
	});
});

test.serial("Return component message on custom component exist", async (t) => {
	const {existsStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	existsStub.withArgs("webappPath/test").resolves(true);
	existsStub.withArgs("webappPath/test/Component.js").resolves(true);

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Component for xy.test already exists",
		metaInformation: {
			type: "component",
			savePath: "webappPath"
		},
		project: project,
		expectedCallCount: 0
	});
});

test.serial("Return component message on custom component", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		type: "application",
		metadata: {
			name: "test",
			namespace: "xy"
		},
		framework: {
			libraries: []
		}
	};

	const output =
`sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";
	return UIComponent.extend("xy.test.Component", {
		metadata : {
			manifest: "json"
		},
		init : function () {
			UIComponent.prototype.init.apply(this, arguments);
		}
	});
});`;

	const expectedManifest = JSON.stringify({
		"_version": "1.1.0",
		"sap.app": {
			"id": "xy.test",
			"type": "application",
			"title": "Test",
			"applicationVersion": {
				"version": "1.0.0"
			}
		},
		"sap.ui": {
			"technology": "UI5"
		},
		"sap.ui5": {
			"dependencies": {
				"libs": {}
			}
		}
	}, null, "\t");

	existsStub.withArgs("webappPath/test").onCall(0).resolves(false);
	existsStub.withArgs("webappPath/test").onCall(1).resolves(true);
	existsStub.withArgs("webappPath/test/Component.js").resolves(false);
	existsStub.withArgs("webappPath/test/manifest.json").resolves(false);
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("component"), "utf-8"));

	await assertCreate(t, {
		name: "test",
		expectedMessage: "Add new Component to project",
		metaInformation: {
			type: "component",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/test/Component.js",
		expectedOutput: output,
		expectedManifest: expectedManifest,
		expectedCallCount: 2
	});
});

test.serial("Return route message on route for existing view created, no routing config", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {};

	const manifest =
`{
	"sap.ui5": {

	}
}`;

	const expectedManifest = JSON.stringify({
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
	}, null, "\t");

	existsStub.withArgs("webappPath/view/Test.view.xml").resolves(true);
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);

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
	const {existsStub, fsReadFileStub} = t.context;
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


	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
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
	const {existsStub, fsReadFileStub, fsReadDirStub} = t.context;
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
	fsReadDirStub.yieldsAsync(null, []);
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
	fsReadFileStub.yieldsAsync(null, fs.readFileSync(getFixturePath("bootstrap"), "utf-8"));

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

test.serial("Return i18n message on default i18n created, no models", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "my.app"
		}
	};

	const manifest =
`{
    "sap.ui5": {

    }
}`;

	const output =
`# Add translations`;

	const expectedManifest =
`{
	"sap.ui5": {
		"models": {
			"i18n": {
				"type": "sap.ui.model.resource.ResourceModel",
				"settings": {
					"bundleName": "my.app.i18n.i18n",
					"supportedLocales": []
				}
			}
		}
	}
}`;

	existsStub.withArgs("webappPath/i18n/i18n.properties").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
	existsStub.withArgs("webappPath/i18n").resolves(true);

	await assertCreate(t, {
		name: undefined,
		expectedMessage: "Create default translation file for project",
		metaInformation: {
			route: false,
			language: undefined,
			controller: false,
			theme: undefined,
			type: "i18n",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/i18n/i18n.properties",
		expectedOutput: output,
		expectedManifest: expectedManifest,
		expectedCallCount: 2
	});
});

test.serial("Return i18n message on default i18n created", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "my.app"
		}
	};

	const manifest =
`{
	"sap.ui5": {
		"models": {

		}
	}
}`;

	const output =
`# Add translations`;

	const expectedManifest =
`{
	"sap.ui5": {
		"models": {
			"i18n": {
				"type": "sap.ui.model.resource.ResourceModel",
				"settings": {
					"bundleName": "my.app.i18n.i18n",
					"supportedLocales": []
				}
			}
		}
	}
}`;

	existsStub.withArgs("webappPath/i18n/i18n.properties").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
	existsStub.withArgs("webappPath/i18n").resolves(true);

	await assertCreate(t, {
		name: undefined,
		expectedMessage: "Create default translation file for project",
		metaInformation: {
			route: false,
			language: undefined,
			controller: false,
			theme: undefined,
			type: "i18n",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/i18n/i18n.properties",
		expectedOutput: output,
		expectedManifest: expectedManifest,
		expectedCallCount: 2
	});
});

test.serial("Return i18n message on custom language i18n created", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const manifest =
`{
	"sap.ui5":{
		"models": {
			"i18n": {
				"type": "sap.ui.model.resource.ResourceModel",
				"settings": {
					"bundleName": "xy.i18n.i18n",
					"supportedLocales": []
				}
			}
		}
	}
}`;

	const output =
`# Add translations`;

	const expectedManifest =
`{
	"sap.ui5": {
		"models": {
			"i18n": {
				"type": "sap.ui.model.resource.ResourceModel",
				"settings": {
					"bundleName": "xy.i18n.i18n",
					"supportedLocales": [
						"en"
					],
					"fallbackLocale": "en"
				}
			}
		}
	}
}`;

	existsStub.withArgs("webappPath/i18n/i18n.properties").resolves(true);
	existsStub.withArgs("webappPath/i18n/i18n_en.properties").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
	existsStub.withArgs("webappPath/i18n").resolves(true);

	await assertCreate(t, {
		name: undefined,
		expectedMessage: "Create EN translation file for project",
		metaInformation: {
			route: false,
			language: "en",
			controller: false,
			theme: undefined,
			type: "i18n",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/i18n/i18n_en.properties",
		expectedOutput: output,
		expectedManifest: expectedManifest,
		expectedCallCount: 2
	});
});

test.serial("Return i18n message on second custom language i18n created", async (t) => {
	const {existsStub, fsReadFileStub} = t.context;
	const project = {
		metadata: {
			namespace: "xy"
		}
	};

	const manifest =
`{
	"sap.ui5":{
		"models": {
			"i18n": {
				"type": "sap.ui.model.resource.ResourceModel",
				"settings": {
					"bundleName": "xy.i18n.i18n",
					"supportedLocales": ["de"],
					"fallbackLocale": "de"
				}
			}
		}
	}
}`;

	const output =
`# Add translations`;

	const expectedManifest =
`{
	"sap.ui5": {
		"models": {
			"i18n": {
				"type": "sap.ui.model.resource.ResourceModel",
				"settings": {
					"bundleName": "xy.i18n.i18n",
					"supportedLocales": [
						"de",
						"en"
					],
					"fallbackLocale": "de"
				}
			}
		}
	}
}`;

	existsStub.withArgs("webappPath/i18n/i18n.properties").resolves(true);
	existsStub.withArgs("webappPath/i18n/i18n_en.properties").resolves(false);
	existsStub.withArgs("webappPath").resolves(true);
	fsReadFileStub.withArgs("webappPath/manifest.json", "utf8").yieldsAsync(null, manifest);
	existsStub.withArgs("webappPath/i18n").resolves(true);

	await assertCreate(t, {
		name: undefined,
		expectedMessage: "Create EN translation file for project",
		metaInformation: {
			route: false,
			language: "en",
			controller: false,
			theme: undefined,
			type: "i18n",
			savePath: "webappPath"
		},
		project: project,
		expectedPath: "webappPath/i18n/i18n_en.properties",
		expectedOutput: output,
		expectedManifest: expectedManifest,
		expectedCallCount: 2
	});
});

test.serial("Return manifest message on create manifest, has dependencies", async (t) => {
	const project = {
		type: "application",
		metadata: {
			name: "test"
		},
		framework: {
			libraries: [
				{name: "ui.tech"}
			]
		}
	};

	const expectedOutput = JSON.stringify({
		"_version": "1.1.0",
		"sap.app": {
			"id": "fancy.app",
			"type": "application",
			"title": "Test",
			"applicationVersion": {
				"version": "1.0.0"
			}
		},
		"sap.ui": {
			"technology": "UI5"
		},
		"sap.ui5": {
			"dependencies": {
				"libs": {
					"ui.tech": {}
				}
			}
		}
	}, null, "\t");

	const {fsWriteFileStub, consoleLogStub} = t.context;
	const {createManifest} = mock.reRequire("../../../lib/framework/create");

	await createManifest({
		namespace: "fancy.app",
		project,
		savePath: "webappPath"
	});

	t.is(fsWriteFileStub.callCount, 1, "Write function should not or once be called");
	t.deepEqual(fsWriteFileStub.getCall(0).args[0], "webappPath/manifest.json",
		"Write function should be called with expected path as argument");
	t.deepEqual(fsWriteFileStub.getCall(0).args[1], expectedOutput,
		"Write function should be called with expected output as argument");
	t.is(consoleLogStub.callCount, 1,
		"console.log should be called " + 1 + " times");
	t.deepEqual(consoleLogStub.getCall(0).args[0], "manifest.json created",
		"console.log should be called with expected string");
});

test.serial("Return manifest message on create manifest, has dependencies and themelib", async (t) => {
	const project = {
		type: "application",
		metadata: {
			name: "test"
		},
		framework: {
			libraries: [
				{name: "ui.tech"},
				{name: "themelib_ui"}
			]
		}
	};

	const expectedOutput = JSON.stringify({
		"_version": "1.1.0",
		"sap.app": {
			"id": "fancy.app",
			"type": "application",
			"title": "Test",
			"applicationVersion": {
				"version": "1.0.0"
			}
		},
		"sap.ui": {
			"technology": "UI5"
		},
		"sap.ui5": {
			"dependencies": {
				"libs": {
					"ui.tech": {}
				}
			}
		}
	}, null, "\t");

	const {fsWriteFileStub, consoleLogStub} = t.context;
	const {createManifest} = mock.reRequire("../../../lib/framework/create");

	await createManifest({
		namespace: "fancy.app",
		project,
		savePath: "webappPath"
	});

	t.is(fsWriteFileStub.callCount, 1, "Write function should not or once be called");
	t.deepEqual(fsWriteFileStub.getCall(0).args[0], "webappPath/manifest.json",
		"Write function should be called with expected path as argument");
	t.deepEqual(fsWriteFileStub.getCall(0).args[1], expectedOutput,
		"Write function should be called with expected output as argument");
	t.is(consoleLogStub.callCount, 1,
		"console.log should be called " + 1 + " times");
	t.deepEqual(consoleLogStub.getCall(0).args[0], "manifest.json created",
		"console.log should be called with expected string");
});

test.serial("Return manifest message on create manifest, no dependencies", async (t) => {
	const project = {
		type: "application",
		metadata: {
			name: "test"
		},
		framework: {
		}
	};

	const expectedOutput = JSON.stringify({
		"_version": "1.1.0",
		"sap.app": {
			"id": "fancy.app",
			"type": "application",
			"title": "Test",
			"applicationVersion": {
				"version": "1.0.0"
			}
		},
		"sap.ui": {
			"technology": "UI5"
		},
		"sap.ui5": {
			"dependencies": {
				"libs": {}
			}
		}
	}, null, "\t");

	const {fsWriteFileStub, consoleLogStub} = t.context;
	const {createManifest} = mock.reRequire("../../../lib/framework/create");

	await createManifest({
		namespace: "fancy.app",
		project,
		savePath: "webappPath"
	});

	t.is(fsWriteFileStub.callCount, 1, "Write function should not or once be called");
	t.deepEqual(fsWriteFileStub.getCall(0).args[0], "webappPath/manifest.json",
		"Write function should be called with expected path as argument");
	t.deepEqual(fsWriteFileStub.getCall(0).args[1], expectedOutput,
		"Write function should be called with expected output as argument");
	t.is(consoleLogStub.callCount, 1,
		"console.log should be called " + 1 + " times");
	t.deepEqual(consoleLogStub.getCall(0).args[0], "manifest.json created",
		"console.log should be called with expected string");
});
