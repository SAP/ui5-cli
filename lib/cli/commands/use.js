// Use
const useCommand = {
	command: "use <framework-info>",
	describe: "Initialize or update the project's framework configuration.",
	middlewares: [require("../middlewares/base.js")]
};

useCommand.builder = function(cli) {
	return cli
		.positional("framework-info", {
			describe: "Framework name, version or both (name@version).\n" +
			"Name can be \"SAPUI5\" or \"OpenUI5\" (case-insensitive).\n" +
			"Version can be \"latest\", \"1.xx\" or \"1.xx.x\".",
			type: "string"
		})
		.example("$0 use sapui5@latest", "Use SAPUI5 in the latest available version")
		.example("$0 use openui5@1.76", "Use OpenUI5 in the latest available 1.76 patch version")
		.example("$0 use latest", "Use the latest available version of the configured framework")
		.example("$0 use openui5", "Use OpenUI5 without a version (or use existing version)");
};

function parseFrameworkInfo(frameworkInfo) {
	const parts = frameworkInfo.split("@");
	if (parts.length > 2) {
		// More than one @ sign
		throw new Error("Invalid framework info: " + frameworkInfo);
	}
	if (parts.length === 1) {
		// No @ sign, only name or version
		const nameOrVersion = parts[0];
		if (!nameOrVersion) {
			throw new Error("Invalid framework info: " + frameworkInfo);
		}
		if (["sapui5", "openui5"].includes(nameOrVersion.toLowerCase())) {
			return {
				name: nameOrVersion,
				version: null
			};
		} else {
			return {
				name: null,
				version: nameOrVersion
			};
		}
	} else {
		const [name, version] = parts;
		if (!name || !version) {
			throw new Error("Invalid framework info: " + frameworkInfo);
		}
		return {name, version};
	}
}

useCommand.handler = async function(argv) {
	const frameworkOptions = parseFrameworkInfo(argv["framework-info"]);

	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	const {usedFramework, usedVersion, yamlUpdated} = await require("../../framework/use")({
		normalizerOptions,
		frameworkOptions
	});

	if (!yamlUpdated) {
		if (argv.config) {
			throw new Error(
				`Internal error while updating config at ${argv.config} to ${usedFramework} version ${usedVersion}`
			);
		} else {
			throw new Error(`Internal error while updating ui5.yaml to ${usedFramework} version ${usedVersion}`);
		}
	} else {
		console.log(`Updated configuration written to ${argv.config || "ui5.yaml"}`);
		console.log(`This project is now using ${usedFramework} version ${usedVersion}`);
	}
};

module.exports = useCommand;
