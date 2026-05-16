# OpenKTV Appliance Plan

Last updated: 2026-05-16

基于 [handoff.md](handoff.md) 和 [todo.md](todo.md) 当前状态制定的下一步执行计划。

## 第一阶段：稳定当前变更（1-2 个 session）

目标：把当前 dirty worktree 中已验证的改动提交，消除"故意脏"状态。

### 1.1 用户验收

- [ ] 用户硬刷新 `http://localhost:1337/public` 确认公共控件可见
- [ ] 用户测试 play/pause/next 按钮行为
- [ ] 用户确认简体中文文案正确

### 1.2 提交分批

建议拆成 3 个 commit：

1. **docs**: 新建 `docs/` 目录及 appliance 子文档（handoff, README, todo, refactor, nas-media），删除旧指针文件 `docs/appliance-todo.md`, `docs/appliance-refactor.md`, `docs/nas-media.md`
2. **fix: playback & public controls**: mpv lavfi 空过滤修复、sub-file 空值修复、播放错误回传、PublicPlayerControls 默认开启、按钮锁/状态修复
3. **ui: public page neumorphic refresh**: PublicHomepage, PlayerBox, PublicHeader, PlaylistPage, KaraDetail, AddKaraButton, Tutorial 样式刷新，zh-Hans/en 文案更新

### 1.3 更新日志

- [ ] 更新 `kmfrontend/src/frontend/data/applianceUpdateLog.ts` 记录本次用户可见变更

---

## 第二阶段：公共播放体验收尾（2-3 个 session）

目标：把手头"已接近完成"的公共播放控制 UX 做到可交付状态。

### 2.1 控件状态反馈

- [ ] 按钮点击后明确的 pending/loading 视觉反馈（当前已有 button lock，确认覆盖所有控件）
- [ ] disabled 状态下显示原因文案（如"无下一首"而非单纯灰掉按钮）
- [ ] 播放列表为空时的引导文案（`/public/playlist/:plaid/me` 已有空状态，复查一致性）

### 2.2 健壮性

- [ ] 公共页同步延迟期间不错误禁用控件（handoff 提到 play/pause 和 next/previous 已有修复，回归验证）
- [ ] 浏览器缓存旧 frontend bundle 时用户提示（或在 PublicHeader 显示版本号/构建时间）

### 2.3 缺失预览图片

- [ ] `app/previews/` 下 ENOENT 不再产生日志噪音（降级到 debug/warn 或生成占位图）
- [ ] 前端对缺失预览显示占位图，而非裂图

### 2.4 locale 同步

- [ ] 逐 key 对比 `zh-Hans.json` 和 `en.json`，补齐缺失 key

---

## 第三阶段：PlaybackRuntime 适配器接入（3-5 个 session）

对应 todo.md Phase 3。目标：在不改变外部播放行为的前提下，让命令走新 command bus / Rust runtime 影子路径。

### 3.1 适配器骨架

- [ ] 将 `src/components/mpv/mpv.ts` 和 `src/services/player.ts` 中的 mpv IPC 调用点统一到 `LegacyPlaybackRuntimeAdapter`
- [ ] 所有 mpv 命令统一 `requestId` / `ack` / `timeout` / 错误码
- [ ] 确认 `playerSnapshot` 事件与 `playerStatus` 保持一致

### 3.2 影子模式验证

- [ ] 设置 `OPENKTV_RUST_PLAYBACK_SHADOW=1`，录制一个完整播放会话
- [ ] 对比 legacy 路径和 Rust shadow 路径的 `PlayPlan` 和命令序列，确认无差异
- [ ] 验证 shadow 模式下 Rust runtime crash/recover 不影响实际播放

### 3.3 测试补齐

- [ ] fake mpv runtime 集成测试：ack timeout、media-ended
- [ ] `PlayPlanBuilder` 缺文件 / 字幕 / quiz modifier 覆盖
- [ ] command bus priority / timeout / dedup 继续扩大覆盖

---

## 第四阶段：PlayPlan 前移 & Queue Decision 拆分（3-5 个 session）

对应 todo.md Phase 4-5。

### 4.1 PlayPlan 预计算

- [ ] 当前歌和下一首歌提前解析：媒体路径、字幕路径、音轨、起点、显示信息
- [ ] 播放热路径只提交已 ready 的 `PlayPlan`
- [ ] 缺文件 / 远程不可达 / 字幕转换失败在预检阶段暴露，而非播放时静默失败

### 4.2 playerEnding() 拆分

- [ ] 纯决策层：计算下一首是什么（Intro/Sponsor/Jingle/Encore/Outro/Random/Quiz/Poll）
- [ ] 副作用订阅器：历史记录写入、DB 更新、streamer files、WS 通知
- [ ] 决策层单元测试（不依赖外部状态）

---

## 第五阶段：Rust Runtime 接管 mpv（3-5 个 session）

对应 todo.md Phase 3 后半 + Phase 6。

### 5.1 Feature Flag 切换

- [ ] 新增 `OPENKTV_RUST_PLAYBACK=1` 环境变量
- [ ] 开启后 `RustPlaybackRuntimeClient` 取代 legacy mpv.ts 成为 mpv 真相源
- [ ] `/health` 报告 runtime 类型（legacy / rust）

### 5.2 崩溃恢复

- [ ] Rust runtime `runtimeCrashed` → UI 显示"播放器恢复中"
- [ ] `runtimeRecovered` → UI 恢复正常
- [ ] 恢复期间队列状态不丢

### 5.3 媒体任务 Worker 化

- [ ] 下载、扫描、ffprobe、字幕转换、预览生成、音量分析迁出播放热路径
- [ ] 新增 media readiness 状态：`missing / downloading / processing / ready / failed`

---

## 第六阶段：Ubuntu Appliance 集成（2-3 个 session）

对应 todo.md Phase 7。

- [ ] systemd unit 文件
- [ ] 开机自启 + 崩溃自动重启
- [ ] 本地诊断页（`/health` 已有，扩展 UI 面板）
- [ ] 固定显示器 / 音频设备 / mpv profile
- [ ] 开机恢复：自动挂载 NAS → 启动 PostgreSQL → 启动 app

---

## 每阶段通用检查

- [ ] `cargo check --manifest-path tools/devctl/Cargo.toml`
- [ ] `cargo check --manifest-path tools/runtime/Cargo.toml`
- [ ] `corepack yarn dev:test`
- [ ] `corepack yarn build`
- [ ] `corepack yarn dev:health http://localhost:1337/health`
- [ ] 更新 `kmfrontend/src/frontend/data/applianceUpdateLog.ts`
