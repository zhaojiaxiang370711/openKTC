import { initPlayer, playPlayer, sendCommand } from '../services/player.js';
import { LegacyPlaybackRuntimeAdapter } from './legacyPlaybackRuntime.js';

export const legacyPlaybackRuntime = new LegacyPlaybackRuntimeAdapter({
	playPlayer,
	sendCommand,
	initPlayer,
});
