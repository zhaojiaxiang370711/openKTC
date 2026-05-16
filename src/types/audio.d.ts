export interface ApplianceAudioMonitorStatus {
	enabled: boolean;
	available: boolean;
	moduleId?: string;
	source: {
		name: string;
		label: string;
		available: boolean;
		volume: number;
		muted: boolean;
	};
	sink: {
		name: string;
		label: string;
		available: boolean;
		volume: number;
		muted: boolean;
	};
	latencyMs: number;
}

export interface ApplianceAudioMonitorUpdate {
	enabled?: boolean;
	micVolume?: number;
	outputVolume?: number;
	micMuted?: boolean;
	outputMuted?: boolean;
}
