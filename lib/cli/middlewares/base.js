const logger = require("./logger");
/**
 * Base middleware for CLI commands.
 *
 * This middleware should be executed for every CLI command to enable basic features (e.g. logging).
 * @param {Object} argv The CLI arguments
 * @returns {Object} Data to be appended to argv
 */
module.exports = function(argv = {}) {
	if (Object.keys(argv).length === 0) return null;

	logger.init(argv);
};
