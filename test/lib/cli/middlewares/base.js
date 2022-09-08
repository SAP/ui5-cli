import test from "ava";
import sinon from "sinon";
import baseMiddleware from "../../../../lib/cli/middlewares/base";
import logger from "../../../../lib/cli/middlewares/logger";

test.beforeEach("Stubbing modules before execution", (t) => {
	sinon.stub(logger, "init");
});

test.afterEach("Stubs Cleanup", (t) => {
	sinon.restore();
});

test.serial("uses default middleware", (t) => {
	baseMiddleware({loglevel: 1});
	t.is(logger.init.called, true, "Logger middleware initialized");
});
