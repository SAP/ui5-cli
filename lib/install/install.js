const pacote = require("pacote");
const path = require("path");
const log = require("@ui5/logger").getLogger("cli:install");

module.exports = async function({tree, distVersion}) {
	const ui5Dependencies = [];

	(function collectDependencies(project) {
		if (project.id.startsWith("@openui5/") && ui5Dependencies.indexOf(project.id) === -1) {
			ui5Dependencies.push(project.id);
		}
		return project.dependencies.map(collectDependencies);
	})(tree);

	const targetDir = path.join(".", "/", "ui5_dependencies");
	log.info(`Requested dist version: ${distVersion}`);
	log.info(`Installing to: ${targetDir}`);
	await Promise.all(ui5Dependencies.map((depName) => {
		log.info(`Installing ${depName} version ${distVersion}...`);
		return pacote.extract(`${depName}@${distVersion}`,
			path.join(targetDir, ...depName.split("/")));
	}));
};
