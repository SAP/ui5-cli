const Handlebars = require("handlebars");

const fs = require("fs");
// const fsHelper = require("../utils/fsHelper");
const path = require("path");
const promisify = require("util").promisify;
const writeFile = promisify(fs.writeFile);

async function createView(project, metaInformation, name) {
	const namespaceArray = createNamespaceArray(metaInformation.namespaceList);

	name = name[0].toUpperCase() + name.slice(1);
	let controllerName = undefined;
	if (metaInformation.controller) {
		controllerName = `${project.metadata.namespace.replace("/", ".")}.controller.${name}`;
		createController(project, metaInformation, name);
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

async function createContoller(project, metaInformation, name) {
	// name = name[0].toUpperCase() + name.slice(1);
	// let controllerName = undefined;
	// if (metaInformation.controller) {
	// 	controllerName = createViewController(project.metadata.namespace, name);
	// }

	// const source = fs.readFileSync(__dirname + "/../templates/View.xml", "utf8");
	// const template = Handlebars.compile(source);
	// const content = template({
	// 	controllerName: controllerName,
	// 	namespaces: namespaceArray
	// });

	// const filePath = `/view/${name}.view.xml`;

	// saveTemplate(filePath, content);
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

function saveTemplate(filePath, content) {
	const webappPath = path.resolve("./webapp");
	writeFile(webappPath.concat(filePath), content, (err) => {
		if (err) {
			throw new Error(`Failed to create component: ${err.message}.`);
		}
		console.log("Create component in " + filePath);
	});
}

module.exports = async function({name, metaInformation, project}) {
	let newComponent = false;

	if (metaInformation.type == "view") {
		await createView(project, metaInformation, name);
		newComponent = true;
	}

	return newComponent;
};
