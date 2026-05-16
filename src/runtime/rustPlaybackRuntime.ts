import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { createInterface, Interface } from 'readline';

import { PlaybackCommandKind, PlayPlan } from '../contracts/playback.js';
import { RuntimeCommandError, RuntimeCommandResult } from '../contracts/runtime.js';

export interface RustPlaybackRuntimeOptions {
	command: string;
	args?: string[];
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	readyTimeoutMs?: number;
	commandTimeoutMs?: number;
}

export interface RustPlaybackRuntimeEvent<Payload = unknown> {
	type: string;
	createdAt: string;
	requestId?: string;
	payload?: Payload;
}

interface PendingCommand {
	createdAt: string;
	timeout: NodeJS.Timeout;
	resolve: (result: RuntimeCommandResult) => void;
}

export class RustPlaybackRuntimeClient extends EventEmitter {
	private child?: ChildProcessWithoutNullStreams;

	private lines?: Interface;

	private readyPromise?: Promise<void>;

	private readySeen = false;

	private pending = new Map<string, PendingCommand>();

	constructor(private readonly options: RustPlaybackRuntimeOptions) {
		super();
	}

	start(): Promise<void> {
		if (this.readyPromise) return this.readyPromise;

		this.child = spawn(this.options.command, this.options.args ?? [], {
			cwd: this.options.cwd,
			env: this.options.env,
			stdio: 'pipe',
		});
		this.readySeen = false;

		this.lines = createInterface({ input: this.child.stdout });
		this.lines.on('line', line => this.handleLine(line));
		this.child.stderr.on('data', chunk => this.emit('stderr', chunk.toString()));
		this.child.on('exit', (code, signal) => this.handleExit(code, signal));
		this.child.on('error', err => this.failAll(normalizeRuntimeError(err)));

		this.readyPromise = new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Rust playback runtime did not become ready within ${this.readyTimeoutMs()}ms`));
			}, this.readyTimeoutMs());

			this.once('runtimeReady', () => {
				clearTimeout(timeout);
				resolve();
			});
			this.once('runtimeExitBeforeReady', error => {
				clearTimeout(timeout);
				reject(error);
			});
			if (this.readySeen) {
				clearTimeout(timeout);
				resolve();
			}
		});

		return this.readyPromise;
	}

	async dispatch<Payload = unknown, Data = unknown>(
		kind: PlaybackCommandKind | 'ping',
		payload?: Payload,
		options: { requestId?: string; timeoutMs?: number } = {}
	): Promise<RuntimeCommandResult<Data>> {
		await this.start();

		const requestId = options.requestId ?? randomUUID();
		const createdAt = new Date().toISOString();
		const timeoutMs = options.timeoutMs ?? this.commandTimeoutMs();

		const result = new Promise<RuntimeCommandResult<Data>>(resolve => {
			const timeout = setTimeout(() => {
				this.pending.delete(requestId);
				resolve({
					requestId,
					ok: false,
					error: {
						name: 'RustPlaybackRuntimeTimeout',
						message: `Rust playback runtime command timed out after ${timeoutMs}ms`,
						code: 'runtimeCommandTimeout',
					},
					timing: {
						createdAt,
						finishedAt: new Date().toISOString(),
					},
				} as RuntimeCommandResult<Data>);
			}, timeoutMs);
			this.pending.set(requestId, { createdAt, timeout, resolve: resolve as PendingCommand['resolve'] });
		});

		this.child?.stdin.write(`${JSON.stringify({ requestId, kind, payload })}\n`);
		return result;
	}

	ping(options: { requestId?: string; timeoutMs?: number } = {}) {
		return this.dispatch('ping', undefined, options);
	}

	loadPlan(plan: PlayPlan, options: { requestId?: string; timeoutMs?: number } = {}) {
		return this.dispatch('loadPlan', plan, options);
	}

	play(options: { requestId?: string; timeoutMs?: number } = {}) {
		return this.dispatch('play', undefined, options);
	}

	pause(options: { requestId?: string; timeoutMs?: number } = {}) {
		return this.dispatch('pause', undefined, options);
	}

	stopPlayback(options: { requestId?: string; timeoutMs?: number } = {}) {
		return this.dispatch('stop', undefined, options);
	}

	stop() {
		this.lines?.close();
		this.lines = undefined;
		this.readySeen = false;
		if (this.child && !this.child.killed) {
			this.child.kill();
		}
		this.child = undefined;
		this.readyPromise = undefined;
		this.failAll({
			name: 'RustPlaybackRuntimeStopped',
			message: 'Rust playback runtime stopped',
			code: 'runtimeStopped',
		});
	}

	private handleLine(line: string) {
		if (!line.trim()) return;
		let event: RustPlaybackRuntimeEvent;
		try {
			event = JSON.parse(line);
		} catch (err) {
			this.emit('runtimeParseError', err, line);
			return;
		}

		this.emit('event', event);
		this.emit(event.type, event);
		if (event.type === 'runtimeReady') this.readySeen = true;

		if (event.requestId && (event.type === 'commandAck' || event.type === 'commandFailed')) {
			this.resolvePending(event);
		}
	}

	private resolvePending(event: RustPlaybackRuntimeEvent) {
		const pending = this.pending.get(event.requestId!);
		if (!pending) return;
		clearTimeout(pending.timeout);
		this.pending.delete(event.requestId!);

		const finishedAt = new Date().toISOString();
		if (event.type === 'commandAck') {
			pending.resolve({
				requestId: event.requestId!,
				ok: true,
				data: event.payload,
				timing: {
					createdAt: pending.createdAt,
					finishedAt,
				},
			});
			return;
		}

		pending.resolve({
			requestId: event.requestId!,
			ok: false,
			error: normalizeRuntimeError(event.payload),
			timing: {
				createdAt: pending.createdAt,
				finishedAt,
			},
		});
	}

	private handleExit(code: number | null, signal: NodeJS.Signals | null) {
		const error = {
			name: 'RustPlaybackRuntimeExited',
			message: `Rust playback runtime exited with code ${code ?? 'null'} signal ${signal ?? 'null'}`,
			code: code ?? signal ?? 'runtimeExited',
		};
		if (this.readyPromise) this.emit('runtimeExitBeforeReady', new Error(error.message));
		this.emit('runtimeExited', error);
		this.failAll(error);
		this.child = undefined;
		this.readyPromise = undefined;
	}

	private failAll(error: RuntimeCommandError) {
		for (const [requestId, pending] of this.pending) {
			clearTimeout(pending.timeout);
			pending.resolve({
				requestId,
				ok: false,
				error,
				timing: {
					createdAt: pending.createdAt,
					finishedAt: new Date().toISOString(),
				},
			});
		}
		this.pending.clear();
	}

	private readyTimeoutMs() {
		return this.options.readyTimeoutMs ?? 5000;
	}

	private commandTimeoutMs() {
		return this.options.commandTimeoutMs ?? 30000;
	}
}

function normalizeRuntimeError(err: unknown): RuntimeCommandError {
	if (err instanceof Error) {
		return {
			name: err.name,
			message: err.message,
			stack: err.stack,
		};
	}
	if (typeof err === 'object' && err !== null) {
		const data = err as { error?: { code?: string | number; message?: string }; code?: string | number; message?: string };
		return {
			name: 'RustPlaybackRuntimeError',
			message: data.error?.message ?? data.message ?? JSON.stringify(err),
			code: data.error?.code ?? data.code,
		};
	}
	return {
		name: 'RustPlaybackRuntimeError',
		message: String(err),
	};
}
