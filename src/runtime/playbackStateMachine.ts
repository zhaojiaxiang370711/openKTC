import { PlaybackRuntimeStatus, PlayerSnapshot, PlayPlan } from '../contracts/playback.js';

export interface PlaybackRuntimeState {
	status: PlaybackRuntimeStatus;
	currentPlan?: PlayPlan;
	position: number;
	error?: string;
	updatedAt: string;
}

export type PlaybackRuntimeAction =
	| { type: 'runtimeStarting'; at?: Date }
	| { type: 'runtimeReady'; at?: Date }
	| { type: 'loadPlan'; plan: PlayPlan; at?: Date }
	| { type: 'playbackStarted'; at?: Date }
	| { type: 'playbackPaused'; at?: Date }
	| { type: 'playbackStopped'; at?: Date }
	| { type: 'positionChanged'; position: number; at?: Date }
	| { type: 'mediaEnded'; at?: Date }
	| { type: 'runtimeCrashed'; error: string; at?: Date }
	| { type: 'runtimeRecovered'; at?: Date }
	| { type: 'commandFailed'; error: string; at?: Date };

export function createInitialPlaybackRuntimeState(at = new Date()): PlaybackRuntimeState {
	return {
		status: 'idle',
		position: 0,
		updatedAt: at.toISOString(),
	};
}

export function reducePlaybackRuntimeState(
	state: PlaybackRuntimeState,
	action: PlaybackRuntimeAction
): PlaybackRuntimeState {
	const updatedAt = (action.at ?? new Date()).toISOString();
	switch (action.type) {
		case 'runtimeStarting':
			return { ...state, status: 'starting', error: undefined, updatedAt };
		case 'runtimeReady':
			return { ...state, status: 'ready', error: undefined, updatedAt };
		case 'loadPlan':
			return { ...state, status: 'loading', currentPlan: action.plan, position: 0, error: undefined, updatedAt };
		case 'playbackStarted':
			return { ...state, status: 'playing', error: undefined, updatedAt };
		case 'playbackPaused':
			return { ...state, status: 'paused', updatedAt };
		case 'playbackStopped':
			return { ...state, status: 'idle', currentPlan: undefined, position: 0, updatedAt };
		case 'positionChanged':
			return { ...state, position: Math.max(0, action.position), updatedAt };
		case 'mediaEnded':
			return { ...state, status: 'ending', updatedAt };
		case 'runtimeCrashed':
			return { ...state, status: 'recovering', error: action.error, updatedAt };
		case 'runtimeRecovered':
			return { ...state, status: state.currentPlan ? 'loading' : 'ready', error: undefined, updatedAt };
		case 'commandFailed':
			return { ...state, status: 'failed', error: action.error, updatedAt };
	}
}

export function snapshotFromRuntimeState(
	state: PlaybackRuntimeState,
	base: Pick<PlayerSnapshot, 'volume' | 'muted' | 'fullscreen'>
): PlayerSnapshot {
	return {
		status: state.status,
		currentPlan: state.currentPlan,
		position: state.position,
		volume: base.volume,
		muted: base.muted,
		fullscreen: base.fullscreen,
		error: state.error,
		updatedAt: state.updatedAt,
	};
}

