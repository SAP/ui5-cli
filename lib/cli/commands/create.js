// create

const baseMiddleware = require("../middlewares/base.js");
const create = require("../../framework/create");
const {prompt} = require("enquirer");
const MemAdapter = require("@ui5/fs").adapters.Memory;
const promisify = require("util").promisify;
const fs = require("fs");
const readDir = promisify(fs.readdir);

const {getRootProjectConfiguration} = require("../../framework/utils");

const createCommand = {
	command: "create [command]",
	describe: "Create template components to the project.",
	handler: handleCreation,
	middlewares: [baseMiddleware]
};

createCommand.builder = function(cli) {
	return cli
		.command("view [name]", "Create a view to the current project", {
			handler: handleCreation,
			builder: viewCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("controller [name]", "Create a controller to the current project", {
			handler: handleCreation,
			builder: controllerCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("control [name]", "Create a custom control to the current project", {
			handler: handleCreation,
			builder: customControlCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.option("interactive", {
			describe: "Enable interactive mode",
			alias: "i",
			default: false,
			type: "boolean"
		})
		.example("$0 create --interactive", "run command in interactive mode.");
};

function viewCommandBuilder(cli) {
	return cli
		.option("controller", {
			describe: "Create a corresponding controller (set to false with prefix --no-)",
			alias: "c",
			default: true,
			type: "boolean"
		})
		.option("route", {
			describe: "Create routing configuration",
			alias: "r",
			default: false,
			type: "boolean"
		})
		.option("namespaces", {
			describe: "A list of framework libraries, which should used as additional namespaces in the view.",
			alias: "ns",
			type: "array"
		})
		.positional("name", {
			describe: "View name",
			type: "string"
		})
		.example("$0 create view example --namespaces=sap.m", "create a view with the framework library " +
			"sap.m as namespace.")
		.example("$0 create view example --no-controller", "create a view without a controller.")
		.example("$0 create view example --route", "create a view with route.");
}

function controllerCommandBuilder(cli) {
	return cli
		.option("modules", {
			describe: "A list of modules, which should used in the controller.",
			type: "array"
		})
		.positional("name", {
			describe: "Controller name",
			type: "string"
		})
		.example("$0 create controller example --modules=sap/m/MessageToast", "create a controller " +
			"with the module MessageToast.");
}

function customControlCommandBuilder(cli) {
	return cli
		.option("modules", {
			describe: "A list of modules, which should used in the controller.",
			type: "array"
		})
		.positional("name", {
			describe: "Control name",
			type: "string"
		})
		.example("$0 create control example --modules=sap/m/MessageToast", "create a controller " +
			"with module MessageToast.");
}

async function handleCreation(argv) {
	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	const project = await getProject(normalizerOptions);

	if (argv["interactive"]) {
		await executePrompts(argv, project, normalizerOptions);
	} else if (argv._.length == 1) {
		throw new Error("Component needed. You can run " +
			"this command without component in interactive mode (--interactive, -i)");
	}

	const name = argv["name"];
	if (!name) {
		throw new Error("Missing mandatory parameter 'name'. You can run " +
			"this command without name in interactive mode (--interactive, -i)");
	}

	const metaInformation = await getMetaInformation(argv);

	const statusMessage = await create({
		name,
		metaInformation,
		project
	});

	await logResult(statusMessage, metaInformation);
}

async function getProject(normalizerOptions) {
	const project = await getRootProjectConfiguration({
		normalizerOptions
	});
	if (project.type != "application") {
		throw new Error("Create command is currently only supported for projects of type Application");
	}
	return project;
}

async function executePrompts(argv, project, normalizerOptions) {
	if (argv._.length == 1) {
		const select = await prompt({
			type: "select",
			name: "control",
			message: "Choose a control:",
			choices: ["View", "Controller", "Custom Control"]
		});

		if (select.control == "Custom Control") {
			argv._.push("control");
		} else {
			argv._.push(select.control.toLowerCase());
		}
	}

	if (!argv["name"]) {
		const inputName = await prompt({
			type: "input",
			name: "name",
			message: `Please name your new ${argv._[1]}:`
		});
		argv["name"] = inputName.name;
	}

	if (argv._[1] == "view") {
		await executeViewPrompts(project.framework.libraries, argv);
	} else if (argv._[1] == "controller" || argv._[1] == "control") {
		await executeControlPrompts(argv, project, normalizerOptions);
	}
}

async function executeViewPrompts(libraries, argv) {
	const namespaceList = [];
	for (const o of libraries) {
		if (!o.name.includes("themelib")) {
			namespaceList.push(o.name);
		}
	}
	const viewPrompts = await prompt([
		{
			type: "confirm",
			name: "controller",
			message: "Create a corresponding controller?",
			format: formatConfirmPrompt
		},
		{
			type: "confirm",
			name: "route",
			message: "Add a routing configuration?",
			format: formatConfirmPrompt
		},
		{
			type: "autocomplete",
			name: "namespaces",
			message: "Pick needed namespaces",
			limit: 5,
			multiple: true,
			choices: namespaceList
		}
	]);
	argv["controller"] = viewPrompts.controller;
	argv["route"] = viewPrompts.route;
	argv["namespaces"] = viewPrompts.namespaces;
}

async function executeControlPrompts(argv, project, normalizerOptions) {
	const normalizer = require("@ui5/project").normalizer;
	const resourceFactory = require("@ui5/fs").resourceFactory;
	const tree = await normalizer.generateProjectTree(normalizerOptions);

	const projectWriters = {};
	const virtualFileSystemList = await resourceFactory.createCollectionsForTree(tree, {
		virtualReaders: projectWriters,
		getVirtualBasePathPrefix: function({project: tree, virBasePath}) {
			if (tree.type === "application" && tree.metadata.namespace) {
				return "/resources/" + tree.metadata.namespace;
			}
		}
	}).dependencies._readers;

	console.log(virtualFileSystemList);
	console.log(virtualFileSystemList[0]._project.metadata.namespace);
	const path = require("path");

	const moduleList = [];
	for (const firstLevelDependency of virtualFileSystemList) {
		if (!firstLevelDependency._project.type.includes("theme")) {
			const files = await readDir(firstLevelDependency._fsBasePath + "/" + firstLevelDependency._project.metadata.namespace);
			const targetFiles = files.filter(function(file) {
				return path.extname(file).toLowerCase() === ".js" && /[A-Z]/.test( file[0]);
			});
			for (const file of targetFiles) {
				moduleList.push(firstLevelDependency._project.metadata.namespace + "/" + file.split(".")[0]);
			}
		}
	}

	const controlPrompts = await prompt([
		{
			type: "autocomplete",
			name: "modules",
			message: "Pick needed modules",
			limit: 5,
			multiple: true,
			choices: moduleList
		}
	]);
	argv["modules"] = controlPrompts.modules;
}

function formatConfirmPrompt(value) {
	return this.isTrue(value) ? "yes" : "no";
}

async function getMetaInformation(argv) {
	const namespaceList = createList(argv["namespaces"] || []);

	const moduleList = createList(argv["modules"] || []);

	const metaInformation = {
		controller: argv.controller,
		route: argv.route,
		namespaceList: namespaceList,
		moduleList: moduleList,
		type: argv["_"][1]
	};
	return metaInformation;
}

function createList(array) {
	const list = array.map((name) => {
		const item = {name};
		return item;
	});
	return list;
}

async function logResult(statusMessage, metaInformation) {
	let logMessage;
	if (!statusMessage) {
		throw new Error(
			"Internal error while adding component"
		);
	} else if (statusMessage == "view") {
		logMessage = "Add new view";
		if (metaInformation.controller) {
			logMessage += " with corresponding controller";
		}
		if (metaInformation.route) {
			logMessage += " and route to it";
		}
	} else if (statusMessage == "controller") {
		logMessage = "Add new controller";
	} else if (statusMessage == "control") {
		logMessage = "Add new control";
	} else if (statusMessage == "route") {
		logMessage = "Add route to view";
	} else {
		throw new Error(
			"Internal error"
		);
	}
	console.log(logMessage);
}

module.exports = createCommand;
