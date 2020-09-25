const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");
const path = require("path");

const ui5Project = require("@ui5/project");


async function assertCreateHandler(t, {argv, expectedMessage, expectedMetaInfo, expectedConsoleLog, project}) {
	const frameworkCreateStub = sinon.stub().resolves({
		statusMessage: expectedMessage
	});
	mock("../../../../lib/framework/create", frameworkCreateStub);

	const createCommand = mock.reRequire("../../../../lib/cli/commands/create");
	await createCommand.handler(argv);

	t.is(frameworkCreateStub.callCount, 1, "Create function should be called");
	t.deepEqual(frameworkCreateStub.getCall(0).args, [
		{
			name: argv["name"],
			metaInformation: expectedMetaInfo,
			project: project
		}],
	"Create function should be called with expected args");

	t.is(t.context.consoleLogStub.callCount, expectedConsoleLog.length,
		"console.log should be called " + expectedConsoleLog.length + " times");
	expectedConsoleLog.forEach((expectedLog, i) => {
		t.deepEqual(t.context.consoleLogStub.getCall(i).args, [expectedLog],
			"console.log should be called with expected string on call index " + i);
	});
}

async function assertFailingCreateHandler(t, {argv, expectedStatusMessage, expectedMessage, expectedCallCount}) {
	const frameworkCreateStub = sinon.stub().resolves({
		statusMessage: expectedStatusMessage
	});
	mock("../../../../lib/framework/create", frameworkCreateStub);

	const createCommand = mock.reRequire("../../../../lib/cli/commands/create");
	const exception = await t.throwsAsync(createCommand.handler(argv));

	t.is(exception.message, expectedMessage, "Create handler should throw expected error");
	t.is(frameworkCreateStub.callCount, expectedCallCount, "Create function should not be called");
}

test.beforeEach((t) => {
	t.context.generateDependencyTreeStub = sinon.stub(ui5Project.normalizer, "generateDependencyTree");
	t.context.processProjectStub = sinon.stub(ui5Project.projectPreprocessor, "processTree");
	t.context.consoleLogStub = sinon.stub(console, "log");
});

test.afterEach.always(() => {
	mock.stopAll();
	sinon.restore();
});

test.serial("Rejects on no component provided", async (t) => {
	await assertFailingCreateHandler(t, {
		argv: {
			_: ["create"]
		},
		expectedStatusMessage: undefined,
		expectedMessage: "Component needed. You can run " +
			"this command without component in interactive mode (--interactive, -i)",
		expectedCallCount: 0
	});
});

test.serial("Rejects on no name provided", async (t) => {
	await assertFailingCreateHandler(t, {
		argv: {
			_: ["create", "component"]
		},
		expectedStatusMessage: undefined,
		expectedMessage: "Missing mandatory parameter 'name'. You can run " +
		"this command without name in interactive mode (--interactive, -i)",
		expectedCallCount: 0
	});
});

test.serial("Rejects on other project type ", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "xy"
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertFailingCreateHandler(t, {
		argv: {
			_: ["create", "component"],
			name: "test"
		},
		expectedStatusMessage: undefined,
		expectedMessage: "Create command is currently only supported for projects of type Application",
		expectedCallCount: 0
	});
});

test.serial("Rejects on no message", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertFailingCreateHandler(t, {
		argv: {
			_: ["create", "view"],
			name: "test"
		},
		expectedStatusMessage: undefined,
		expectedMessage: "Internal error while adding component",
		expectedCallCount: 1
	});
});

test.serial("Rejects on other message", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertFailingCreateHandler(t, {
		argv: {
			_: ["create", "view"],
			name: "test"
		},
		expectedStatusMessage: "xy",
		expectedMessage: "Internal error",
		expectedCallCount: 1
	});
});

test.serial("Add raw view", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}

	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertCreateHandler(t, {
		argv: {
			_: ["create", "view"],
			name: "test",
			controller: false,
			route: false,
		},
		expectedMessage: "view",
		expectedMetaInfo: {
			controller: false,
			moduleList: [],
			namespaceList: [],
			route: false,
			type: "view",
			webappPath: path.join(__dirname, "..", "..", "..", "..", "app")
		},
		expectedConsoleLog: ["Add new view"],
		project: project
	});
});

