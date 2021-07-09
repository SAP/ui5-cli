const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");
const logger = require("@ui5/logger");

test.beforeEach((t) => {
	t.context.log = {
		warn: sinon.stub()
	};
	sinon.stub(logger, "getLogger").withArgs("cli:commands:build").returns(t.context.log);
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
				name: "a"
			}
		}, {
			metadata: {
				name: "b"
			}
		}]
	};
	const deps = ["*", "a", "b", "b", "c"];
	const depsRegExp = ["^abc$"];

	t.deepEqual(createDependencyList({tree: tree, dependencies: deps, dependenciesRegExp: depsRegExp}),
		["*", "a", "b", /^abc$/]);
	t.is(t.context.log.warn.callCount, 1, "log.warn should be called once");
	t.deepEqual(t.context.log.warn.getCall(0).args, ["Could not find dependency 'c' for 'Sample'."],
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
	const dependencyList = ["a", "b", "c", "d", /e/];
	const excludeList = [/c/, /e/];

	mergeDependencyLists(targetDependencyList, dependencyList, excludeList);
	t.deepEqual(targetDependencyList, [/a/, "b", "d"]);
});

test.serial("alignWithBuilderAPI: * is added to excludedDependencies", (t) => {
	const {alignWithBuilderAPI} = t.context.buildHelper;
	const args = {
		includedDependencies: ["a"],
		excludedDependencies: []
	};
	t.is(alignWithBuilderAPI(false, args.includedDependencies, args.excludedDependencies), true);
	t.deepEqual(args, {
		includedDependencies: ["a"],
		excludedDependencies: ["*"]
	});
});

test.serial("alignWithBuilderAPI: includedDependencies=* is is an alias for buildAll", (t) => {
	const {alignWithBuilderAPI} = t.context.buildHelper;
	const args = {
		includedDependencies: ["*"],
		excludedDependencies: []
	};
	t.is(alignWithBuilderAPI(false, args.includedDependencies, args.excludedDependencies), true);
	t.deepEqual(args, {
		includedDependencies: [],
		excludedDependencies: []
	});
});
