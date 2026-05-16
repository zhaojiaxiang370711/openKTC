import './AudioMonitorPanel.scss';

import i18next from 'i18next';
import { useEffect, useState } from 'react';

import { ApplianceAudioMonitorStatus, ApplianceAudioMonitorUpdate } from '../../../../../src/types/audio';
import { commandBackend } from '../../../utils/socket';
import { WS_CMD } from '../../../utils/ws';

function AudioMonitorPanel() {
	const [status, setStatus] = useState<ApplianceAudioMonitorStatus>();
	const [loading, setLoading] = useState(false);
	const [micVolume, setMicVolume] = useState(100);
	const [outputVolume, setOutputVolume] = useState(70);

	const refresh = async () => {
		const data = await commandBackend(WS_CMD.GET_APPLIANCE_AUDIO_MONITOR, undefined, false, 8000, true);
		setStatus(data);
	};

	const update = async (body: ApplianceAudioMonitorUpdate) => {
		if (loading) return;
		setLoading(true);
		try {
			const data = await commandBackend(WS_CMD.UPDATE_APPLIANCE_AUDIO_MONITOR, body, false, 10000);
			setStatus(data);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		refresh().catch(() => {});
	}, []);

	useEffect(() => {
		if (!status || loading) return;
		setMicVolume(status.source.volume);
		setOutputVolume(status.sink.volume);
	}, [loading, status]);

	if (!status) return null;

	return (
		<section className={`audio-monitor-panel${status.enabled ? ' enabled' : ''}`}>
			<div className="audio-monitor-heading">
				<div>
					<strong>{i18next.t('PUBLIC_HOMEPAGE.AUDIO.TITLE')}</strong>
					<span>
						{i18next.t('PUBLIC_HOMEPAGE.AUDIO.ROUTE', {
							source: status.source.label,
							sink: status.sink.label,
						})}
					</span>
				</div>
				<button
					className={`monitor-toggle${status.enabled ? ' on' : ''}`}
					disabled={loading || !status.available}
					onClick={() => update({ enabled: !status.enabled })}
				>
					<i className={`fas fa-${status.enabled ? 'microphone' : 'microphone-slash'}`} />
					{status.enabled
						? i18next.t('PUBLIC_HOMEPAGE.AUDIO.MONITOR_ON')
						: i18next.t('PUBLIC_HOMEPAGE.AUDIO.MONITOR_OFF')}
				</button>
			</div>
			{!status.available ? (
				<div className="audio-monitor-warning">
					<i className="fas fa-exclamation-triangle" />
					{i18next.t('PUBLIC_HOMEPAGE.AUDIO.UNAVAILABLE')}
				</div>
			) : (
				<div className="audio-monitor-controls">
					<div className="audio-slider">
						<label htmlFor="audio-monitor-mic-volume">
							<i className="fas fa-microphone" />
							{i18next.t('PUBLIC_HOMEPAGE.AUDIO.MIC_VOLUME')}
							<span>{micVolume}%</span>
						</label>
						<input
							id="audio-monitor-mic-volume"
							type="range"
							min="0"
							max="150"
							value={micVolume}
							onBlur={event => update({ micVolume: Number(event.currentTarget.value) })}
							onChange={event => setMicVolume(Number(event.currentTarget.value))}
							onMouseUp={event => update({ micVolume: Number(event.currentTarget.value) })}
							onTouchEnd={event => update({ micVolume: Number(event.currentTarget.value) })}
						/>
					</div>
					<div className="audio-slider">
						<label htmlFor="audio-monitor-output-volume">
							<i className="fas fa-volume-up" />
							{i18next.t('PUBLIC_HOMEPAGE.AUDIO.OUTPUT_VOLUME')}
							<span>{outputVolume}%</span>
						</label>
						<input
							id="audio-monitor-output-volume"
							type="range"
							min="0"
							max="100"
							value={outputVolume}
							onBlur={event => update({ outputVolume: Number(event.currentTarget.value) })}
							onChange={event => setOutputVolume(Number(event.currentTarget.value))}
							onMouseUp={event => update({ outputVolume: Number(event.currentTarget.value) })}
							onTouchEnd={event => update({ outputVolume: Number(event.currentTarget.value) })}
						/>
					</div>
					<div className="audio-monitor-buttons">
						<button
							className={status.source.muted ? 'muted' : ''}
							disabled={loading}
							onClick={() => update({ micMuted: !status.source.muted })}
						>
							<i className={`fas fa-${status.source.muted ? 'microphone-slash' : 'microphone'}`} />
							{status.source.muted
								? i18next.t('PUBLIC_HOMEPAGE.AUDIO.MIC_MUTED')
								: i18next.t('PUBLIC_HOMEPAGE.AUDIO.MIC_ACTIVE')}
						</button>
						<button
							className={status.sink.muted ? 'muted' : ''}
							disabled={loading}
							onClick={() => update({ outputMuted: !status.sink.muted })}
						>
							<i className={`fas fa-volume-${status.sink.muted ? 'mute' : 'up'}`} />
							{status.sink.muted
								? i18next.t('PUBLIC_HOMEPAGE.AUDIO.OUTPUT_MUTED')
								: i18next.t('PUBLIC_HOMEPAGE.AUDIO.OUTPUT_ACTIVE')}
						</button>
					</div>
				</div>
			)}
		</section>
	);
}

export default AudioMonitorPanel;
