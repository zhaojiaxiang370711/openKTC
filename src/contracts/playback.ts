import { RuntimeCommandPriority } from './runtime.js';

export type PlaybackRuntimeStatus =
	| 'idle'
	| 'starting'
	| 'ready'
	| 'loading'
	| 'playing'
	| 'paused'
	| 'ending'
	| 'recovering'
	| 'failed';

export type PlaybackMediaType =
	| 'song'
	| 'stop'
	| 'pause'
	| 'poll'
	| 'bundled'
	| 'Intros'
	| 'Jingles'
	| 'Sponsors'
	| 'Encores'
	| 'Outros';

export type PlaybackCommandKind =
	| 'loadPlan'
	| 'play'
	| 'pause'
	| 'stop'
	| 'seek'
	| 'setVolume'
	| 'setPitch'
	| 'setSpeed'
	| 'setSubs'
	| 'restart'
	| 'next'
	| 'previous'
	| 'toggleFullscreen';

export type PlaybackEventType =
	| 'runtimeReady'
	| 'stateChanged'
	| 'positionChanged'
	| 'mediaEnded'
	| 'commandAck'
	| 'commandFailed'
	| 'runtimeCrashed'
	| 'runtimeRecovered';

export interface PlayPlan {
	id: string;
	kid?: string;
	mediaType: PlaybackMediaType | string;
	mediaPath: string;
	subtitlePath?: string;
	mpvOptions: Record<string, unknown>;
	displayInfo?: string;
	expectedDuration?: number;
	requester?: string;
	createdAt: string;
}

export interface PlayerSnapshot {
	status: PlaybackRuntimeStatus;
	currentPlan?: PlayPlan;
	position: number;
	volume: number;
	muted: boolean;
	fullscreen: boolean;
	error?: string;
	updatedAt: string;
	legacyStatus?: 'stop' | 'pause' | 'play';
}

export interface PlaybackCommand<Payload = unknown> {
	requestId: string;
	kind: PlaybackCommandKind;
	payload?: Payload;
	priority: RuntimeCommandPriority;
	createdAt: string;
	timeoutMs: number;
}

export interface PlaybackEvent<Payload = unknown> {
	type: PlaybackEventType;
	payload?: Payload;
	requestId?: string;
	createdAt: string;
}
