import { describe, expect, it } from 'vitest';

import { RuntimeCommandBus } from '../../src/runtime/commandBus.js';
import { LegacyPlaybackRuntimeAdapter, mapPlayerCommandKind } from '../../src/runtime/legacyPlaybackRuntime.js';

describe('LegacyPlaybackRuntimeAdapter', () => {
	it('routes playback commands through the high priority runtime bus', async () => {
		const bus = new RuntimeCommandBus();
		const queuedKinds: string[] = [];
		bus.on('queued', command => queuedKinds.push(`${command.kind}:${command.priority}`));

		const runtime = new LegacyPlaybackRuntimeAdapter(
			{
				playPlayer: () => 'played' as any,
				sendCommand: () => 'sent' as any,
				initPlayer: () => undefined as any,
			},
			bus
		);

		await expect(runtime.playCurrent('singer')).resolves.toBe('played');
		await expect(runtime.sendPlayerCommand('pause', undefined)).resolves.toBe('sent');
		await expect(runtime.restart()).resolves.toBeUndefined();

		expect(queuedKinds).toEqual(['play:high', 'pause:high', 'restart:high']);
	});

	it('maps legacy player command names to playback command kinds', () => {
		expect(mapPlayerCommandKind('skip')).toBe('next');
		expect(mapPlayerCommandKind('prev')).toBe('previous');
		expect(mapPlayerCommandKind('goTo')).toBe('seek');
		expect(mapPlayerCommandKind('showSubs')).toBe('setSubs');
		expect(mapPlayerCommandKind('unknown')).toBe('stop');
	});
});
