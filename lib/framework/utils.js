async function getRootProjectConfiguration({normalizerOptions}) {
	const {normalizer, projectPreprocessor} = require("@ui5/project");

	const tree = await normalizer.generateDependencyTree(normalizerOptions);

	if (normalizerOptions.configPath) {
		tree.configPath = normalizerOptions.configPath;
	}

	// Prevent dependencies from being processed
	tree.dependencies = [];

	return projectPreprocessor.processTree(tree);
}

function getFrameworkResolver(frameworkName) {
	if (frameworkName === "SAPUI5") {
		return require("@ui5/project").ui5Framework.Sapui5Resolver;
	} else if (frameworkName === "OpenUI5") {
		return require("@ui5/project").ui5Framework.Openui5Resolver;
	} else {
		throw new Error("Invalid framework.name: " + frameworkName);
	}
}

module.exports.getRootProjectConfiguration = getRootProjectConfiguration;
module.exports.getFrameworkResolver = getFrameworkResolver;
