import path from "node:path";
import {readFile, writeFile} from "node:fs/promises";
import {loadAll, dump} from "js-yaml";
import {fromYaml, getPosition, getValue, getKind} from "data-with-position";
import {getLogger} from "@ui5/logger";

const log = getLogger("cli:framework:updateYaml");

function getProjectYamlDocument({project, configFile, configPath}) {
	const configs = loadAll(configFile, undefined, {
		filename: configPath
	});

	const projectDocumentIndex = configs.findIndex((config) => {
		return config.metadata && config.metadata.name === project.getName();
	});
	if (projectDocumentIndex === -1) {
		throw new Error(
			`Could not find project with name ${project.getName()} in YAML: ${configPath}`
		);
	}

	const matchDocumentSeparator = /^---/gm;
	let currentDocumentIndex = 0;
	let currentIndex = 0;
	let document;
	while ((document = matchDocumentSeparator.exec(configFile)) !== null) {
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
			let startIndex = positionToIndex(change.parentPosition.end);
			if (change.parentPosition.end.column > 1) {
				// When end.column is not 1 we expect it to be the end of the line
				// so the index needs to be increased by 1 to insert into the next line
				startIndex++;
			}
			const endIndex = startIndex;
			return {
				startIndex,
				endIndex,
				value: change.value
			};
		}
	}).sort((a, b) => {
		// Sort descending by endIndex
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
	const data = getValueFromPath(positionData, path);
	const position = getPosition(data);
	const kind = getKind(data);
	if ((kind === "array" && data.length) || kind === "object") {
		// data-with-position treats arrays and objects different from primitives:
		// The end index of such nodes always reaches up to the beginning of the following node, instead of the end
		// of the contained data.
		// For example, if an array has entries, the end position of the array is *directly* at the beginning of
		// the next node instead of at the end of the last entry.
		// Typically this means one line and multiple columns *after* the array ended.
		// However, if an array has no entries (e.g. "[]"), the end is directly after the end of that data and
		// *not* in the next line (this appears to be an inconsistency).
		// Therefore, in case we encounter an array *with entries*, or an object, we reset the end column to "1"
		// to prevent replacing (i.e. removing) the indentation of the following node.
		position.end.column = 1;
	}
	return position;
}

function formatValue(value, indent) {
	if (typeof value === "string") {
		// TODO: Use better logic?
		if (value.includes(".")) {
			return ` "${value}"`; // Put quotes around versions
		} else {
			return " " + value;
		}
	} else if (typeof value === "object" && !Array.isArray(value)) {
		let string = "\n";
		Object.keys(value).forEach((key, i, arr) => {
			const entry = value[key];
			string += " ".repeat(indent) + key + ":" + formatValue(entry);
			if (i < arr.length - 1) {
				string += "\n";
			}
		});
		return string;
	} else if (Array.isArray(value)) {
		const indentString = " ".repeat(indent);
		const string = dump(value);
		const arr = string.split("\n");
		arr.pop();
		return "\n" + indentString + arr.join("\n" + indentString) + "\n";
	}
}

export default async function({project, configPathOverride, data}) {
	let configPath;
	if (configPathOverride) {
		if (path.isAbsolute(configPathOverride)) {
			configPath = configPathOverride;
		} else {
			configPath = path.join(project.getRootPath(), configPathOverride);
		}
	} else {
		configPath = path.join(project.getRootPath(), "ui5.yaml");
	}

	const configFile = await readFile(configPath, {encoding: "utf8"});

	let {
		projectDocumentContent,
		projectDocumentStartIndex
	} = await getProjectYamlDocument({
		project,
		configFile,
		configPath
	});

	const positionData = fromYaml(projectDocumentContent);

	const changes = [];

	function addInsert(entryPath, newValue) {
		// New
		const parentPath = entryPath.slice(0, -1);
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
		let value = `${" ".repeat(indent)}${entryPath[entryPath.length - 1]}:${formatValue(newValue, indent + 2)}`;
		if (!value.endsWith("\n")) {
			value += "\n";
		}
		changes.push({
			type: "insert",
			parentPosition,
			value
		});
	}

	function addUpdate(entryPath, newValue) {
		const position = getPositionFromPath(positionData, entryPath);
		// -1 as column 1 starts at index 0
		const indent = position.start.column - 1;
		changes.push({
			type: "update",
			position,
			value: `${entryPath[entryPath.length - 1]}:${formatValue(newValue, indent + 2)}`
		});
	}

	function addRemove(entryPath) {
		const position = getPositionFromPath(positionData, entryPath);
		const copyPosition = JSON.parse(JSON.stringify(position));
		// set copyPosition to 1 to remove the indent
		copyPosition.start.column = 1;
		changes.push({
			type: "update",
			position: copyPosition,
			value: ``
		});
	}

	if (!positionData.framework) {
		addInsert(["framework"], data.framework);
	} else {
		if (data.framework.name) {
			if (!positionData.framework.name) {
				addInsert(["framework", "name"], data.framework.name);
			} else if (getValue(positionData.framework.name) !== data.framework.name) {
				addUpdate(["framework", "name"], data.framework.name);
			}
		}
		if (data.framework.version) {
			if (!positionData.framework.version) {
				addInsert(["framework", "version"], data.framework.version);
			} else if (getValue(positionData.framework.version) !== data.framework.version) {
				addUpdate(["framework", "version"], data.framework.version);
			}
		}
		if (data.framework.libraries) {
			if (!positionData.framework.libraries) {
				addInsert(["framework", "libraries"], data.framework.libraries);
			} else if (Array.isArray(data.framework.libraries) && data.framework.libraries.length > 0) {
				addUpdate(["framework", "libraries"], data.framework.libraries);
			} else {
				// remove empty array
				addRemove(["framework", "libraries"]);
			}
		}
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
		loadAll(adoptedYaml);
	} catch (err) {
		const error = new Error("Failed to update YAML file: " + err.message);
		error.name = "FrameworkUpdateYamlFailed";
		log.verbose(error.message);
		log.verbose(`Original YAML (${configPath}):\n` + configFile);
		log.verbose("Updated YAML:\n" + adoptedYaml);
		throw error;
	}

	await writeFile(configPath, adoptedYaml);
}
