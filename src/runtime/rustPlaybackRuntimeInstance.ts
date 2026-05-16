import { PlayPlan } from '../contracts/playback.js';
import { PlayerCommand } from '../types/player.js';
import { mapPlayerCommandKind } from './legacyPlaybackRuntime.js';
import { RustPlaybackRuntimeClient } from './rustPlaybackRuntime.js';

let shadowRuntime: RustPlaybackRuntimeClient | undefined;

export function isRustPlaybackRuntimeShadowEnabled() {
	return process.env.OPENKTV_RUST_PLAYBACK_SHADOW === '1';
}

export async function mirrorLegacyPlayerCommandToRust(command: PlayerCommand, options: unknown) {
	if (!isRustPlaybackRuntimeShadowEnabled()) return;
	if (!isShadowedPlayerCommand(command)) return;
	const runtime = getShadowRuntime();
	const kind = mapPlayerCommandKind(command);

	const payload = normalizeLegacyOptions(command, options);
	const result = await runtime.dispatch(kind, payload, { timeoutMs: 5000 });
	if (!result.ok) {
		throw Object.assign(new Error(result.error?.message ?? 'Rust playback shadow command failed'), {
			code: result.error?.code,
		});
	}
}

export async function mirrorPlayPlanToRust(playPlan: PlayPlan | undefined) {
	if (!isRustPlaybackRuntimeShadowEnabled() || !playPlan) return;
	const result = await getShadowRuntime().loadPlan(playPlan, { timeoutMs: 10000 });
	if (!result.ok) {
		throw Object.assign(new Error(result.error?.message ?? 'Rust playback shadow loadPlan failed'), {
			code: result.error?.code,
		});
	}
}

export async function clearRustPlaybackShadowPlan() {
	if (!isRustPlaybackRuntimeShadowEnabled()) return;
	const result = await getShadowRuntime().stopPlayback({ timeoutMs: 5000 });
	if (!result.ok) {
		throw Object.assign(new Error(result.error?.message ?? 'Rust playback shadow stop failed'), {
			code: result.error?.code,
		});
	}
}

export async function restartRustPlaybackShadow() {
	if (!isRustPlaybackRuntimeShadowEnabled()) return;
	const result = await getShadowRuntime().dispatch('restart', undefined, { timeoutMs: 5000 });
	if (!result.ok) {
		throw Object.assign(new Error(result.error?.message ?? 'Rust playback shadow restart failed'), {
			code: result.error?.code,
		});
	}
}

function getShadowRuntime() {
	if (!shadowRuntime) {
		shadowRuntime = new RustPlaybackRuntimeClient({
			command: 'cargo',
			args: ['run', '--quiet', '--manifest-path', 'tools/runtime/Cargo.toml', '--', '--mpv'],
			cwd: process.cwd(),
			env: {
				...process.env,
				OPENKTV_RUNTIME_MPV_ARGS: process.env.OPENKTV_RUNTIME_MPV_ARGS ?? '--vo=null --ao=null',
			},
			readyTimeoutMs: 10000,
			commandTimeoutMs: 5000,
		});
	}
	return shadowRuntime;
}

function isShadowedPlayerCommand(command: PlayerCommand) {
	return [
		'play',
		'pause',
		'stopNow',
		'skip',
		'seek',
		'goTo',
		'setVolume',
		'setSpeed',
		'showSubs',
		'hideSubs',
		'toggleFullscreen',
	].includes(command);
}

function normalizeLegacyOptions(command: PlayerCommand, options: unknown) {
	if (typeof options === 'object' && options !== null) return options;
	if (command === 'setVolume' && typeof options === 'number') return { volume: options };
	if (command === 'setSpeed' && typeof options === 'number') return { speed: options };
	if (command === 'seek' && typeof options === 'number') return { seconds: options };
	if (command === 'goTo' && typeof options === 'number') return { position: options };
	return undefined;
}
