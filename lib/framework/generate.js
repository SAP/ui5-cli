const Handlebars = require("handlebars");

const fs = require("fs");
const fsHelper = require("../utils/fsHelper");
const path = require("path");
const promisify = require("util").promisify;
const writeFile = promisify(fs.writeFile);

const {getRootProjectConfiguration, getFrameworkResolver} = require("./utils");

module.exports = async function({name, additionalOptions, normalizerOptions, namespaceList}) {
	const project = await getRootProjectConfiguration({normalizerOptions});
	// console.log(project);

	if (!project.framework) {
		throw new Error(
			`Project ${project.metadata.name} is missing a framework configuration. ` +
			`Please use "ui5 use" to configure a framework and version.`
		);
	}
	if (!project.framework.version) {
		throw new Error(
			`Project ${project.metadata.name} does not define a framework version configuration. ` +
			`Please use "ui5 use" to configure a version.`
		);
	}

	const Resolver = getFrameworkResolver(project.framework.name);

	const resolver = new Resolver({
		cwd: project.path,
		version: project.framework.version
	});

	// Get metadata of all libraries to verify that they can be installed
	await Promise.all(namespaceList.map(async ({name}) => {
		try {
			await resolver.getLibraryMetadata(name);
		} catch (err) {
			throw new Error(`Failed to find ${project.framework.name} framework library ${name}: ` + err.message);
		}
	}));

	const allNamespaces = [...namespaceList];

	if (project.framework.libraries) {
		project.framework.libraries.forEach((library) => {
			// Don't add libraries twice!
			if (allNamespaces.findIndex(($) => $.name === library.name) === -1) {
				allNamespaces.push(library);
			}
		});
	}
	allNamespaces.sort((a, b) => {
		return a.name.localeCompare(b.name);
	});

	const namespaceArray = [];
	for (const namespace of allNamespaces) {
		const array = namespace.name.split(".");
		const namespaceObj = {
			name: namespace.name,
			abv: array[array.length - 1]
		};
		namespaceArray.push(namespaceObj);
	}

	const source = fs.readFileSync(__dirname + "/../templates/View.xml", "utf8");
	const template = Handlebars.compile(source);

	const content = template({
		namespaces: namespaceArray
	});
	const viewPath = path.resolve("./webapp") + "/view/";
	const fileName = name[0].toUpperCase() + name.slice(1) + ".view.xml";
	writeFile(viewPath + fileName, content, (err) => {
		if (err) {
			return console.error(`Failed to generate view: ${err.message}.`);
		}

		console.log("Generated view" + fileName);
	});

	return true;
};
