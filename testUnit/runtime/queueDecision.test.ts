import { describe, expect, it } from 'vitest';

import { decideAfterPlayback } from '../../src/runtime/queueDecision.js';

describe('queueDecision', () => {
	it('stops after current song before considering other transitions', () => {
		expect(
			decideAfterPlayback({
				stopping: true,
				randomPlaying: true,
			})
		).toEqual([{ type: 'stopPlayer' }, { type: 'nextSong' }]);
	});

	it('plays sponsor after intro when sponsors are enabled', () => {
		expect(
			decideAfterPlayback({
				mediaType: 'Intros',
				enabledMedias: { sponsors: true },
			})
		).toEqual([{ type: 'playPlaylistMedia', mediaType: 'Sponsors' }]);
	});

	it('plays the current song after intro when sponsors are disabled', () => {
		expect(
			decideAfterPlayback({
				mediaType: 'Intros',
				enabledMedias: { sponsors: false },
			})
		).toEqual([{ type: 'playCurrentSong' }]);
	});

	it('plays encore before the last song when enabled', () => {
		expect(
			decideAfterPlayback({
				mediaType: 'song',
				currentSongPosition: 4,
				playlistSize: 5,
				enabledMedias: { encores: true },
			})
		).toEqual([{ type: 'playPlaylistMedia', mediaType: 'Encores' }]);
	});

	it('handles random end-of-playlist mode', () => {
		expect(
			decideAfterPlayback({
				mediaType: 'song',
				currentSongPosition: 5,
				playlistSize: 5,
				endOfPlaylistAction: 'random',
			})
		).toEqual([{ type: 'playRandomAfterPlaylist' }]);
	});

	it('plays scheduled jingles before moving to the next song', () => {
		expect(
			decideAfterPlayback({
				mediaType: 'song',
				counters: { jingle: 3, sponsor: 0 },
				intervals: { jingle: 3, sponsor: 5 },
				enabledMedias: { jingles: true, sponsors: true },
			})
		).toEqual([{ type: 'playPlaylistMedia', mediaType: 'Jingles' }]);
	});
});

