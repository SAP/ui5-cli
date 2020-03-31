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
		// Should not happen via yargs as parameter is mandatory
		throw new Error("Missing mandatory parameter framework-libraries");
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

	const formattedLibraries = libraries.map(($) => $.name).join(" ");
	const library = libraries.length === 1 ? "library": "libraries";
	if (!yamlUpdated) {
		if (argv.config) {
			throw new Error(
				`Internal error while adding framework ${library} ${formattedLibraries} to config at ${argv.config}`
			);
		} else {
			throw new Error(
				`Internal error while adding framework ${library} ${formattedLibraries} to ui5.yaml`
			);
		}
	} else {
		console.log(`Updated configuration written to ${argv.config || "ui5.yaml"}`);
		let logMessage = `Added framework ${library} ${formattedLibraries} as`;
		if (development) {
			logMessage += " development";
		} else if (optional) {
			logMessage += " optional";
		}
		logMessage += libraries.length === 1 ? " dependency": " dependencies";
		console.log(logMessage);
	}
};

module.exports = addCommand;