test.serial("Add default view", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertCreateHandler(t, {
		argv: {
			_: ["create", "view"],
			name: "test",
			controller: true,
			route: false,
		},
		expectedMessage: "view",
		expectedMetaInfo: {
			controller: true,
			moduleList: [],
			namespaceList: [],
			route: false,
			type: "view",
			webappPath: path.join(__dirname, "..", "..", "..", "..", "app")
		},
		expectedConsoleLog: ["Add new view with corresponding controller"],
		project: project
	});
});

test.serial("Add default view with route", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertCreateHandler(t, {
		argv: {
			_: ["create", "view"],
			name: "test",
			controller: true,
			route: true,
		},
		expectedMessage: "view",
		expectedMetaInfo: {
			controller: true,
			moduleList: [],
			namespaceList: [],
			route: true,
			type: "view",
			webappPath: path.join(__dirname, "..", "..", "..", "..", "app")
		},
		expectedConsoleLog: ["Add new view with corresponding controller and route to project"],
		project: project
	});
});

test.serial("Add to existing view an route", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertCreateHandler(t, {
		argv: {
			_: ["create", "view"],
			name: "test",
			controller: true,
			route: true,
		},
		expectedMessage: "route",
		expectedMetaInfo: {
			controller: true,
			moduleList: [],
			namespaceList: [],
			route: true,
			type: "view",
			webappPath: path.join(__dirname, "..", "..", "..", "..", "app")
		},
		expectedConsoleLog: ["Add route to view"],
		project: project
	});
});

test.serial("Add default view with valid namespace", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertCreateHandler(t, {
		argv: {
			_: ["create", "view"],
			name: "test",
			controller: true,
			namespaces: ["sap.m"],
			route: false,
		},
		expectedMessage: "view",
		expectedMetaInfo: {
			controller: true,
			moduleList: [],
			namespaceList: [{name: "sap.m"}],
			route: false,
			type: "view",
			webappPath: path.join(__dirname, "..", "..", "..", "..", "app")
		},
		expectedConsoleLog: ["Add new view with corresponding controller"],
		project: project
	});
});

test.serial("Add controller", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertCreateHandler(t, {
		argv: {
			_: ["create", "controller"],
			name: "test"
		},
		expectedMessage: "controller",
		expectedMetaInfo: {
			controller: undefined,
			moduleList: [],
			namespaceList: [],
			route: undefined,
			type: "controller",
			webappPath: path.join(__dirname, "..", "..", "..", "..", "app")
		},
		expectedConsoleLog: ["Add new controller"],
		project: project
	});
});

test.serial("Add controller with modules", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertCreateHandler(t, {
		argv: {
			_: ["create", "controller"],
			name: "test",
			modules: ["sap/m/MessageToast"]
		},
		expectedMessage: "controller",
		expectedMetaInfo: {
			controller: undefined,
			moduleList: [{name: "sap/m/MessageToast"}],
			namespaceList: [],
			route: undefined,
			type: "controller",
			webappPath: path.join(__dirname, "..", "..", "..", "..", "app")
		},
		expectedConsoleLog: ["Add new controller"],
		project: project
	});
});

test.serial("Add control", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertCreateHandler(t, {
		argv: {
			_: ["create", "control"],
			name: "test"
		},
		expectedMessage: "control",
		expectedMetaInfo: {
			controller: undefined,
			moduleList: [],
			namespaceList: [],
			route: undefined,
			type: "control",
			webappPath: path.join(__dirname, "..", "..", "..", "..", "app")
		},
		expectedConsoleLog: ["Add new control"],
		project: project
	});
});

test.serial("Add control with modules", async (t) => {
	const {generateDependencyTreeStub, processProjectStub} = t.context;

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		type: "application",
		resources: {
			configuration: {
				paths: {
					webapp: "app"
				}
			}
		}
	};
	generateDependencyTreeStub.resolves(tree);
	processProjectStub.resolves(project);

	await assertCreateHandler(t, {
		argv: {
			_: ["create", "control"],
			name: "test",
			modules: ["sap/m/MessageToast"]
		},
		expectedMessage: "control",
		expectedMetaInfo: {
			controller: undefined,
			moduleList: [{name: "sap/m/MessageToast"}],
			namespaceList: [],
			route: undefined,
			type: "control",
			webappPath: path.join(__dirname, "..", "..", "..", "..", "app")
		},
		expectedConsoleLog: ["Add new control"],
		project: project
	});
});
