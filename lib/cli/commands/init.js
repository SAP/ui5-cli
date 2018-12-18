const init = require("../../init/init");
const {promisify} = require("util");
const path = require("path");
const fs = require("fs");
const safeDumpYaml = require("js-yaml").safeDump;
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Init
const initCommand = {
	command: "init",
	describe: "Initialize the UI5 Build and Development Tooling configuration for an application or library project.",
	middlewares: [require("../middlewares/base.js")]
};

initCommand.fileExists = async function fileExists(filePath) {
	try {
		await stat(filePath);
		return true;
	} catch (err) {
		// "File or directory does not exist"
		if (err.code === "ENOENT") {
			return false;
		} else {
			throw err;
		}
	}
};

initCommand.handler = async function() {
	try {
		const yamlPath = path.resolve("./ui5.yaml");
		if (await initCommand.fileExists(yamlPath)) {
			throw new Error("Initialization not possible: ui5.yaml already exists");
		}

		const projectConfig = await init();
		const yaml = safeDumpYaml(projectConfig);

		await writeFile(yamlPath, yaml);

		console.log(`Wrote ui5.yaml to ${yamlPath}:\n`);
		console.log(yaml);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

module.exports = initCommand;
