# OpenKTV Appliance Handoff

Last updated: 2026-05-16 17:45 Asia/Shanghai

This handoff is written for the next AI/developer taking over the local OpenKTV appliance fork.

## TL;DR

- Canonical project path: `/home/x/code/openktv`
- Compatibility path: `/home/x/code/karaokemugen-app` is a symlink to `openktv`
- Branch: `appliance/refactor-runtime`
- Current HEAD when this was written: `b40cba238`
- Local service: running detached on `http://localhost:1337`
- Health check: OK as of 2026-05-16 17:44 Asia/Shanghai
- Frontend framework: React, not Vue
- Frontend versions:
  - `react`: `19.2.6`
  - `react-dom`: `19.2.6`
  - `react-router-dom`: `7.15.0`
  - `vite`: `^8.0.11`

## Required Context

Read these first:

1. `/home/x/code/AGENTS.md`
2. `/home/x/.codex/skills/karaokemugen-appliance-dev/SKILL.md`
3. `docs/README.md`
4. `docs/appliance/README.md`
5. `docs/appliance/todo.md`
6. `docs/appliance/refactor.md`
7. `docs/appliance/nas-media.md`
8. `docs/appliance/plan.md`

Local docs may include private paths, LAN hostnames, NAS details, and workstation-specific setup. Do not sanitize or generalize them unless the user explicitly asks to publish the repo.

## Current User Goal

The user wants a local living-room karaoke appliance based on Karaoke Mugen/OpenKTV:

- NAS-backed local media library.
- Public phone/tablet request page in Simplified Chinese.
- Clear song request flow.
- Reliable mpv playback.
- Public playback controls on request pages.
- Future low-latency Ubuntu appliance architecture.

The user has repeatedly tested:

- `http://localhost:1337/public`
- `http://localhost:1337/public/playlist/91998538-6a31-450a-897f-80c6af3a022d`
- `http://localhost:1337/public/playlist/91998538-6a31-450a-897f-80c6af3a022d/me`
- `http://localhost:1337/public/karaoke/e60c786c-2eb9-4799-a822-7e3c920c0d0a`

## Non-Negotiable Rules

- Work in `/home/x/code/openktv`.
- Do not treat `/home/x/code/karaokemugen-app` as a second copy. It is a symlink.
- Do not revert unrelated dirty worktree changes.
- Preserve public WebSocket command compatibility.
- Keep mpv as the playback engine.
- Keep microphone audio out of Node/Electron/app runtime. The expected mic path is hardware direct monitoring or an external mixer/audio interface.
- Use local filesystem mount paths for NAS media, not raw `smb://...` URLs inside app config.
- Update `kmfrontend/src/frontend/data/applianceUpdateLog.ts` for user-visible behavior changes.

## Current Runtime State

Last observed commands:

```sh
export PATH=/home/x/code/node/bin:$PATH
corepack yarn dev:status
```

Result at handoff:

```text
detached pid: 311913 (running)
HTTP/1.1 200 OK
{"ok":true,"checks":{"core":{"ok":true},"player":{"ok":true},"db":{"ok":true},"mediaCache":{"ok":true}}}
```

The service was restarted after the latest public-control fixes. Ask the user to hard-refresh the browser if the old frontend bundle appears cached.

## Important Paths

- Backend/Electron/Node: `src/`
- Frontend React app: `kmfrontend/`
- Public page components: `kmfrontend/src/frontend/components/public/`
- Shared player controls: `kmfrontend/src/frontend/components/PlayerControls.tsx`
- Public playlist/list UI: `kmfrontend/src/frontend/components/karas/Playlist.tsx`
- Public request detail button: `kmfrontend/src/frontend/components/generic/buttons/AddKaraButton.tsx`
- Simplified Chinese locale: `kmfrontend/src/locales/zh-Hans.json`
- Appliance update log: `kmfrontend/src/frontend/data/applianceUpdateLog.ts`
- mpv player implementation: `src/components/mpv/`
- Legacy playback service: `src/services/player.ts`
- Queue/playback flow: `src/services/karaEngine.ts`, `src/services/playlist.ts`
- Rust dev helper: `tools/devctl/`
- Experimental Rust runtime: `tools/runtime/`
- Local private runtime data: `app/`
- Local config: `app/config.yml` (ignored/private)
- Logs: `app/logs/`, `app/run/devctl-headless.log`

