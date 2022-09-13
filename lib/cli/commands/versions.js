import baseMiddleware from "../middlewares/base.js";

const versions = {
	command: "versions",
	describe: "Shows the versions of all UI5 Tooling modules",
	middlewares: [baseMiddleware]
};

const NOT_FOUND = "===(not installed)";
versions.getVersion = (pkg) => {
	try {
		// TODO: With exports defined in package.json we won't be able to import the package.json of a package anymore
		// One idea would be to have a dedicated '/version' module export which provides the version.
		// e.g. const {default: version} = await import("@ui5/builder/version");
		// Or maybe some general name to allow providing more metadata:
		// const {version} = await import("@ui5/builder/metadata");
		const packageInfo = require(`${pkg}/package.json`);
		return packageInfo.version || NOT_FOUND;
	} catch (err) {
		return NOT_FOUND;
	}
};

versions.handler = async function() {
	const cliVersion = versions.getVersion("../../..");
	const builderVersion = versions.getVersion("@ui5/builder");
	const serverVersion = versions.getVersion("@ui5/server");
	const fsVersion = versions.getVersion("@ui5/fs");
	const projectVersion = versions.getVersion("@ui5/project");
	const loggerVersion = versions.getVersion("@ui5/logger");
	console.log(`
@ui5/cli:      ${cliVersion}
@ui5/builder:  ${builderVersion}
@ui5/server:   ${serverVersion}
@ui5/fs:       ${fsVersion}
@ui5/project:  ${projectVersion}
@ui5/logger:   ${loggerVersion}
	`);
};

export default versions;
