# OpenKTV Appliance TODO

本分支目标：把本地 OpenKTV fork 增量重构成 Ubuntu 客厅机优先、低延迟、可诊断、可恢复的 KTV appliance。第一阶段保留现有 Karaoke Mugen Electron/Node/React/Socket.IO 功能和外部 WebSocket 命令兼容，新增稳定边界后再逐步替换内部实现。

## 已完成

- 建立长期重构分支：`appliance/refactor-runtime`。
- 安装并验证本地运行依赖：mpv、ffmpeg、PostgreSQL、前后端依赖。
- 跑通最小启动和 `/health`，确认 headless app 可在本机运行。
- 新增 contracts 层：
  - `RuntimeCommand`
  - `RuntimeEvent`
  - `PlaybackCommand`
  - `PlaybackEvent`
  - `PlayerSnapshot`
  - `PlayPlan`
- 新增 runtime 基础设施：
  - priority command bus
  - player snapshot projection
  - playback state machine
  - PlayPlan builder
  - queue decision model
  - healthcheck
- 保持旧 `WS_CMD` 命令兼容，并让播放控制命令先进入高优先级 command bus。
- 保留旧 `playerStatus` 事件，同时新增 `playerSnapshot` 投影事件。
- 新增 `/health` endpoint，覆盖 core/player/db/mediaCache。
- 新增 Rust `tools/devctl`：
  - `dev:doctor`
  - `dev:setup-db`
  - `dev:build`
  - `dev:test`
  - `dev:health`
  - `dev:snapshot`
  - `dev:logs`
  - `dev:nas`
  - `dev:run`
  - `dev:stop`
  - `dev:restart`
  - `dev:status`
  - 没有 `DISPLAY` 的 shell 中自动探测 `/tmp/.X11-unix/X0` / `X1`，用于本机 appliance detached 启动。
- 新增 Rust `tools/runtime`：
  - `openktv-runtime` JSONL 进程骨架
  - `runtimeReady / stateChanged / commandAck / commandFailed` 事件输出
  - `ping / play / pause / stop / seek / setVolume / setPitch / setSpeed / setSubs / toggleFullscreen / restart` 命令确认
  - 可选 `--mpv` backend：启动真实 mpv idle 进程、创建 IPC socket、发送基础 mpv IPC 命令、检测 mpv 退出并上报 `runtimeCrashed`
  - `dev:runtime-mpv-loadplan-check`：生成本地 WAV，提交 `PlayPlan`，并通过真实 mpv IPC 验证 `loadPlan/play/pause/stop`
  - `dev:runtime-mpv-recover-check`：杀掉测试 mpv 后验证 `runtimeCrashed -> recovering -> runtimeRecovered`，并确认恢复后仍能 ack 控制命令
  - mpv 退出后 Rust runtime 进入 `Recovering`，自动重建 mpv supervisor，并发出 `runtimeRecovered`
  - mpv IPC 现在按 `request_id` 读取对应响应，避免把 mpv 异步事件误判成命令失败。
  - TypeScript `RustPlaybackRuntimeClient` IPC adapter 和单元测试
- 新增默认关闭的 Rust playback shadow 接入点：设置 `OPENKTV_RUST_PLAYBACK_SHADOW=1` 时，旧播放器仍为真相源，安全的 legacy 控制命令和真实已解析 `PlayPlan` 会镜像到 Rust runtime。
- 新增 `LegacyPlaybackRuntimeAdapter`，把旧播放器服务调用和 command bus 包装从 WebSocket controller 中抽出，为 Phase 3 的真实 `PlaybackRuntime` 替换预留边界。
- 本地项目名改为 `openktv`，保留上游兼容行为。
- 建立 NAS 媒体目录约定：`smb://192.168.0.109/nas_hdd/` 需要挂载到本机路径后再作为下载和播放媒体根使用。
- 本地 appliance 默认语言改为简体中文：
  - `App.Language` 默认 `zh-Hans`
  - 前端注册 `zh-Hans` locale
  - 系统偏好页暴露语言选择
  - 新建本地用户默认跟随后端语言
- Codex skill 已写入本机：
  - `/home/x/.codex/skills/karaokemugen-appliance-dev/SKILL.md`

## 进行中

- 将 Rust `devctl` 作为本地 appliance 操作入口，减少对 Node 脚本的诊断依赖。
- 将现有播放器状态逐步从全局 `state.player` 迁到 `PlayerSnapshot` 真相源。
- 将播放控制路径从旧服务 adapter 迁到真正独立的 `PlaybackRuntime`。
- 将 Rust runtime 从 shadow/smoke test 升级到 feature-flagged `PlayPlan` 播放所有者。
- 将 `PlayPlan` 创建前移到播放热路径之前。

## 未完成

- Phase 3: Playback Runtime 独立化
  - 从 `mpv.ts`、`mpvIPC.ts`、`player.ts`、`karaEngine.ts` 中抽出真实 mpv runtime adapter。
  - 将真实队列 `PlayPlan` 通过 feature flag 接入旧 WebSocket 播放控制路径。
  - 所有 mpv 命令统一 requestId、ack、timeout、错误码、结构化日志。
  - 将 Rust runtime 的 `runtimeCrashed/runtimeRecovered` 投影到现有 UI 和 `/health` 诊断。
- Phase 4: PlayPlan 预计算
  - 当前歌和下一首歌提前解析媒体路径、字幕路径、音轨、起点、显示信息。
  - 播放热路径只提交本地 ready 的 `PlayPlan`。
  - 缺文件、远程不可达、字幕转换失败在预检阶段暴露。
- Phase 5: Queue Decision Refactor
  - 拆解 live `playerEnding()`。
  - Intro/Sponsor/Jingle/Encore/Outro/Random/Quiz/Poll 都通过统一 `PlaybackDecision`。
  - 历史记录、DB 更新、streamer files、WS 通知迁到事件订阅器。
- Phase 6: Worker 化媒体任务
  - 下载、扫描、ffprobe、字幕转换、预览生成、音量分析迁出播放热路径。
  - 新增 media readiness：`missing / downloading / processing / ready / failed`。
- Phase 7: Ubuntu Appliance 集成
  - systemd unit。
  - 自动重启。
  - 本地诊断页。
  - 固定显示器、固定音频设备、mpv 常驻 profile。
  - 开机恢复。
- 测试补齐
  - fake mpv runtime 集成测试，重点覆盖 ack timeout 和 media-ended；真实 mpv crash/recover 已有 devctl 烟测。
  - Socket.IO 兼容测试。
  - `PlayPlanBuilder` 缺文件/字幕/quiz modifier 覆盖。
  - command bus priority/timeout/dedup 覆盖继续扩大。

## 下一步建议

1. 先把 `PlaybackRuntime` adapter 骨架接到现有 mpv 控制路径，不改变外部行为。
2. 把 `play/pause/stop/next/seek/volume/subs/fullscreen` 的 ack/timeout 统一记录到 command bus。
3. 在 `PlayPlanBuilder` 前移之前，增加一组 fake mpv runtime 测试，确保切换时能快速回归。
4. 用 `dev:run/dev:stop/dev:restart/dev:status` 保持本地服务常驻；编译和测试前可以停，结束后恢复。
