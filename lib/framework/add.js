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
		throw new Error("No framework configuration defined. Please use \"ui5 use\" to configure a framework and version.");
	}
	if (!project.framework.version) {
		throw new Error("No framework version defined. Please use \"ui5 use\" to configure a version.");
	}

	const Resolver = getFrameworkResolver(project.framework.name);

	const resolver = new Resolver({
		cwd: project.path,
		version: project.framework.version
	});

	// Get metadata of all libraries to verify that they can be installed
	try {
		await Promise.all(libraries.map((libraryName) => {
			return resolver.getLibraryMetadata(libraryName);
		}));
	} catch (err) {
		throw new Error("Failed to load library metadata: " + err.message);
	}

	const yamlLibraries = libraries.map((name) => {
		return {name}; // TODO: optional/development
	});
	if (project.framework.libraries) {
		project.framework.libraries.forEach((library) => {
			// Don't add libraries twice!
			if (yamlLibraries.findIndex(($) => $.name === library.name) === -1) {
				yamlLibraries.push(library);
			}
		});
	}

	yamlLibraries.sort((a, b) => {
		return a.name.localeCompare(b.name);
	});

	// Try to update YAML file but still return with name and resolved version in case it failed
	let yamlUpdated = false;
	try {
		await require("./updateYaml")({
			project,
			data: {
				framework: {
					libraries: yamlLibraries
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
