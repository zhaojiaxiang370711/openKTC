import dayjs from 'dayjs';

import { News } from '../types/news';

type LocalizedText = {
	'zh-Hans': string;
	en: string;
};

type ApplianceUpdateEntry = {
	date: string;
	version: string;
	type: string;
	title: LocalizedText;
	changes: {
		fixed?: LocalizedText[];
		improved?: LocalizedText[];
		notes?: LocalizedText[];
	};
};

const entries: ApplianceUpdateEntry[] = [
	{
		date: '2026-05-16T15:05:00+08:00',
		version: 'appliance-0.11',
		type: 'appliance',
		title: {
			'zh-Hans': 'Rust runtime 支持 mpv 自动恢复',
			en: 'Rust runtime mpv auto-recovery',
		},
		changes: {
			fixed: [
				{
					'zh-Hans': 'Rust mpv IPC 现在会等到匹配 request_id 的响应，避免把 mpv 异步事件误判成命令失败。',
					en: 'Rust mpv IPC now waits for the matching request_id response, avoiding false command failures from asynchronous mpv events.',
				},
				{
					'zh-Hans': 'devctl 启动前检查不再因为 dist 构建产物暂时不存在而阻止 dev:run/dev:restart，构建步骤会重新生成它们。',
					en: 'devctl preflight no longer blocks dev:run/dev:restart when dist artifacts are temporarily missing; the build step regenerates them.',
				},
				{
					'zh-Hans': 'devctl detached 启动现在会在没有 DISPLAY 时自动使用本机 X11 显示器，例如 :0。',
					en: 'devctl detached startup now falls back to a local X11 display such as :0 when DISPLAY is missing.',
				},
			],
			improved: [
				{
					'zh-Hans': 'Rust 播放 runtime 现在会在测试 mpv 退出后进入 Recovering，自动重建 mpv supervisor，并发出 runtimeRecovered。',
					en: 'The Rust playback runtime now enters Recovering after the test mpv exits, rebuilds the mpv supervisor, and emits runtimeRecovered.',
				},
				{
					'zh-Hans': '新增 dev:runtime-mpv-recover-check，可以杀掉测试 mpv 并验证恢复后命令仍然能 ack。',
					en: 'Added dev:runtime-mpv-recover-check to kill the test mpv and verify that commands still acknowledge after recovery.',
				},
			],
		},
	},
	{
		date: '2026-05-16T14:55:00+08:00',
		version: 'appliance-0.10',
		type: 'appliance',
		title: {
			'zh-Hans': '真实 PlayPlan shadow 到 Rust runtime',
			en: 'Real PlayPlan shadowing into Rust runtime',
		},
		changes: {
			improved: [
				{
					'zh-Hans': 'Rust loadPlan 现在会带上 mpvOptions 和字幕路径，更接近旧播放器的真实加载参数。',
					en: 'Rust loadPlan now carries mpvOptions and subtitle paths, making it closer to the legacy player load parameters.',
				},
				{
					'zh-Hans': '开启 OPENKTV_RUST_PLAYBACK_SHADOW=1 后，旧播放器解析出的真实 PlayPlan 会镜像到 Rust runtime，旧播放器仍然是真相源。',
					en: 'With OPENKTV_RUST_PLAYBACK_SHADOW=1, real PlayPlans resolved by the legacy player are mirrored into the Rust runtime while legacy playback remains the source of truth.',
				},
			],
		},
	},
	{
		date: '2026-05-16T14:35:00+08:00',
		version: 'appliance-0.9',
		type: 'appliance',
		title: {
			'zh-Hans': 'PlayPlan 到 Rust runtime 的闭环',
			en: 'PlayPlan loop into Rust runtime',
		},
		changes: {
			improved: [
				{
					'zh-Hans': '新增 dev:runtime-mpv-loadplan-check，生成本地 WAV 后通过真实 mpv IPC 验证 loadPlan、play、pause、stop。',
					en: 'Added dev:runtime-mpv-loadplan-check to generate a local WAV and verify loadPlan, play, pause, and stop through real mpv IPC.',
				},
				{
					'zh-Hans': 'TypeScript IPC client 新增 loadPlan/play/pause/stopPlayback helper，并加入默认关闭的 Rust playback shadow flag。',
					en: 'Added loadPlan/play/pause/stopPlayback helpers to the TypeScript IPC client plus a disabled-by-default Rust playback shadow flag.',
				},
			],
		},
	},
	{
		date: '2026-05-16T14:10:00+08:00',
		version: 'appliance-0.8',
		type: 'appliance',
		title: {
			'zh-Hans': 'Rust runtime 接入真实 mpv IPC',
			en: 'Rust runtime connected to real mpv IPC',
		},
		changes: {
			improved: [
				{
					'zh-Hans': 'openktv-runtime 新增可选 --mpv backend，可以启动真实 mpv idle 进程并通过 IPC 确认基础播放控制命令。',
					en: 'openktv-runtime now has an optional --mpv backend that starts a real idle mpv process and acknowledges basic playback controls through IPC.',
				},
				{
					'zh-Hans': '新增 dev:runtime-mpv-check，用 null 音视频输出验证 mpv IPC，不影响当前客厅播放服务。',
					en: 'Added dev:runtime-mpv-check to verify mpv IPC with null audio/video output without affecting the current living-room playback service.',
				},
			],
		},
	},
	{
		date: '2026-05-16T13:40:00+08:00',
		version: 'appliance-0.7',
		type: 'appliance',
		title: {
			'zh-Hans': 'Rust 播放 runtime 骨架',
			en: 'Rust playback runtime skeleton',
		},
		changes: {
			improved: [
				{
					'zh-Hans': '新增 openktv-runtime Rust 进程骨架，先提供 JSONL 命令确认、状态事件和播放器 snapshot 雏形。',
					en: 'Added the openktv-runtime Rust process skeleton with JSONL command acknowledgements, state events, and a first player snapshot shape.',
				},
				{
					'zh-Hans': '新增 TypeScript IPC client 和单元测试，为后续把 mpv 生命周期迁移到 Rust 进程做准备。',
					en: 'Added a TypeScript IPC client and unit tests to prepare for moving mpv lifecycle ownership into the Rust process.',
				},
			],
		},
	},
	{
		date: '2026-05-16T13:05:00+08:00',
		version: 'appliance-0.6',
		type: 'appliance',
		title: {
			'zh-Hans': 'NAS 地址确认和挂载验证',
			en: 'NAS address confirmed and mount verified',
		},
		changes: {
			improved: [
				{
					'zh-Hans': '将飞牛 NAS 默认地址固定为 smb://192.168.0.109/nas_hdd/，xfn.local 仅作为局域网别名保留。',
					en: 'Pinned the Feiniu NAS default address to smb://192.168.0.109/nas_hdd/ while keeping xfn.local as a LAN alias.',
				},
				{
					'zh-Hans': '本机媒体挂载点使用私有凭据文件接入 NAS，避免把账号密码写入仓库配置。',
					en: 'Connected the local media mount through a private credentials file so NAS credentials stay out of repository config.',
				},
			],
		},
	},
	{
		date: '2026-05-16T12:20:00+08:00',
		version: 'appliance-0.5',
		type: 'appliance',
		title: {
			'zh-Hans': 'OpenKTV 命名和 NAS 媒体目录',
			en: 'OpenKTV naming and NAS media directory',
		},
		changes: {
			improved: [
				{
					'zh-Hans': '本地项目命名改为 OpenKTV，保留 Karaoke Mugen 上游协议和客户端兼容性。',
					en: 'Renamed the local project to OpenKTV while preserving Karaoke Mugen upstream protocol and client compatibility.',
				},
				{
					'zh-Hans': '新增飞牛 NAS 媒体目录约定：将 SMB 共享挂载为本机目录后作为下载和播放媒体根。',
					en: 'Added the Feiniu NAS media convention: mount the SMB share locally and use it as the download/playback media root.',
				},
			],
		},
	},
	{
		date: '2026-05-16T11:55:00+08:00',
		version: 'appliance-0.4',
		type: 'appliance',
		title: {
			'zh-Hans': '中文首页和本地更新记录',
			en: 'Chinese home page and local update log',
		},
		changes: {
			fixed: [
				{
					'zh-Hans': '修复登录后主页、系统面板和左侧导航大量回退英文的问题。',
					en: 'Fixed English fallback across the post-login home page, system panel, and side navigation.',
				},
				{
					'zh-Hans': '移除重复的 HEADERS 翻译覆盖，确保系统面板标题正常显示中文。',
					en: 'Removed duplicate HEADERS translation overrides so system panel titles render correctly.',
				},
			],
			improved: [
				{
					'zh-Hans': '界面语言收敛为简体中文和英文，歌库元数据语言选择仍保留 ISO 语言列表。',
					en: 'Limited interface languages to Simplified Chinese and English while preserving ISO language choices for song metadata.',
				},
				{
					'zh-Hans': '首页右侧由上游新闻改为本地更新记录，后续重构、Bug 修复和构建变化都会记录在这里。',
					en: 'Replaced upstream news on the home page with a local update log for refactors, bug fixes, and build changes.',
				},
			],
		},
	},
	{
		date: '2026-05-16T10:30:00+08:00',
		version: 'appliance-0.3',
		type: 'appliance',
		title: {
			'zh-Hans': 'Rust devctl 长驻运行工具',
			en: 'Rust devctl detached runtime helper',
		},
		changes: {
			fixed: [
				{
					'zh-Hans': '修复本地服务后台运行和重启流程，让 Karaoke Mugen 可以由 devctl 持续托管。',
					en: 'Fixed the detached local run and restart flow so Karaoke Mugen can stay managed by devctl.',
				},
			],
			improved: [
				{
					'zh-Hans': '加入健康检查、日志、状态、重启和快照命令，方便 Ubuntu 客厅机调试。',
					en: 'Added health, logs, status, restart, and snapshot commands for Ubuntu appliance debugging.',
				},
			],
		},
	},
	{
		date: '2026-05-15T22:00:00+08:00',
		version: 'appliance-0.2',
		type: 'appliance',
		title: {
			'zh-Hans': '低延迟 runtime 重构基线',
			en: 'Low-latency runtime refactor baseline',
		},
		changes: {
			improved: [
				{
					'zh-Hans': '新增 contracts、command bus、PlayerSnapshot、PlayPlanBuilder、播放器状态机和 healthcheck 基础设施。',
					en: 'Added contracts, command bus, PlayerSnapshot, PlayPlanBuilder, player state machine, and healthcheck foundations.',
				},
				{
					'zh-Hans': '播放器控制开始通过高优先级命令通道接入，为后续独立 PlaybackRuntime 做准备。',
					en: 'Started routing player controls through a high-priority command path in preparation for an independent PlaybackRuntime.',
				},
			],
			notes: [
				{
					'zh-Hans': '第一阶段保留原有 Web UI、手机点歌、Quiz、Streamer 和上游兼容行为。',
					en: 'Phase one keeps the existing Web UI, mobile requests, Quiz, Streamer, and upstream-compatible behavior.',
				},
			],
		},
	},
];

function localize(text: LocalizedText, language: string): string {
	return language?.startsWith('zh') ? text['zh-Hans'] : text.en;
}

function list(title: string, items: LocalizedText[] | undefined, language: string): string {
	if (!items?.length) return '';
	return `<h3>${title}</h3><ul>${items.map(item => `<li>${localize(item, language)}</li>`).join('')}</ul>`;
}

export function buildApplianceUpdateNews(language: string): News[] {
	const isChinese = language?.startsWith('zh');
	const labels = {
		fixed: isChinese ? '修复' : 'Fixed',
		improved: isChinese ? '优化' : 'Improved',
		notes: isChinese ? '说明' : 'Notes',
	};
	return entries.map(entry => ({
		html: [
			list(labels.fixed, entry.changes.fixed, language),
			list(labels.improved, entry.changes.improved, language),
			list(labels.notes, entry.changes.notes, language),
		].join(''),
		date: entry.date,
		dateStr: dayjs(entry.date).format('YYYY-MM-DD HH:mm'),
		title: `${entry.version} - ${localize(entry.title, language)}`,
		link: '',
		type: entry.type,
	}));
}
