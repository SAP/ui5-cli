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

async function resolveVersion({frameworkName, frameworkVersion}) {
	let Resolver;
	if (frameworkName.toLowerCase() === "sapui5") {
		Resolver = require("@ui5/project").ui5Framework.Sapui5Resolver;
	} else if (frameworkName.toLowerCase() === "openui5") {
		Resolver = require("@ui5/project").ui5Framework.Openui5Resolver;
	} else {
		throw new Error("Invalid framework.name: " + frameworkName);
	}
	return await Resolver.resolveVersion(frameworkVersion);
}

useCommand.handler = async function(argv) {
	const frameworkVersion = argv.frameworkVersion;
	let frameworkName = argv.framework;

	// TODO: how to read current project configuration to check whether framework config exists?
	const project = require("js-yaml").safeLoad(require("fs").readFileSync("./ui5.yaml"));
	const frameworkConfig = project.framework;

	if (!frameworkConfig && !frameworkName) {
		// No framework configuration and no framework name specified
		// => Ask user
		// TODO: Ask user
		frameworkName = "openui5";
	} else if (!frameworkConfig.name) {
		throw new Error("Mandatory framework name missing!");
	} else {
		frameworkName = frameworkName || frameworkConfig.name;
	}

	// Given framework is different than configured framework
	// => Adopt name

	// TODO: Adopt existing configuration

	console.log(await resolveVersion({
		frameworkName,
		frameworkVersion
	}));
};

module.exports = useCommand;
