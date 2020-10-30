const handlebars = require("handlebars");

const fs = require("fs");
const fsHelper = require("../utils/fsHelper");
const promisify = require("util").promisify;
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkDir = promisify(fs.mkdir);

async function createView(namespace, metaInformation, name) {
	const namespaceArray = createArrayFromList(metaInformation.namespaceList);

	const fileInfo = {
		webappPath: metaInformation.savePath,
		type: metaInformation.type,
		name: name,
		fileExtension: "xml"
	};

	let controllerName = undefined;
	if (metaInformation.controller) {
		metaInformation.type = "controller";
		controllerName = await createControllerName(namespace, name, metaInformation.type);
		if (!await fsHelper.exists(`${metaInformation.savePath}/${metaInformation.type}/${name}.controller.js`)) {
			await createComponent(namespace, metaInformation, name);
		}
		metaInformation.type = "view";
	}

	if (metaInformation.route) {
		await createRoute(name, metaInformation.savePath);
	}

	const source = await readFile(__dirname + "/../templates/view", "utf8");
	const template = handlebars.compile(source);
	const content = template({
		controllerName: controllerName,
		namespaces: namespaceArray
	});

	await saveTemplate(fileInfo, content);
}

async function createRoute(name, savePath) {
	const manifest = JSON.parse(await readFile(savePath + "/manifest.json", "utf8"));

	if (!manifest["sap.ui5"]) {
		throw new Error("No valid manifest. 'sap.ui5' object is missing");
	}
	const sapui5 = manifest["sap.ui5"];
	let routes = [];
	const targetsObj = {
		targets: {}
	};
	if (sapui5.routing) {
		if (sapui5.routing.routes ? !sapui5.routing.targets : sapui5.routing.targets) {
			throw new Error("No valid manifest. 'routes' or 'targets' is missing");
		}
		routes = sapui5.routing.routes || [];

		Object.assign(targetsObj.targets, sapui5.routing.targets);

		createRouteTarget({routes, targetsObj}, name);

		sapui5.routing["routes"] = routes;
		Object.assign(sapui5.routing, targetsObj);
	} else {
		const routingObj = {
			routing: {}
		};

		createRouteTarget({routes, targetsObj}, name);

		routingObj.routing["routes"] = routes;
		Object.assign(routingObj.routing, targetsObj);
		Object.assign(sapui5, routingObj);
	}

	const data = JSON.stringify(manifest, null, 4);
	await writeFile(savePath + "/manifest.json", data);
}

function createRouteTarget({routes, targetsObj}, name) {
	const descName = name.toLowerCase();
	for (const route of routes) {
		if (route.name.match(descName)) {
			throw new Error(`Route for ${name} does already exist`);
		}
	}
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
}

function createControllerName(namespace, name, type) {
	if (type == "component") {
		return `${namespace.replace("/", ".")}.${name}`;
	}
	return `${namespace.replace("/", ".")}.${type}.${name}`;
}

async function createComponent(namespace, metaInformation, name) {
	const componentName = await createControllerName(namespace, name, metaInformation.type);
	const moduleArray = createArrayFromList(metaInformation.moduleList);

	const fileInfo = {
		savePath: metaInformation.savePath,
		type: metaInformation.type,
		name: name,
		fileExtension: "js"
	};

	const source = await readFile(__dirname + `/../templates/${metaInformation.type}`, "utf8");
	const template = handlebars.compile(source);
	const content = template({
		controllerName: componentName,
		modules: moduleArray
	});

	await saveTemplate(fileInfo, content);
}

async function createManifest(namespace, metaInformation) {
	const manifest = {
		"_version": "1.1.0",
		"sap.app": {
			"id": `${namespace}`,
			"type": `${metaInformation.project.type}`,
			"title": `${metaInformation.project.metadata.name}`,
			"applicationVersion": {
				"version": "1.0.0"
			}
		},
		"sap.ui": {
			"technology": "UI5"
		},
		"sap.ui5": {

		}
	};

	const data = JSON.stringify(manifest, null, 4);
	await writeFile(metaInformation.savePath + "/manifest.json", data);
}

function createArrayFromList(list) {
	const allItems = Array.from(new Set(list));

	allItems.sort((a, b) => {
		return a.name.localeCompare(b.name);
	});

	const itemArray = [];
	for (const item of allItems) {
		const namespaceArray = item.name.split(".");
		const moduleArray = item.name.split("/");
		const templateObj = {
			name: item.name,
			abv: namespaceArray.pop(),
			module: moduleArray.pop()
		};
		itemArray.push(templateObj);
	}
	return itemArray;
}

async function saveTemplate(fileInfo, content) {
	let path = `${fileInfo.savePath}/${fileInfo.type}`;
	try {
		if (!await fsHelper.exists(fileInfo.webappPath)) {
			throw new Error("Internal error");
		}
		if (!await fsHelper.exists(path) && fileInfo.type != "component") {
			await mkDir(path);
		}
		if (fileInfo.type == "control") {
			path += `/${fileInfo.name}.${fileInfo.fileExtension}`;
		} else if (fileInfo.type == "component") {
			path = `${fileInfo.webappPath}/${fileInfo.name}.${fileInfo.fileExtension}`;
		} else {
			path += `/${fileInfo.name}.${fileInfo.type}.${fileInfo.fileExtension}`;
		}
		await writeFile(path, content);
	} catch (err) {
		throw new Error(`Failed to create component: ${err.message}.`);
	}
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

async function create({name, metaInformation, namespace}) {
	let statusMessage = undefined;

	if (name) {
		name = capitalizeFirstLetter(name);
	}

	if (metaInformation) {
		if (metaInformation.type == "view") {
			if (!await fsHelper.exists(`${metaInformation.savePath}/${metaInformation.type}/${name}.view.xml`)) {
				await createView(namespace, metaInformation, name);
				statusMessage = metaInformation.type;
			} else if (metaInformation.route) {
				await createRoute(name, metaInformation.savePath);
				statusMessage = "route";
			} else {
				statusMessage = capitalizeFirstLetter(`${metaInformation.type} ${name} already exists`);
			}
		} else if (metaInformation.type == "controller" || metaInformation.type == "control") {
			if (!(await fsHelper.exists(`${metaInformation.savePath}/${metaInformation.type}/${name}.${metaInformation.type}.js`) ||
				await fsHelper.exists(`${metaInformation.savePath}/${metaInformation.type}/${name}.js`))) {
				await createComponent(namespace, metaInformation, name);
				statusMessage = metaInformation.type;
			} else {
				statusMessage = capitalizeFirstLetter(`${metaInformation.type} ${name} already exists`);
			}
		} else if (metaInformation.type == "component") {
			if (!name) {
				name = "Component";
			}
			if (!await fsHelper.exists(`${metaInformation.savePath}/${name}.js`)) {
				await createComponent(namespace, metaInformation, name);
				if (!await fsHelper.exists(`${metaInformation.savePath}/manifest.json`)) {
					await createManifest(namespace, metaInformation);
				}
				statusMessage = metaInformation.type;
			} else {
				statusMessage = capitalizeFirstLetter(`${metaInformation.type} ${name} already exists`);
			}
		} else {
			statusMessage = "No valid component type";
		}
	} else {
		statusMessage = "No needed information provided";
	}

	return {
		statusMessage
	};
}

module.exports = {create, createManifest};
