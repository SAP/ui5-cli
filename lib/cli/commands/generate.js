// Generate

const baseMiddleware = require("../middlewares/base.js");
const {generateView} = require("../../framework/generate")

const generateCommand = {
	command: "generate <command>",
	describe: "Generate template components to the project.",
	middlewares: [baseMiddleware]
};

generateCommand.builder = function(cli) {
	return cli
		.command("view <name>", "Generate a view to the current project", {
			handler: handleViewGeneration,
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
		.example("$0 generate view sap.m", "Generate a view with the framework library sap.m as dependency.");
};

async function handleGeneration(argv) {
	console.log(argv);
}

async function handleViewGeneration(argv) {
	const name = argv["name"];

	if (!name) {
		// Should not happen via yargs as parameter is mandatory
		throw new Error("Missing mandatory parameter name");
	}

	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	const additionalOptions = {
		controller: argv.controller,
		route: argv.route,
		interactive: argv.interactive
	};

	let namespaceList = [];
	if (argv["namespaces"]) {
		namespaceList = argv["namespaces"].map((name) => {
			const namespace = {name};
			return namespace;
		});
	}

	const {newView} = await generateView({
		name,
		additionalOptions,
		normalizerOptions,
		namespaceList
	});
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
		.option("namespaces", {
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
