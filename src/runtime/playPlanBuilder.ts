import { PlayPlan } from '../contracts/playback.js';
import { PlaylistMedia } from '../lib/types/playlistMedias.js';
import { CurrentSong } from '../types/playlist.js';

interface SongPlayPlanInput {
	song: CurrentSong;
	mediaPath: string;
	subtitlePath?: string;
	mpvOptions: Record<string, unknown>;
	start?: number;
}

interface PlaylistMediaPlayPlanInput {
	media: PlaylistMedia;
	mediaType: string;
	subtitlePath?: string;
	mpvOptions: Record<string, unknown>;
}

export function createSongPlayPlan(input: SongPlayPlanInput): PlayPlan {
	return {
		id: String(input.song.plcid ?? input.song.kid),
		kid: input.song.kid,
		mediaType: 'song',
		mediaPath: input.mediaPath,
		subtitlePath: input.subtitlePath || undefined,
		mpvOptions: {
			...input.mpvOptions,
			start: input.start?.toString() ?? input.mpvOptions.start,
		},
		displayInfo: input.song.infos,
		expectedDuration: input.song.duration,
		requester: input.song.username,
		createdAt: new Date().toISOString(),
	};
}

export function createPlaylistMediaPlayPlan(input: PlaylistMediaPlayPlanInput): PlayPlan {
	return {
		id: `${input.mediaType}:${input.media.filename}`,
		mediaType: input.mediaType,
		mediaPath: input.media.filename,
		subtitlePath: input.subtitlePath || undefined,
		mpvOptions: input.mpvOptions,
		displayInfo: input.media.series,
		createdAt: new Date().toISOString(),
	};
}

