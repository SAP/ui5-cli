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
		savePath: metaInformation.savePath,
		type: metaInformation.type,
		name: name,
		fileExtension: "xml"
	};

	let controllerName = undefined;
	if (metaInformation.controller) {
		metaInformation.type = "controller";
		controllerName = await createControlName(namespace, name, metaInformation.type);
		if (!await fsHelper.exists(`${metaInformation.savePath}/${metaInformation.type}/${name}.controller.js`)) {
			await createComponent(namespace, metaInformation, name);
		}
		metaInformation.type = "view";
	}

	if (metaInformation.rootView) {
		await configureRootView(metaInformation.savePath, namespace, name);
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

async function configureRootView(savePath, namespace, name) {
	const manifest = await readManifest(savePath);

	const sapui5 = manifest["sap.ui5"];

	const rootView = {
		"viewName": `${namespace.replace("/", ".")}.view.${name}`,
		"type": "XML",
		"async": true,
		"id": `${name.toLowerCase()}`
	};

	sapui5["rootView"] = rootView;
	await writeJSON(manifest, savePath);
}

async function createRoute(name, savePath) {
	const manifest = await readManifest(savePath);

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

	await writeJSON(manifest, savePath);
}

async function readManifest(savePath) {
	const manifest = JSON.parse(await readFile(savePath + "/manifest.json", "utf8"));

	if (!manifest["sap.ui5"]) {
		throw new Error("No valid manifest. 'sap.ui5' object is missing");
	}
	return manifest;
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

function createControlName(namespace, name, type) {
	if (type == "component") {
		return `${namespace.replace("/", ".")}.${name}`;
	}
	return `${namespace.replace("/", ".")}.${type}.${name}`;
}

async function createComponent(namespace, metaInformation, name) {
	const componentName = await createControlName(namespace, name, metaInformation.type);
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

async function createBootstrap(namespace, metaInformation, name) {
	const id = `${namespace.split("/").pop()}`;
	namespace = `${namespace.replace("/", ".")}`;
	const manifest = JSON.parse(await readFile(metaInformation.savePath + "/manifest.json", "utf8"));
	const title = capitalizeFirstLetter(manifest["sap.app"].title);

	const fileInfo = {
		savePath: metaInformation.savePath,
		type: metaInformation.type,
		name: name,
		fileExtension: "html"
	};

	const source = await readFile(__dirname + `/../templates/${metaInformation.type}`, "utf8");
	const template = handlebars.compile(source);
	const content = template({
		id: id,
		title: title,
		theme: metaInformation.theme,
		namespace: namespace
	});

	await saveTemplate(fileInfo, content);
}

async function createManifest({namespace, project, savePath}) {
	const dependencies = {
		libs: {}
	};
	if (project.framework && project.framework.libraries) {
		for (const o of project.framework.libraries) {
			if (!o.name.includes("themelib")) {
				dependencies.libs[o.name] = {};
			}
		}
	}

	const manifest = {
		"_version": "1.1.0",
		"sap.app": {
			"id": `${namespace}`,
			"type": `${project.type}`,
			"title": `${project.metadata.name}`,
			"applicationVersion": {
				"version": "1.0.0"
			}
		},
		"sap.ui": {
			"technology": "UI5"
		},
		"sap.ui5": {
			"dependencies": dependencies
		}
	};

	await writeJSON(manifest, savePath);
	console.log("manifest.json created");
}

async function writeJSON(manifest, savePath) {
	const data = JSON.stringify(manifest, null, 4);
	await writeFile(`${savePath}/manifest.json`, data);
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
		if (!await fsHelper.exists(fileInfo.savePath)) {
			throw new Error("Internal error");
		}
		if (!await fsHelper.exists(path) && !(fileInfo.type == "component" || fileInfo.type == "bootstrap")) {
			await mkDir(path);
		}
		if (fileInfo.type == "control") {
			path += `/${fileInfo.name}.${fileInfo.fileExtension}`;
		} else if (fileInfo.type == "component" || fileInfo.type == "bootstrap") {
			path = `${fileInfo.savePath}/${fileInfo.name}.${fileInfo.fileExtension}`;
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

async function create({name, metaInformation, project}) {
	let statusMessage = undefined;

	if (name) {
		name = capitalizeFirstLetter(name);
	}

	if (metaInformation) {
		if (metaInformation.type == "view") {
			if (!await fsHelper.exists(`${metaInformation.savePath}/${metaInformation.type}/${name}.view.xml`)) {
				await createView(project.metadata.namespace, metaInformation, name);
				statusMessage = "Add new view";
				if (metaInformation.controller) {
					statusMessage += " with corresponding controller";
				}
				if (metaInformation.route) {
					statusMessage += " and route";
				}
				if (metaInformation.rootView) {
					statusMessage += " as root";
				}
				statusMessage += " to project";
			} else if (metaInformation.route) {
				await createRoute(name, metaInformation.savePath);
				statusMessage = "Add route to view";
			} else {
				statusMessage = capitalizeFirstLetter(`${metaInformation.type} ${name} already exists`);
			}
		} else if (metaInformation.type == "controller" || metaInformation.type == "control") {
			if (!(await fsHelper.exists(`${metaInformation.savePath}/${metaInformation.type}/${name}.${metaInformation.type}.js`) ||
				await fsHelper.exists(`${metaInformation.savePath}/${metaInformation.type}/${name}.js`))) {
				await createComponent(project.metadata.namespace, metaInformation, name);
				statusMessage = metaInformation.type == "controller" ? "Add new controller to project" :
					"Add new control to project";
			} else {
				statusMessage = capitalizeFirstLetter(`${metaInformation.type} ${name} already exists`);
			}
		} else if (metaInformation.type == "component") {
			let namespace = project.metadata.namespace.replace("/", ".");
			if (name) {
				name = name.charAt(0).toLowerCase() + name.slice(1);
				metaInformation.savePath += `/${name}`;
				namespace += `.${name}`;
				if (!await fsHelper.exists(metaInformation.savePath)) {
					await mkDir(metaInformation.savePath);
				}
			}
			name = "Component";
			if (!await fsHelper.exists(`${metaInformation.savePath}/${name}.js`)) {
				if (!await fsHelper.exists(`${metaInformation.savePath}/manifest.json`)) {
					await createManifest({namespace, project, savePath: metaInformation.savePath});
				}
				await createComponent(namespace, metaInformation, name);

				statusMessage = "Add new Component to project";
			} else {
				statusMessage = capitalizeFirstLetter(`${metaInformation.type} for ${namespace} already exists`);
			}
		} else if (metaInformation.type == "bootstrap") {
			if (name) {
				name = name.toLowerCase();
			} else {
				name = "index";
			}
			if (!await fsHelper.exists(`${metaInformation.savePath}/${name}.html`)) {
				await createBootstrap(project.metadata.namespace, metaInformation, name);
				statusMessage = "Create bootstrap for project";
			} else {
				statusMessage = capitalizeFirstLetter(`${metaInformation.type} for project already exists`);
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
