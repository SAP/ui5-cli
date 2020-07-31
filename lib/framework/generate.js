const Handlebars = require("handlebars");

const fs = require("fs");
const fsHelper = require("../utils/fsHelper");
const path = require("path");
const promisify = require("util").promisify;
const writeFile = promisify(fs.writeFile);

const {getRootProjectConfiguration, getFrameworkResolver} = require("./utils");

async function checkNamespaces(project, namespaceList) {
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
		}
		catch (err) {
			throw new Error(`Failed to find ${project.framework.name} framework library ${name}: ` + err.message);
		}
	}));
}

function createNamespaceArray(namespaceList, project) {
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
	return namespaceArray;
}

function createViewController(namespace, name) {
	const controllerName = `${namespace.replace("/", ".")}.controller.${name}`;
	return controllerName;
}

function saveTemplate(filePath, content) {
	writeFile(filePath, content, (err) => {
		if (err) {
			throw new Error(`Failed to generate view: ${err.message}.`);
		}
		console.log("Generate view in " + filePath);
	});
}

module.exports = {
	generateView: async function({name, additionalOptions, normalizerOptions, namespaceList}) {
		const project = await getRootProjectConfiguration({normalizerOptions});
		console.log(project);

		await checkNamespaces(project, namespaceList);

		const namespaceArray = createNamespaceArray(namespaceList, project);

		name = name[0].toUpperCase() + name.slice(1);
		let controllerName = undefined;
		if (additionalOptions.controller) {
			controllerName = createViewController(project.metadata.namespace, name);
		}

		const source = fs.readFileSync(__dirname + "/../templates/View.xml", "utf8");
		const template = Handlebars.compile(source);
		const content = template({
			controllerName: controllerName,
			namespaces: namespaceArray
		});
		const webappPath = path.resolve("./webapp");

		const filePath = `${webappPath}/view/${name}.view.xml`;

		saveTemplate(filePath, content);

		return true;
	},
	generateController: async function({name, additionalOptions, normalizerOptions}) {
		const project = await getRootProjectConfiguration({normalizerOptions});
		return true;
	},
	generateCustomControl: async function() {
		return true;
	}
};


