// Use
const addCommand = {
	command: "add <framework-libraries..>",
	describe: "Add a SAPUI5/OpenUI5 framework library to the project configuration.",
	middlewares: [require("../middlewares/base.js")]
};

addCommand.builder = function(cli) {
	return cli.positional("framework-libraries", {
		describe: "Framework library names",
		type: "string"
	});
};

addCommand.handler = async function(argv) {
	const libraries = argv["framework-libraries"];

	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	const {yamlUpdated} = await require("../../framework/add")({
		normalizerOptions,
		libraries
	});

	if (!yamlUpdated) {
		if (argv.config) {
			console.log(`Failed to add ${libraries.join(" ")} to config at ${argv.config}`);
		} else {
			console.log(`Failed to add ${libraries.join(" ")} to ui5.yaml`);
		}
	} else {
		if (argv.config) {
			console.log(`Updated config at ${argv.config}`);
		} else {
			console.log(`Updated ui5.yaml`);
		}
		console.log(`Added ${libraries.join(" ")}`);
	}
};

module.exports = addCommand;
