export async function getRootProjectConfiguration(projectGraphOptions) {
	const {generateProjectGraph} = require("@ui5/project");

	let graph;
	if (projectGraphOptions.dependencyDefinition) {
		graph = await generateProjectGraph.usingStaticFile({
			filePath: projectGraphOptions.dependencyDefinition,
			resolveFrameworkDependencies: false
		});
	} else {
		graph = await generateProjectGraph.usingNodePackageDependencies({
			rootConfigPath: projectGraphOptions.config,
			resolveFrameworkDependencies: false
		});
	}

	return graph.getRoot();
}

export function getFrameworkResolver(frameworkName) {
	if (frameworkName === "SAPUI5") {
		return require("@ui5/project").ui5Framework.Sapui5Resolver;
	} else if (frameworkName === "OpenUI5") {
		return require("@ui5/project").ui5Framework.Openui5Resolver;
	} else {
		throw new Error("Invalid framework.name: " + frameworkName);
	}
}

export function isValidSpecVersion(specVersion) {
	return specVersion && (specVersion !== "0.1" && specVersion !== "1.0" && specVersion !== "1.1");
}
