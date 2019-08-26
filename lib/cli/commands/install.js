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
	normalizer.generateProjectTree(options).then(function(tree) {
		if (!tree.resources || !tree.resources.framework) {
			throw new Error(`Missing resources.framework configuration for root project ${tree.metadata.name}`);
		}
		return install({
			tree,
			distVersion: tree.resources.framework.version
		});
	}).catch(function(err) {
		console.error(err);
		process.exit(1);
	});
};

module.exports = install;
