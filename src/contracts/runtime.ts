export type RuntimeCommandPriority = 'high' | 'normal' | 'low';

export interface RuntimeCommand<Payload = unknown> {
	requestId: string;
	kind: string;
	payload?: Payload;
	priority: RuntimeCommandPriority;
	source?: string;
	createdAt: string;
	timeoutMs: number;
}

export interface RuntimeCommandTiming {
	createdAt: string;
	startedAt?: string;
	finishedAt?: string;
	durationMs?: number;
}

export interface RuntimeCommandError {
	name: string;
	message: string;
	code?: number | string;
	stack?: string;
}

export interface RuntimeCommandResult<Data = unknown> {
	requestId: string;
	ok: boolean;
	data?: Data;
	error?: RuntimeCommandError;
	timing: RuntimeCommandTiming;
}

export interface RuntimeEvent<Payload = unknown> {
	type: string;
	payload?: Payload;
	requestId?: string;
	createdAt: string;
}

