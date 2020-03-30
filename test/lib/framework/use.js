const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");

const ui5Project = require("@ui5/project");

let useFramework;

test.beforeEach((t) => {
	t.context.generateDependencyTreeStub = sinon.stub(ui5Project.normalizer, "generateDependencyTree");
	t.context.processTreeStub = sinon.stub(ui5Project.projectPreprocessor, "processTree");
	t.context.Openui5ResolveVersionStub = sinon.stub(ui5Project.ui5Framework.Openui5Resolver, "resolveVersion");
	t.context.Sapui5ResolveVersionStub = sinon.stub(ui5Project.ui5Framework.Sapui5Resolver, "resolveVersion");

	t.context.updateYamlStub = sinon.stub();
	mock("../../../lib/framework/updateYaml", t.context.updateYamlStub);

	useFramework = mock.reRequire("../../../lib/framework/use");
});

test.afterEach.always(() => {
	mock.stopAll();
	sinon.restore();
});

test.serial("Use with name and version (OpenUI5)", async (t) => {
	const {generateDependencyTreeStub, processTreeStub, Openui5ResolveVersionStub} = t.context;

	const normalizerOptions = {
		"fakeNormalizerOption": true
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "2.0",
		metadata: {
			name: "my-project"
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);
	Openui5ResolveVersionStub.resolves("1.76.0");

	const {usedFramework, usedVersion} = await useFramework({
		normalizerOptions,
		frameworkOptions: {
			name: "openui5",
			version: "latest"
		}
	});

	t.is(usedFramework, "OpenUI5", "Used framework should be OpenUI5");
	t.is(usedVersion, "1.76.0", "Used version should be 1.76.0");

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{"fakeNormalizerOption": true}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Openui5ResolveVersionStub.callCount, 1, "Openui5Resolver.resolveVersion should be called once");
	t.deepEqual(Openui5ResolveVersionStub.getCall(0).args, ["latest"],
		"Openui5Resolver.resolveVersion should be called with expected args");
});

test.serial("Use with name and version (SAPUI5)", async (t) => {
	const {generateDependencyTreeStub, processTreeStub, Sapui5ResolveVersionStub} = t.context;

	const normalizerOptions = {
		"fakeNormalizerOption": true
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "2.0",
		metadata: {
			name: "my-project"
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);
	Sapui5ResolveVersionStub.resolves("1.76.0");

	const {usedFramework, usedVersion} = await useFramework({
		normalizerOptions,
		frameworkOptions: {
			name: "sapui5",
			version: "latest"
		}
	});

	t.is(usedFramework, "SAPUI5", "Used framework should be SAPUI5");
	t.is(usedVersion, "1.76.0", "Used version should be 1.76.0");

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{"fakeNormalizerOption": true}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Sapui5ResolveVersionStub.callCount, 1, "Sapui5Resolver.resolveVersion should be called once");
	t.deepEqual(Sapui5ResolveVersionStub.getCall(0).args, ["latest"],
		"Sapui5Resolver.resolveVersion should be called with expected args");
});

test.serial("Use with version only (OpenUI5)", async (t) => {
	const {generateDependencyTreeStub, processTreeStub, Openui5ResolveVersionStub} = t.context;

	const normalizerOptions = {
		"fakeNormalizerOption": true
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "2.0",
		metadata: {
			name: "my-project"
		},
		framework: {
			name: "OpenUI5"
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);
	Openui5ResolveVersionStub.resolves("1.76.0");

	const {usedFramework, usedVersion} = await useFramework({
		normalizerOptions,
		frameworkOptions: {
			name: null,
			version: "latest"
		}
	});

	t.is(usedFramework, "OpenUI5", "Used framework should be OpenUI5");
	t.is(usedVersion, "1.76.0", "Used version should be 1.76.0");

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{"fakeNormalizerOption": true}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Openui5ResolveVersionStub.callCount, 1, "Openui5Resolver.resolveVersion should be called once");
	t.deepEqual(Openui5ResolveVersionStub.getCall(0).args, ["latest"],
		"Openui5Resolver.resolveVersion should be called with expected args");
});

test.serial("Use with version only (SAPUI5)", async (t) => {
	const {generateDependencyTreeStub, processTreeStub, Sapui5ResolveVersionStub} = t.context;

	const normalizerOptions = {
		"fakeNormalizerOption": true
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "2.0",
		metadata: {
			name: "my-project"
		},
		framework: {
			name: "SAPUI5"
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);
	Sapui5ResolveVersionStub.resolves("1.76.0");

	const {usedFramework, usedVersion} = await useFramework({
		normalizerOptions,
		frameworkOptions: {
			name: null,
			version: "latest"
		}
	});

	t.is(usedFramework, "SAPUI5", "Used framework should be SAPUI5");
	t.is(usedVersion, "1.76.0", "Used version should be 1.76.0");

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{"fakeNormalizerOption": true}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Sapui5ResolveVersionStub.callCount, 1, "Sapui5Resolver.resolveVersion should be called once");
	t.deepEqual(Sapui5ResolveVersionStub.getCall(0).args, ["latest"],
		"Sapui5Resolver.resolveVersion should be called with expected args");
});

