const test = require("ava");
const sinon = require("sinon");
const mock = require("mock-require");

const addCommand = require("../../../../lib/cli/commands/add");

async function assertAddHandler(t, {argv, expectedLibraries}) {
	const frameworkAddStub = sinon.stub().resolves({
		yamlUpdated: true
	});
	mock("../../../../lib/framework/add", frameworkAddStub);

	await addCommand.handler(argv);

	t.is(frameworkAddStub.callCount, 1, "Add function should be called once");
	t.deepEqual(frameworkAddStub.getCall(0).args, [
		{
			libraries: expectedLibraries,
			normalizerOptions: {
				configPath: undefined,
				translatorName: undefined
			}
		}],
	"Add function should be called with expected args");
}

async function assertFailingAddHandler(t, {argv, expectedMessage}) {
	const frameworkAddStub = sinon.stub().resolves({
		yamlUpdated: true
	});
	mock("../../../../lib/framework/add", frameworkAddStub);

	const exception = await t.throwsAsync(addCommand.handler(argv));

	t.is(exception.message, expectedMessage, "Add handler should throw expected error");
	t.is(frameworkAddStub.callCount, 0, "Add function should not be called");
}

test.afterEach.always(() => {
	mock.stopAll();
	sinon.restore();
});

test.serial("Accepts single library", async (t) => {
	await assertAddHandler(t, {
		argv: {"framework-libraries": ["sap.ui.lib1"]},
		expectedLibraries: ["sap.ui.lib1"]
	});
});

test.serial("Accepts multiple libraries", async (t) => {
	await assertAddHandler(t, {
		argv: {"framework-libraries": ["sap.ui.lib1", "sap.ui.lib2"]},
		expectedLibraries: ["sap.ui.lib1", "sap.ui.lib2"]
	});
});

test.serial("Rejects on empty framework-libraries", async (t) => {
	await assertFailingAddHandler(t, {
		argv: {"framework-libraries": ""},
		expectedMessage: "Missing mandatory framework-libraries"
	});
});
