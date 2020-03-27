async function resolveVersion({frameworkName, frameworkVersion}) {
	let Resolver;
	if (frameworkName === "SAPUI5") {
		Resolver = require("@ui5/project").ui5Framework.Sapui5Resolver;
	} else if (frameworkName === "OpenUI5") {
		Resolver = require("@ui5/project").ui5Framework.Openui5Resolver;
	} else {
		throw new Error("Invalid framework.name: " + frameworkName);
	}
	return await Resolver.resolveVersion(frameworkVersion);
}

async function getRootProjectConfiguration({normalizerOptions}) {
	const {normalizer, projectPreprocessor} = require("@ui5/project");

	let tree = await normalizer.generateDependencyTree(normalizerOptions);

	if (normalizerOptions.configPath) {
		tree.configPath = normalizerOptions.configPath;
	}

	// Prevent dependencies from being processed
	tree.dependencies = [];

	tree = await projectPreprocessor.processTree(tree);
}

function getEffectiveFrameworkName({project, frameworkOptions}) {
	if (!project.framework && !frameworkOptions.name) {
		throw new Error("No framework configuration defined. Please provide --framework option!");
	}
	if (project.framework && !project.framework.name) {
		// This should not happen as the configuration should be validated against the schema
		throw new Error("Mandatory framework name missing in project configuration!");
	}
	if (frameworkOptions.name) {
		if (frameworkOptions.name.toLowerCase() === "openui5") {
			return "OpenUI5";
		} else if (frameworkOptions.name.toLowerCase() === "sapui5") {
			return "SAPUI5";
		} else {
			throw new Error("Invalid framework name: " + frameworkOptions.name);
		}
	} else {
		return project.framework.name;
	}
}

module.exports = async function({normalizerOptions, frameworkOptions}) {
	const project = await getRootProjectConfiguration({normalizerOptions});

	const frameworkName = getEffectiveFrameworkName({project, frameworkOptions});
	const resolvedVersion = await resolveVersion({
		frameworkName,
		frameworkVersion: frameworkOptions.version
	});

	await require("./updateYaml")(project, {
		framework: {
			name: frameworkName,
			version: resolvedVersion
		}
	});

	return {
		usedFramework: frameworkName,
		usedVersion: resolvedVersion
	};
};
