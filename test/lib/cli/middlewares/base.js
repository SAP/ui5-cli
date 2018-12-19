const {test} = require("ava");
const sinon = require("sinon");
const baseMiddleware = require("../../../../lib/cli/middlewares/base");
const logger = require("../../../../lib/cli/middlewares/logger");

test.beforeEach("Stubbing modules before execution", (t) => {
	sinon.stub(logger, "init");
});

test.afterEach("Stubs Cleanup", (t) => {
	logger.init.restore();
});

test.serial("uses default middleware", async (t) => {
	baseMiddleware({loglevel: 1});
	t.is(logger.init.called, true, "Logger middleware initialized");
});

test.serial("skip base middleware initialisation if no arguments have been given", async (t) => {
	const usedMiddleware = baseMiddleware();
	t.deepEqual(usedMiddleware, null, "No middleware is used");
});
