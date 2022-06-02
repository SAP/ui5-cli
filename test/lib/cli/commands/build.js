const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");

const args = {
	_: [],
	dest: "./dist",
	loglevel: "info",
	t8r: "npm",
	translator: "npm"
};

function getDefaultArgv() {
	return {
		"_": ["build"],
		"loglevel": "info",
		"log-level": "info",
		"logLevel": "info",
		"x-perf": false,
		"xPerf": false,
		"include-all-dependencies": false,
		"all": false,
		"a": false,
		"includeAllDependencies": false,
		"dest": "./dist",
		"clean-dest": false,
		"cleanDest": false,
		"experimental-css-variables": false,
		"experimentalCssVariables": false,
		"$0": "ui5"
	};
}

function getDefaultBuilderArgs() {
	return {
		destPath: "./dist",
		cleanDest: false,
		complexDependencyIncludes: {
			includeAllDependencies: false,
			includeDependency: undefined,
			includeDependencyRegExp: undefined,
			includeDependencyTree: undefined,
			excludeDependency: undefined,
			excludeDependencyRegExp: undefined,
			excludeDependencyTree: undefined,
			defaultIncludeDependency: undefined,
			defaultIncludeDependencyRegExp: undefined,
			defaultIncludeDependencyTree: undefined
		},
		archive: false,
		selfContained: false,
		jsdoc: false,
		includedTasks: undefined,
		excludedTasks: undefined,
		cssVariables: false
	};
}

test.beforeEach((t) => {
	const project = require("@ui5/project");

	t.context.argv = getDefaultArgv();
	t.context.expectedBuilderArgs = getDefaultBuilderArgs();

	sinon.stub(project.generateProjectGraph, "usingStaticFile").resolves();
	sinon.stub(project.generateProjectGraph, "usingNodePackageDependencies").resolves();
	t.context.generateProjectGraph = project.generateProjectGraph;

	t.context.builder = sinon.stub().resolves();

	// NOTE: project.builder needs to be re-defined via defineProperty.
	// Sinon is unable to create a stub for the property because of the lazy-loading
	// mechanism in @ui5/project index.js
	Object.defineProperty(project, "builder", {
		get() {
			return t.context.builder;
		}
	});

	// Create basic mocking objects
	const fakeGraph = {
		getRoot: sinon.stub().returns({
			getBuilderSettings: sinon.stub().returns(undefined)
		})
	};
	t.context.generateProjectGraph.usingNodePackageDependencies.resolves(fakeGraph);
	t.context.expectedBuilderArgs.graph = fakeGraph;

	t.context.build = require("../../../../lib/cli/commands/build");
});

test.afterEach.always((t) => {
	sinon.restore();
	mock.stopAll();
});

test.serial("ui5 build (default) ", async (t) => {
	const {build, argv, builder, expectedBuilderArgs} = t.context;

	await build.handler(argv);

	t.deepEqual(builder.getCall(0).args[0], expectedBuilderArgs, "default build triggered with expected arguments");
});

test.serial("ui5 build self-contained", async (t) => {
	const {build, argv, builder, expectedBuilderArgs} = t.context;

	argv._.push("self-contained");

	await build.handler(argv);

	expectedBuilderArgs.selfContained = true;
	t.deepEqual(builder.getCall(0).args[0], expectedBuilderArgs, "Self-contained build called with expected arguments");
});

test.serial("ui5 build jsdoc", async (t) => {
	const {build, argv, builder, expectedBuilderArgs} = t.context;

	argv._.push("jsdoc");

	await build.handler(argv);

	expectedBuilderArgs.jsdoc = true;
	t.deepEqual(builder.getCall(0).args[0], expectedBuilderArgs, "JSDoc build called with expected arguments");
});

test.serial("ui5 build --framework-version 1.99", async (t) => {
	const {build, argv, generateProjectGraph} = t.context;

	argv.frameworkVersion = "1.99.0";

	await build.handler(argv);

	t.deepEqual(
		generateProjectGraph.usingNodePackageDependencies.getCall(0).args[0],
		{
			rootConfigPath: undefined,
			versionOverride: "1.99.0"
		}, "generateProjectGraph.usingNodePackageDependencies got called with expected arguments"
	);
});

