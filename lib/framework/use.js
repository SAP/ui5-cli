const {getRootProjectConfiguration, getFrameworkResolver} = require("./utils");

async function resolveVersion({frameworkName, frameworkVersion}) {
	return await getFrameworkResolver(frameworkName).resolveVersion(frameworkVersion);
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

function isValidSpecVersion(specVersion) {
	return specVersion !== "0.1" && specVersion !== "1.0" && specVersion !== "1.1";
}

module.exports = async function({normalizerOptions, frameworkOptions}) {
	const project = await getRootProjectConfiguration({normalizerOptions});

	if (!isValidSpecVersion(project.specVersion)) {
		throw new Error(
			`ui5 use command requires specVersion "2.0" or higher. ` +
			`Project ${project.metadata.name} uses specVersion "${project.specVersion}"`
		);
	}

	const frameworkName = getEffectiveFrameworkName({project, frameworkOptions});
	const resolvedVersion = await resolveVersion({
		frameworkName,
		frameworkVersion: frameworkOptions.version
	});

	// Try to update YAML file but still return with name and resolved version in case it failed
	let yamlUpdated = false;
	try {
		await require("./updateYaml")({
			project,
			data: {
				framework: {
					name: frameworkName,
					version: resolvedVersion
				}
			}
		});
		yamlUpdated = true;
	} catch (err) {
		if (err.name !== "FrameworkUpdateYamlFailed") {
			throw err;
		}
	}
	return {
		yamlUpdated,
		usedFramework: frameworkName,
		usedVersion: resolvedVersion
	};
};
