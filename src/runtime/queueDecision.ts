export type PlaybackDecision =
	| { type: 'restartPlayer' }
	| { type: 'stopPlayer'; endOfPlaylist?: boolean }
	| { type: 'nextSong' }
	| { type: 'playCurrentSong' }
	| { type: 'playRandomAfterPlaylist' }
	| { type: 'playPlaylistMedia'; mediaType: 'Intros' | 'Jingles' | 'Sponsors' | 'Encores' | 'Outros' }
	| { type: 'switchToFallbackPlaylist' }
	| { type: 'stopGame' };

export interface QueueDecisionInput {
	mediaType?: string;
	stopping?: boolean;
	playerNeedsRestart?: boolean;
	randomPlaying?: boolean;
	singlePlay?: boolean;
	quizRunning?: boolean;
	currentSongPosition?: number;
	playlistSize?: number;
	encorePlayed?: boolean;
	endOfPlaylistAction?: 'stop' | 'random' | 'random_fallback' | 'play_fallback' | 'repeat';
	counters?: {
		jingle: number;
		sponsor: number;
	};
	enabledMedias?: {
		jingles?: boolean;
		sponsors?: boolean;
		encores?: boolean;
		outros?: boolean;
	};
	intervals?: {
		jingle: number;
		sponsor: number;
	};
	introPlayed?: boolean;
	introSponsorPlayed?: boolean;
}

export function decideAfterPlayback(input: QueueDecisionInput): PlaybackDecision[] {
	const decisions: PlaybackDecision[] = [];
	if (input.playerNeedsRestart) decisions.push({ type: 'restartPlayer' });
	if (input.stopping) return [...decisions, { type: 'stopPlayer' }, { type: 'nextSong' }];
	if (input.randomPlaying) return [...decisions, { type: 'playRandomAfterPlaylist' }];
	if (input.mediaType === 'Intros') {
		return [
			...decisions,
			input.enabledMedias?.sponsors ? { type: 'playPlaylistMedia', mediaType: 'Sponsors' } : { type: 'playCurrentSong' },
		];
	}
	if (input.mediaType === 'Sponsors' && input.introPlayed && !input.introSponsorPlayed) {
		return [...decisions, { type: 'playCurrentSong' }];
	}
	if (input.mediaType === 'Encores') return [...decisions, { type: 'nextSong' }];
	if (input.mediaType === 'Outros') return [...decideEndOfPlaylist(input, decisions)];
	if (shouldPlayEncore(input)) return [...decisions, { type: 'playPlaylistMedia', mediaType: 'Encores' }];
	if (isLastSong(input)) {
		if (input.enabledMedias?.outros && !input.randomPlaying) decisions.push({ type: 'playPlaylistMedia', mediaType: 'Outros' });
		return [...decideEndOfPlaylist(input, decisions)];
	}
	if (shouldPlayJingle(input)) return [...decisions, { type: 'playPlaylistMedia', mediaType: 'Jingles' }];
	if (shouldPlaySponsor(input)) return [...decisions, { type: 'playPlaylistMedia', mediaType: 'Sponsors' }];
	if (input.mediaType !== 'stop') return [...decisions, { type: 'nextSong' }];
	return [...decisions, { type: 'stopPlayer' }];
}

function decideEndOfPlaylist(input: QueueDecisionInput, decisions: PlaybackDecision[]): PlaybackDecision[] {
	switch (input.endOfPlaylistAction) {
		case 'random':
		case 'random_fallback':
			return [...decisions, { type: 'playRandomAfterPlaylist' }];
		case 'play_fallback':
			return [...decisions, { type: 'switchToFallbackPlaylist' }, { type: 'nextSong' }];
		case 'repeat':
			return [...decisions, { type: 'nextSong' }];
		default:
			return [...decisions, input.quizRunning ? { type: 'stopGame' } : { type: 'stopPlayer', endOfPlaylist: true }];
	}
}

function shouldPlayEncore(input: QueueDecisionInput) {
	return (
		!!input.enabledMedias?.encores &&
		input.currentSongPosition === (input.playlistSize ?? 0) - 1 &&
		!input.encorePlayed &&
		!input.singlePlay &&
		!input.quizRunning
	);
}

function isLastSong(input: QueueDecisionInput) {
	return (
		typeof input.currentSongPosition === 'number' &&
		typeof input.playlistSize === 'number' &&
		input.currentSongPosition === input.playlistSize &&
		input.mediaType !== 'stop' &&
		input.mediaType !== 'pause'
	);
}

function shouldPlayJingle(input: QueueDecisionInput) {
	return (
		!input.singlePlay &&
		!!input.enabledMedias?.jingles &&
		(input.counters?.jingle ?? 0) >= (input.intervals?.jingle ?? Number.POSITIVE_INFINITY)
	);
}

function shouldPlaySponsor(input: QueueDecisionInput) {
	return (
		!input.singlePlay &&
		!!input.enabledMedias?.sponsors &&
		(input.counters?.sponsor ?? 0) >= (input.intervals?.sponsor ?? Number.POSITIVE_INFINITY)
	);
}
