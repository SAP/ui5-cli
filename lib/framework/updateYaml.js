const path = require("path");
const deepDiff = require("deep-diff");
const {loadAll, safeDump, DEFAULT_SAFE_SCHEMA} = require("js-yaml");
const {fromYaml, getPosition} = require("data-with-position");

function safeLoadAll({configFile, configPath}) {
	// Using loadAll with DEFAULT_SAFE_SCHEMA instead of safeLoadAll to pass "filename".
	// safeLoadAll doesn't handle its parameters properly.
	// See https://github.com/nodeca/js-yaml/issues/456 and https://github.com/nodeca/js-yaml/pull/381
	return loadAll(configFile, undefined, {
		filename: configPath,
		schema: DEFAULT_SAFE_SCHEMA
	});
}

function getProjectYamlDocument({project, configFile, configPath}) {
	const configs = safeLoadAll({configFile, configPath});

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

function applyChanges(string, changes) {
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

	const indexReplacements = changes.map((change) => {
		if (change.type === "update") {
			return {
				startIndex: positionToIndex(change.position.start),
				endIndex: positionToIndex(change.position.end),
				value: change.value
			};
		} else if (change.type === "insert") {
			return {
				startIndex: positionToIndex(change.parentPosition.end) + 1,
				endIndex: positionToIndex(change.parentPosition.end) + 1,
				value: change.value
			};
		}
	}).sort((a, b) => {
		// Sort decending by endIndex
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

function formatValue(value, indent) {
	if (typeof value === "string") {
		// TOOD: Use better logic?
		if (value.includes(".")) {
			return ` "${value}"`; // Put quotes around versions
		} else {
			return " " + value;
		}
	} else if (typeof value === "object" && !Array.isArray(value)) {
		let string = "\n";
		Object.keys(value).forEach((key) => {
			const entry = value[key];
			string += " ".repeat(indent) + key + ":" + formatValue(entry) + "\n";
		});
		return string;
	} else if (Array.isArray(value)) {
		const indentString = " ".repeat(indent);
		const string = safeDump(value);
		const arr = string.split("\n");
		arr.pop();
		return "\n" + indentString + arr.join("\n" + indentString);
	}
}

module.exports = async function({project, data}) {
	const {promisify} = require("util");
	const fs = require("fs");
	const readFile = promisify(fs.readFile);
	const writeFile = promisify(fs.writeFile);

	const configPath = project.configPath || path.join(project.path, "ui5.yaml");
	const configFile = await readFile(configPath, {encoding: "utf8"});

	let {
		projectDocument,
		projectDocumentContent,
		projectDocumentStartIndex
	} = await getProjectYamlDocument({
		project,
		configFile,
		configPath
	});

	const positionData = fromYaml(projectDocumentContent);

	const changes = [];

	function handleNew(diffEntry) {
		// New
		// TODO
		const parentPath = diffEntry.path.slice(0, -1);
		const parentData = getValueFromPath(positionData, parentPath);
		const parentPosition = getPosition(parentData);
		const siblings = Object.keys(parentData);
		let indent;
		if (siblings.length === 0) {
			indent = parentPosition.start.column - 1;
		} else {
			const firstSiblingPosition = getPosition(parentData[siblings[0]]);
			indent = firstSiblingPosition.start.column - 1;
		}
		changes.push({
			type: "insert",
			parentPosition,
			value: `${" ".repeat(indent)}${diffEntry.path[diffEntry.path.length - 1]}:${formatValue(diffEntry.rhs, indent + 2)}\n`
		});
	}

	function handleArray(diffEntry) {
		const newArrayData = getValueFromPath(data, diffEntry.path);
		const arrayData = getValueFromPath(positionData, diffEntry.path);
		const arrayPosition = getPosition(arrayData);
		// -1 as column 1 starts at index 0
		const indent = arrayPosition.start.column - 1;
		changes.push({
			type: "update",
			position: arrayPosition,
			value: `${diffEntry.path[diffEntry.path.length - 1]}:` + formatValue(newArrayData, indent + 2)
		});
	}

	const arraysHandled = {};

	const diffEntries = deepDiff(projectDocument, data);
	if (diffEntries) {
		diffEntries.forEach((diffEntry) => {
			console.log(diffEntry);
			switch (diffEntry.kind) {
			case "N":
				if (diffEntry.path[0] === "framework" && diffEntry.path[1] === "libraries") {
					break;
				}
				handleNew(diffEntry);
				break;
			case "E":
				// Edit
				if (diffEntry.path[0] === "framework" && diffEntry.path[1] === "libraries") {
					break;
				}
				changes.push({
					type: "update",
					position: getPositionFromPath(positionData, diffEntry.path),
					value: `${diffEntry.path[diffEntry.path.length - 1]}:${formatValue(diffEntry.rhs)}`
				});
				break;
			case "A":
				// Array
				if (arraysHandled[diffEntry.path.join("/")]) {
					console.log("arraysHandled - skip: " + diffEntry.path.join("/"));
					break;
				}
				handleArray(diffEntry);
				arraysHandled[diffEntry.path.join("/")] = true;
				break;
			case "D":
				// Ignore deletes as we only want to add/update entries
				break;
			default:
				break;
			}
		});
	}

	// TODO: detect windows line-endings
	if (!projectDocumentContent.endsWith("\n")) {
		projectDocumentContent += "\n";
	}

	const adoptedProjectYaml = applyChanges(projectDocumentContent, changes);

	const array = Array.from(configFile);
	array.splice(projectDocumentStartIndex, projectDocumentContent.length, adoptedProjectYaml);
	let adoptedYaml = array.join("");

	// TODO: detect windows line-endings
	if (!adoptedYaml.endsWith("\n")) {
		adoptedYaml += "\n";
	}

	// Validate content before writing
	try {
		safeLoadAll({configFile: adoptedYaml, configPath});
	} catch (err) {
		console.log(err);
		console.log(adoptedYaml);
		const error = new Error("Failed to update YAML file: " + err.message);
		error.name = "FrameworkUpdateYamlFailed";
		throw error;
	}

	await writeFile(configPath, adoptedYaml);
};