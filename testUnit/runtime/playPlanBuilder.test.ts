import { describe, expect, it } from 'vitest';

import { createPlaylistMediaPlayPlan, createSongPlayPlan } from '../../src/runtime/playPlanBuilder.js';

describe('playPlanBuilder', () => {
	it('creates resolved song play plans for the playback runtime', () => {
		const plan = createSongPlayPlan({
			song: {
				kid: 'kid-1',
				plcid: 10,
				mediafile: 'unresolved.mp4',
				duration: 120,
				infos: 'Display info',
				username: 'singer',
			} as any,
			mediaPath: '/media/resolved.mp4',
			subtitlePath: '/lyrics/resolved.ass',
			mpvOptions: { sid: '1' },
			start: 12,
		});

		expect(plan).toMatchObject({
			id: '10',
			kid: 'kid-1',
			mediaType: 'song',
			mediaPath: '/media/resolved.mp4',
			subtitlePath: '/lyrics/resolved.ass',
			displayInfo: 'Display info',
			expectedDuration: 120,
			requester: 'singer',
			mpvOptions: {
				sid: '1',
				start: '12',
			},
		});
	});

	it('creates playlist media play plans', () => {
		const plan = createPlaylistMediaPlayPlan({
			media: { filename: '/jingles/one.mp4', type: 'Jingles', series: 'Break' } as any,
			mediaType: 'Jingles',
			mpvOptions: { af: 'loudnorm' },
		});

		expect(plan).toMatchObject({
			id: 'Jingles:/jingles/one.mp4',
			mediaType: 'Jingles',
			mediaPath: '/jingles/one.mp4',
			displayInfo: 'Break',
			mpvOptions: { af: 'loudnorm' },
		});
	});
});

