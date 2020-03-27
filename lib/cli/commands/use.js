// Use
const useCommand = {
	command: "use <frameworkVersion> [--framework=openui5|sapui5]",
	describe: "Initialize or update the UI5 Tooling framework configuration.",
	middlewares: [require("../middlewares/base.js")]
};

useCommand.builder = function(cli) {
	return cli.positional("frameworkVersion", {
		describe: "Version",
		type: "string"
	}).option("framework", {
		describe: "Framework",
		type: "string"
	});
};

useCommand.handler = async function(argv) {
	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};
	const frameworkOptions = {
		name: argv.frameworkName,
		version: argv.frameworkVersion
	};
	const {usedFramework, usedVersion} = await require("../../framework/use")({
		normalizerOptions,
		frameworkOptions
	});

	if (argv.config) {
		console.log(`Updated config at ${argv.config}`);
	} else {
		console.log(`Updated ui5.yaml`);
	}
	console.log(`Now using ${usedFramework} version: ${usedVersion}`);
};

module.exports = useCommand;
