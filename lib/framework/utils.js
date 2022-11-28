import {graphFromStaticFile, graphFromPackageDependencies} from "@ui5/project/graph";
import Sapui5Resolver from "@ui5/project/ui5Framework/Sapui5Resolver";
import Openui5Resolver from "@ui5/project/ui5Framework/Openui5Resolver";

export async function getRootProjectConfiguration(projectGraphOptions) {
	let graph;
	if (projectGraphOptions.dependencyDefinition) {
		graph = await graphFromStaticFile({
			filePath: projectGraphOptions.dependencyDefinition,
			resolveFrameworkDependencies: false
		});
	} else {
		graph = await graphFromPackageDependencies({
			rootConfigPath: projectGraphOptions.config,
			resolveFrameworkDependencies: false
		});
	}

	return graph.getRoot();
}

export function getFrameworkResolver(frameworkName) {
	if (frameworkName === "SAPUI5") {
		return Sapui5Resolver;
	} else if (frameworkName === "OpenUI5") {
		return Openui5Resolver;
	} else {
		throw new Error("Invalid framework.name: " + frameworkName);
	}
}
