import { execFile } from 'child_process';
import { promisify } from 'util';

import { ApplianceAudioMonitorStatus, ApplianceAudioMonitorUpdate } from '../types/audio.js';

const execFileAsync = promisify(execFile);

const newmineSource = 'alsa_input.usb-SmartlinkTechnology_Newmine-00.mono-fallback';
const hdmiSink = 'alsa_output.pci-0000_01_00.1.hdmi-stereo';
const loopbackLatencyMs = 20;

export async function getApplianceAudioMonitorStatus(): Promise<ApplianceAudioMonitorStatus> {
	const [sources, sinks, modules, sourceVolume, sinkVolume, sourceMute, sinkMute] = await Promise.all([
		pactl(['list', 'short', 'sources']),
		pactl(['list', 'short', 'sinks']),
		pactl(['list', 'short', 'modules']),
		getVolume('source', newmineSource),
		getVolume('sink', hdmiSink),
		getMute('source', newmineSource),
		getMute('sink', hdmiSink),
	]);
	const moduleId = findLoopbackModuleId(modules, newmineSource, hdmiSink);
	const sourceAvailable = hasNode(sources, newmineSource);
	const sinkAvailable = hasNode(sinks, hdmiSink);

	return {
		enabled: !!moduleId,
		available: sourceAvailable && sinkAvailable,
		moduleId,
		latencyMs: loopbackLatencyMs,
		source: {
			name: newmineSource,
			label: 'Newmine',
			available: sourceAvailable,
			volume: sourceVolume,
			muted: sourceMute,
		},
		sink: {
			name: hdmiSink,
			label: 'HDMI / display',
			available: sinkAvailable,
			volume: sinkVolume,
			muted: sinkMute,
		},
	};
}

export async function updateApplianceAudioMonitor(update: ApplianceAudioMonitorUpdate) {
	if (typeof update.micVolume === 'number') {
		await setVolume('source', newmineSource, update.micVolume, 150);
	}
	if (typeof update.outputVolume === 'number') {
		await setVolume('sink', hdmiSink, update.outputVolume, 100);
	}
	if (typeof update.micMuted === 'boolean') {
		await setMute('source', newmineSource, update.micMuted);
	}
	if (typeof update.outputMuted === 'boolean') {
		await setMute('sink', hdmiSink, update.outputMuted);
	}
	if (typeof update.enabled === 'boolean') {
		if (update.enabled) {
			await enableLoopback();
		} else {
			await disableLoopback();
		}
	}
	return getApplianceAudioMonitorStatus();
}

async function enableLoopback() {
	await pactl(['set-default-source', newmineSource]);
	await pactl(['set-default-sink', hdmiSink]);
	await disableLoopback();
	await pactl([
		'load-module',
		'module-loopback',
		`source=${newmineSource}`,
		`sink=${hdmiSink}`,
		`latency_msec=${loopbackLatencyMs}`,
	]);
}

async function disableLoopback() {
	const modules = await pactl(['list', 'short', 'modules']);
	const moduleIds = findLoopbackModuleIds(modules, newmineSource);
	await Promise.all(moduleIds.map(id => pactl(['unload-module', id]).catch(() => {})));
}

async function pactl(args: string[]) {
	try {
		const { stdout } = await execFileAsync('pactl', args, {
			timeout: 5000,
			maxBuffer: 1024 * 1024,
		});
		return stdout;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`pactl ${args.join(' ')} failed: ${message}`);
	}
}

async function getVolume(kind: 'source' | 'sink', name: string) {
	try {
		const output = await pactl([`get-${kind}-volume`, name]);
		return parsePercent(output);
	} catch (_) {
		return 0;
	}
}

async function setVolume(kind: 'source' | 'sink', name: string, value: number, max: number) {
	const percent = Math.max(0, Math.min(max, Math.round(value)));
	await pactl([`set-${kind}-volume`, name, `${percent}%`]);
}

async function getMute(kind: 'source' | 'sink', name: string) {
	try {
		const output = await pactl([`get-${kind}-mute`, name]);
		return /\byes\b/i.test(output);
	} catch (_) {
		return false;
	}
}

async function setMute(kind: 'source' | 'sink', name: string, muted: boolean) {
	await pactl([`set-${kind}-mute`, name, muted ? '1' : '0']);
}

function hasNode(output: string, name: string) {
	return output
		.split('\n')
		.map(line => line.split('\t')[1])
		.includes(name);
}

function findLoopbackModuleId(output: string, source: string, sink: string) {
	return findLoopbackModuleIds(output, source).find(id => {
		const line = output.split('\n').find(moduleLine => moduleLine.startsWith(`${id}\t`));
		return line?.includes(`sink=${sink}`);
	});
}

function findLoopbackModuleIds(output: string, source: string) {
	return output
		.split('\n')
		.filter(line => line.includes('module-loopback') && line.includes(`source=${source}`))
		.map(line => line.split('\t')[0])
		.filter(Boolean);
}

function parsePercent(output: string) {
	const match = output.match(/\/\s*(\d+)%/);
	return match ? Number(match[1]) : 0;
}
