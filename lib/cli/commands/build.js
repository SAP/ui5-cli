// Build

const baseMiddleware = require("../middlewares/base.js");
const buildHelper = require("../../utils/buildHelper");

const build = {
	command: "build",
	describe: "Build project in current directory",
	handler: handleBuild,
	middlewares: [baseMiddleware]
};

build.builder = function(cli) {
	return cli
		.command("dev", "Dev build: Skips non-essential and time-intensive tasks during build", {
			handler: handleBuild,
			builder: noop,
			middlewares: [baseMiddleware]
		})
		.command("jsdoc", "Build JSDoc resources", {
			handler: handleBuild,
			builder: noop,
			middlewares: [baseMiddleware]
		})
		.command("preload", "(default) Build project and create preload bundles", {
			handler: handleBuild,
			builder: noop,
			middlewares: [baseMiddleware]
		})
		.command("self-contained", "Build project and create self-contained bundle", {
			handler: handleBuild,
			builder: noop,
			middlewares: [baseMiddleware]
		})
		.option("all", {
			describe: "Include all project dependencies into build process",
			alias: "a",
			default: false,
			type: "boolean"
		})
		.option("include-dependency", {
			describe: "A list of dependencies to be included into the build process",
			type: "array"
		})
		.option("include-dependency-regexp", {
			describe: "A list of regular expressions defining dependencies to be included into the build process",
			type: "array"
		})
		.option("include-dependency-tree", {
			describe: "A list of dependencies to be included into the build process; sub-dependencies are" +
				" implicitly included and do not need to be part of this list",
			type: "array"
		})
		.option("exclude-dependency", {
			describe: "A list of dependencies to be excluded from the build process",
			type: "array"
		})
		.option("exclude-dependency-regexp", {
			describe: "A list of regular expressions defining dependencies to be excluded from the build process",
			type: "array"
		})
		.option("exclude-dependency-tree", {
			describe: "A list of dependencies to be excluded from the build process; sub-dependencies are" +
				" implicitly included and do not need to be part of this list",
			type: "array"
		})
		.option("dest", {
			describe: "Path of build destination",
			default: "./dist",
			type: "string"
		})
		.option("clean-dest", {
			describe: "If present, clean the destination directory before building",
			default: false,
			type: "boolean"
		})
		.option("dev-exclude-project", {
			describe:
				"A list of specific projects to be excluded from dev mode " +
				"(dev mode must be active for this to be effective)",
			type: "array"
		})
		.option("include-task", {
			describe: "A list of specific tasks to be included to the default/dev set",
			type: "array"
		})
		.option("exclude-task", {
			describe: "A list of specific tasks to be excluded from default/dev set",
			type: "array"
		})
		.option("framework-version", {
			describe: "Overrides the framework version defined by the project",
			type: "string"
		})
		.example("ui5 build --all", "Preload build for project and dependencies to \"./dist\"")
		.example("ui5 build --all --exclude-task=* --include-task=createDebugFiles generateAppPreload",
			"Build project and dependencies but only apply the createDebugFiles- and generateAppPreload tasks")
		.example("ui5 build --all --include-task=createDebugFiles --exclude-task=generateAppPreload",
			"Build project and dependencies by applying all default tasks including the createDebugFiles " +
			"task and excluding the generateAppPreload task")
		.example("ui5 build dev --all --dev-exclude-project=sap.ui.core sap.m",
			"Build project and dependencies in dev mode, except \"sap.ui.core\" and \"sap.m\" " +
			"(useful in combination with --include-task)")
		.example("ui5 build dev",
			"Build project and dependencies in dev mode. Only a set of essential tasks is executed.");
};

async function handleBuild(argv) {
	const normalizer = require("@ui5/project").normalizer;
	const builder = require("@ui5/builder").builder;
	const logger = require("@ui5/logger");

	const command = argv._[argv._.length - 1];
	logger.setShowProgress(true);

	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	if (argv.frameworkVersion) {
		normalizerOptions.frameworkOptions = {
			versionOverride: argv.frameworkVersion
		};
	}

	const tree = await normalizer.generateProjectTree(normalizerOptions);
	const buildSettings = (tree.builder && tree.builder.settings) || {};

	const includedDependencies = buildHelper.createDependencyList({
		tree: tree,
		dependencies: argv["include-dependency"],
		dependenciesRegExp: argv["include-dependency-regexp"]
	});
	const includedDependencyTrees = buildHelper.createDependencyList({
		tree: tree,
		dependencies: argv["include-dependency-tree"],
		handleSubtree: true
	});
	const excludedDependencies = buildHelper.createDependencyList({
		tree: tree,
		dependencies: argv["exclude-dependency"],
		dependenciesRegExp: argv["exclude-dependency-regexp"]
	});
	const excludedDependencyTrees = buildHelper.createDependencyList({
		tree: tree,
		dependencies: argv["exclude-dependency-tree"],
		handleSubtree: true
	});
	const defaultIncludedDependencies = buildHelper.createDependencyList({
		tree: tree,
		dependencies: buildSettings.includeDependency,
		dependenciesRegExp: buildSettings.includeDependencyRegExp
	});
	const defaultIncludedDependencyTrees = buildHelper.createDependencyList({
		tree: tree,
		dependencies: buildSettings.includeDependencyTree,
		handleSubtree: true
	});

	// Append resolved include-trees to includedDependencies, ignoring excluded projects
	buildHelper.mergeDependencyLists(includedDependencies, includedDependencyTrees, excludedDependencies);
	// Append resolved exclude-trees to excludedDependencies, ignoring explicitly included projects
	buildHelper.mergeDependencyLists(excludedDependencies, excludedDependencyTrees, includedDependencies);

	// Combine dependencies set in build settings and append them to includedDependencies, ignoring excluded projects
	Array.prototype.push.apply(defaultIncludedDependencies, defaultIncludedDependencyTrees);
	buildHelper.mergeDependencyLists(includedDependencies, defaultIncludedDependencies, excludedDependencies);

	const buildAll = buildHelper.alignWithBuilderApi(argv.all, includedDependencies, excludedDependencies);

	await builder.build({
		tree: tree,
		destPath: argv.dest,
		cleanDest: argv["clean-dest"],
		buildDependencies: buildAll,
		includedDependencies: includedDependencies,
		excludedDependencies: excludedDependencies,
		dev: command === "dev",
		selfContained: command === "self-contained",
		jsdoc: command === "jsdoc",
		devExcludeProject: argv["dev-exclude-project"],
		includedTasks: argv["include-task"],
		excludedTasks: argv["exclude-task"]
	});
}

function noop() {}

module.exports = build;
