const {test} = require("ava");
const sinon = require("sinon");
const baseMiddleware = require("../../../../lib/cli/middlewares/base");
const logger = require("@ui5/logger");

test.serial("sets log level of log middleware", async (t) => {
	sinon.stub(logger, "setLevel");
	baseMiddleware({loglevel: 1});
	t.is(logger.setLevel.getCall(0).args[0], 1, "sets log level to 1");
	logger.setLevel.restore();
});

test.serial("disable middleware if invalig arguments are given", async (t) => {
	const usedMiddleware = baseMiddleware();
	t.deepEqual(usedMiddleware, {}, "No middleware is used");
});

test.serial("use logger middleware if verbose or loglevel are set", async (t) => {
	const usedMiddleware = baseMiddleware({verbose: true});
	t.deepEqual(Object.keys(usedMiddleware), Object.keys(logger), "Logger is used as middleware");
});
