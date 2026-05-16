import fs, { constants } from 'fs';

import { getCurrentPlayerSnapshot } from './playerSnapshotProjection.js';
import { getState } from '../utils/state.js';

export interface RuntimeHealthCheck {
	ok: boolean;
	message?: string;
}

export interface RuntimeHealth {
	ok: boolean;
	checkedAt: string;
	checks: {
		core: RuntimeHealthCheck;
		player: RuntimeHealthCheck;
		db: RuntimeHealthCheck;
		mediaCache: RuntimeHealthCheck;
	};
}

export async function getRuntimeHealth(): Promise<RuntimeHealth> {
	const state = getState();
	const player = getCurrentPlayerSnapshot();
	const checks = {
		core: {
			ok: !state.shutdownInProgress,
			message: state.shutdownInProgress ? 'shutdown in progress' : undefined,
		},
		player: {
			ok: player.status !== 'failed',
			message: player.error,
		},
		db: {
			ok: !!state.DBReady,
			message: state.DBReady ? undefined : 'database is not ready',
		},
		mediaCache: await checkWritablePath(state.dataPath),
	};
	return {
		ok: Object.values(checks).every(check => check.ok),
		checkedAt: new Date().toISOString(),
		checks,
	};
}

async function checkWritablePath(path: string): Promise<RuntimeHealthCheck> {
	if (!path) {
		return { ok: false, message: 'data path is not set' };
	}
	try {
		await fs.promises.access(path, constants.W_OK);
		return { ok: true };
	} catch (err) {
		return {
			ok: false,
			message: err instanceof Error ? err.message : String(err),
		};
	}
}

