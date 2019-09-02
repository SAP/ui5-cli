const pacote = require("pacote");
const path = require("path");
const log = require("@ui5/logger").getLogger("cli:install");

const pacoteOptions = {
	registry: "http://localhost:4873"
};

module.exports = async function({tree, distVersionOverride}) {
	const targetDir = path.join(".", "ui5_dependencies");
	let distVersion;
	if (distVersionOverride) {
		distVersion = distVersionOverride;
		log.info(
			`Overriding configured SAPUI5 version ${tree.resources.framework.version} with ${distVersionOverride}`);
	} else {
		distVersion = tree.resources.framework.version;
	}
	log.info(`Using SAPUI5 version: ${distVersion}`);
	log.info(`Installing to: ${targetDir}`);

	log.info("Requesting dist package...");
	const distPkgPath = path.join(targetDir, "@sap", "ui5", distVersion);
	const pDistPackage = pacote.extract(`@sap/ui5@${distVersion}`,
		distPkgPath, pacoteOptions);

	const ui5Dependencies = [];

	(function collectDependencies(project) {
		if (project.resources && project.resources.framework && project.resources.framework.libraries) {
			project.resources.framework.libraries.forEach((dependency) => {
				if (!ui5Dependencies.includes(dependency.name) && !dependency.optional) {
					ui5Dependencies.push(dependency.name);
				}
			});
		}
		return project.dependencies.map(collectDependencies);
	})(tree);

	await pDistPackage;
	const metadata = require(path.join(tree.path, distPkgPath, "metadata.json"));

	const depsToProcess = [...ui5Dependencies];

	const dependenciesToInstall = {};
	while (depsToProcess.length) {
		// TODO: Look into array length for potential optimization
		const depName = depsToProcess.shift();
		if (!metadata.libraries[depName]) {
			throw new Error(`Failed to find library ${depName} in dist packages metadata.json`);
		}
		const depMetadata = metadata.libraries[depName];
		if (!dependenciesToInstall[depMetadata.packageName]) {
			dependenciesToInstall[depMetadata.packageName] = {
				version: depMetadata.version
			};
			depsToProcess.push(...depMetadata.dependencies);
		}
	}

	await Promise.all(Object.keys(dependenciesToInstall).map((depName) => {
		const version = dependenciesToInstall[depName].version;
		log.info(`Installing ${depName} version ${version}...`);
		return pacote.extract(`${depName}@${version}`,
			path.join(targetDir, ...depName.split("/"), version), pacoteOptions);
	}));

	/* // Alternative, only storing tar files:
	await Promise.all(dependenciesToInstall.map((depName) => {
		log.info(`Installing ${depName} version ${distVersion}...`);
		const fileName = depName + ".tgz";
		return pacote.tarball.toFile(`${depName}@${distVersion}`,
			path.join(targetDir, ...fileName.split("/")));
	}));
	*/
};
