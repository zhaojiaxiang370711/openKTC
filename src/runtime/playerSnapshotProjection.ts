import { PlayerSnapshot } from '../contracts/playback.js';
import { emitWS } from '../lib/utils/ws.js';
import { PublicPlayerState } from '../types/state.js';
import { createPlayerSnapshot } from './playerSnapshot.js';

let currentSnapshot: PlayerSnapshot = createPlayerSnapshot({});
let currentPlayPlan: PlayerSnapshot['currentPlan'];

export function getCurrentPlayerSnapshot() {
	return currentSnapshot;
}

export function setCurrentPlayPlan(playPlan: PlayerSnapshot['currentPlan']) {
	currentPlayPlan = playPlan;
	return currentPlayPlan;
}

export function clearCurrentPlayPlan() {
	currentPlayPlan = undefined;
	return currentPlayPlan;
}

export function updatePlayerSnapshot(playerState: Partial<PublicPlayerState>) {
	const status = playerState.playerStatus;
	const plan = status === 'stop' && !playerState.currentSong && !playerState.currentMedia ? undefined : currentPlayPlan;
	if (!plan) currentPlayPlan = undefined;
	currentSnapshot = createPlayerSnapshot(playerState, new Date(), plan);
	emitWS('playerSnapshot', currentSnapshot);
	return currentSnapshot;
}
