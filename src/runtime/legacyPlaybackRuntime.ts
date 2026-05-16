import { PlaybackCommandKind } from '../contracts/playback.js';
import type { PlayerCommand } from '../types/player.js';
import { RuntimeCommandBus, runtimeCommandBus } from './commandBus.js';

export interface LegacyPlaybackRuntimeDependencies {
	playPlayer: (fromStart: boolean, username: string) => Promise<unknown> | unknown;
	sendCommand: (command: PlayerCommand, options: unknown) => Promise<string> | string;
	initPlayer: () => Promise<unknown> | unknown;
}

export class LegacyPlaybackRuntimeAdapter {
	constructor(
		private readonly deps: LegacyPlaybackRuntimeDependencies,
		private readonly bus: RuntimeCommandBus = runtimeCommandBus
	) {}

	playCurrent(username: string) {
		return this.run('play', { username }, () => this.deps.playPlayer(true, username));
	}

	sendPlayerCommand(command: PlayerCommand, options: unknown): Promise<string> {
		return this.run(mapPlayerCommandKind(command), { command, options }, () =>
			this.deps.sendCommand(command, options)
		);
	}

	restart() {
		return this.run('restart', undefined, () => this.deps.initPlayer());
	}

	private async run<T>(kind: PlaybackCommandKind, payload: unknown, handler: () => Promise<T> | T) {
		const result = await this.bus.dispatch(kind, payload, handler, {
			priority: 'high',
			source: 'ws:player',
			timeoutMs: 30000,
		});
		if (result.ok) return result.data as T;
		throw Object.assign(new Error(result.error?.message ?? 'Playback command failed'), {
			code: result.error?.code ?? 500,
		});
	}
}

export function mapPlayerCommandKind(command: string): PlaybackCommandKind {
	switch (command) {
		case 'play':
			return 'play';
		case 'pause':
			return 'pause';
		case 'skip':
			return 'next';
		case 'prev':
			return 'previous';
		case 'seek':
		case 'goTo':
			return 'seek';
		case 'setVolume':
			return 'setVolume';
		case 'setPitch':
			return 'setPitch';
		case 'setSpeed':
			return 'setSpeed';
		case 'showSubs':
		case 'hideSubs':
			return 'setSubs';
		case 'toggleFullscreen':
			return 'toggleFullscreen';
		default:
			return 'stop';
	}
}
