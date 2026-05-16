import { PlaybackRuntimeStatus, PlayerSnapshot, PlayPlan } from '../contracts/playback.js';
import { PublicPlayerState } from '../types/state.js';

export function createPlayerSnapshot(
	player: Partial<PublicPlayerState>,
	updatedAt = new Date(),
	currentPlan?: PlayPlan
): PlayerSnapshot {
	return {
		status: mapPlaybackStatus(player),
		currentPlan: currentPlan ?? createCurrentPlan(player, updatedAt),
		position: Math.max(0, Number(player.timeposition ?? 0)),
		volume: Number(player.volume ?? 100),
		muted: !!player.mute,
		fullscreen: !!player.fullscreen,
		updatedAt: updatedAt.toISOString(),
		legacyStatus: player.playerStatus,
	};
}

export function mapPlaybackStatus(player: Partial<PublicPlayerState>): PlaybackRuntimeStatus {
	if (player.isOperating) return 'loading';
	if (player.playerStatus === 'play' || player.playing) return 'playing';
	if (player.playerStatus === 'pause') return 'paused';
	return 'idle';
}

function createCurrentPlan(player: Partial<PublicPlayerState>, updatedAt: Date): PlayPlan {
	if (player.currentSong) {
		return {
			id: String(player.currentSong.plcid ?? player.currentSong.kid),
			kid: player.currentSong.kid,
			mediaType: 'song',
			mediaPath: player.currentSong.mediafile,
			mpvOptions: {},
			displayInfo: player.currentSong.infos,
			expectedDuration: player.currentSong.duration,
			requester: player.currentRequester ?? player.currentSong.username,
			createdAt: updatedAt.toISOString(),
		};
	}
	if (player.currentMedia) {
		return {
			id: player.currentMedia.filename,
			mediaType: player.mediaType ?? 'bundled',
			mediaPath: player.currentMedia.filename,
			mpvOptions: {},
			createdAt: updatedAt.toISOString(),
		};
	}
	return undefined;
}
