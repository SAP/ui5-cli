// Generate

const baseMiddleware = require("../middlewares/base.js");
const create = require("../../framework/create");
const {prompt} = require("enquirer");

const {getRootProjectConfiguration, getFrameworkResolver} = require("../../framework/utils");

const generateCommand = {
	command: "create [command]",
	describe: "Create template components to the project.",
	handler: handleCreation,
	middlewares: [baseMiddleware]
};

generateCommand.builder = function(cli) {
	return cli
		.command("view [name]", "Create a view to the current project", {
			handler: handleCreation,
			builder: viewCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("controller <name>", "Create a controller to the current project", {
			handler: handleCreation,
			builder: controllerCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("control <name>", "Create a custom control to the current project", {
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
		.example("$0 create view example sap.m", "create a view with the framework library sap.m as namespace.");
};

function viewCommandBuilder(cli) {
	return cli
		.option("controller", {
			describe: "Create a corresponding controller",
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
		.option("namespace", {
			describe: "A list of framework libraries, which should used as additional namespaces in the view.",
			type: "array"
		})
		.positional("name", {
			describe: "View name",
			demandOption: "Need view name",
			type: "string"
		});
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
		});
}

function customControlCommandBuilder(cli) {
	return cli
		.option("parent", {
			describe: "The control, which will be extended.",
			alias: "p",
			type: "string"
		})
		.positional("name", {
			describe: "Control name",
			type: "string"
		});
}

async function handleCreation(argv) {
	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	const project = await getProject(normalizerOptions);

	if (argv["interactive"]) {
		argv = await executePrompts(argv, project);
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

	const newComponent = await create({
		name,
		metaInformation,
		project
	});

	await logResult(newComponent, metaInformation);
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

async function resolveProjectFramework(project) {
	if (!project.framework) {
		throw new Error(
			`Project ${project.metadata.name} is missing a framework configuration. ` +
			`Please use "ui5 use" to configure a framework and version.`
		);
	}
	if (!project.framework.version) {
		throw new Error(
			`Project ${project.metadata.name} does not define a framework version configuration. ` +
			`Please use "ui5 use" to configure a version.`
		);
	}

	const Resolver = getFrameworkResolver(project.framework.name);

	const resolver = new Resolver({
		cwd: project.path,
		version: project.framework.version
	});
	return resolver;
}

async function executePrompts(argv, project) {
	const frameworkResolver = await resolveProjectFramework(project);

	if (argv._.length == 1) {
		const select = await prompt({
			type: "select",
			name: "control",
			message: "Choose a control:",
			choices: ["View", "Contoller", "Custom Control"]
		});

		if (select.control == "Custom Control") {
			argv._.push("control");
		} else {
			argv._.push(select.control.toLowerCase());
		}
	}

	const inputName = await prompt({
		type: "input",
		name: "name",
		message: `Please name your new ${argv._[1]}:`
	});
	argv["name"] = inputName.name;

	if (argv._[1] == "view") {
		const viewPrompts = await prompt([
			{
				type: "confirm",
				name: "controller",
				message: "Create a corresponding controller?"
			},
			{
				type: "confirm",
				name: "route",
				message: "Add a routing configuration?"
			},
			{
				type: "multiselect",
				name: "namespace",
				message: "Pick needed namespaces",
				choices: [
					"sap.m",
					"sap.ui.unified",
					"sap.ui.core",
					"sap.ui.table"
				]
			}
		]);
		argv["controller"] = viewPrompts.controller;
		argv["route"] = viewPrompts.route;
		argv["namespace"] = viewPrompts.namespace;
	}

	return argv;
}

async function getMetaInformation(argv) {
	const namespaceNames = argv["namespace"] || [];
	const namespaceList = namespaceNames.map((name) => {
		const namespace = {name};
		return namespace;
	});

	const metaInformation = {
		controller: argv.controller,
		route: argv.route,
		namespaceList: namespaceList,
		type: argv["_"][1]
	};
	return metaInformation;
}

async function logResult(newComponent, metaInformation) {
	if (!newComponent) {
		throw new Error(
			"Internal error while adding view"
		);
	} else {
		let logMessage = "Added view";
		if (metaInformation.controller) {
			logMessage += " with corresponding controller";
		}
		if (metaInformation.route) {
			logMessage += " and route";
		}
		logMessage += " to project";
		console.log(logMessage);
	}
}

module.exports = generateCommand;
