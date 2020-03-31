const {getRootProjectConfiguration, getFrameworkResolver} = require("./utils");

function isValidSpecVersion(specVersion) {
	return specVersion !== "0.1" && specVersion !== "1.0" && specVersion !== "1.1";
}

module.exports = async function({normalizerOptions, libraries}) {
	const project = await getRootProjectConfiguration({normalizerOptions});

	if (!isValidSpecVersion(project.specVersion)) {
		throw new Error(
			`ui5 add command requires specVersion "2.0" or higher. ` +
			`Project ${project.metadata.name} uses specVersion "${project.specVersion}"`
		);
	}

	if (!project.framework) {
		throw new Error(`Project ${project.metadata.name} is missing a framework configuration. Please use "ui5 use" to configure a framework and version.`);
	}
	if (!project.framework.version) {
		throw new Error(`Project ${project.metadata.name} does not define a framework version configuration. Please use "ui5 use" to configure a version.`);
	}

	const Resolver = getFrameworkResolver(project.framework.name);

	const resolver = new Resolver({
		cwd: project.path,
		version: project.framework.version
	});

	// Get metadata of all libraries to verify that they can be installed
	try {
		await Promise.all(libraries.map(({name}) => {
			return resolver.getLibraryMetadata(name);
		}));
	} catch (err) {
		throw new Error("Failed to load library metadata: " + err.message);
	}

	if (project.framework.libraries) {
		project.framework.libraries.forEach((library) => {
			// Don't add libraries twice!
			if (libraries.findIndex(($) => $.name === library.name) === -1) {
				libraries.push(library);
			}
		});
	}
	libraries.sort((a, b) => {
		return a.name.localeCompare(b.name);
	});

	// Try to update YAML file but still return with name and resolved version in case it failed
	let yamlUpdated = false;
	try {
		await require("./updateYaml")({
			project,
			data: {
				framework: {
					libraries
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
		yamlUpdated
	};
};
