# Build Guide

petTaTo uses **electron-vite** (Vite-powered build for main, preload and the two
renderers) and **electron-builder** for installers.

## Build the app

```bash
npm run build
```

Outputs to `out/`:

```
out/
  main/index.js          compiled main process
  preload/index.js       compiled preload bridge
  renderer/
    pet/index.html       desktop overlay
    dashboard/index.html control panel
    assets/…             bundled JS/CSS
```

Run the built app:

```bash
npm start          # electron-vite preview
```

## How it fits together

- `electron.vite.config.ts` defines three build targets. The renderer has two
  HTML entry points (`pet`, `dashboard`) and uses a relative base (`./`) so it
  works both under `file://` (overlay) and over HTTP (web panel).
- Runtime dependencies (`express`, `sql.js`, `pngjs`) are kept external (not
  bundled) and shipped via `node_modules` inside the package.
- The sql.js WebAssembly file (`sql-wasm.wasm`) is copied to the app resources
  and located at runtime — no native compilation required.

## Assets

Sprite sheets, the house and icons are generated **from code**:

- automatically on first launch into `<userData>/generated_assets/`, and
- via `npm run gen:assets` for development / packaging (also writes
  `build/icon.png`).

## Type checking

```bash
npm run typecheck
```
