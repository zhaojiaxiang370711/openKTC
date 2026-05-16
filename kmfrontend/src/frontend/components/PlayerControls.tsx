import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { CurrentSong } from '../../../../src/types/playlist';
import { PublicPlayerState } from '../../../../src/types/state';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import { commandBackend, getSocket } from '../../utils/socket';
import { displayMessage, is_touch_device, isNonStandardPlaylist } from '../../utils/tools';
import PlayCurrentModal from './modals/PlayCurrentModal';
import { WS_CMD } from '../../utils/ws';

interface IProps {
	currentPlaylist: PlaylistElem;
	statusPlayer: PublicPlayerState;
	scope: 'admin' | 'public' | 'chibi';
	putPlayerCommando: (event: any) => Promise<unknown> | unknown;
}

function PlayerControls(props: IProps) {
	const context = useContext(GlobalContext);
	const [gameContinue, setGameContinue] = useState(false);
	const [pendingCommand, setPendingCommand] = useState<string>();

	const currentSong = props.statusPlayer?.currentSong as CurrentSong;
	const playlistCount = props.currentPlaylist?.karacount;
	const hasPlaylistCount = typeof playlistCount === 'number';
	const hasPlayableQueue = (playlistCount ?? 0) > 0 || !!currentSong;
	const isStopped = !props.statusPlayer || props.statusPlayer.playerStatus === 'stop';
	const canStop = !!props.statusPlayer && !isStopped;
	const canPlay = !props.statusPlayer || !props.currentPlaylist || hasPlayableQueue || props.statusPlayer?.playerStatus === 'pause';
	const canPrevious = !!currentSong && currentSong.pos > 1;
	const canNext = !!currentSong && (!hasPlaylistCount || currentSong.pos < playlistCount);

	const commandClass = (base: string, disabled: boolean, command: string) =>
		`${base}${disabled ? ' disabled' : ''}${pendingCommand === command ? ' pending' : ''}`;

	const runCommand = async (event: any, disabled = false) => {
		const command = event.currentTarget.getAttribute('data-namecommand');
		if (disabled || pendingCommand) return;
		setPendingCommand(command);
		try {
			await props.putPlayerCommando(event);
		} catch (err) {
			const code = err instanceof Error ? err.message : undefined;
			displayMessage('warning', i18next.t(code ? `ERROR_CODES.${code}` : 'ERROR_CODES.COMMAND_SEND_ERROR'));
		} finally {
			setPendingCommand(undefined);
		}
	};

	const play = (event: any) => {
		const namecommand = event.currentTarget.getAttribute('data-namecommand');
		if ((namecommand === 'play' && !canPlay) || pendingCommand) return;
		if (
			namecommand === 'play' &&
			props.scope === 'admin' &&
			props.currentPlaylist &&
			isStopped &&
			context.globalState.frontendContext.playlistInfoLeft.plaid !== props.currentPlaylist?.plaid &&
			context.globalState.frontendContext.playlistInfoRight.plaid !== props.currentPlaylist?.plaid &&
			(!isNonStandardPlaylist(context.globalState.frontendContext.playlistInfoLeft.plaid) ||
				!isNonStandardPlaylist(context.globalState.frontendContext.playlistInfoRight.plaid))
		) {
			showModal(
				context.globalDispatch,
				<PlayCurrentModal
					currentPlaylist={props.currentPlaylist}
					displayedPlaylist={
						!isNonStandardPlaylist(context.globalState.frontendContext.playlistInfoRight.plaid)
							? context.globalState.frontendContext.playlistInfoRight
							: context.globalState.frontendContext.playlistInfoLeft
					}
				/>
			);
		} else {
			runCommand(event);
		}
	};

	const toggleGameContinue = () => {
		commandBackend(WS_CMD.CONTINUE_GAME_SONG).then(setGameContinue);
	};

	const qStart = () => {
		setGameContinue(false);
	};

	useEffect(() => {
		if (props.scope !== 'public') getSocket().on('quizStart', qStart);
		return () => {
			if (props.scope !== 'public') getSocket().off('quizStart', qStart);
		};
	}, []);

	const quizInProgress = context.globalState.settings.data.state.quiz.running;

	return props.scope === 'public' ? (
		<>
			{props.statusPlayer?.stopping ||
			props.statusPlayer?.mediaType !== 'song' ||
			context?.globalState.settings.data.config?.Karaoke.ClassicMode ? (
				<div
					className={commandClass('red', !canStop, 'stopNow')}
					data-namecommand="stopNow"
					aria-disabled={!canStop}
					onClick={event => runCommand(event, !canStop)}
				>
					<i className="fas fa-stop fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.STOP_NOW_SHORT')}
				</div>
			) : (
				<div
					className={commandClass('red', !canStop, 'stopAfter')}
					data-namecommand="stopAfter"
					aria-disabled={!canStop}
					onClick={event => runCommand(event, !canStop)}
				>
					<i className="fas fa-stop fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.STOP_AFTER_SHORT')}
				</div>
			)}
			{canPrevious ? (
				<div
					className={commandClass('white', !canPrevious, 'prev')}
					data-namecommand="prev"
					aria-disabled={!canPrevious}
					onClick={event => runCommand(event, !canPrevious)}
				>
					<i className="fas fa-fast-backward fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.PREVIOUS_SONG_SHORT')}
				</div>
			) : null}
			{props.statusPlayer?.playerStatus === 'play' ? (
				<div className={commandClass('blue', false, 'pause')} data-namecommand="pause" onClick={play}>
					<i className="fas fa-pause fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.PAUSE')}
				</div>
			) : (
				<div
					className={commandClass('blue', !canPlay, 'play')}
					data-namecommand="play"
					aria-disabled={!canPlay}
					onClick={play}
				>
					<i className="fas fa-play fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.PLAY')}
				</div>
			)}
			{canNext ? (
				<div
					data-namecommand="skip"
					className={commandClass('white', !canNext, 'skip')}
					aria-disabled={!canNext}
					onClick={event => runCommand(event, !canNext)}
				>
					<i className="fas fa-fast-forward fa-2x" />
					{is_touch_device() ? '' : i18next.t('PLAYERS_CONTROLS.NEXT_SONG_SHORT')}
				</div>
			) : null}
		</>
	) : (
		<>
			{props.statusPlayer?.stopping ||
			props.statusPlayer?.mediaType !== 'song' ||
			context?.globalState.settings.data.config?.Karaoke.ClassicMode ? (
				<button
					title={i18next.t('PLAYERS_CONTROLS.STOP_NOW')}
					data-namecommand="stopNow"
					className="btn btn-danger stopButton"
					onClick={event => runCommand(event, !canStop)}
					disabled={!canStop || !!pendingCommand}
				>
					<i className="fas fa-stop" />
				</button>
			) : (
				<button
					title={i18next.t('PLAYERS_CONTROLS.STOP_AFTER')}
					data-namecommand="stopAfter"
					className="btn stopButton"
					onClick={event => runCommand(event, !canStop)}
					disabled={!canStop || !!pendingCommand}
				>
					<i className="fas fa-stop" />
				</button>
			)}
			<button
				title={i18next.t('PLAYERS_CONTROLS.PREVIOUS_SONG')}
				data-namecommand="prev"
				className="btn btn-default"
				onClick={event => runCommand(event, !canPrevious)}
				disabled={!canPrevious || !!pendingCommand}
			>
				<i className="fas fa-fast-backward" />
			</button>
			{props.statusPlayer?.playerStatus === 'play' ? (
				<button
					title={i18next.t('PLAYERS_CONTROLS.PAUSE')}
					data-namecommand="pause"
					className="btn btn-primary"
					onClick={play}
					disabled={!!pendingCommand}
				>
					<i className="fas fa-pause" />
				</button>
			) : (
				<button
					title={i18next.t('PLAYERS_CONTROLS.PLAY')}
					data-namecommand="play"
					className="btn btn-primary"
					onClick={play}
					disabled={!canPlay || !!pendingCommand}
				>
					<i className="fas fa-play" />
				</button>
			)}
			<button
				title={i18next.t('PLAYERS_CONTROLS.NEXT_SONG')}
				data-namecommand="skip"
				className="btn btn-default"
				onClick={event => runCommand(event, !canNext)}
				disabled={!canNext || !!pendingCommand}
			>
				<i className="fas fa-fast-forward" />
			</button>
			{quizInProgress ? (
				<button
					title={i18next.t('QUIZ.CONTINUE')}
					className={`btn ${gameContinue ? 'btn-primary' : ''}`}
					onClick={toggleGameContinue}
				>
					<i className="fas fa-forward" />
				</button>
			) : (
				<button
					title={i18next.t('PLAYERS_CONTROLS.REWIND')}
					data-namecommand="goTo"
					defaultValue="0"
					className="btn btn-danger-low rewindButton"
					onClick={props.putPlayerCommando}
				>
					<i className="fas fa-undo-alt" />
				</button>
			)}
		</>
	);
}

export default PlayerControls;
