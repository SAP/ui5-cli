const handlebars = require("handlebars");

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
		controllerName = await createControllerName(project.metadata.namespace, name);
		await createController(project, metaInformation, name);
	}

	if (metaInformation.route) {
		await createRoute(name);
	}

	const source = fs.readFileSync(__dirname + "/../templates/View", "utf8");
	const template = handlebars.compile(source);
	const content = template({
		controllerName: controllerName,
		namespaces: namespaceArray
	});

	const filePath = `/view/${name}.view.xml`;

	await saveTemplate(filePath, content);
}

async function createRoute(name) {
	const webappPath = path.resolve("./webapp");
	const manifest = require(webappPath + "/manifest.json");

	const descName = name.toLowerCase();
	if (!manifest["sap.ui5"]) {
		throw new Error("No valid manifest. 'sap.ui5' object is missing");
	}
	const sapui5 = manifest["sap.ui5"];
	let routes = [];
	const targetsObj = {
		targets: {}
	};
	if (sapui5.routing) {
		if (!sapui5.routing.routes) {
			throw new Error("No valid manifest. 'routes' object is missing");
		}
		routes = sapui5.routing.routes;
		for (const route of routes) {
			if (route.name == descName) {
				throw new Error(`Route pattern with name ${descName} does already exist`);
			}
		}
		const route = {
			pattern: descName,
			name: descName,
			target: descName
		};
		routes.push(route);

		if (!sapui5.routing.targets) {
			throw new Error("No valid manifest. 'targets' object is missing");
		}
		Object.assign(targetsObj.targets, sapui5.routing.targets);
		const target = {
			[descName]: {
				viewId: descName,
				viewName: name
			}
		};
		Object.assign(targetsObj.targets, target);
		Object.assign(sapui5.routing, targetsObj);
	} else {
		const routingObj = {
			routing: {}
		};

		const route = {
			pattern: descName,
			name: descName,
			target: descName
		};
		routes.push(route);

		const target = {
			[descName]: {
				viewId: descName,
				viewName: name
			}
		};
		Object.assign(targetsObj.targets, target);
		routingObj.routing["routes"] = routes;
		Object.assign(routingObj.routing, targetsObj);
		Object.assign(manifest["sap.ui5"], routingObj);
	}
	const data = JSON.stringify(manifest, null, 4);
	fs.writeFile(webappPath + "/manifest.json", data, (err) => {
		if (err) throw err;
		console.log("Data written to file");
	});
}

function createControllerName(namespace, name) {
	return `${namespace.replace("/", ".")}.controller.${name}`;
}

async function createController(project, metaInformation, name) {
	name = name[0].toUpperCase() + name.slice(1);

	const controllerName = await createControllerName(project.metadata.namespace, name);

	const source = fs.readFileSync(__dirname + "/../templates/Controller", "utf8");
	const template = handlebars.compile(source);
	const content = template({
		controllerName: controllerName
	});

	const filePath = `/controller/${name}.controller.js`;

	await saveTemplate(filePath, content);
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
	writeFile(webappPath.concat(filePath), content, {flag: "wx"}, (err) => {
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

	if (metaInformation.type == "controller") {
		await createController(project, metaInformation, name);
		newComponent = true;
	}

	return newComponent;
};
