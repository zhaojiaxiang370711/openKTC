import { initPlayer, playPlayer, sendCommand } from '../services/player.js';
import { LegacyPlaybackRuntimeAdapter } from './legacyPlaybackRuntime.js';
import { mirrorLegacyPlayerCommandToRust, restartRustPlaybackShadow } from './rustPlaybackRuntimeInstance.js';

export const legacyPlaybackRuntime = new LegacyPlaybackRuntimeAdapter({
	playPlayer,
	async sendCommand(command, options) {
		const result = await sendCommand(command, options);
		void mirrorLegacyPlayerCommandToRust(command, options).catch(err => {
			console.warn(`Rust playback shadow command failed: ${err.message}`);
		});
		return result;
	},
	async initPlayer() {
		const result = await initPlayer();
		void restartRustPlaybackShadow().catch(err => {
			console.warn(`Rust playback shadow restart failed: ${err.message}`);
		});
		return result;
	},
});
