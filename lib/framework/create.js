const handlebars = require("handlebars");

const fs = require("fs");
// const fsHelper = require("../utils/fsHelper");
const path = require("path");
const promisify = require("util").promisify;
const writeFile = promisify(fs.writeFile);

async function createView(project, metaInformation, name) {
	const namespaceArray = createArrayFromList(metaInformation.namespaceList);

	const fileInfo = {
		webappPath: metaInformation.webappPath,
		type: metaInformation.type,
		name: name,
		fileExtension: "xml"
	};

	let controllerName = undefined;
	if (metaInformation.controller) {
		metaInformation.type = "controller";
		controllerName = await createControllerName(project.metadata.namespace, name, metaInformation.type);
		await createController(project, metaInformation, name);
	}

	if (metaInformation.route) {
		await createRoute(name, metaInformation.webappPath);
	}

	const source = fs.readFileSync(__dirname + "/../templates/view", "utf8");
	const template = handlebars.compile(source);
	const content = template({
		controllerName: controllerName,
		namespaces: namespaceArray
	});

	await saveTemplate(fileInfo, content);
}

async function createRoute(name, webappPath) {
	const manifest = require(webappPath + "/manifest.json");

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
	fs.writeFile(webappPath + "/manifest.json", data, (err) => {
		if (err) {
			throw err;
		}
	});
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
	return `${namespace.replace("/", ".")}.${type}.${name}`;
}

async function createController(project, metaInformation, name) {
	const componentName = await createControllerName(project.metadata.namespace, name, metaInformation.type);
	const moduleArray = createArrayFromList(metaInformation.moduleList);

	const fileInfo = {
		webappPath: metaInformation.webappPath,
		type: metaInformation.type,
		name: name,
		fileExtension: "js"
	};

	const source = fs.readFileSync(__dirname + `/../templates/${metaInformation.type}`, "utf8");
	const template = handlebars.compile(source);
	const content = template({
		controllerName: componentName,
		modules: moduleArray
	});

	await saveTemplate(fileInfo, content);
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
			abv: namespaceArray[namespaceArray.length - 1],
			module: moduleArray[moduleArray.length - 1]
		};
		itemArray.push(templateObj);
	}
	return itemArray;
}

function saveTemplate(fileInfo, content) {
	let path = `${fileInfo.webappPath}/${fileInfo.type}`;
	try {
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path);
		}
		path += `/${fileInfo.name}.${fileInfo.type}.${fileInfo.fileExtension}`;
		writeFile(path, content, () => {
			console.log("Create component in " + path);
		});
	} catch (err) {
		throw new Error(`Failed to create component: ${err.message}.`);
	}
}

module.exports = async function({name, metaInformation, project}) {
	let message = undefined;
	const webappPath = path.resolve("./webapp");
	metaInformation.webappPath = webappPath;
	name = name[0].toUpperCase() + name.slice(1);
	try {
		if (metaInformation.type == "view") {
			if (!fs.existsSync(webappPath + `/${metaInformation.type}/${name}.view.xml`)) {
				await createView(project, metaInformation, name);
				message = metaInformation.type;
			} else if (metaInformation.route) {
				await createRoute(name, metaInformation.webappPath);
				message = "route";
			}
		} else if (metaInformation.type == "controller" || metaInformation.type == "control") {
			if (!fs.existsSync(webappPath + `/${metaInformation.type}/${name}.${metaInformation}.js`)) {
				await createController(project, metaInformation, name);
				message = metaInformation.type;
			}
		}
	} catch (err) {
		throw new Error(
			err
		);
	}

	return message;
};
