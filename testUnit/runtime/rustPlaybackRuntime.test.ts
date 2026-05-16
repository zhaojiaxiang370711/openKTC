import { describe, expect, it } from 'vitest';

import { PlayPlan } from '../../src/contracts/playback.js';
import { RustPlaybackRuntimeClient } from '../../src/runtime/rustPlaybackRuntime.js';

const fakeRuntimeScript = `
const readline = require('node:readline');
function emit(event) {
  process.stdout.write(JSON.stringify({ createdAt: new Date().toISOString(), ...event }) + '\\n');
}
emit({ type: 'runtimeReady', payload: { snapshot: { status: 'ready' } } });
readline.createInterface({ input: process.stdin }).on('line', line => {
  const command = JSON.parse(line);
  if (command.payload && command.payload.silent) return;
  if (command.payload && command.payload.fail) {
    emit({ type: 'commandFailed', requestId: command.requestId, payload: { error: { code: 'fakeFailed', message: 'fake failure' } } });
    return;
  }
  emit({ type: 'commandAck', requestId: command.requestId, payload: { kind: command.kind, received: command.payload } });
  emit({ type: 'stateChanged', payload: { snapshot: { status: command.kind === 'pause' ? 'paused' : 'playing' } } });
});
`;

describe('RustPlaybackRuntimeClient', () => {
	it('starts a JSONL runtime and resolves command acknowledgements', async () => {
		const client = createFakeClient();
		try {
			await client.start();
			const result = await client.dispatch('play', { requester: 'tester' });

			expect(result.ok).toBe(true);
			expect(result.data).toMatchObject({
				kind: 'play',
				received: {
					requester: 'tester',
				},
			});
		} finally {
			client.stop();
		}
	});

	it('loads a PlayPlan through the typed helper', async () => {
		const client = createFakeClient();
		try {
			const plan: PlayPlan = {
				id: 'plan-1',
				mediaType: 'song',
				mediaPath: '/tmp/openktv-smoke.wav',
				mpvOptions: {},
				createdAt: '2026-05-16T00:00:00.000Z',
			};
			const result = await client.loadPlan(plan);

			expect(result.ok).toBe(true);
			expect(result.data).toMatchObject({
				kind: 'loadPlan',
				received: {
					id: 'plan-1',
					mediaPath: '/tmp/openktv-smoke.wav',
				},
			});
		} finally {
			client.stop();
		}
	});

	it('normalizes runtime command failures', async () => {
		const client = createFakeClient();
		try {
			const result = await client.dispatch('play', { fail: true });

			expect(result.ok).toBe(false);
			expect(result.error).toMatchObject({
				code: 'fakeFailed',
				message: 'fake failure',
			});
		} finally {
			client.stop();
		}
	});

	it('times out commands without an acknowledgement', async () => {
		const client = createFakeClient();
		try {
			const result = await client.dispatch('ping', { silent: true }, { timeoutMs: 20 });

			expect(result.ok).toBe(false);
			expect(result.error?.code).toBe('runtimeCommandTimeout');
		} finally {
			client.stop();
		}
	});
});

function createFakeClient() {
	return new RustPlaybackRuntimeClient({
		command: process.execPath,
		args: ['-e', fakeRuntimeScript],
		commandTimeoutMs: 1000,
		readyTimeoutMs: 1000,
	});
}
