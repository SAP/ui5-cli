// Test

let test = {
	command: "test",
	describe: "TBD"
};

test.handler = async function(argv) {
	const karma = require("karma");
	const normalizer = require("@ui5/project").normalizer;
	const server = require("@ui5/server").server;

	const tree = await normalizer.generateProjectTree({
		translator: argv.translator,
		configPath: argv.config
	});

	await server.serve(tree, {
		port: 8080
	});

	const karmaServer = new karma.Server({
		basePath: "webapp",
		frameworks: ["qunit", "openui5"],
		openui5: {
			path: "http://localhost:8080/resources/sap-ui-core.js"
		},
		client: {
			openui5: {
				config: {
					theme: "sap_belize",
					language: "EN",
					bindingSyntax: "complex",
					compatVersion: "edge",
					preload: "async",
					resourceroots: {"sap.ui.demo.todo": "./base"}
				},
				tests: [
					"sap/ui/demo/todo/test/unit/allTests",
					"sap/ui/demo/todo/test/integration/AllJourneys"
				]
			}
		},
		files: [
			{pattern: "**", included: false, served: true, watched: true}
		],
		reporters: ["progress"],
		port: 9876,
		logLevel: "INFO",
		browserConsoleLogOptions: {
			level: "warn"
		},
		browsers: ["Chrome"]
	}, function(exitCode) {
		console.log("Karma has exited with " + exitCode);
		process.exit(exitCode);
	});
	karmaServer.start();
};

module.exports = test;
