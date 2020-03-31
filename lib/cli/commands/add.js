// Use
const addCommand = {
	command: "add [--development] [--optional] <framework-libraries..>",
	describe: "Add a SAPUI5/OpenUI5 framework library to the project configuration.",
	middlewares: [require("../middlewares/base.js")]
};

addCommand.builder = function(cli) {
	return cli.positional("framework-libraries", {
		describe: "Framework library names",
		type: "string"
	}).option("development", {
		describe: "Add as development dependency",
		alias: "D",
		default: false,
		type: "boolean"
	}).option("optional", {
		describe: "Add as optional dependency",
		alias: "O",
		default: false,
		type: "boolean"
	});
};

addCommand.handler = async function(argv) {
	const libraryNames = argv["framework-libraries"] || [];
	const development = argv["development"];
	const optional = argv["optional"];

	if (libraryNames.length === 0) {
		throw new Error("Missing mandatory framework-libraries");
	}

	if (development && optional) {
		throw new Error("Options 'development' and 'optional' can not be combined");
	}

	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	const libraries = libraryNames.map((name) => {
		const library = {name};
		if (optional) {
			library.optional = true;
		} else if (development) {
			library.development = true;
		}
		return library;
	});

	const {yamlUpdated} = await require("../../framework/add")({
		normalizerOptions,
		libraries
	});

	if (!yamlUpdated) {
		if (argv.config) {
			throw new Error(`Failed to add ${libraries.join(" ")} to config at ${argv.config}`);
		} else {
			throw new Error(`Failed to add ${libraries.join(" ")} to ui5.yaml`);
		}
	} else {
		if (argv.config) {
			console.log(`Updated config at ${argv.config}`);
		} else {
			console.log(`Updated ui5.yaml`);
		}
		console.log(`Added ${libraries.map(($) => $.name).join(" ")}`);
	}
};

module.exports = addCommand;