## Media And NAS State

NAS convention:

- Durable HDD share: `smb://192.168.0.109/nas_hdd/`
- LAN alias seen from user: `smb://xfn.local/nas_hdd/`
- SSD import source: `smb://xfn.local/nas_ssd/`
- Local mount path: `/home/x/code/openktv/app/media/nas_hdd`

The app config should point repositories to local folders under:

```text
/home/x/code/openktv/app/media/nas_hdd
```

Prior observed library state:

- DB had 157 songs.
- 154 mp4, 2 mp3, 1 flac.
- All were `DOWNLOADED`.
- SSD content had been copied/imported into the HDD-backed library.
- The user still wants HDD mp4 files included.

Known log noise:

- Missing preview thumbnails can appear as `ENOENT` under `app/previews/...jpg`. This is usually preview generation/cache, not necessarily playback failure.

## Recent Work Completed

### UI/public request flow

Files touched include:

- `kmfrontend/src/frontend/components/public/PublicHomepage.tsx`
- `kmfrontend/src/frontend/components/public/PublicHomepage.scss`
- `kmfrontend/src/frontend/components/public/PlayerBox.tsx`
- `kmfrontend/src/frontend/components/public/PlayerBox.scss`
- `kmfrontend/src/frontend/components/PlaylistPage.tsx`
- `kmfrontend/src/frontend/components/PlaylistPage.scss`
- `kmfrontend/src/frontend/components/karas/KaraDetail.tsx`
- `kmfrontend/src/frontend/components/karas/KaraDetail.scss`
- `kmfrontend/src/frontend/components/karas/Playlist.tsx`
- `kmfrontend/src/frontend/components/karas/Playlist.scss`
- `kmfrontend/src/frontend/components/generic/buttons/AddKaraButton.tsx`
- `kmfrontend/src/frontend/components/modals/Tutorial.scss`
- `kmfrontend/src/locales/en.json`
- `kmfrontend/src/locales/zh-Hans.json`

Completed:

- Neumorphic-style refresh for public request/playback pages.
- Better three-step request guidance.
- Better song detail next-step states: add, queued, waiting, vote, browse only.
- Better empty state for `/public/playlist/:plaid/me`.
- Simplified Chinese copy updates.

### Playback fixes

Files:

- `src/components/mpv/lavfiGenerator.ts`
- `src/components/mpv/mpv.ts`
- `src/services/karaEngine.ts`
- `src/services/playlist.ts`

Completed:

- Fixed local MV playback failure caused by empty lavfi filter generation.
- Avoided sending empty `sub-file` to mpv when no subtitles exist.
- Playback errors now propagate back to the frontend instead of appearing as a silent no-op.

### Public player controls

Files:

- `kmfrontend/src/frontend/components/PlayerControls.tsx`
- `kmfrontend/src/frontend/components/public/PublicHeader.tsx`
- `kmfrontend/src/frontend/components/public/PublicHeader.scss`
- `src/utils/defaultSettings.ts`
- local ignored `app/config.yml`

Completed:

- Public controls default to enabled for the local appliance.
- `app/config.yml` has local `Frontend.PublicPlayerControls: true`.
- Buttons now lock while commands are pending.
- Play/pause no longer gets blocked just because the public page is still syncing player state.
- Next/previous buttons are less likely to be incorrectly disabled when playlist count has not arrived yet.

## Dirty Worktree At Handoff

The worktree is intentionally dirty. Do not revert blindly.

Main modified groups:

