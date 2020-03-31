// Use
const useCommand = {
	command: "use <framework-info>",
	describe: "Initialize or update the UI5 Tooling framework configuration.",
	middlewares: [require("../middlewares/base.js")]
};

useCommand.builder = function(cli) {
	return cli.positional("framework-info", {
		describe: "Framework name, version or both",
		type: "string"
	});
};

const versionRegExp = /^(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/;

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
		if (nameOrVersion === "latest" || versionRegExp.test(nameOrVersion)) {
			return {
				name: null,
				version: nameOrVersion
			};
		} else {
			return {
				name: nameOrVersion,
				version: null
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
			throw new Error(`Failed to update config at ${argv.config} to ${usedFramework} version ${usedVersion}`);
		} else {
			throw new Error(`Failed to update ui5.yaml to ${usedFramework} version ${usedVersion}`);
		}
	} else {
		if (argv.config) {
			console.log(`Updated config at ${argv.config}`);
		} else {
			console.log(`Updated ui5.yaml`);
		}
		console.log(`Now using ${usedFramework} version: ${usedVersion}`);
	}
};

module.exports = useCommand;
