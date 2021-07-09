const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");
const normalizer = require("@ui5/project").normalizer;
const builder = require("@ui5/builder").builder;
const logger = require("@ui5/logger");
let normalizerStub = null;
let builderStub = null;

const args = {
	_: [],
	dest: "./dist",
	loglevel: "info",
	t8r: "npm",
	translator: "npm"
};
const defaultBuilderArgs = {
	tree: {
		metadata: {
			name: "Sample"
		}
	},
	destPath: "./dist",
	buildDependencies: undefined,
	includedDependencies: [],
	excludedDependencies: [],
	cleanDest: undefined,
	dev: false,
	selfContained: false,
	jsdoc: false,
	devExcludeProject: undefined,
	includedTasks: undefined,
	excludedTasks: undefined
};

test.beforeEach((t) => {
	normalizerStub = sinon.stub(normalizer, "generateProjectTree");
	builderStub = sinon.stub(builder, "build").returns(Promise.resolve());
	sinon.stub(logger, "setShowProgress");
	t.context.log = {
		warn: sinon.stub()
	};
	sinon.stub(logger, "getLogger").withArgs("cli:commands:build").returns(t.context.log);
	mock.reRequire("../../../../lib/utils/buildHelper"); // rerequire buildHelper to ensure usage of stubbed logger
	t.context.build = mock.reRequire("../../../../lib/cli/commands/build");
});

test.afterEach.always((t) => {
	sinon.restore();
	mock.stopAll();
});

test.serial("ui5 build (default) ", async (t) => {
	normalizerStub.resolves({
		metadata:
		{
			name: "Sample"
		}
	});
	args._ = ["build"];
	await t.context.build.handler(args);
	t.deepEqual(builderStub.getCall(0).args[0], defaultBuilderArgs, "default build triggered with expected arguments");
});

test.serial("ui5 build dev", async (t) => {
	normalizerStub.resolves({
		metadata:
		{
			name: "Sample"
		}
	});
	args._ = ["build", "dev"];
	await t.context.build.handler(args);
	t.deepEqual(
		builderStub.getCall(0).args[0],
		Object.assign({}, defaultBuilderArgs, {dev: true}),
		"Dev build called with expected arguments"
	);
});

test.serial("ui5 build self-contained", async (t) => {
	normalizerStub.resolves({
		metadata:
		{
			name: "Sample"
		}
	});
	args._ = ["build", "self-contained"];
	await t.context.build.handler(args);
	t.deepEqual(
		builderStub.getCall(0).args[0],
		Object.assign({}, defaultBuilderArgs, {selfContained: true}),
		"Self-contained build called with expected arguments"
	);
});

test.serial("ui5 build jsdoc", async (t) => {
	normalizerStub.resolves({
		metadata:
		{
			name: "Sample"
		}
	});
	args._ = ["build", "jsdoc"];
	await t.context.build.handler(args);
	t.deepEqual(
		builderStub.getCall(0).args[0],
		Object.assign({}, defaultBuilderArgs, {jsdoc: true}),
		"JSDoc build called with expected arguments"
	);
});

test.serial("ui5 build --framework-version 1.99", async (t) => {
	normalizerStub.resolves({
		metadata:
		{
			name: "Sample"
		}
	});

	args._ = ["build"];
	args.frameworkVersion = "1.99.0";
	await t.context.build.handler(args);
	t.deepEqual(
		normalizerStub.getCall(0).args[0],
		{
			configPath: undefined,
			translatorName: "npm",
			frameworkOptions: {
				versionOverride: "1.99.0"
			}
		}, "generateProjectTree got called with expected arguments"
	);
});

