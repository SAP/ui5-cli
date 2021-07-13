const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");
const logger = require("@ui5/logger");

test.beforeEach((t) => {
	t.context.log = {
		warn: sinon.stub()
	};
	sinon.stub(logger, "getLogger").withArgs("cli:utils:buildHelper").returns(t.context.log);
	t.context.buildHelper = mock.reRequire("../../../lib/utils/buildHelper");
});

test.afterEach.always((t) => {
	sinon.restore();
	mock.stopAll();
});

test.serial("createDependencyList", (t) => {
	const {createDependencyList} = t.context.buildHelper;
	const tree = {
		metadata: {
			name: "Sample"
		},
		dependencies: [{
			metadata: {
				name: "a0"
			},
			dependencies: [{
				metadata: {
					name: "b"
				},
				dependencies: [{
					metadata: {
						name: "c"
					},
					dependencies: [{
						metadata: {
							name: "d0"
						},
						dependencies: []
					}, {
						metadata: {
							name: "d1"
						},
						dependencies: []
					}]
				}]
			}]
		}, {
			metadata: {
				name: "a1"
			},
			dependencies: []
		}]
	};
	const deps = ["*", "a0", "a1", "b", "b", "d1", "unknown"];
	const depsRegExp = ["^abc$"];

	t.deepEqual(createDependencyList({tree: tree, dependencies: deps, dependenciesRegExp: depsRegExp}),
		["*", "a0", "a1", "b", "d1", /^abc$/]);
	t.is(t.context.log.warn.callCount, 1, "log.warn should be called once");
	t.deepEqual(t.context.log.warn.getCall(0).args, ["Could not find dependency 'unknown' for 'Sample'."],
		"logger.warn should be called with expected string");
});

test.serial("createDependencyList: handleSubtree", (t) => {
	const {createDependencyList} = t.context.buildHelper;
	const tree = {
		metadata: {
			name: "Sample"
		},
		dependencies: [{
			metadata: {
				name: "a"
			},
			dependencies: [{
				metadata: {
					name: "b"
				},
				dependencies: [{
					metadata: {
						name: "c"
					},
					dependencies: [{
						metadata: {
							name: "d0"
						},
						dependencies: []
					}, {
						metadata: {
							name: "d1"
						},
						dependencies: []
					}]
				}]
			}]
		}]
	};
	const deps = ["a", "x"];

	t.deepEqual(createDependencyList({tree: tree, dependencies: deps, handleSubtree: true}),
		["a", "b", "c", "d0", "d1"]);
	t.is(t.context.log.warn.callCount, 1, "log.warn should be called once");
	t.deepEqual(t.context.log.warn.getCall(0).args, ["Could not find dependency 'x' for 'Sample'."],
		"logger.warn should be called with expected string");
});

test.serial("createDependencyList: handleSubtree (select dependency within the subtree)", (t) => {
	const {createDependencyList} = t.context.buildHelper;
	const tree = {
		metadata: {
			name: "Sample"
		},
		dependencies: [{
			metadata: {
				name: "a"
			},
			dependencies: [{
				metadata: {
					name: "b"
				},
				dependencies: [{
					metadata: {
						name: "c"
					},
					dependencies: [{
						metadata: {
							name: "d0"
						},
						dependencies: []
					}, {
						metadata: {
							name: "d1"
						},
						dependencies: []
					}]
				}]
			}]
		}]
	};
	const deps = ["b"];

	t.deepEqual(createDependencyList({tree: tree, dependencies: deps, handleSubtree: true}),
		["b", "c", "d0", "d1"]);
});

test.serial("createDependencyList: illegal call", (t) => {
	const {createDependencyList} = t.context.buildHelper;
	const error = t.throws(() => {
		createDependencyList({tree: {}, dependencies: ["a"], dependenciesRegExp: ["b"], handleSubtree: true})
	});

	t.is(error.message, `RegExp's should not be appended to list of sub-dependencies`,
		"Threw with expected error message");
});

test.serial("mergeDependencyLists", (t) => {
	const {mergeDependencyLists} = t.context.buildHelper;
	const targetDependencyList = ["a"];
	const dependencyList = ["a", "b", "c", "d"];
	const excludeList = ["c"];

	mergeDependencyLists(targetDependencyList, dependencyList, excludeList);
	t.deepEqual(targetDependencyList, ["a", "b", "d"]);
});

test.serial("mergeDependencyLists: RegExp", (t) => {
	const {mergeDependencyLists} = t.context.buildHelper;
	const targetDependencyList = [/a/];
	const dependencyList = [/a/, "a", "b", "c", "d", /e+$/];
	const excludeList = [/c/, /e+$/];

	mergeDependencyLists(targetDependencyList, dependencyList, excludeList);
	t.deepEqual(targetDependencyList, [/a/, "a", "b", "d"]);
});

test.serial("alignWithBuilderApi: * is added to excludedDependencies", (t) => {
	const {alignWithBuilderApi} = t.context.buildHelper;
	const args = {
		includedDependencies: ["a"],
		excludedDependencies: []
	};
	t.is(alignWithBuilderApi(false, args.includedDependencies, args.excludedDependencies), true,
		"Should return true if includedDependencies are given");
	t.deepEqual(args, {
		includedDependencies: ["a"],
		excludedDependencies: ["*"]
	});
});

test.serial("alignWithBuilderApi: includedDependencies=* is is an alias for buildAll", (t) => {
	const {alignWithBuilderApi} = t.context.buildHelper;
	const args = {
		includedDependencies: ["*"],
		excludedDependencies: []
	};
	t.is(alignWithBuilderApi(false, args.includedDependencies, args.excludedDependencies), true,
		"Should return true if includedDependencies are given");
	t.deepEqual(args, {
		includedDependencies: [],
		excludedDependencies: []
	});
});
