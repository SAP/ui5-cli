import {writeFile} from "node:fs/promises";
import {Session} from "node:inspector";

let session;

export async function start() {
	if (session) {
		return;
	}
	session = new Session();
	session.connect();
	await new Promise((resolve) => {
		session.post("Profiler.enable", () => {
			session.post("Profiler.start", () => {
				resolve();
			});
		});
	});
}

async function writeProfile(profile) {
	const d = new Date();
	const timestamp =
		`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}_${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}`;

	await writeFile(`./ui5_${timestamp}.cpuprofile`, JSON.stringify(profile));
}

export async function stop() {
	if (!session) {
		return;
	}
	const profile = await new Promise((resolve) => {
		session.post("Profiler.stop", (err, {profile}) => {
			if (err) {
				resolve(null);
			} else {
				resolve(profile);
			}
		});
	});
	if (profile) {
		await writeProfile(profile);
	}
}
