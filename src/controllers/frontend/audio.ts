import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { getConfig } from '../../lib/utils/config.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	getApplianceAudioMonitorStatus,
	updateApplianceAudioMonitor,
} from '../../services/audioMonitor.js';
import { runChecklist } from '../middlewares.js';

export default function audioController(router: SocketIOApp) {
	router.route(WS_CMD.GET_APPLIANCE_AUDIO_MONITOR, async (socket, req) => {
		await runChecklist(socket, req, getConfig().Frontend.PublicPlayerControls ? 'guest' : 'admin');
		try {
			return await getApplianceAudioMonitorStatus();
		} catch (err) {
			throw { code: 500, message: APIMessage(err instanceof Error ? err.message : 'AUDIO_MONITOR_ERROR') };
		}
	});

	router.route(WS_CMD.UPDATE_APPLIANCE_AUDIO_MONITOR, async (socket, req) => {
		await runChecklist(socket, req, getConfig().Frontend.PublicPlayerControls ? 'guest' : 'admin');
		try {
			return await updateApplianceAudioMonitor(req.body);
		} catch (err) {
			throw { code: 500, message: APIMessage(err instanceof Error ? err.message : 'AUDIO_MONITOR_ERROR') };
		}
	});
}
