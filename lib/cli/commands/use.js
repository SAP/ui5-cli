// Use
const useCommand = {
	command: "use <frameworkVersion> [--framework=openui5|sapui5]",
	describe: "Initialize or update the UI5 Tooling framework configuration.",
	middlewares: [require("../middlewares/base.js")]
};

useCommand.builder = function(cli) {
	return cli.positional("frameworkVersion", {
		describe: "Version",
		type: "string"
	}).option("framework", {
		describe: "Framework",
		type: "string"
	});
};

async function resolveVersion({frameworkName, frameworkVersion}) {
	let Resolver;
	if (frameworkName === "SAPUI5") {
		Resolver = require("@ui5/project").ui5Framework.Sapui5Resolver;
	} else if (frameworkName === "OpenUI5") {
		Resolver = require("@ui5/project").ui5Framework.Openui5Resolver;
	} else {
		throw new Error("Invalid framework.name: " + frameworkName);
	}
	return await Resolver.resolveVersion(frameworkVersion);
}

useCommand.handler = async function(argv) {
	const frameworkVersion = argv.frameworkVersion;
	let frameworkName;

	const {normalizer, projectPreprocessor} = require("@ui5/project");

	const normalizerOptions = {
		translatorName: argv.translator,
		configPath: argv.config
	};

	let tree = await normalizer.generateDependencyTree(normalizerOptions);

	if (normalizerOptions.configPath) {
		tree.configPath = normalizerOptions.configPath;
	}

	// Prevent dependencies from being processed
	tree.dependencies = [];

	tree = await projectPreprocessor.processTree(tree);

	const frameworkConfig = tree.framework;

	if (!frameworkConfig && !argv.framework) {
		// No framework configuration and no framework name specified
		// => Throw error
		throw new Error("No framework configuration defined. Please provide --framework option!");
	} else if (frameworkConfig && !frameworkConfig.name) {
		throw new Error("Mandatory framework name missing!");
	} else if (argv.framework) {
		if (argv.framework.toLowerCase() === "openui5") {
			frameworkName = "OpenUI5";
		} else if (argv.framework.toLowerCase() === "sapui5") {
			frameworkName = "SAPUI5";
		} else {
			throw new Error("Invalid framework.name: " + frameworkName);
		}
	} else {
		frameworkName = frameworkConfig.name;
	}

	const resolvedVersion = await resolveVersion({
		frameworkName,
		frameworkVersion
	});

	if (!resolvedVersion) {
		throw new Error(
			`Unable to resolve given version ${frameworkVersion} for ${frameworkName}. Check verbose log for details.`
		);
	}

	await updateYaml(tree.configPath || "./ui5.yaml", {
		framework: {
			name: frameworkName,
			version: resolvedVersion
		}
	});

	console.log(`Now using ${frameworkName} version: ${resolvedVersion}`);
};

module.exports = useCommand;

async function updateYaml(configPath, newData) {
	const {fromYaml, getPosition, getValue} = require("data-with-position");

	const configFile = require("fs").readFileSync(configPath, {encoding: "utf8"});

	// Using loadAll with DEFAULT_SAFE_SCHEMA instead of safeLoadAll to pass "filename".
	// safeLoadAll doesn't handle its parameters properly.
	// See https://github.com/nodeca/js-yaml/issues/456 and https://github.com/nodeca/js-yaml/pull/381
	// const jsyaml = require("js-yaml");
	// const configs = jsyaml.loadAll(configFile, undefined, {
	// 	filename: configPath,
	// 	schema: jsyaml.DEFAULT_SAFE_SCHEMA
	// });

	// const projectDocumentIndex = configs.findIndex((config) => config.)

	/*
	const matchAll = require("string.prototype.matchall");
	const matchDocumentSeparator = /^---/gm;
	const documents = matchAll(configFile, matchDocumentSeparator);
	let currentDocumentIndex = 0;
	for (const document of documents) {
		// If the first separator is not at the beginning of the file
		// we are already at document index 1
		// Using String#trim() to remove any whitespace characters
		if (currentDocumentIndex === 0 && configFile.substring(0, document.index).trim().length > 0) {
			currentDocumentIndex = 1;
		}

		if (currentDocumentIndex === yaml.documentIndex) {
			currentIndex = document.index;
			currentSubstring = configFile.substring(currentIndex);
			break;
		}

		currentDocumentIndex++;
	}
	*/

	/* testing */
	// const foo = require("yaml-ast-parser").loadAll(configFile, function(document) {
	// 	console.log(document);
	// });

	// TODO: split configFile by document separator as data-with-position can only handle the first document

	const data = fromYaml(configFile);

	const replacements = [
		{
			position: getPosition(data.framework.version),
			value: `version: "${newData.framework.version}"`
		}
	];

	if (newData.framework.name !== getValue(data.framework.name)) {
		replacements.push({
			position: getPosition(data.framework.name),
			value: `name: ${newData.framework.name}`
		});
	}

	const adoptedYaml = applyReplacements(configFile, replacements);

	require("fs").writeFileSync(configPath, adoptedYaml);
}


function applyReplacements(string, replacements) {
	function positionToIndex(position) {
		// Match the n-th line-ending to find the start of the given line
		const lineStartPattern = new RegExp("(?:(?:\r?\n)([^\r\n]*)){" + (position.line - 1) + "}");
		const lineStartMatch = lineStartPattern.exec(string);
		if (!lineStartMatch) {
			throw new Error("Could not find line start!");
		}
		// Add column number -1 (as column 1 starts at index 0)
		return lineStartMatch.index + lineStartMatch[0].length - lineStartMatch[1].length + position.column - 1;
	}

	const indexReplacements = replacements.map((replacement) => {
		return {
			startIndex: positionToIndex(replacement.position.start),
			endIndex: positionToIndex(replacement.position.end),
			value: replacement.value
		};
	}).sort((a, b) => {
		// Sort decending by endIndex so that replacements
		// This means replacements are done from bottom to top to not affect length/index of upcoming replacements

		if (a.endIndex < b.endIndex) {
			return 1;
		}
		if (a.endIndex > b.endIndex) {
			return -1;
		}
		return 0;
	});

	const array = Array.from(string);
	indexReplacements.forEach((indexReplacement) => {
		array.splice(
			/* index   */ indexReplacement.startIndex,
			/* count   */ indexReplacement.endIndex - indexReplacement.startIndex,
			/* insert  */ indexReplacement.value
		);
	});
	return array.join("");
}
