import path from "node:path";
import os from "node:os";
import chalk from "chalk";
import baseMiddleware from "../middlewares/base.js";
// Internal module that is not exposed in package.json. Workaround in order to make it available for the CLI.
import Configuration from "../../../node_modules/@ui5/project/lib/config/Configuration.js";

const ALLOWED_KEYS = ["snapshotEndpointUrl"];
const ui5RcFilePath = path.resolve(path.join(os.homedir(), ".ui5rc"));

const configCommand = {
	command: "config",
	describe: "Configures the `.ui5rc` file.",
	middlewares: [baseMiddleware],
	handler: handleConfig
};

configCommand.builder = function(cli) {
	return cli
		.command("set <key> <value>", "Sets a property in `.ui5rc`", {
			handler: handleConfig,
			builder: noop,
			middlewares: [baseMiddleware],
		})
		.command("get <key>", "Gets a property from `.ui5rc`", {
			handler: handleConfig,
			builder: noop,
			middlewares: [baseMiddleware],
		})
		.command("list", "List settings stored in `.ui5rc`", {
			handler: handleConfig,
			builder: noop,
			middlewares: [baseMiddleware],
		});
};

function noop() {}

async function handleConfig(argv) {
	const {_: commandArgs, key, value} = argv;

	if (key && !ALLOWED_KEYS.includes(key)) {
		throw new Error(`The provided key is not part of the .ui5rc allowed options: ${ALLOWED_KEYS.join(", ")}`);
	}

	const config = await Configuration.fromFile();

	if (commandArgs.includes("list")) {
		console.log(`Listing properties from ${chalk.dim(ui5RcFilePath)}:
${formatJsonForOutput(config.toJSON())}`);
	} else if (commandArgs.includes("get")) {
		console.log(`Getting property ${chalk.bold(key)} from ${chalk.dim(ui5RcFilePath)}:
${formatJsonForOutput(config.toJSON(), key)}`);
	} else if (commandArgs.includes("set")) {
		const jsonConfig = config.toJSON();
		if (value) {
			jsonConfig[key] = value;
		} else {
			delete jsonConfig[key];
		}

		console.log(`Set property ${chalk.bold(key)} into ${chalk.dim(ui5RcFilePath)}:
${formatJsonForOutput(jsonConfig, key)}`);

		await Configuration.toFile(new Configuration(jsonConfig));
	}
}

function formatJsonForOutput(config, filterKey) {
	return Object.keys(config)
		.filter((key) => !filterKey || filterKey === key)
		.map(
			(key) => `  ${key} = ${config[key]}\n`
		).join("");
}

export default configCommand;
