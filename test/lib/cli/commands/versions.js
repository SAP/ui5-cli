import test from "ava";
import sinon from "sinon";
import versions from "../../../../lib/cli/commands/versions.js";

test.afterEach.always((t) => {
	sinon.restore();
});

test.serial("Retrieves version from package.json", async (t) => {
	const builderVersion = await versions.getVersion("../../../test/fixtures/@ui5/builder");
	const serverVersion = await versions.getVersion("../../../test/fixtures/@ui5/server");
	const fsVersion = await versions.getVersion("../../../test/fixtures/@ui5/fs");
	const projectVersion = await versions.getVersion("../../../test/fixtures/@ui5/project");
	const loggerVersion = await versions.getVersion("../../../test/fixtures/@ui5/logger");

	t.is(builderVersion, "0.2.6", "retrieved correct version for builder");
	t.is(serverVersion, "0.2.2", "retrieved correct version for server");
	t.is(fsVersion, "0.2.0", "retrieved correct version for fs");
	t.is(projectVersion, "0.2.3", "retrieved correct version for project");
	t.is(loggerVersion, "0.2.2", "retrieved correct version for logger");
});

test.serial("Error: returns not installed if version was not found", async (t) => {
	t.is(await versions.getVersion("not/existing/path"), "===(not installed)", "No version found");
});

test.serial("Error: throws with error if error occurred while processing", async (t) => {
	sinon.stub(versions, "getVersion").throws(new Error("Error occurred"));
	const error = await t.throwsAsync(versions.handler({}));
	t.is(error.message, "Error occurred", "Correct error message thrown");
});