async function assertIncludeDependency(t, {
	treeDeps, includeDeps, includeDepsRegExp, includeDepsTree, excludeDeps, excludeDepsRegExp, excludeDepsTree,
	expectedBuilderArgs
}) {
	const tree = Object.assign({metadata: {name: "Sample"}}, treeDeps);
	const _args = Object.assign({}, args); // copy default args to ensure it is not modified
	normalizerStub.resolves(tree);
	_args._ = ["build"];
	_args["include-dependency"] = includeDeps;
	_args["include-dependency-regexp"] = includeDepsRegExp;
	_args["include-dependency-tree"] = includeDepsTree;
	_args["exclude-dependency"] = excludeDeps;
	_args["exclude-dependency-regexp"] = excludeDepsRegExp;
	_args["exclude-dependency-tree"] = excludeDepsTree;
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
				},
				dependencies: []
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

[{
	title: "no excludes",
	excludeDepsRegExp: [],
	excludeDepsTree: [],
	expectedBuilderArgs: {
		buildDependencies: true,
		includedDependencies: ["a", "b0", "b1", "c"],
		excludedDependencies: ["*"]
	}
}, {
	title: "overridden by excludes",
	excludeDepsRegExp: ["^b0$"],
	excludeDepsTree: ["b1"],
	expectedBuilderArgs: {
		buildDependencies: true,
		includedDependencies: ["a"],
		excludedDependencies: ["b0", "b1", "c", "*"]
	}
}].forEach((fixture) => {
	test.serial(`ui5 build (dependency included via ui5.yaml); ${fixture.title}`, async (t) => {
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
				}],
				builder: {
					settings: {
						includeDependency: ["a"],
						includeDependencyRegExp: ["^b0$"],
						includeDependencyTree: ["b1"],
					}
				}
			},
			excludeDepsRegExp: fixture.excludeDepsRegExp,
			excludeDepsTree: fixture.excludeDepsTree,
			expectedBuilderArgs: fixture.expectedBuilderArgs
		});
	});
});

test.serial("ui5 build --include-dependency-regexp", async (t) => {
	await assertIncludeDependency(t, {
		treeDeps: {
			dependencies: [{
				metadata: {
					name: "sap.ui.core"
				},
				dependencies: []
			}, {
				metadata: {
					name: "sap.m"
				},
				dependencies: []
			}, {
				metadata: {
					name: "sap.f"
				},
				dependencies: []
			}]
		},
		includeDepsRegExp: ["^sap.[mf]$"],
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: ["sap.m", "sap.f"],
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

test.serial("ui5 build include/exclude tree (two subtrees, sharing a transitive dependency)", async (t) => {
	await assertIncludeDependency(t, {
		treeDeps: {
			dependencies: [{
				metadata: {
					name: "a0"
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
			}, {
				metadata: {
					name: "a1"
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
		includeDepsTree: ["a0"],
		excludeDepsTree: ["a1"],
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: ["a0", "b0", "b1", "c"],
			excludedDependencies: ["a1", "*"]
		}
	});
});

test.serial("ui5 build --include-dependency --include-dependency-tree (select a transitive dependency)", async (t) => {
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
					dependencies: [{
						metadata: {
							name: "b0.c"
						},
						dependencies: []
					}]
				}, {
					metadata: {
						name: "b1"
					},
					dependencies: [{
						metadata: {
							name: "b1.c"
						},
						dependencies: []
					}]
				}]
			}]
		},
		includeDeps: ["b0"],
		includeDepsTree: ["b1"],
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: ["b0", "b1", "b1.c"],
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
				},
				dependencies: []
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

test.serial("ui5 build --include-dependency-tree include/exclude tree has a lower priority", async (t) => {
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
		excludeDepsRegExp: ["^b.$"],
		expectedBuilderArgs: {
			buildDependencies: true,
			includedDependencies: ["a", "c"],
			excludedDependencies: ["b0", "b1", "*"]
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
	t.deepEqual(log.warn.getCall(0).args,
		["Could not find dependency \"sap.ui.core\" for project Sample. Dependency filter is ignored"],
		"logger.warn should be called with expected string");
});


test.serial("ui5 build --experimental-css-variables", async (t) => {
	normalizerStub.resolves({
		metadata: {
			name: "Sample"
		},
		dependencies: []
	});
	args._ = ["build"];
	args["experimental-css-variables"] = true;
	await t.context.build.handler(args);
	t.deepEqual(
		builderStub.getCall(0).args[0],
		Object.assign({}, defaultBuilderArgs, {cssVariables: true}),
		"Build with activated CSS Variables is called with expected arguments"
	);
});
