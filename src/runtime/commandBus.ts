import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import {
	RuntimeCommand,
	RuntimeCommandError,
	RuntimeCommandPriority,
	RuntimeCommandResult,
} from '../contracts/runtime.js';

type RuntimeCommandHandler<Payload, Result> = (command: RuntimeCommand<Payload>) => Promise<Result> | Result;

interface RuntimeCommandOptions {
	requestId?: string;
	priority?: RuntimeCommandPriority;
	source?: string;
	timeoutMs?: number;
}

interface QueuedCommand<Payload, Result> {
	command: RuntimeCommand<Payload>;
	handler: RuntimeCommandHandler<Payload, Result>;
	resolve: (result: RuntimeCommandResult<Result>) => void;
}

const priorityOrder: RuntimeCommandPriority[] = ['high', 'normal', 'low'];

export class RuntimeCommandBus extends EventEmitter {
	private queues: Record<RuntimeCommandPriority, QueuedCommand<unknown, unknown>[]>;

	private inFlight: Map<string, Promise<RuntimeCommandResult<unknown>>>;

	private processing: boolean;

	private drainScheduled: boolean;

	constructor() {
		super();
		this.queues = {
			high: [],
			normal: [],
			low: [],
		};
		this.inFlight = new Map();
		this.processing = false;
		this.drainScheduled = false;
	}

	dispatch<Payload = unknown, Result = unknown>(
		kind: string,
		payload: Payload,
		handler: RuntimeCommandHandler<Payload, Result>,
		options: RuntimeCommandOptions = {}
	): Promise<RuntimeCommandResult<Result>> {
		const requestId = options.requestId ?? randomUUID();
		const existing = this.inFlight.get(requestId);
		if (existing) return existing as Promise<RuntimeCommandResult<Result>>;

		const command: RuntimeCommand<Payload> = {
			requestId,
			kind,
			payload,
			priority: options.priority ?? 'normal',
			source: options.source,
			createdAt: new Date().toISOString(),
			timeoutMs: options.timeoutMs ?? 10000,
		};

		const promise = new Promise<RuntimeCommandResult<Result>>(resolve => {
			this.queues[command.priority].push({ command, handler, resolve } as QueuedCommand<unknown, unknown>);
			this.emit('queued', command);
			this.scheduleDrain();
		});

		this.inFlight.set(requestId, promise as Promise<RuntimeCommandResult<unknown>>);
		promise.finally(() => this.inFlight.delete(requestId));
		return promise;
	}

	private scheduleDrain() {
		if (this.drainScheduled) return;
		this.drainScheduled = true;
		queueMicrotask(() => {
			this.drainScheduled = false;
			void this.drain();
		});
	}

	private async drain() {
		if (this.processing) return;
		this.processing = true;
		try {
			let item = this.next();
			while (item) {
				const result = await this.execute(item);
				item.resolve(result);
				item = this.next();
			}
		} finally {
			this.processing = false;
			if (this.hasQueuedCommands()) this.scheduleDrain();
		}
	}

	private next() {
		for (const priority of priorityOrder) {
			const item = this.queues[priority].shift();
			if (item) return item;
		}
		return null;
	}

	private hasQueuedCommands() {
		return priorityOrder.some(priority => this.queues[priority].length > 0);
	}

	private async execute<Payload, Result>(
		item: QueuedCommand<Payload, Result>
	): Promise<RuntimeCommandResult<Result>> {
		const { command, handler } = item;
		const started = Date.now();
		const startedAt = new Date(started).toISOString();
		this.emit('started', command);
		try {
			const data = await this.withTimeout(handler(command), command.timeoutMs);
			const finished = Date.now();
			const result: RuntimeCommandResult<Result> = {
				requestId: command.requestId,
				ok: true,
				data,
				timing: {
					createdAt: command.createdAt,
					startedAt,
					finishedAt: new Date(finished).toISOString(),
					durationMs: finished - started,
				},
			};
			this.emit('commandAck', { command, result });
			return result;
		} catch (err) {
			const finished = Date.now();
			const result: RuntimeCommandResult<Result> = {
				requestId: command.requestId,
				ok: false,
				error: normalizeError(err),
				timing: {
					createdAt: command.createdAt,
					startedAt,
					finishedAt: new Date(finished).toISOString(),
					durationMs: finished - started,
				},
			};
			this.emit('commandFailed', { command, result });
			return result;
		}
	}

	private withTimeout<Result>(promiseOrValue: Promise<Result> | Result, timeoutMs: number): Promise<Result> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Runtime command timed out after ${timeoutMs}ms`));
			}, timeoutMs);
			Promise.resolve(promiseOrValue).then(
				value => {
					clearTimeout(timeout);
					resolve(value);
				},
				err => {
					clearTimeout(timeout);
					reject(err);
				}
			);
		});
	}
}

function normalizeError(err: unknown): RuntimeCommandError {
	if (err instanceof Error) {
		const maybeCoded = err as Error & { code?: number | string };
		return {
			name: err.name,
			message: err.message,
			code: maybeCoded.code,
			stack: err.stack,
		};
	}
	if (typeof err === 'object' && err !== null) {
		const data = err as { code?: number | string; message?: string };
		return {
			name: 'RuntimeCommandError',
			message: typeof data.message === 'string' ? data.message : JSON.stringify(err),
			code: data.code,
		};
	}
	return {
		name: 'RuntimeCommandError',
		message: String(err),
	};
}

export const runtimeCommandBus = new RuntimeCommandBus();

