import {stat} from "node:fs/promises";
import path from "node:path";

/**
 * Checks if a file or path exists
 *
 * @param filePath Path to check
 * @returns Promise resolving with true if the file or path exists
 */
export async function exists(filePath: string) {
	try {
		await stat(filePath);
		return true;
	} catch (err) {
		// "File or directory does not exist"
		if (err.code === "ENOENT") {
			return false;
		} else {
			throw err;
		}
	}
}

/**
 * Checks if a list of paths exists
 *
 * @param paths List of paths to check
 * @param cwd Current working directory
 * @returns Resolving with an array of booleans for each path
 */
export async function pathsExist(paths: any[], cwd: string) {
	return await Promise.all(paths.map((p) => exists(path.join(cwd, p))));
}
