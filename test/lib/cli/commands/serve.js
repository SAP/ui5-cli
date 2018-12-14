const {test} = require("ava");
const sinon = require("sinon");
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
let openUrlStub = null;

test.beforeEach("Stubbing modules before execution", (t) => {
	normalizerStub = sinon.stub(normalizer, "generateProjectTree");
	serverStub = sinon.stub(server, "serve");
	sslUtilStub = sinon.stub(ui5Server.sslUtil, "getSslCertificate");
	openUrlStub = sinon.stub(serve, "openUrl");
});

test.afterEach("Stubs Cleanup", (t) => {
	normalizerStub.restore();
	serverStub.restore();
	sslUtilStub.restore();
	openUrlStub.restore();
});

test.serial("ui5 serve: default", async (t) => {
	normalizerStub.resolves(projectTree);
	serverStub.resolves({h2: false, port: 8080});

	// loads project tree
	const pPrepareServerConfig = await serve.handler(defaultInitialHandlerArgs);
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

test.serial("ui5 serve --accept-remote-connections", async (t) => {
	normalizerStub.resolves(projectTree);
	serverStub.resolves({port: 8080});
	const pPrepareServerConfig = await serve.handler(
		Object.assign({}, defaultInitialHandlerArgs, {acceptRemoteConnections: true})
	);
	const pServeServer = await pPrepareServerConfig;
	await pServeServer;
	const injectedServerConfig = serverStub.getCall(0).args[1];
	t.is(injectedServerConfig.acceptRemoteConnections, true, "Remove connections are accepted");
});

test.serial("ui5 serve --open", async (t) => {
	normalizerStub.resolves(projectTree);
	serverStub.resolves({port: 8080});
	const pPrepareServerConfig = await serve.handler(
		Object.assign({}, defaultInitialHandlerArgs, {open: "webapp/index.html"})
	);
	const pServeServer = await pPrepareServerConfig;
	const pServeServerHandler = await pServeServer;
	await pServeServerHandler;
	const openedUrl = openUrlStub.getCall(0).lastArg;
	t.is(openedUrl, "http://localhost:8080/webapp/index.html", `Opens url: ${openedUrl}`);
});

test.serial("ui5 serve --open (opens default url)", async (t) => {
	normalizerStub.resolves(projectTree);
	serverStub.resolves({port: 8080});
	const pPrepareServerConfig = await serve.handler(
		Object.assign({}, defaultInitialHandlerArgs, {open: true})
	);
	const pServeServer = await pPrepareServerConfig;
	const pServeServerHandler = await pServeServer;
	await pServeServerHandler;
	const openedUrl = openUrlStub.getCall(0).lastArg;
	t.is(openedUrl, "http://localhost:8080", `Opens url: ${openedUrl}`);
});
// test("ui5 serve --config", async (t) => { });

// test("ui5 serve --translator", async (t) => { });

// test("ui5 serve --key", async (t) => { });

// test("ui5 serve --cert", async (t) => { });
