# Troubleshooting

## The pet doesn't appear

- Check the tray icon exists → *Open Dashboard* to confirm the app is running.
- On **Linux/Wayland**, Electron renders the transparent overlay via XWayland.
  If transparency fails, try launching with `--ozone-platform=x11`:
  ```bash
  ELECTRON_OZONE_PLATFORM_HINT=x11 npm start
  ```
- Some compositors don't honour always-on-top for override-redirect windows.
  Toggle **Always on top** off/on in *Appearance*.

## I can't click the pet / the pet blocks my clicks

- The overlay is click-through except over the pet. If clicks aren't reaching the
  pet, disable **Click-through mode** in *Appearance*.
- If the whole screen seems blocked, enable **Click-through mode**, then drag the
  pet — interaction is restored on hover.

## Control panel won't load at 127.0.0.1:3577

- Another app may use the port. Change `system.apiPort` in
  `config/config.json` and restart, then open the new port.
- The API is **loopback-only** by design; it is not reachable from other
  machines.

## Stats look wrong after the app was closed for a long time

- That's offline progression. Decay is damped past ~12 h, so a pet left for days
  is hungry/lonely but recovers quickly once you care for it.

## Reset everything

Delete the data directory (back it up first):

- Linux: `~/.config/petTaTo/`
- Windows: `%APPDATA%/petTaTo/`
- macOS: `~/Library/Application Support/petTaTo/`

## Build / packaging issues

- `sql-wasm.wasm not found`: ensure `node_modules/sql.js/dist/sql-wasm.wasm`
  exists (`npm install`) — it's copied into the package via `extraResources`.
- Linux `.rpm` build fails: install `rpmbuild`. `.deb` needs `dpkg`/`fakeroot`.
- Native modules: petTaTo intentionally uses **no** native addons (SQLite is
  WebAssembly), so no `node-gyp`/Python build is required.

## Logs

- In-app: dashboard → **Developer** → Logs.
- On disk: `<userData>/logs/pettato.log`.
