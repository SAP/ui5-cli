// update-notifier is an ES module and therefore needs to be loaded via "import".
// It is important to have this code in a separate file as this module also
// supports Node.js versions without dynamic import support (e.g. v10).
// Otherwise it will lead to syntax errors.
module.exports = async function({pkg}) {
	const updateNotifier = (await import("update-notifier")).default;
	updateNotifier({
		pkg,
		updateCheckInterval: 1000 * 60 * 60 * 24, // 1 day
		shouldNotifyInNpmScript: true
	}).notify();
};
