import { describe, expect, it } from 'vitest';

import {
	createInitialPlaybackRuntimeState,
	reducePlaybackRuntimeState,
	snapshotFromRuntimeState,
} from '../../src/runtime/playbackStateMachine.js';

describe('playbackStateMachine', () => {
	it('models the normal load and play lifecycle', () => {
		const started = createInitialPlaybackRuntimeState(new Date('2026-05-16T00:00:00.000Z'));
		const loading = reducePlaybackRuntimeState(started, {
			type: 'loadPlan',
			plan: {
				id: 'plan-1',
				mediaType: 'song',
				mediaPath: '/media/song.mp4',
				mpvOptions: {},
				createdAt: '2026-05-16T00:00:00.000Z',
			},
			at: new Date('2026-05-16T00:00:01.000Z'),
		});
		const playing = reducePlaybackRuntimeState(loading, {
			type: 'playbackStarted',
			at: new Date('2026-05-16T00:00:02.000Z'),
		});
		const positioned = reducePlaybackRuntimeState(playing, {
			type: 'positionChanged',
			position: 15,
			at: new Date('2026-05-16T00:00:03.000Z'),
		});

		expect(positioned).toMatchObject({
			status: 'playing',
			position: 15,
			currentPlan: { id: 'plan-1' },
		});
	});

	it('keeps the current plan while recovering from a runtime crash', () => {
		const state = reducePlaybackRuntimeState(createInitialPlaybackRuntimeState(), {
			type: 'loadPlan',
			plan: {
				id: 'plan-1',
				mediaType: 'song',
				mediaPath: '/media/song.mp4',
				mpvOptions: {},
				createdAt: '2026-05-16T00:00:00.000Z',
			},
		});
		const recovering = reducePlaybackRuntimeState(state, { type: 'runtimeCrashed', error: 'mpv exited' });
		const recovered = reducePlaybackRuntimeState(recovering, { type: 'runtimeRecovered' });

		expect(recovering).toMatchObject({ status: 'recovering', error: 'mpv exited', currentPlan: { id: 'plan-1' } });
		expect(recovered).toMatchObject({ status: 'loading', error: undefined, currentPlan: { id: 'plan-1' } });
	});

	it('creates public snapshots from runtime state', () => {
		const state = reducePlaybackRuntimeState(createInitialPlaybackRuntimeState(), { type: 'runtimeReady' });

		expect(snapshotFromRuntimeState(state, { volume: 80, muted: false, fullscreen: true })).toMatchObject({
			status: 'ready',
			volume: 80,
			muted: false,
			fullscreen: true,
		});
	});
});