- Appliance docs:
  - `docs/README.md`
  - `docs/appliance/README.md`
  - `docs/appliance/todo.md`
  - `docs/appliance/refactor.md`
  - `docs/appliance/nas-media.md`
  - old pointer files: `docs/appliance-todo.md`, `docs/appliance-refactor.md`, `docs/nas-media.md`
- Public UI refresh files under `kmfrontend/src/frontend/components/public/`
- Playlist and kara detail UX files under `kmfrontend/src/frontend/components/karas/`
- Shared controls: `kmfrontend/src/frontend/components/PlayerControls.tsx`
- Locales: `kmfrontend/src/locales/en.json`, `kmfrontend/src/locales/zh-Hans.json`
- Playback fixes: `src/components/mpv/lavfiGenerator.ts`, `src/components/mpv/mpv.ts`, `src/services/karaEngine.ts`, `src/services/playlist.ts`
- Defaults/dev helper:
  - `src/utils/defaultSettings.ts`
  - `tools/devctl/src/main.rs`

Run this before editing:

```sh
git status --short
```

## Validation Already Run Recently

These passed during the latest work session:

```sh
export PATH=/home/x/code/node/bin:$PATH
corepack yarn buildkmfrontend
corepack yarn dev:test
corepack yarn build
cargo check --manifest-path tools/devctl/Cargo.toml
cargo check --manifest-path tools/runtime/Cargo.toml
corepack yarn dev:health http://localhost:1337/health
```

Expected warnings:

- Node version warning: local Node is `v24.11.0`, expected `>=24.14.0`.
- Vite/Rolldown chunk-size warnings.
- `react-audio-player` direct eval warning.
- `postgres` / `pg_ctl` binary warnings may show while the configured PostgreSQL cluster is still online and health passes.

## Useful Commands

Always export PATH first:

```sh
export PATH=/home/x/code/node/bin:$PATH
```

Common:

```sh
corepack yarn dev:status
corepack yarn dev:health http://localhost:1337/health
corepack yarn dev:logs 200
corepack yarn dev:restart
corepack yarn buildkmfrontend
corepack yarn dev:test
corepack yarn build
```

NAS:

```sh
corepack yarn dev:nas
```

Rust runtime smoke tests:

```sh
corepack yarn dev:runtime-check
corepack yarn dev:runtime-mpv-check
corepack yarn dev:runtime-mpv-loadplan-check
corepack yarn dev:runtime-mpv-recover-check
```

## Known User-Facing Issues To Recheck

1. Public homepage controls:
   - Reopen `http://localhost:1337/public`.
   - Verify player controls are visible after hard refresh.

2. Current playlist controls:
   - Reopen `http://localhost:1337/public/playlist/91998538-6a31-450a-897f-80c6af3a022d`.
   - Try play/pause/next.
   - If it still "does nothing", immediately inspect:

```sh
tail -260 app/run/devctl-headless.log
tail -260 app/logs/karaokemugen-2026-05-16.log
```

3. No microphone audio:
   - This is expected in app runtime. The app does not capture/mix mic audio.
   - Check hardware direct monitoring, mixer, USB sound card, PipeWire/Pulse routing if needed.

4. Missing previews:
   - Preview `ENOENT` errors are visible in logs.
   - They may affect thumbnails, not necessarily song playback.

## Recommended Next Work

详细的阶段性计划见 [plan.md](plan.md)。以下是摘要：

### Immediate

1. Have the user hard-refresh public pages and confirm public controls are visible.
2. If buttons still feel unresponsive, add temporary frontend command logging or inspect browser console/socket responses.
3. Verify queue state directly: current playlist, current song, `flag_playing`, and `karacount`.
4. Decide whether to commit the current UI/playback/doc batch before larger refactors.

## Final Reminder For Next AI

This is a personal workstation project, not a clean public repo. Prefer small, reversible changes. Do not reorganize source folders broadly unless the user explicitly asks for a larger refactor. When in doubt, preserve local behavior and keep the appliance running.
