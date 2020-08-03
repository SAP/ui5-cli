// Generate

const baseMiddleware = require("../middlewares/base.js");
const generate = require("../../framework/generate");
const {prompt} = require("enquirer");

const generateCommand = {
	command: "generate [command]",
	describe: "Generate template components to the project.",
	handler: handleGeneration,
	middlewares: [baseMiddleware]
};

generateCommand.builder = function(cli) {
	return cli
		.command("view [name]", "Generate a view to the current project", {
			handler: handleGeneration,
			builder: viewCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("controller <name>", "Generate a controller to the current project", {
			handler: handleGeneration,
			builder: controllerCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("control <name>", "Generate a custom control to the current project", {
			handler: handleGeneration,
			builder: customControlCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.option("interactive", {
			describe: "Enable/Disable interactive mode",
			alias: "i",
			default: false,
			type: "boolean"
		})
		.example("$0 generate view example sap.m", "Generate a view with the framework library sap.m as namespace.");
};

async function handleGeneration(argv) {
	if (argv["interactive"]) {
		argv = await executePrompts(argv);
	} else if (argv._.length == 1) {
		throw new Error("Component needed. You can run " +
			"this command without component in interactive mode (--interactive, -i)");
	}
	console.log(argv);
	if (argv["_"][1] == "view") {
		await handleViewGeneration(argv);
	}
}

async function executePrompts(argv) {
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
				message: "Generate a corresponding controller?"
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

async function handleViewGeneration(argv) {
	const name = argv["name"];
	const namespaceNames = argv["namespace"] || [];

	if (!name) {
		throw new Error("Missing mandatory parameter name. You can run " +
			"this command without parameter in interactive mode (--interactive, -i)");
	}

	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	const namespaceList = namespaceNames.map((name) => {
		const namespace = {name};
		return namespace;
	});

	const metaInformation = {
		controller: argv.controller,
		route: argv.route,
		interactive: argv.interactive,
		namespaceList: namespaceList,
		type: argv["_"][1]
	};

	const newView = await generate({
		name,
		metaInformation,
		normalizerOptions
	});

	const namespace = namespaceNames.length === 1 ? "namespace": "namespaces";
	if (!newView) {
		throw new Error(
			"Internal error while adding view"
		);
	} else {
		let logMessage = "Added view";
		if (metaInformation.controller) {
			logMessage += " with corresponding controller";
		} else if (metaInformation.route) {
			logMessage += " and route";
		} else if (namespaceNames.length > 0) {
			logMessage += `, ${namespace}: ${namespaceNames.join(" ")}`;
		}
		logMessage += " to project";
		console.log(logMessage);
	}
}

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

module.exports = generateCommand;
