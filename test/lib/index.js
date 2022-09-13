import test from "ava";
import index from "../../index.js";

test("index.js exports all expected modules", (t) => {
	t.truthy(index.init, "Module exported");
});
