import {pathToFileURL} from "node:url";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import baseMiddleware from "../middlewares/base.js";

// Using CommonsJS require.resolve as long as import.meta.resolve is experimental
const require = createRequire(import.meta.url);

const versions = {
	command: "versions",
	describe: "Shows the versions of all UI5 Tooling modules",
	middlewares: [baseMiddleware]
};

const NOT_FOUND = "===(not installed)";
versions.getVersion = async (pkg) => {
	try {
		// TODO: This solution relies on the fact that the entrypoint of each package is
		// located within the package root directory (./index.js).
		// A better solution would be to have a dedicated '/version' module export which provides the version.
		// e.g. const {default: version} = await import("@ui5/builder/version");
		// Or maybe some general name to allow providing more metadata:
		// const {version} = await import("@ui5/builder/metadata");
		const pkgJsonPath = new URL("./package.json", pathToFileURL(require.resolve(pkg)));
		const packageInfo = JSON.parse(await readFile(pkgJsonPath, {encoding: "utf-8"}));
		return packageInfo.version || NOT_FOUND;
	} catch (err) {
		return NOT_FOUND;
	}
};

versions.handler = async function() {
	const output = (await Promise.all(
		[
			{id: "../../../", name: "@ui5/cli"},
			{id: "@ui5/builder"},
			{id: "@ui5/server"},
			{id: "@ui5/fs"},
			{id: "@ui5/project"},
			{id: "@ui5/logger"},
		].map(async ({name, id}) => {
			return ((name || id) + ":").padEnd(15) + (await versions.getVersion(id));
		})
	)).join("\n");

	console.log(`\n${output}\n`);
};

export default versions;
