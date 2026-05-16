import { describe, expect, it } from 'vitest';

import { RuntimeCommandBus } from '../../src/runtime/commandBus.js';

describe('RuntimeCommandBus', () => {
	it('runs queued high priority commands before lower priority commands', async () => {
		const bus = new RuntimeCommandBus();
		const order: string[] = [];

		const low = bus.dispatch('low', undefined, () => order.push('low'), { priority: 'low' });
		const high = bus.dispatch('high', undefined, () => order.push('high'), { priority: 'high' });

		await Promise.all([low, high]);

		expect(order).toEqual(['high', 'low']);
	});

	it('returns the same result promise for duplicate request ids while queued', async () => {
		const bus = new RuntimeCommandBus();
		const first = bus.dispatch('same', undefined, () => 'first', { requestId: 'req-1' });
		const second = bus.dispatch('same', undefined, () => 'second', { requestId: 'req-1' });

		await expect(first).resolves.toMatchObject({ ok: true, data: 'first' });
		await expect(second).resolves.toMatchObject({ ok: true, data: 'first' });
	});

	it('normalizes timeout failures into command results', async () => {
		const bus = new RuntimeCommandBus();
		const result = await bus.dispatch('slow', undefined, () => new Promise(() => {}), { timeoutMs: 1 });

		expect(result.ok).toBe(false);
		expect(result.error.message).toContain('timed out');
	});
});

