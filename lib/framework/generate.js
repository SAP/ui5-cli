const Handlebars = require("handlebars");

const fs = require("fs");
// const fsHelper = require("../utils/fsHelper");
const path = require("path");
const promisify = require("util").promisify;
const writeFile = promisify(fs.writeFile);

const {getFrameworkResolver} = require("./utils");

async function generateView(project, metaInformation, name) {
	await checkNamespaces(project, metaInformation.namespaceList);

	const namespaceArray = createNamespaceArray(metaInformation.namespaceList);

	name = name[0].toUpperCase() + name.slice(1);
	let controllerName = undefined;
	if (metaInformation.controller) {
		controllerName = createViewController(project.metadata.namespace, name);
	}

	const source = fs.readFileSync(__dirname + "/../templates/View.xml", "utf8");
	const template = Handlebars.compile(source);
	const content = template({
		controllerName: controllerName,
		namespaces: namespaceArray
	});

	const filePath = `/view/${name}.view.xml`;

	saveTemplate(filePath, content);
}

// async function generateContoller(project, metaInformation, name) {
// 	await checkNamespaces(project, metaInformation.namespaceList);

// 	const namespaceArray = createNamespaceArray(metaInformation.namespaceList);

// 	name = name[0].toUpperCase() + name.slice(1);
// 	let controllerName = undefined;
// 	if (metaInformation.controller) {
// 		controllerName = createViewController(project.metadata.namespace, name);
// 	}

// 	const source = fs.readFileSync(__dirname + "/../templates/View.xml", "utf8");
// 	const template = Handlebars.compile(source);
// 	const content = template({
// 		controllerName: controllerName,
// 		namespaces: namespaceArray
// 	});

// 	const filePath = `/view/${name}.view.xml`;

// 	saveTemplate(filePath, content);
// }

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
		} catch (err) {
			throw new Error(`Failed to find ${project.framework.name} framework library ${name}: ` + err.message);
		}
	}));
}

function createNamespaceArray(namespaceList) {
	const allNamespaces = Array.from(new Set(namespaceList));

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

	// generateContoller(name);

	return controllerName;
}

function saveTemplate(filePath, content) {
	const webappPath = path.resolve("./webapp");
	writeFile(webappPath.concat(filePath), content, (err) => {
		if (err) {
			throw new Error(`Failed to generate template: ${err.message}.`);
		}
		console.log("Generate template in " + filePath);
	});
}

module.exports = async function({name, metaInformation, project}) {
	let newComponent = false;

	if (metaInformation.type == "view") {
		await generateView(project, metaInformation, name);
		newComponent = true;
	}

	return newComponent;
};
