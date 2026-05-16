# OpenKTV Local Docs

This directory keeps local appliance notes separate from upstream Karaoke Mugen source layout.

## Start Here

- `appliance/README.md` - local Ubuntu/NAS appliance overview and current work map.
- `appliance/handoff.md` - current handoff for another AI/developer.
- `appliance/todo.md` - living TODO for the appliance refactor.
- `appliance/refactor.md` - runtime refactor notes and development commands.
- `appliance/nas-media.md` - NAS mount and media folder convention.
- `appliance/plan.md` - phased execution plan from current state.

## Project Folder Map

- `src/` - Electron/Node backend, player services, runtime compatibility layer.
- `kmfrontend/` - React frontend for public, admin, and system pages.
- `tools/` - local helper tools, including Rust `devctl` and experimental runtime.
- `app/` - local private runtime data: config, DB files, logs, media mounts, generated previews.
- `assets/` - bundled upstream/static assets and submodules.
- `dist/`, `kmfrontend/dist/` - generated build output.
- `node_modules/`, `kmfrontend/node_modules/` - dependency installs.

`/home/x/code/karaokemugen-app` is a symlink to `/home/x/code/openktv`, so both paths point to the same checkout.
