# OpenKTV Appliance Notes

These notes are for the local living-room OpenKTV appliance fork. They are intentionally local-first and may mention private paths, NAS mounts, and workstation details.

## Current Files

- `handoff.md` - current handoff for another AI/developer.
- `todo.md` - progress, completed work, and next execution steps.
- `refactor.md` - architecture/refactor notes for playback runtime extraction.
- `nas-media.md` - Feiniu NAS media source, mount path, and expected media layout.

## Operating Rules

- Use `/home/x/code/openktv` as the canonical project path.
- Treat `/home/x/code/karaokemugen-app` as a compatibility symlink only.
- Keep application config pointed at local filesystem paths, not raw `smb://` URLs.
- Keep microphone audio outside the app runtime; use hardware/direct monitoring.
- Keep mpv as the playback engine while the Rust runtime is still being introduced.

## Common Commands

```sh
export PATH=/home/x/code/node/bin:$PATH
corepack yarn dev:status
corepack yarn dev:health http://localhost:1337/health
corepack yarn dev:restart
corepack yarn dev:test
corepack yarn build
```

For NAS checks:

```sh
export PATH=/home/x/code/node/bin:$PATH
corepack yarn dev:nas
```
