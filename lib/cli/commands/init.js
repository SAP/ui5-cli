// Init

const fsHelper = require("../../utils/fsHelper");
const init = require("../../init/init");
const promisify = require("util").promisify;
const path = require("path");
const {createManifest} = require("../../framework/create");
const fs = require("fs");
const jsYaml = require("js-yaml");
const writeFile = promisify(fs.writeFile);
const {Input} = require("enquirer");

const initCommand = {
	command: "init [namespace]",
	describe: "Initialize the UI5 Tooling configuration for an application or library project.",
	builder: (cli) => {
		return cli
			.positional("namespace", {
				describe: "namespace for project",
				type: "string"
			});
	},
	middlewares: [require("../middlewares/base.js")]
};

initCommand.handler = async function(argv) {
	const yamlPath = path.resolve("./ui5.yaml");
	if (await fsHelper.exists(yamlPath)) {
		throw new Error("Initialization not possible: ui5.yaml already exists");
	}

	const projectConfig = await init.init();
	let savePath = path.resolve("");
	if (projectConfig.type == "application") {
		savePath = path.resolve("./webapp");
	} else if (projectConfig.type == "library") {
		savePath = path.resolve("./src");
	}
	if (!await fsHelper.exists(`${savePath}/manifest.json`)) {
		let namespace = argv["namespace"];
		while (!namespace) {
			const prompt = new Input({
				message: "Name your namespace for the project: "
			});
			const inputName = await prompt.run();
			namespace = inputName;
		}
		await createManifest({
			namespace: namespace.replace("/", "."),
			project: projectConfig,
			savePath: savePath
		});
	}

	const yaml = jsYaml.safeDump(projectConfig);

	await writeFile(yamlPath, yaml);
	console.log(`Wrote ui5.yaml to ${yamlPath}:\n`);
	console.log(yaml);
};

module.exports = initCommand;
