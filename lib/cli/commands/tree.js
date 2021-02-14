// Tree
const tree = {
	command: "tree",
	describe:
		"Outputs the dependency tree of the current project to stdout. " +
		"It takes all relevant parameters of ui5 build into account.",
	middlewares: [require("../middlewares/base.js")]
};

tree.builder = function(cli) {
	return cli
		.option("full", {
			describe: "Include more information (currently the project configuration)",
			default: false,
			type: "boolean"
		})
		.option("json", {
			describe: "Output tree as formatted JSON string",
			default: false,
			type: "boolean"
		})
		.option("dedupe", {
			describe: "Remove duplicate projects from project tree",
			default: false,
			type: "boolean"
		})
		.option("framework-version", {
			describe:
				"Overrides the framework version defined by the project. Only supported in combination with --full",
			type: "string"
		})
		.option("x-graph-mode", {
			describe: "Uses an experimental project graph instead of a dependency tree",
			default: false,
			type: "boolean"
		})
		.option("x-perf", {
			describe: "Outputs performance measurements",
			default: false,
			type: "boolean"
		})
		.check((argv) => {
			if (argv.frameworkVersion && !argv.full) {
				throw new Error(`"framework-version" can only be used in combination with option "--full"`);
			} else {
				return true;
			}
		})
		.example("ui5 tree > tree.txt", "Pipes the dependency tree into a new file \"tree.txt\"")
		.example("ui5 tree --json > tree.json", "Pipes the dependency tree into a new file \"tree.json\"");
};

tree.handler = async function(argv) {
	const normalizer = require("@ui5/project").normalizer;
	const treeify = require("treeify");
	const chalk = require("chalk");

	const options = {
		translatorName: argv.translator,
		translatorOptions: {
			includeDeduped: !argv.dedupe
		},
		configPath: argv.config
	};

	if (argv.frameworkVersion ) {
		options.frameworkOptions = {
			versionOverride: argv.frameworkVersion
		};
	}

	let startTime;
	let elapsedTime;
	if (argv.xPerf) {
		startTime = process.hrtime();
	}
	if (argv.xGraphMode) {
		const graph = await normalizer.generateProjectGraph(options);

		if (argv.xPerf) {
			elapsedTime = getElapsedTime(startTime);
		}

		const projects = {};
		const indentWidth = 4;
		await graph.traverseBreadthFirst(async ({project, getDependencies}) => {
			const deps = getDependencies().map((dep) => {
				return dep.getName();
			});
			projects[project.getName()] = {
				render: function(indentation, connectorIndices, lastChild) {
					let baseString = " ".repeat(indentation * indentWidth);
					connectorIndices.forEach((idx) => {
						baseString = `${baseString.slice(0, idx)}│${baseString.slice(idx + 1)}`;
					});
					const connectorString = lastChild ? "╰─" : "├─";
					console.log(
						`${baseString}${connectorString} ${chalk.bold(project.getName())} ` +
						chalk.dim(`(${project.getVersion()}, ${project.getType()}) `) +
						chalk.dim.italic(`${project.getPath()}`)
					);

					const lastIdx = deps.length -1;
					const newConnectorIndices = [...connectorIndices];
					if (!lastChild) {
						newConnectorIndices.push(indentation * indentWidth);
					}
					deps.forEach((dep, i) => {
						projects[dep].render(indentation + 1, newConnectorIndices, i === lastIdx);
					});
				}
			};
		});

		const projectKeys = Object.keys(projects);
		console.log(chalk.bold.underline(`Dependencies (${projectKeys.length}):`));
		projects[projectKeys[0]].render(0, [], true);
		console.log("");

		const extensions = Object.entries(graph.getAllExtensions());
		console.log(chalk.bold.underline(`Extensions (${extensions.length}):`));
		if (extensions.length) {
			extensions.forEach((extension) => {
				console.log(
					`${" ".repeat(indentWidth)} ├─ ${extension.getName()}` +
					chalk.dim(`(${extension.getVersion()}, ${extension.getType()}) `) +
					chalk.dim.italic(`${extension.getPath()}`));
			});
		} else {
			console.log(chalk.italic(`None`));
		}
	} else {
		let projectTree;
		if (argv.full) {
			projectTree = await normalizer.generateProjectTree(options);
		} else {
			projectTree = await normalizer.generateDependencyTree(options);
		}
		if (argv.xPerf) {
			elapsedTime = getElapsedTime(startTime);
		}


		const output = argv.json ? JSON.stringify(projectTree, null, 4) : treeify.asTree(projectTree, true);
		console.log(output);
	}

	if (argv.xPerf) {
		console.log("");
		console.log(chalk.blue(`Normalizer took ${chalk.bold(elapsedTime)}`));
	}
};

function getElapsedTime(startTime) {
	const timeDiff = process.hrtime(startTime);
	const prettyHrtime = require("pretty-hrtime");
	return prettyHrtime(timeDiff);
}
module.exports = tree;
