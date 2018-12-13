const {test} = require("ava");
const sinon = require("sinon");
// const opn = require("opn");
const normalizer = require("@ui5/project").normalizer;
const serve = require("../../../../lib/cli/commands/serve");
const ui5Server = require("@ui5/server");
const server = ui5Server.server;
const defaultInitialHandlerArgs = Object.freeze({
	accessRemoteConnections: false,
	cert: "$HOME/.ui5/server/server.crt",
	h2: false,
	key: "$HOME/.ui5/server/server.key",
	loglevel: "info",
	t8r: "npm",
	translator: "npm"
});
const projectTree = {
	metadata: {
		name: "Sample"
	}
};

let normalizerStub = null;
let serverStub = null;
let sslUtilStub = null;

test.beforeEach("Stubbing modules before execution", (t) => {
	normalizerStub = sinon.stub(normalizer, "generateProjectTree");
	serverStub = sinon.stub(server, "serve");
	sslUtilStub = sinon.stub(ui5Server.sslUtil, "getSslCertificate");
});

test.afterEach("Stubs Cleanup", (t) => {
	normalizerStub.restore();
	serverStub.restore();
	sslUtilStub.restore();
});

test.serial("ui5 serve: default", async (t) => {
	normalizerStub.resolves(projectTree);
	serverStub.resolves({h2: false, port: 8080});

	// loads project tree
	const pPrepareServerConfig = await serve.handler(Object.assign({}, defaultInitialHandlerArgs));
	// preprocess project config, skipping cert load
	const pServeServer = await pPrepareServerConfig;
	// serve server using config
	await pServeServer;

	const injectedProjectTree = serverStub.getCall(0).args[0];
	const injectedServerConfig = serverStub.getCall(0).args[1];

	t.deepEqual(injectedProjectTree, projectTree, "Starting server with given project tree");
	t.deepEqual(injectedServerConfig, {
		changePortIfInUse: true,
		acceptRemoteConnections: false,
		h2: false,
		port: 8080
	}, "Starting server with specific server config");
});

test.serial("ui5 serve --h2", async (t) => {
	normalizerStub.resolves(projectTree);
	serverStub.resolves({h2: true, port: 8443});
	sslUtilStub.resolves({
		key: "randombyte-likes-ponies",
		cert: "secret"
	});

	// loads project tree using http 2
	const pPrepareServerConfig = await serve.handler(Object.assign({}, defaultInitialHandlerArgs, {h2: true}));
	// preprocess project config
	const pFetchSSLCert = await pPrepareServerConfig;
	// Fetching ssl certificate
	const pServeServer = await pFetchSSLCert;
	// serve server using config
	await pServeServer;

	const injectedProjectTree = serverStub.getCall(0).args[0];
	const injectedServerConfig = serverStub.getCall(0).args[1];

	t.deepEqual(injectedProjectTree, projectTree, "Starting server with given project tree");
	t.is(injectedServerConfig.port === 8443, true, "http2 default port was auto set");

	t.deepEqual(injectedServerConfig, {
		changePortIfInUse: true,
		acceptRemoteConnections: false,
		h2: true,
		port: 8443,
		key: "randombyte-likes-ponies",
		cert: "secret"
	}, "Starting server with specific server config");
});

// test("ui5 serve --config", async (t) => {

// });

// test("ui5 serve --translator", async (t) => {

// });

// test("ui5 serve --port --open", async (t) => {

// });

// test("ui5 serve --accept-remote-connections", async (t) => {

// });

// test("ui5 serve --key", async (t) => {

// });

// test("ui5 serve --cert", async (t) => {

// });
