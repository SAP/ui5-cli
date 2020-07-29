// Generate

const baseMiddleware = require("../middlewares/base.js");

const generateCommand = {
	command: "generate <command>",
	describe: "Generate template components to the project.",
	middlewares: [baseMiddleware]
};

generateCommand.builder = function(cli) {
	return cli
		.command("view <name> [<framework-libraries..>]", "Generate a view to the current project", {
			handler: handleGeneration,
			builder: viewOptions,
			middlewares: [baseMiddleware]
		})
		.command("controller <name>", "Generate a controller to the current project", {
			handler: handleGeneration,
			builder: noop,
			middlewares: [baseMiddleware]
		})
		.command("control <name> [parent-control]", "Generate a custom control to the current project", {
			handler: handleGeneration,
			builder: noop,
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

}

function viewOptions(cli) {
	return cli
		.option("controller", {
			describe: "Creates a corresponding controller",
			alias: "c",
			default: false,
			type: "boolean"
		});
}

function noop() {}

module.exports = generateCommand;
