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
		date: '2026-05-16T21:00:00+08:00',
		version: 'appliance-0.18',
		type: 'appliance',
		title: {
			'zh-Hans': '关闭默认片头和赞助视频',
			en: 'Disabled default intro and sponsor videos',
		},
		changes: {
			improved: [
				{
					'zh-Hans':
						'本地 appliance 不再在歌曲播放前插入 kara.moe 默认片头、赞助、间奏、返场或结束视频，点播歌曲会直接开始。',
					en: 'The local appliance no longer inserts kara.moe default intros, sponsors, jingles, encores, or outros before requested songs; selected songs start directly.',
				},
			],
		},
	},
	{
		date: '2026-05-16T20:20:00+08:00',
		version: 'appliance-0.17',
		type: 'appliance',
		title: {
			'zh-Hans': '修复 MV 画面显示位置',
			en: 'Fixed MV display placement',
		},
		changes: {
			fixed: [
				{
					'zh-Hans':
						'播放器现在会启动到 HDMI 外接显示器全屏，避免只听到声音但 MV 小窗口藏在电脑屏幕或浏览器后面。',
					en: 'The player now starts fullscreen on the HDMI display, avoiding cases where audio plays while the MV window is hidden behind the browser or on the laptop screen.',
				},
			],
			improved: [
				{
					'zh-Hans': '屏蔽 mpv 默认的 F、ESC 和鼠标双击全屏切换，减少客厅播放时误触退出全屏。',
					en: 'Disabled mpv default F, ESC, and double-click fullscreen toggles to reduce accidental fullscreen exits during living-room playback.',
				},
			],
		},
	},
	{
		date: '2026-05-16T18:10:00+08:00',
		version: 'appliance-0.16',
		type: 'appliance',
		title: {
			'zh-Hans': '新增麦克风监听控制',
			en: 'Added microphone monitor controls',
		},
		changes: {
			improved: [
				{
					'zh-Hans':
						'公共点歌首页新增 Newmine 麦克风到 HDMI/显示器音响的监听开关，并支持麦克风、音响音量和静音控制。',
					en: 'The public request homepage now controls Newmine microphone monitoring into the HDMI/display speakers, with mic and speaker volume and mute controls.',
				},
				{
					'zh-Hans':
						'麦克风声音通过系统 PipeWire/PulseAudio loopback 输出，不进入播放器混音链路，降低延迟并减少播放逻辑风险。',
					en: 'Microphone audio now uses a system PipeWire/PulseAudio loopback instead of entering the player mixing path, reducing latency and playback risk.',
				},
			],
		},
	},
	{
		date: '2026-05-16T17:35:00+08:00',
		version: 'appliance-0.15',
		type: 'appliance',
		title: {
			'zh-Hans': '修复播放控制按钮状态',
			en: 'Fixed playback control button states',
		},
		changes: {
			fixed: [
				{
					'zh-Hans':
						'播放失败或没有当前歌曲时，现在会把错误返回给页面，不会再表现成点击播放但无反馈。',
					en: 'Playback failures or missing current songs now return an error to the page instead of looking like a no-op.',
				},
				{
					'zh-Hans':
						'播放、停止、上一曲、下一曲按钮现在按当前队列和播放状态启用，避免在没有下一首或没有队列时发出无效命令。',
					en: 'Play, stop, previous, and next controls now enable according to queue and playback state, avoiding invalid commands when there is no next song or no queue.',
				},
				{
					'zh-Hans':
						'修复公共页面播放器状态尚未同步完成时，播放/暂停按钮可能被前端拦截导致点击无反应的问题。',
					en: 'Fixed public play/pause controls being blocked before the player state finished syncing.',
				},
			],
			improved: [
				{
					'zh-Hans': '本地 appliance 默认打开公共点歌页播放器控制按钮。',
					en: 'Enabled public request-page player controls by default for the local appliance.',
				},
			],
		},
	},
	{
		date: '2026-05-16T17:05:00+08:00',
		version: 'appliance-0.14',
		type: 'appliance',
		title: {
			'zh-Hans': '修复本地 MV 播放失败',
			en: 'Fixed local MV playback failure',
		},
		changes: {
			fixed: [
				{
					'zh-Hans':
						'修复没有 loudnorm/字幕/叠加信息的本地视频生成空 lavfi filter，导致 mpv 报错后没有声音和画面的问题。',
					en: 'Fixed local videos without loudnorm, subtitles, or overlays generating an empty lavfi filter that made mpv fail with no audio or video.',
				},
			],
		},
	},
	{
		date: '2026-05-16T16:40:00+08:00',
		version: 'appliance-0.13',
		type: 'appliance',
		title: {
			'zh-Hans': '点歌详情页下一步提示',
			en: 'Request detail next-step hint',
		},
		changes: {
			improved: [
				{
					'zh-Hans':
						'歌曲详情页现在会明确提示“加入队列、已加入、投票或仅浏览”的下一步，并把加入队列按钮强化为主操作。',
					en: 'Song detail pages now clearly show whether to add, wait, vote, or browse only, with Add to queue promoted as the primary action.',
				},
				{
					'zh-Hans': '“我的待播歌曲”为空时会解释当前歌曲不会出现在待播列表，并提供跳转到当前队列的按钮。',
					en: 'The empty My incoming songs view now explains that the current song is not listed there and links to the current queue.',
				},
			],
		},
	},
	{
		date: '2026-05-16T16:10:00+08:00',
		version: 'appliance-0.12',
		type: 'appliance',
		title: {
			'zh-Hans': '点歌播放页新拟态改版',
			en: 'Neumorphic request and playback refresh',
		},
		changes: {
			improved: [
				{
					'zh-Hans': '公共点歌首页采用新拟态面板、分组操作和三步点歌提示，手机与桌面布局更清晰。',
					en: 'Refreshed the public request homepage with neumorphic panels, grouped actions, and a three-step request hint for clearer mobile and desktop use.',
				},
				{
					'zh-Hans': '播放器卡片、待播队列和教程遮罩改为更柔和的凸起/内嵌视觉，并补齐简体中文教程文案。',
					en: 'Updated the player card, upcoming queue, and tutorial overlay with softer raised/inset surfaces and completed the Simplified Chinese tutorial copy.',
				},
			],
		},
	},
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
					'zh-Hans':
						'devctl 启动前检查不再因为 dist 构建产物暂时不存在而阻止 dev:run/dev:restart，构建步骤会重新生成它们。',
					en: 'devctl preflight no longer blocks dev:run/dev:restart when dist artifacts are temporarily missing; the build step regenerates them.',
				},
				{
					'zh-Hans': 'devctl detached 启动现在会在没有 DISPLAY 时自动使用本机 X11 显示器和 Xauthority 文件。',
					en: 'devctl detached startup now falls back to the local X11 display and Xauthority file when DISPLAY is missing.',
				},
				{
					'zh-Hans': 'dev:status 现在会在 pid 文件过期时从进程表找回真实 Electron 主进程并刷新 pid。',
					en: 'dev:status now recovers the real Electron main process from the process table and refreshes stale pid files.',
				},
			],
			improved: [
				{
					'zh-Hans':
						'Rust 播放 runtime 现在会在测试 mpv 退出后进入 Recovering，自动重建 mpv supervisor，并发出 runtimeRecovered。',
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
					'zh-Hans':
						'开启 OPENKTV_RUST_PLAYBACK_SHADOW=1 后，旧播放器解析出的真实 PlayPlan 会镜像到 Rust runtime，旧播放器仍然是真相源。',
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
					'zh-Hans':
						'新增 dev:runtime-mpv-loadplan-check，生成本地 WAV 后通过真实 mpv IPC 验证 loadPlan、play、pause、stop。',
					en: 'Added dev:runtime-mpv-loadplan-check to generate a local WAV and verify loadPlan, play, pause, and stop through real mpv IPC.',
				},
				{
					'zh-Hans':
						'TypeScript IPC client 新增 loadPlan/play/pause/stopPlayback helper，并加入默认关闭的 Rust playback shadow flag。',
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
					'zh-Hans':
						'openktv-runtime 新增可选 --mpv backend，可以启动真实 mpv idle 进程并通过 IPC 确认基础播放控制命令。',
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
					'zh-Hans':
						'新增 openktv-runtime Rust 进程骨架，先提供 JSONL 命令确认、状态事件和播放器 snapshot 雏形。',
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
					'zh-Hans':
						'将飞牛 NAS 默认媒体根固定为 smb://192.168.0.109/nas_hdd/，SSD 共享作为导入源复制进 HDD 歌库。',
					en: 'Pinned the Feiniu NAS media root to smb://192.168.0.109/nas_hdd/ and treat the SSD share as an import source copied into the HDD library.',
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
					'zh-Hans':
						'新增 contracts、command bus、PlayerSnapshot、PlayPlanBuilder、播放器状态机和 healthcheck 基础设施。',
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
