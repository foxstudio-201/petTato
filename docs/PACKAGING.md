# Packaging Guide

Installers are produced by **electron-builder** using `electron-builder.yml`.
Output goes to `dist/`.

## Prerequisites

```bash
npm run gen:assets     # ensures build/icon.png exists
npm run build          # compile into out/
```

(The `dist*` scripts run `build` for you.)

## Commands

```bash
npm run dist:linux     # AppImage + .deb + .rpm
npm run dist:win       # NSIS .exe + .msi
npm run dist:mac       # .dmg
npm run dist           # default targets for the current OS
npm run pack:dir       # unpacked app (fast smoke test, no installer)
```

## Targets

| OS | Targets |
|---|---|
| Windows 10/11 | `nsis` (.exe), `msi` |
| macOS 13+ | `dmg` (also produces the `.app` bundle) |
| Linux (GNOME/KDE/XFCE/Cinnamon, X11/Wayland) | `AppImage`, `deb`, `rpm` |

## Notes

- **Cross-compiling** Windows/macOS installers from Linux is limited; build each
  OS on its own platform (or CI) for signed, native installers.
- `sql-wasm.wasm` is declared in `extraResources` + `asarUnpack` so SQLite works
  from the packaged app.
- Linux `.rpm` requires `rpmbuild`; `.deb` requires `dpkg`/`fakeroot`. AppImage
  needs no extra tooling.
- Code signing (Windows/macOS) is left unconfigured; add certificates in
  `electron-builder.yml` for distribution.
