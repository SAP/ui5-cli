const path = require("path");
const deepDiff = require("deep-diff");
const {fromYaml, getPosition, getValue} = require("data-with-position");

function getProjectYamlDocument({project, configFile, configPath}) {
	// Using loadAll with DEFAULT_SAFE_SCHEMA instead of safeLoadAll to pass "filename".
	// safeLoadAll doesn't handle its parameters properly.
	// See https://github.com/nodeca/js-yaml/issues/456 and https://github.com/nodeca/js-yaml/pull/381
	const jsyaml = require("js-yaml");
	const configs = jsyaml.loadAll(configFile, undefined, {
		filename: configPath,
		schema: jsyaml.DEFAULT_SAFE_SCHEMA
	});

	const projectDocumentIndex = configs.findIndex((config) => {
		return config.metadata && config.metadata.name === project.metadata.name;
	});
	if (projectDocumentIndex === -1) {
		throw new Error(
			`Could not find project with name ${project.metadata.name} in YAML: ${configPath}`
		);
	}

	const matchAll = require("string.prototype.matchall");
	const matchDocumentSeparator = /^---/gm;
	const documents = matchAll(configFile, matchDocumentSeparator);
	let currentDocumentIndex = 0;
	let currentIndex = 0;
	for (const document of documents) {
		// If the first separator is not at the beginning of the file
		// we are already at document index 1
		// Using String#trim() to remove any whitespace characters
		if (currentDocumentIndex === 0 && configFile.substring(0, document.index).trim().length > 0) {
			currentDocumentIndex = 1;
		}

		if (currentDocumentIndex === projectDocumentIndex) {
			currentIndex = document.index;
			break;
		}

		currentDocumentIndex++;
	}

	return {
		projectDocument: configs[projectDocumentIndex],
		projectDocumentContent: configFile.substring(currentIndex),
		projectDocumentStartIndex: currentIndex
	};
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

function getValueFromPath(data, path) {
	return path.reduce((currentData, pathSegment) => {
		return currentData[pathSegment];
	}, data);
}

function getPositionFromPath(positionData, path) {
	return getPosition(getValueFromPath(positionData, path));
}

function formatValue(value) {
	// TOOD: Use better logic?
	if (value.includes(".")) {
		return `"${value}"`; // Put quotes around versions
	} else {
		return value;
	}
}

module.exports = async function({project, data}) {
	const {promisify} = require("util");
	const fs = require("fs");
	const readFile = promisify(fs.readFile);
	const writeFile = promisify(fs.writeFile);

	const configPath = project.configPath || path.join(project.path, "ui5.yaml");
	const configFile = await readFile(configPath, {encoding: "utf8"});

	const {
		projectDocument,
		projectDocumentContent,
		projectDocumentStartIndex
	} = await getProjectYamlDocument({
		project,
		configFile,
		configPath
	});

	const positionData = fromYaml(projectDocumentContent);

	const replacements = [];

	deepDiff(projectDocument, data).forEach((diffEntry) => {
		switch (diffEntry.kind) {
		case "N":
			// New
			// TODO
			break;
		case "E":
			// Edit
			// TODO
			replacements.push({
				position: getPositionFromPath(positionData, diffEntry.path),
				value: `${diffEntry.path[diffEntry.path.length - 1]}: ${formatValue(diffEntry.rhs)}`
			});
			break;
		case "A":
			// Array
			// TODO
			break;
		case "D":
			// Ignore deletes as we only want to add/update entries
			break;
		default:
			break;
		}
	});

	let adoptedProjectYaml;
	if (!positionData.framework) {
		adoptedProjectYaml = projectDocumentContent + "\n" + "framework:\n";
		adoptedProjectYaml += "  name: " + data.framework.name;
		if (data.framework.version) {
			adoptedProjectYaml += "\n  version: \"" + data.framework.version + "\"";
		}
		adoptedProjectYaml += "\n";
	} else {
		// replacements.push({
		// 	position: getPosition(positionData.framework.version),
		// 	value: `version: "${data.framework.version}"`
		// });
		adoptedProjectYaml = applyReplacements(projectDocumentContent, replacements);
	}


	const array = Array.from(configFile);
	array.splice(projectDocumentStartIndex, projectDocumentContent.length, adoptedProjectYaml);
	const adoptedYaml = array.join("");

	await writeFile(configPath, adoptedYaml);
};
