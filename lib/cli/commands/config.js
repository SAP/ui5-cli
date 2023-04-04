import path from "node:path";
import os from "node:os";
import chalk from "chalk";
import baseMiddleware from "../middlewares/base.js";

const ALLOWED_KEYS = ["snapshotEndpointUrl"];
const ui5RcFilePath = path.resolve(path.join(os.homedir(), ".ui5rc"));

const configCommand = {
	command: "config",
	describe: "Configures the `.ui5rc` file.",
	middlewares: [baseMiddleware],
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
	const config = await readConfig();

	if (key && !ALLOWED_KEYS.includes(key)) {
		throw new Error(`The provided key is not part of the .ui5rc allowed options: ${ALLOWED_KEYS.join(", ")}`);
	}

	if (commandArgs.includes("list")) {
		console.log(`Listing properties from ${chalk.dim(ui5RcFilePath)}:
${formatJsonForOutput(config)}`);
	} else if (commandArgs.includes("get")) {
		console.log(`Getting property ${chalk.bold(key)} from ${chalk.dim(ui5RcFilePath)}:
${formatJsonForOutput(config, key)}`);
	} else if (commandArgs.includes("set")) {
		const newConfig = {};
		newConfig[key] = value;

		console.log(`Set property ${chalk.bold(key)} into ${chalk.dim(ui5RcFilePath)}:
${formatJsonForOutput(newConfig, key)}`);

		await saveConfig({...config, ...newConfig});
	}
}

function formatJsonForOutput(config, filterKey) {
	return Object.keys(config)
		.filter((key) => !filterKey || filterKey === key)
		.map(
			(key) => `  ${key} = ${config[key]}\n`
		).join("");
}

async function readConfig() {
	const {default: fs} = await import("graceful-fs");
	const {promisify} = await import("node:util");
	const readFile = promisify(fs.readFile);
	let config;
	try {
		const fileContent = await readFile(ui5RcFilePath);
		config = JSON.parse(fileContent);
	} catch (err) {
		if (err.code === "ENOENT") {
			// "File or directory does not exist"
			config = {};
		} else {
			throw err;
		}
	}
	return config;
}

async function saveConfig(config) {
	const {default: fs} = await import("graceful-fs");
	const {promisify} = await import("node:util");
	const writeFile = promisify(fs.writeFile);

	return writeFile(ui5RcFilePath, JSON.stringify(config));
}

export default configCommand;
