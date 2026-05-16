# OpenKTV Appliance Runtime Refactor

This branch incrementally moves the local OpenKTV fork of Karaoke Mugen toward a low-latency Ubuntu living-room appliance architecture.

## Baseline

- Branch: `appliance/refactor-runtime`
- Target platform: Ubuntu living-room machine
- Microphone path: hardware direct monitoring, outside Node/Electron
- Existing public WebSocket command names remain compatible
- Baseline checks after dependency install:
  - `yarn typecheck`: passing
  - `yarn test:unit`: passing

Dependency install note: `register-scheme` reports a Yarn build warning in this environment, but `yarn install --immutable` completes successfully.

## Implemented In This Slice

- Runtime contracts for commands, events, playback commands, play plans, and player snapshots.
- Priority command bus with request ids, timeouts, deduplication for in-flight request ids, and command ack/failure events.
- High-priority playback command routing inside the existing player WebSocket controller.
- PlayerSnapshot projection emitted as `playerSnapshot` while preserving the legacy `playerStatus` event.
- Resolved PlayPlan creation for songs and playlist medias after existing path/subtitle resolution.
- Pure playback runtime state machine for future mpv crash recovery and runtime supervision.
- `/health` endpoint for systemd/appliance probes.
- Rust `tools/devctl` helper for deployment diagnostics, local PostgreSQL setup, builds, tests, health checks, and dev startup.
- Chinese appliance default: `App.Language` now defaults to `zh-Hans`, the system preferences page exposes an application language selector, and the frontend registers the existing Simplified Chinese locale.
- Rust diagnostic helpers for appliance snapshots and latest-log inspection.
- Local project name is `openktv`; the compatibility layer still preserves upstream Karaoke Mugen WebSocket/API behavior.
- NAS media plan: mount `smb://192.168.0.109/nas_hdd/` to a local filesystem path and point repository media folders at that mount, so downloads and playback both use the NAS-backed files.
- Rust `openktv-runtime` JSONL process skeleton for Phase 3 playback runtime extraction. It can start, ack playback commands, maintain a small runtime snapshot, and gives the TypeScript compatibility layer a stable IPC bridge before real mpv ownership moves over.
- Rust runtime `loadPlan` is smoke-tested with a generated local WAV file through real mpv IPC. A disabled-by-default `OPENKTV_RUST_PLAYBACK_SHADOW=1` path can mirror safe legacy player commands to the Rust runtime for future gray testing.

## Developer CLI

```sh
yarn dev:doctor
yarn dev:setup-db
yarn dev:build
yarn dev:test
yarn dev:runtime
yarn dev:runtime-check
yarn dev:runtime-mpv-check
yarn dev:runtime-mpv-loadplan-check
yarn dev:health
yarn dev:snapshot
yarn dev:logs
yarn dev:nas
yarn dev:start-headless
yarn dev:frontend
```

`yarn dev:setup-db` creates a local PostgreSQL database/user and writes `app/config.yml`, which is ignored by git because this checkout is portable. The CLI is implemented in Rust with no third-party crate dependencies so it can remain a stable appliance/debugging entrypoint outside the TypeScript runtime.

`yarn dev:snapshot` prints branch/revision, key tool versions, PostgreSQL cluster state, relevant local processes, `/health`, and the newest app log path. `yarn dev:logs [lines]` tails the newest file in `app/logs`.

`yarn dev:runtime` starts the Rust playback runtime JSONL process on stdio. `yarn dev:runtime-check` compiles it and performs a `runtimeReady` + `ping` smoke test. `yarn dev:runtime-mpv-check` starts the runtime in mpv backend mode with null audio/video output and verifies a real mpv IPC command acknowledgement. `yarn dev:runtime-mpv-loadplan-check` generates a tiny local WAV, submits it as a `PlayPlan`, then verifies `loadPlan/play/pause/stop` through real mpv IPC.

`yarn dev:nas` checks the Feiniu NAS media convention (`smb://192.168.0.109/nas_hdd/` mounted at `app/media/nas_hdd`) and prints whether the local mount path is actually mounted and writable.

## Next Execution Steps

See `docs/appliance-todo.md` for the living TODO list with completed and pending work.

1. Move PlayPlan creation earlier, before playback, so the current song and next song can be precomputed from the queue.
2. Replace direct `Players` calls in player services with the `RustPlaybackRuntimeClient` behind a feature flag after shadow mode records enough successful command mirrors.
3. Split `playerEnding()` into a pure decision function and side-effect subscribers.
4. Add fake mpv integration tests for ack timeout, crash, recover, and media-ended behavior.
5. Add Ubuntu appliance service files and a local diagnostics page once the runtime adapter owns mpv lifecycle.
