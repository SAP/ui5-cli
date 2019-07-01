const path = require("path");
const os = require("os");

// Serve
const serve = {
	command: "serve",
	describe: "Start a web server for the current project",
	middlewares: [require("../middlewares/base.js")]
};

serve.builder = function(cli) {
	return cli
		.option("port", {
			describe: "Port to bind on (default for HTTP: 8080, HTTP/2: 8443)",
			alias: "p",
			type: "number"
		})
		.option("open", {
			describe: "Open web server root directory in default browser. Optionally, supplied relative path will be appended to the root URL",
			alias: "o",
			type: "string"
		})
		.option("h2", {
			describe: "Shortcut for enabling the HTTP/2 protocol for the web server",
			default: false,
			type: "boolean"
		})
		.option("accept-remote-connections", {
			describe: "Accept remote connections. By default the server only accepts connections from localhost",
			default: false,
			type: "boolean"
		})
		.option("key", {
			describe: "Path to the private key",
			default: path.join(os.homedir(), ".ui5", "server", "server.key"),
			type: "string"
		})
		.option("cert", {
			describe: "Path to the certificate",
			default: path.join(os.homedir(), ".ui5", "server", "server.crt"),
			type: "string"
		})
		.option("sap-csp-policies", {
			describe: "Always send content security policies 'sap-target-level-1' and 'sap-target-level-2' in report-only mode",
			default: false,
			type: "boolean"
		})
		.example("ui5 serve", "Start a web server for the current project")
		.example("ui5 serve --h2", "Enable the HTTP/2 protocol for the web server (requires SSL certificate)")
		.example("ui5 serve --config /path/to/ui5.yaml", "Use the project configuration from a custom path")
		.example("ui5 serve --translator static:/path/to/projectDependencies.yaml",
			"Use a \"static\" translator with translator parameters.")
		.example("ui5 serve --port 1337 --open tests/QUnit.html",
			"Listen to port 1337 and launch default browser with http://localhost:1337/test/QUnit.html");
};

serve.handler = function(argv) {
	const normalizer = require("@ui5/project").normalizer;
	const ui5Server = require("@ui5/server");
	const server = ui5Server.server;

	normalizer.generateProjectTree({
		translatorName: argv.translator,
		configPath: argv.config
	}).then(function(tree) {
		const serverConfig = {
			port: argv.port === undefined ? argv.h2 ? 8443 : 8080 : argv.port,
			changePortIfInUse: argv.port === undefined, // only change if port isn't explicitly set
			h2: argv.h2,
			acceptRemoteConnections: !!argv.acceptRemoteConnections,
			cert: argv.h2 ? argv.cert : undefined,
			key: argv.h2 ? argv.key : undefined,
			sendSAPTargetCSP: !!argv.sapCspPolicies
		};

		if (!serverConfig.h2) {
			return {serverConfig, tree};
		} else {
			return ui5Server.sslUtil.getSslCertificate(serverConfig.key, serverConfig.cert).then(({key, cert}) => {
				serverConfig.key = key;
				serverConfig.cert = cert;
				return {serverConfig, tree};
			});
		}
	}).then(({serverConfig, tree}) => {
		return server.serve(tree, serverConfig).then(function({h2, port}) {
			const protocol = h2 ? "https" : "http";
			let browserUrl = protocol + "://localhost:" + port;
			console.log("Server started");
			console.log("URL: " + browserUrl);

			if (argv.open !== undefined) {
				if (typeof argv.open === "string") {
					let relPath = argv.open || "/";
					if (!relPath.startsWith("/")) {
						relPath = "/" + relPath;
					}
					browserUrl += relPath;
				}
				const open = require("open");
				open(browserUrl);
			}

			return browserUrl;
		});
	}).catch(function(err) {
		console.error(err);
		process.exit(1);
	});
};

module.exports = serve;
