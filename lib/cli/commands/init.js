// Init
const initCommand = {
	command: "init",
	describe: "Initialize the UI5 Build and Development Tooling configuration for an application or library project.",
	middlewares: [require("../middlewares/base.js")]
};

initCommand.lazyRequireDependencies = async function() {
	return {
		validate: require("../../utils/validate"),
		init: require("../../init/init"),
		promisify: require("util").promisify,
		path: require("path"),
		fs: require("fs"),
		jsYaml: require("js-yaml")
	};
};

initCommand.handler = async function() {
	const {validate, init, promisify, path, fs, jsYaml} = initCommand.lazyRequireDependencies();
	const writeFile = promisify(fs.writeFile);
	try {
		const yamlPath = path.resolve("./ui5.yaml");
		if (await validate.exists(yamlPath)) {
			throw new Error("Initialization not possible: ui5.yaml already exists");
		}

		const projectConfig = await init.init();
		const yaml = jsYaml.safeDump(projectConfig);

		await writeFile(yamlPath, yaml);
		console.log(`Wrote ui5.yaml to ${yamlPath}:\n`);
		console.log(yaml);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

module.exports = initCommand;
