import {writeFile} from "node:fs/promises";
import {Session} from "node:inspector";

let session;
let processSignals;

export async function start() {
	if (session) {
		return;
	}
	session = new Session();
	session.connect();
	await new Promise((resolve) => {
		session.post("Profiler.enable", () => {
			console.log(`Recording CPU profile...`);
			session.post("Profiler.start", () => {
				processSignals = registerSigHooks();
				resolve();
			});
		});
	});
}

async function writeProfile(profile) {
	const formatter = new Intl.DateTimeFormat("en-GB", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
	const dateParts = Object.create(null);
	const parts = formatter.formatToParts(new Date());
	parts.forEach((p) => {
		dateParts[p.type] = p.value;
	});

	const fileName = `./ui5_${dateParts.year}-${dateParts.month}-${dateParts.day}_` +
		`${dateParts.hour}-${dateParts.minute}-${dateParts.second}.cpuprofile`;
	console.log(`\nSaving CPU profile to ${fileName}...`);
	await writeFile(fileName, JSON.stringify(profile));
}

export async function stop() {
	if (!session) {
		return;
	}
	if (processSignals) {
		deregisterSigHooks(processSignals);
		processSignals = null;
	}
	const profile = await new Promise((resolve) => {
		session.post("Profiler.stop", (err, {profile}) => {
			if (err) {
				resolve(null);
			} else {
				resolve(profile);
			}
		});
		session = null;
	});
	if (profile) {
		await writeProfile(profile);
	}
}

function registerSigHooks() {
	function createListener(exitCode) {
		return function() {
			// Gracefully end profiling, then exit
			stop().then(() => {
				process.exit(exitCode);
			});
		};
	}

	const processSignals = {
		"SIGHUP": createListener(128 + 1),
		"SIGINT": createListener(128 + 2),
		"SIGTERM": createListener(128 + 15),
		"SIGBREAK": createListener(128 + 21)
	};

	for (const signal of Object.keys(processSignals)) {
		process.on(signal, processSignals[signal]);
	}
	return processSignals;
}

function deregisterSigHooks(signals) {
	for (const signal of Object.keys(signals)) {
		process.removeListener(signal, signals[signal]);
	}
}
