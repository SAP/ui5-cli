import test from "ava";
import {createRequire} from "node:module";

// Using CommonsJS require as importing json files causes an ExperimentalWarning
const require = createRequire(import.meta.url);

// package.json should be exported to allow reading the version
test("export of package.json", (t) => {
	t.truthy(require("@ui5/cli/package.json").version);
});
