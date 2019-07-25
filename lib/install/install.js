const pacote = require("pacote");
const path = require("path");
const log = require("@ui5/logger").getLogger("cli:install");

async function getDependencies(packageName, distVersion, alreadyProcessed) {
	const manifest = await pacote.manifest(`${packageName}@${distVersion}`);
	const dependencies = Object.keys(manifest.dependencies).filter((depName) => {
		return !alreadyProcessed.includes(depName);
	});
	alreadyProcessed.push(...dependencies);
	const transDeps = await Promise.all(dependencies.map((depName) => {
		return getDependencies(depName, distVersion, alreadyProcessed);
	}));
	transDeps.push(dependencies);
	return Array.prototype.concat.apply([], transDeps);
}

module.exports = async function({tree, distVersion}) {
	const ui5Dependencies = [];

	(function collectDependencies(project) {
		if (project.id.startsWith("@openui5/") && ui5Dependencies.indexOf(project.id) === -1) {
			ui5Dependencies.push(project.id);
		}
		return project.dependencies.map(collectDependencies);
	})(tree);

	const targetDir = path.join(".", "ui5_dependencies", distVersion, "/");
	log.info(`Requested dist version: ${distVersion}`);
	log.info(`Installing to: ${targetDir}`);
	const transDeps = await Promise.all(ui5Dependencies.map((depName) => {
		return getDependencies(depName, distVersion, ui5Dependencies);
	}));

	transDeps.push(ui5Dependencies);
	const dependencies = Array.prototype.concat.apply([], transDeps);


	await Promise.all(dependencies.map((depName) => {
		log.info(`Installing ${depName} version ${distVersion}...`);
		return pacote.extract(`${depName}@${distVersion}`,
			path.join(targetDir, ...depName.split("/")));
	}));

	/* // Alternative, only storing tar files:
	await Promise.all(dependencies.map((depName) => {
		log.info(`Installing ${depName} version ${distVersion}...`);
		const fileName = depName + ".tgz";
		return pacote.tarball.toFile(`${depName}@${distVersion}`,
			path.join(targetDir, ...fileName.split("/")));
	}));
	*/
};
