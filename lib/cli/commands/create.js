// create

const baseMiddleware = require("../middlewares/base.js");
const {create} = require("../../framework/create");
const path = require("path");
const {Confirm, AutoComplete, Input, Select} = require("enquirer");

const {getRootProjectConfiguration} = require("../../framework/utils");

const createCommand = {
	command: "create [command]",
	describe: "Create template components to the project.",
	handler: handleCreation,
	middlewares: [baseMiddleware]
};

createCommand.builder = function(cli) {
	return cli
		.command("view [name]", "Create a view to the current project", {
			handler: handleCreation,
			builder: viewCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("controller [name]", "Create a controller to the current project", {
			handler: handleCreation,
			builder: controllerCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("control [name]", "Create a custom control to the current project", {
			handler: handleCreation,
			builder: customControlCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("component [name]", "Create component and if needed manifest.json", {
			handler: handleCreation,
			builder: componentCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.command("bootstrap [name]", "Create standard bootstrap for current project", {
			handler: handleCreation,
			builder: bootstrapCommandBuilder,
			middlewares: [baseMiddleware]
		})
		.option("interactive", {
			describe: "Enable interactive mode",
			alias: "i",
			default: false,
			type: "boolean"
		})
		.example("$0 create --interactive", "run command in interactive mode.");
};

function viewCommandBuilder(cli) {
	return cli
		.option("controller", {
			describe: "Create a corresponding controller (set to false with prefix --no-)",
			alias: "c",
			default: true,
			type: "boolean"
		})
		.option("route", {
			describe: "Create routing configuration",
			alias: "r",
			default: false,
			type: "boolean"
		})
		.option("namespaces", {
			describe: "A list of framework libraries, which should used as additional namespaces in the view.",
			alias: "ns",
			type: "array"
		})
		.option("root", {
			describe: "Configure the view as root view.",
			default: false,
			type: "boolean"
		})
		.positional("name", {
			describe: "View name",
			type: "string"
		})
		.example("$0 create view example --namespaces=sap.m", "create a view with the framework library " +
			"sap.m as namespace.")
		.example("$0 create view example --no-controller", "create a view without a controller.")
		.example("$0 create view example --route", "create a view with route.");
}

function controllerCommandBuilder(cli) {
	return cli
		.option("modules", {
			describe: "A list of modules, which should used in the controller.",
			type: "array"
		})
		.positional("name", {
			describe: "Controller name",
			type: "string"
		})
		.example("$0 create controller example --modules=sap/m/MessageToast", "create a controller " +
			"with the module MessageToast.");
}

function customControlCommandBuilder(cli) {
	return cli
		.option("modules", {
			describe: "A list of modules, which should used in the controller.",
			type: "array"
		})
		.positional("name", {
			describe: "Control name",
			type: "string"
		})
		.example("$0 create control example --modules=sap/m/MessageToast", "create a controller " +
			"with module MessageToast.");
}

function componentCommandBuilder(cli) {
	return cli
		.option("modules", {
			describe: "A list of modules, which should used in the component.",
			type: "array"
		})
		.positional("name", {
			describe: "Component name (empty for root)",
			type: "string"
		})
		.example("$0 create component example --modules=sap/ui/json/JSONModel", "create a Component " +
			"with module JSONModel.");
}

function bootstrapCommandBuilder(cli) {
	return cli
		.option("theme", {
			describe: "Configure the provided theme.",
			type: "string"
		})
		.positional("name", {
			describe: "Name for .html (empty for index.html)",
			type: "string"
		})
		.example("$0 create bootstrap --theme=sap_fiori_3", "create a index.html " +
			"with theme configuration.");
}

async function handleCreation(argv) {
	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	const project = await getProject(normalizerOptions);

	const normalizer = require("@ui5/project").normalizer;
	const resourceFactory = require("@ui5/fs").resourceFactory;
	const tree = await normalizer.generateProjectTree(normalizerOptions);

	const projectWriters = {};
	const resourceReaderCollection = await resourceFactory.createCollectionsForTree(tree, {
		virtualReaders: projectWriters,
		getVirtualBasePathPrefix: function({project: tree, virBasePath}) {
			if (tree.type === "application" && tree.metadata.namespace) {
				return "/resources/" + tree.metadata.namespace;
			}
		}
	});
	const virtualFileSystemList = resourceReaderCollection.dependencies._readers;

	if (argv["interactive"]) {
		await executePrompts(argv, virtualFileSystemList);
	} else if (argv._.length == 1) {
		throw new Error("Component needed. You can run " +
			"this command without component in interactive mode (--interactive, -i)");
	}

	const name = argv["name"];
	if (!name && !((argv["_"][1] == "component") || (argv["_"][1] == "bootstrap"))) {
		throw new Error("Missing mandatory parameter 'name'. You can run " +
			"this command without name in interactive mode (--interactive, -i)");
	}

	await addLibrary(normalizerOptions, [{name: "sap.m"}]);
	if (argv["namespaces"] && argv["namespaces"].includes("sap.m")) {
		argv["namespaces"].splice(argv["namespaces"].indexOf("sap.m"), 1);
	}
	const metaInformation = await getMetaInformation(argv, project.resources.configuration.paths.webapp,
		virtualFileSystemList);

	const {statusMessage} = await create({
		name,
		metaInformation,
		project: project
	});

	if (metaInformation.theme) {
		await addLibrary(normalizerOptions, [{name: `themelib_${metaInformation.theme}`}]);
	}

	await logResult(statusMessage, metaInformation);
}

async function addLibrary(normalizerOptions, libraries) {
	try {
		await require("../../framework/add")({
			normalizerOptions,
			libraries: libraries
		});
	} catch (err) {
		throw new Error(`Need framework libraries. Unable to configure: ${err}`);
	}
}

async function getProject(normalizerOptions) {
	try {
		const project = await getRootProjectConfiguration({
			normalizerOptions
		});
		if (project.type != "application") {
			throw new Error("Create command is currently only supported for projects of type application");
		}
		return project;
	} catch (err) {
		throw new Error(`Failed to read project: ${err.message}`);
	}
}

async function executePrompts(argv, virtualFileSystemList) {
	let prompt;
	if (argv._.length == 1) {
		prompt = new Select({
			message: "Choose what you want to create:",
			choices: [
				"View", "Controller", "Custom Control",
				"Component", "Bootstrap"
			]
		});
		const select = await prompt.run();

		if (select == "Custom Control") {
			argv._.push("control");
		} else {
			argv._.push(select.toLowerCase());
		}
	}

	if (!argv["name"]) {
		do {
			prompt = new Input({
				message: argv._[1] == "bootstrap" ? "Want to rename the index.html? (empty for default)" :
					`Please name your new ${argv._[1]}:`
			});
			const inputName = await prompt.run();
			argv["name"] = inputName;
		} while (!argv["name"] && !(argv._[1] == "component" || argv._[1] == "bootstrap"));
	}

	if (argv._[1] == "view") {
		await executeViewPrompts(argv, virtualFileSystemList);
	} else if (argv._[1] == "controller" || argv._[1] == "control" || argv._[1] == "component") {
		await executeControlPrompts(argv, virtualFileSystemList);
	} else if (argv._[1] == "bootstrap") {
		await executeBootstrapPrompts(virtualFileSystemList, argv);
	}
}

async function executeBootstrapPrompts(virtualFileSystemList, argv) {
	virtualFileSystemList = await virtualFileSystemList.filter((fs) => {
		return fs._project.type.includes("theme");
	});
	const themeList = await getDependencyList(virtualFileSystemList, "theme");
	themeList.forEach((item, index, array) => {
		array[index] = item.replace("themelib_", "");
	});

	let theme = undefined;
	if (themeList.length != 0) {
		const prompt = new AutoComplete({
			message: "Pick theme for UI",
			limit: 5,
			choices: themeList
		});
		theme = await prompt.run();
	}
	argv["theme"] = theme;
}

async function executeViewPrompts(argv, virtualFileSystemList) {
	const namespaceList = await getDependencyList(virtualFileSystemList, "namespace");

	let prompt = new Confirm({
		message: "Create a corresponding controller?",
		format: formatConfirmPrompt
	});
	const controller = await prompt.run();

	prompt = new Confirm({
		message: "Add a routing configuration?",
		format: formatConfirmPrompt
	});
	const route = await prompt.run();

	let namespaces = [];
	if (namespaceList.length != 0) {
		prompt = new AutoComplete({
			message: "Pick needed namespaces",
			limit: 5,
			multiple: true,
			choices: namespaceList
		});
		namespaces = await prompt.run();
	}

	prompt = new Confirm({
		message: "Configure view as root?",
		format: formatConfirmPrompt
	});
	const rootView = await prompt.run();


	argv["controller"] = controller;
	argv["route"] = route;
	argv["namespaces"] = namespaces;
	argv["root"] = rootView;
}

async function executeControlPrompts(argv, virtualFileSystemList) {
	const moduleList = await getDependencyList(virtualFileSystemList, "module");

	let modules = [];
	if (moduleList.length != 0) {
		const prompt = new AutoComplete({
			message: "Pick needed modules",
			limit: 5,
			multiple: true,
			choices: moduleList
		});
		modules = await prompt.run();
	}
	argv["modules"] = modules;
}

function formatConfirmPrompt(value) {
	return this.isTrue(value) ? "yes" : "no";
}

async function getDependencyList(virtualFileSystemList, asked) {
	const moduleList = [];
	for (const dependency of virtualFileSystemList) {
		let item = "";
		if (asked == "theme") {
			item = dependency._project.metadata.name;
			moduleList.push(item);
		} else {
			const files = await dependency.byGlob(`${dependency._virBasePath}sap/**/*.js`);
			for (const file of files) {
				if (asked == "module") {
					item = file._path.replace(dependency._virBasePath, "").replace(".js", "");
					// eslint-disable-next-line no-useless-escape
					if (!/[\._]/g.test(item)) {
						moduleList.push(item);
					}
				} else if (asked == "namespace") {
					item = file._project.metadata.name;
					moduleList.push(item);
				}
			}
		}
	}
	const uniqueList = [...new Set(moduleList)];
	uniqueList.sort();
	return uniqueList;
}

async function getMetaInformation(argv, webappPath, virtualFileSystemList) {
	let namespaceList = [];
	let moduleList = [];
	if (!(argv["_"][1] == "bootstrap")) {
		virtualFileSystemList = await virtualFileSystemList.filter((fs) => {
			return !fs._project.type.includes("theme");
		});
		if (argv["namespaces"] && argv["namespaces"].length != 0) {
			const globalDependencyList = await getDependencyList(virtualFileSystemList, "namespace");
			namespaceList = await createList(argv["namespaces"] || [], globalDependencyList);
		} else if (argv["modules"] && argv["modules"].length != 0) {
			const globalDependencyList = await getDependencyList(virtualFileSystemList, "module");
			moduleList = await createList(argv["modules"] || [], globalDependencyList);
		}
	}

	const savePath = path.resolve(`./${webappPath}`);

	const metaInformation = {
		controller: argv.controller,
		route: argv.route,
		namespaceList: namespaceList,
		rootView: argv.root,
		moduleList: moduleList,
		theme: argv.theme,
		savePath: savePath,
		type: argv["_"][1]
	};
	return metaInformation;
}

function validateLibrary(array, globalDependencyList) {
	array = array.map((value) => value.toLowerCase());
	const found = globalDependencyList.filter((r) => {
		return array.includes(r.split("/").pop().toLowerCase()) || array.includes(r.toLowerCase());
	});
	if (found.length == 0) {
		throw new Error("No valid library/module provided. " +
			"Use 'ui5 add' to add the needed library.");
	}
	return found;
}

async function createList(array, globalDependencyList) {
	const found = await validateLibrary(array, globalDependencyList);
	const list = found.map((name) => {
		const item = {name};
		return item;
	});
	return list;
}

async function logResult(statusMessage) {
	if (!statusMessage) {
		throw new Error(
			"Internal error while adding component"
		);
	}
	console.log(statusMessage);
}

module.exports = createCommand;
