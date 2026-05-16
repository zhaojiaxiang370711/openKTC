import { describe, expect, it } from 'vitest';

import { createPlayerSnapshot } from '../../src/runtime/playerSnapshot.js';

describe('createPlayerSnapshot', () => {
	it('maps legacy playing state to the appliance snapshot shape', () => {
		const snapshot = createPlayerSnapshot(
			{
				playerStatus: 'play',
				playing: true,
				timeposition: 42,
				volume: 75,
				mute: false,
				fullscreen: true,
				currentRequester: 'guest',
				currentSong: {
					kid: 'kid-1',
					plcid: 12,
					mediafile: 'song.mp4',
					duration: 180,
					infos: 'Song info',
					username: 'guest',
				} as any,
			},
			new Date('2026-05-16T00:00:00.000Z')
		);

		expect(snapshot).toMatchObject({
			status: 'playing',
			position: 42,
			volume: 75,
			muted: false,
			fullscreen: true,
			legacyStatus: 'play',
			currentPlan: {
				id: '12',
				kid: 'kid-1',
				mediaType: 'song',
				mediaPath: 'song.mp4',
				requester: 'guest',
			},
		});
	});

	it('maps stop state to idle without a play plan', () => {
		const snapshot = createPlayerSnapshot({ playerStatus: 'stop' }, new Date('2026-05-16T00:00:00.000Z'));

		expect(snapshot.status).toBe('idle');
		expect(snapshot.currentPlan).toBeUndefined();
	});
});