async function assertIncludeDependency(t, {
	treeDeps, includeDeps, includeDepsRegExp, includeDepsTree, excludeDeps, expectedBuilderArgs
}) {
	const tree = Object.assign({metadata: {name: "Sample"}}, treeDeps);
	const _args = Object.assign({}, args); // copy default args to ensure it is not modified
	normalizerStub.resolves(tree);
	_args._ = ["build"];
	_args["include-dependency"] = includeDeps;
	_args["include-dependency-regexp"] = includeDepsRegExp;
	_args["include-dependency-tree"] = includeDepsTree;
	_args["exclude-dependency"] = excludeDeps;
	await t.context.build.handler(_args);
	t.deepEqual(builderStub.getCall(0).args[0],
		Object.assign({}, defaultBuilderArgs, {tree: tree}, expectedBuilderArgs),
		"default build triggered with expected arguments");
}

test.serial("ui5 build --include-dependency", async (t) => {
	await assertIncludeDependency(t, {
		treeDeps: {
			dependencies: [{
				metadata: {
					name: "sap.ui.core"
				}
			}]
		},
		includeDeps: ["sap.ui.core"],
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: ["sap.ui.core"],
			excludedDependencies: ["*"]
		}
	});
});

test.serial("ui5 build (dependency included via ui5.yaml)", async (t) => {
	await assertIncludeDependency(t, {
		treeDeps: {
			dependencies: [{
				metadata: {
					name: "sap.ui.core"
				}
			}],
			builder: {
				settings: {
					includeDependency: ["sap.ui.core"]
				}
			}
		},
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: ["sap.ui.core"],
			excludedDependencies: ["*"]
		}
	});
});

test.serial("ui5 build --include-dependency-regexp", async (t) => {
	await assertIncludeDependency(t, {
		treeDeps: {
			dependencies: [{
				metadata: {
					name: "sap.ui.core"
				}
			}]
		},
		includeDepsRegExp: ["^sap.[mf]$"],
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: [/^sap.[mf]$/],
			excludedDependencies: ["*"]
		}
	});
});

test.serial("ui5 build --include-dependency-tree", async (t) => {
	await assertIncludeDependency(t, {
		treeDeps: {
			dependencies: [{
				metadata: {
					name: "a"
				},
				dependencies: [{
					metadata: {
						name: "b0"
					},
					dependencies: []
				}, {
					metadata: {
						name: "b1"
					},
					dependencies: [{
						metadata: {
							name: "c"
						},
						dependencies: []
					}]
				}]
			}]
		},
		includeDepsTree: ["a"],
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: ["a", "b0", "b1", "c"],
			excludedDependencies: ["*"]
		}
	});
});

test.serial("ui5 build --include-dependency=* --exclude-dependency=sap.ui.core", async (t) => {
	await assertIncludeDependency(t, {
		treeDeps: {
			dependencies: [{
				metadata: {
					name: "sap.ui.core"
				}
			}]
		},
		includeDeps: ["*"],
		excludeDeps: ["sap.ui.core"],
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: [],
			excludedDependencies: ["sap.ui.core"]
		}
	});
});

test.serial("ui5 build --include-dependency-tree=a --exclude-dependency=a", async (t) => {
	await assertIncludeDependency(t, {
		treeDeps: {
			dependencies: [{
				metadata: {
					name: "a"
				},
				dependencies: [{
					metadata: {
						name: "b0"
					},
					dependencies: []
				}, {
					metadata: {
						name: "b1"
					},
					dependencies: []
				}]
			}]
		},
		includeDepsTree: ["a"],
		excludeDeps: ["a"],
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: ["b0", "b1"],
			excludedDependencies: ["a", "*"]
		}
	});
});

test.serial("ui5 build --include-dependency (dependency not found)", async (t) => {
	const {log} = t.context;
	await assertIncludeDependency(t, {
		treeDeps: {
			dependencies: []
		},
		includeDeps: ["sap.ui.core"]
	});
	t.is(log.warn.callCount, 1, "log.warn should be called once");
	t.deepEqual(log.warn.getCall(0).args, ["Could not find dependency 'sap.ui.core' for 'Sample'."],
		"logger.warn should be called with expected string");
});
