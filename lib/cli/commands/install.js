// install
const install = {
	command: "install",
	describe: "install",
	middlewares: [require("../middlewares/base.js")]
};

install.builder = function(cli) {
	return cli
		.example("ui5 install", "ui5 install");
};

install.handler = function(argv) {
	const normalizer = require("@ui5/project").normalizer;
	const install = require("../../install/install.js");

	const options = {
		translatorName: argv.translator,
		configPath: argv.config
	};
	const distVersion = "1.66.1";
	normalizer.generateDependencyTree(options).then(function(tree) {
		return install({tree, distVersion});
	}).catch(function(err) {
		console.error(err);
		process.exit(1);
	});
};

module.exports = install;
