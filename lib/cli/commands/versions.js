import {pathToFileURL} from "node:url";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import baseMiddleware from "../middlewares/base.js";

// Using CommonsJS require as importing json files causes an ExperimentalWarning
const require = createRequire(import.meta.url);

const versions = {
	command: "versions",
	describe: "Shows the versions of all UI5 Tooling modules",
	middlewares: [baseMiddleware]
};

const NOT_FOUND = "===(not installed)";
versions.getVersion = (pkg) => {
	try {
		const packageInfo = require(`${pkg}/package.json`);
		return packageInfo.version || NOT_FOUND
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
			return ((name || id) + ":").padEnd(15) + versions.getVersion(id);
		})
	)).join("\n");

	console.log(`\n${output}\n`);
};

export default versions;
