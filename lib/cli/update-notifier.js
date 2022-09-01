module.exports = async function({pkg}) {
	const updateNotifier = (await import("update-notifier")).default;
	updateNotifier({
		pkg,
		updateCheckInterval: 1000 * 60 * 60 * 24, // 1 day
		shouldNotifyInNpmScript: true
	}).notify();
};