test.serial("Use with normalizerOptions.configPath", async (t) => {
	const {generateDependencyTreeStub, processTreeStub, Sapui5ResolveVersionStub} = t.context;

	const normalizerOptions = {
		configPath: "/path/to/ui5.yaml"
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "2.0",
		metadata: {
			name: "my-project"
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);
	Sapui5ResolveVersionStub.resolves("1.76.0");

	const {usedFramework, usedVersion} = await useFramework({
		normalizerOptions,
		frameworkOptions: {
			name: "SAPUI5",
			version: "latest"
		}
	});

	t.is(usedFramework, "SAPUI5", "Used framework should be SAPUI5");
	t.is(usedVersion, "1.76.0", "Used version should be 1.76.0");

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{configPath: "/path/to/ui5.yaml"}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		configPath: "/path/to/ui5.yaml",
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Sapui5ResolveVersionStub.callCount, 1, "Sapui5Resolver.resolveVersion should be called once");
	t.deepEqual(Sapui5ResolveVersionStub.getCall(0).args, ["latest"],
		"Sapui5Resolver.resolveVersion should be called with expected args");
});

test.serial("Use with version only (no framework name)", async (t) => {
	const {generateDependencyTreeStub, processTreeStub,
		Openui5ResolveVersionStub, Sapui5ResolveVersionStub} = t.context;

	const normalizerOptions = {
		"fakeNormalizerOption": true
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "2.0",
		metadata: {
			name: "my-project"
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);

	const error = await t.throwsAsync(useFramework({
		normalizerOptions,
		frameworkOptions: {
			name: null,
			version: "latest"
		}
	}));

	t.is(error.message, "No framework configuration defined. Please provide --framework option!");

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{"fakeNormalizerOption": true}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Openui5ResolveVersionStub.callCount, 0, "Openui5Resolver.resolveVersion should not be called");
	t.is(Sapui5ResolveVersionStub.callCount, 0, "Sapui5Resolver.resolveVersion should not be called");
});

test.serial("Use with invalid name", async (t) => {
	const {generateDependencyTreeStub, processTreeStub,
		Openui5ResolveVersionStub, Sapui5ResolveVersionStub} = t.context;

	const normalizerOptions = {
		"fakeNormalizerOption": true
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "2.0",
		metadata: {
			name: "my-project"
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);

	const error = await t.throwsAsync(useFramework({
		normalizerOptions,
		frameworkOptions: {
			name: "Foo",
			version: "latest"
		}
	}));

	t.is(error.message, "Invalid framework name: Foo");

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{"fakeNormalizerOption": true}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Openui5ResolveVersionStub.callCount, 0, "Openui5Resolver.resolveVersion should not be called");
	t.is(Sapui5ResolveVersionStub.callCount, 0, "Sapui5Resolver.resolveVersion should not be called");
});


test.serial("Use with specVersion 1.0", async (t) => {
	const {generateDependencyTreeStub, processTreeStub,
		Openui5ResolveVersionStub, Sapui5ResolveVersionStub} = t.context;

	const normalizerOptions = {
		"fakeNormalizerOption": true
	};

	const tree = {
		dependencies: [{id: "fake-dependency"}]
	};
	const project = {
		specVersion: "1.0",
		metadata: {
			name: "my-project"
		}
	};

	generateDependencyTreeStub.resolves(tree);
	processTreeStub.resolves(project);

	const error = await t.throwsAsync(useFramework({
		normalizerOptions,
		frameworkOptions: {
			name: "Foo",
			version: "latest"
		}
	}));

	t.is(error.message,
		`ui5 use command requires specVersion "2.0" or higher. Project my-project uses specVersion "1.0"`);

	t.is(generateDependencyTreeStub.callCount, 1, "normalizer.generateDependencyTree should be called once");
	t.deepEqual(generateDependencyTreeStub.getCall(0).args, [{"fakeNormalizerOption": true}],
		"normalizer.generateDependencyTree should be called with expected args");

	t.is(processTreeStub.callCount, 1, "projectPreprocessor.processTree should be called once");
	t.deepEqual(processTreeStub.getCall(0).args, [{
		dependencies: []
	}],
	"projectPreprocessor.processTree should be called with expected args");

	t.is(Openui5ResolveVersionStub.callCount, 0, "Openui5Resolver.resolveVersion should not be called");
	t.is(Sapui5ResolveVersionStub.callCount, 0, "Sapui5Resolver.resolveVersion should not be called");
});
