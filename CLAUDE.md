# Project

Two JavaScript emulators of the Radio-86RK (Intel 8080) computer,
maintained side-by-side in one repository:

- `classic/` — original vanilla JS/HTML implementation.
- `kit/` — newer SvelteKit + TypeScript implementation, also shipped
  as a `<radio86-emulator>` web component and the `rk86` npm package
  (terminal emulator).

`docs/` is served by GitHub Pages at rk86.ru: `docs/` (root) = kit
production, `docs/classic/` = classic, `docs/alpha/` and `docs/beta/`
= kit experimental slots (built with `BASE_PATH=/alpha` and `/beta`
respectively), `docs/monitor/` = separately maintained.

## Toolchain

Both versions use `bun` as runtime/test-runner and `just` as the task
runner. Root [`Justfile`](Justfile) composes both.

Install (macOS/Linux):

```bash
curl -fsSL https://bun.sh/install | bash    # bun
brew install just                            # just (or: cargo install just)
```

See [bun.sh/docs/installation](https://bun.sh/docs/installation) and
[just.systems/man/en/packages.html](https://just.systems/man/en/packages.html)
for other platforms.

### Root

- `just` — install + build + test (both versions)
- `just install` — `bun install` in `classic/` and `kit/`
- `just build` — builds both
- `just test` — tests both
- `just serve [port]` — static HTTP server from `docs/`
- `just clean` — `git clean -fdx -e .claude -e kit/.claude`

### classic/ (commands)

- `just` — tests + build
- `just test` — bun test (9 files, 53 tests)
- `just build` — regenerates `build/` (copy of `src/` + catalog + tape)
- `just release` — rsyncs `build/` into `../docs/classic/`
- `just watch` — bun-native fs.watch rebuilder
- `just clean` — `rm -rf build node_modules`

### kit/ (commands)

- `bun run dev` — dev server (http://localhost:5173)
- `bun run build` — static build to `kit/build/`
- `bun run check` — svelte-check type checking
- `just test` — unit tests + i8080 CPU tests
- `just test-ci` — full CI suite
- `just release` / `just release-root` — production deploy to
  `../docs/` (root, no BASE_PATH)
- `just release-alpha` / `just release-beta` — experimental deploy
  with base path to `../docs/alpha/` and `../docs/beta/`
- `just release-experimental` — both alpha and beta
- `just terminal-run [args]` — run terminal emulator locally
  (executes `src/lib/terminal/rk86_terminal.ts` under bun directly;
  does not use the regenerable `kit/rk86.ts` bundle intermediate,
  which is produced only by `just terminal-build` when publishing)
- `just terminal-build` — bundle terminal to `packages/rk86/rk86.js`
- `just terminal-publish` — build + bump + npm publish
- `just build-asm` — assemble i8080 programs in `../info/asm/`

## Structure

```
classic/
  src/            — vanilla JS sources (emulator + web UI)
  tests/          — bun:test (ESM); use (0, eval) indirect-eval to
                    load src files as globals since src uses var/fn
                    top-level declarations (no exports)
  tools/
    build.js          — tape catalog (+ dump_file helper)
    build-catalog.js  — HTML catalog via twig template
    watch.ts          — bun-native rebuilder (fs.watch + debounce)
    catalog.template  — twig template for the catalog page
  package.json    — "type": "module"; deps: twig only
  Justfile
kit/
  src/lib/core/     — emulator core (CPU, memory, screen, keyboard,
                      sound interface, runner, disassembler)
  src/lib/web/      — browser layer (boot, canvas renderer, Web Audio
                      sound, tape with save-to-file)
  src/lib/terminal/ — terminal emulator (Node.js/Bun, Unicode screen
                      rendering; --headless, --turbo, --timeout,
                      --exit-halt, --exit-address, --screen,
                      --memory[-from|-to], --snapshot,
                      --input "Key…[,*ms…]", -g <addr> (CPU jump),
                      -G <addr> (route through monitor G command)
                      for e2e testing; --online uploads file to
                      UPLOAD_SERVER and opens rk86.ru in browser)
  src/lib/component/— standalone <radio86-emulator> web component
  src/routes/       — SvelteKit pages and UI components
  src/routes/state.svelte.ts — reactive bridge between imperative
                               engine and Svelte
  src/routes/catalog/ — program catalog page
  static/           — static assets (assembler HTML, icons, ROM/
                      program files, catalog data)
  tests/            — bun unit tests
  tests/cpu/        — auto-generated table-driven CPU test data
                      (one file per instruction)
  tests/generate_cpu_data.ts — generates tests/cpu/*_data.ts from
                               the CPU implementation
  tests/rk86_terminal_e2e.test.ts — e2e tests that spawn the terminal
                                    and assert on screen/memory/
                                    snapshot dumps vs goldens in
                                    tests/data/
  tests/data/       — golden snapshots (canonical JSON.stringify(…,
                      null, 4); tests/data/*.json is in
                      .prettierignore)
  tools/            — build scripts (catalog generator, version)
  packages/rk86/    — published npm package (terminal CLI)
  svelte.config.js  — runs tools/build_catalog.ts + bundles the
                      web-component on every build/dev
  vite.config.ts    — Tailwind + sveltekit() plugin; dev middleware
                      staticIndexFallback rewrites /asm → /asm/
                      index.html (prod served by real webserver)
info/
  RK86.md           — full programmer's reference (memory map,
                      peripherals, monitor, video, keyboard);
                      Russian
  HELP.md           — tutorial-style emulator manual (loading,
                      file formats, snapshots, peripherals,
                      local development); Russian. Linked from
                      the toolbar "?" / GitHub Pages help page
  MIKROSHA.md       — Mikrosha notes
  SNAPSHOT.md       — JSON snapshot format
  asm/              — i8080 assembly examples
docs/
  (root)            — kit output (production)
  classic/          — classic output
  alpha/            — kit output (experimental, BASE_PATH=/alpha)
  beta/             — kit output (experimental, BASE_PATH=/beta)
  monitor/          — hand-maintained monitor viewer
loader/
  main.ts           — Deno Deploy single-file server for the rk86
                      --online flag. POST /load chunks the binary
                      into Deno KV (32KB Uint8Array values) with a
                      60s TTL, returns {id} (6 chars). GET /file/
                      <name>?<id> looks up by bare-query id and
                      serves application/octet-stream with permissive
                      CORS; <name> in the path is purely a hint for
                      rk86.ru's extension-based parser dispatch. TTL
                      handles cleanup; no explicit delete on GET.
                      Deployed manually via Deno Deploy² playground;
                      requires {"unstable":["kv"]} in deno.json or
                      the project's unstable-APIs toggle.
```

## Generated files (gitignored)

- `classic/build/` — recreated by `just build`
- `kit/.svelte-kit/`, `kit/build/` — vite/SvelteKit output
- `kit/rk86.ts` — terminal bundle intermediate (from
  `just terminal-build`)
- `kit/src/lib/tape_catalog.ts` — file list from `static/files/`
- `kit/src/lib/catalog_data.ts` — catalog metadata from
  `static/catalog/*/info.md`
- `kit/src/lib/rk86_version.ts` — build timestamp
- `kit/static/radio86-emulator.js` — bundled web component
- `kit/tests/cpu/*_data.ts` — CPU test tables (regenerate with
  `bun tests/generate_cpu_data.ts`)

The `kit/src/lib/*` files are auto-generated via `svelte.config.js`
on every build/dev.

## Conventions

### Shared

- Source of truth for programs: `kit/static/files/` — every file
  must have `kit/static/catalog/<name>/info.md`. Classic has its own
  parallel copy under `classic/src/files/` and `classic/src/catalog/`
  for the classic build pipeline; both kept in sync when adding
  programs.
- All text in UI is in Russian.
- `info/` is the shared documentation directory at repo root (not
  duplicated inside classic/ or kit/).
- Hex-dump file format: text files starting with the shebang
  `#!rk86` (bytes `23 21 72 6B 38 36`) are parsed as hex dumps —
  4-char offset prefix (informational), then space-separated hex
  bytes; `#`-comments are ignored. Optional tags `!name=…`,
  `!start=…`, `!entry=…` (in any comment line) override the file
  name (drives extension-based parser dispatch), the load address
  for raw `.bin`, and the entry point. Implemented in
  `kit/src/lib/core/rk86_file_parser.ts` and
  `classic/src/rk86_file_parser.js`. Documented in `info/HELP.md`.

### kit-specific

- Imports use `.js` extension in `.ts` files (SvelteKit/Vite
  requirement).
- `$lib` alias points to `src/lib/`.
- Debugger mode: combined view with 1:1 canvas (top-left),
  disassembler (right), breakpoint editor (bottom-left). Canvas
  click focuses keyboard input to emulator; clicking
  disassembler/breakpoint editor redirects input there. Canvas
  wrap shows a thin grey border, switches to green on hover/focus.
- Floating panels (visualizer, keyboard) are non-modal, draggable
  Svelte components.
- Disassembler is embedded-only (no standalone floating mode);
  there is no CLI/console.
- Debugger is a programmatic GUI debugger (`rk86_debugger.ts`),
  not a CLI. Public surface: `add`/`update`/`remove`/`toggleExecAt`,
  `step`/`stepOver`/`stepOut`/`runToCursor`/`go`, `attach`/`detach`,
  `subscribe(listener)`. Breakpoint shape: `{id, type:
  exec|read|write|opcode, address, length, count, hits, temp,
  active}`. `temp` bps are removed on hit (used by step-over /
  step-out / run-to-cursor). Persisted in `localStorage` under
  `rk86:debugger:breakpoints` (schema-versioned; `temp` and
  `hits` excluded).
- Tracer attaches only while the debugger panel is visible —
  zero perf cost otherwise. `+page.svelte#toggleDebugger`
  calls `dbg.attach()` / `dbg.detach()`. `attach()` sets
  `runner.tracer` (per-instruction before/after) and
  `memory.tracer` (per-access for read/write breakpoints).
- Memory tracer fires from `memory.read()`/`write()` only — NOT
  from `read_raw`/`write_raw`, so debugger panel edits and
  snapshot loads do not trip breakpoints. Per-access tracing
  catches every read/write of multi-byte instructions (e.g.
  `LHLD`, `PUSH`, `MVI M`); relying on `last_access_address`
  would only catch the last access of each instruction.
- Disassembler keyboard shortcuts (debugger-visible only): F5
  Go/Pause, F10 Step Over, F11 Step, Shift+F11 Step Out, F9
  toggle exec bp at cursor, Ctrl+F10 Run to cursor. Inside hex
  edit fields: Tab/Shift+Tab advance to next/prev byte, Enter
  commits, Esc cancels.
- Disassembler code+data row counts autosize via ResizeObserver
  (pane `clientHeight / line height`), with the regs row pinned
  in the middle by flexbox (`.disasm` flex column, panes
  `flex: 1 1 0`). Data view shows 16 bytes per row.
- Frozen states live in IndexedDB (`rk86` db, `freezes` store)
  via `kit/src/lib/web/freeze_store.ts` — not localStorage,
  because each freeze (snapshot JSON + PNG thumbnail) easily
  exceeds the 5 MB localStorage cap. Cap: 20 entries.
- Assembler is the standalone asm8 playground under `static/asm/`
  (drop-in of `asm8/docs/`). The toolbar "Ассемблер" button opens
  `{base}/asm/` in a new tab. Example `.asm` files live at
  `static/asm/examples/*.asm` (one fetch per file on playground
  load — no bundled JS strings). The playground's "run"/"download"
  builds an **`.rk` file** (header: big-endian `start`+`end`;
  trailer: `E6` + big-endian `rk86_check_sum`) — programs with
  non-zero `org` don't carry leading-zero padding.
- Playground → emulator handoff:
  `localStorage["asm8-handoff:<uuid>"]` holds `{ts, url}` JSON (url
  = data URL carrying the `.rk`); emulator reads via
  `?handoff=<uuid>`, deletes the key one-shot. Stale keys (>1 h) are
  swept at the next playground write. This avoids browser URL-
  length limits (Chrome 431) for large programs that `?run=data:…`
  can't fit.
- `?run=` / `?file=` / `?handoff=` autorun all route through
  `machine.runLoadedFile()` (monitor G-injection) — unified with the
  toolbar "Запустить программу" button, not `cpu.jump(entry)`
  (ALIAZ1-style keyboard-state bugs).
- `asm8080` npm package (which is asm8) is also used by the terminal
  to assemble `.asm` files at load time.
- UI state from engine callbacks flows through `state.svelte.ts`
  (reactive `$state` object). Two stores: `ui` (general
  engine-driven status) and `debuggerState` (mirror of
  `debugger.breaks` plus visibility flag).
- Machine methods (`reset`, `restart`, `pause`, `loadCatalogFile`,
  `runLoadedFile`, `uploadFile`) are assigned in `boot.ts`.
  `runLoadedFile` injects `G<addr>Enter` via `simulate_keyboard`
  rather than `cpu.jump` — the direct jump leaves the monitor mid-
  prompt-loop with inconsistent keyboard state that broke programs
  like ALIAZ1.
- Deterministic execution: `runner.execute()` takes
  `on_batch_complete` (fires at end of every `TICK_PER_MS`-tick
  batch) and `turbo` (runs 100 batches per macrotask, yields with
  `setTimeout(…, 0)`). The terminal's `--input` injection is
  scheduled in CPU ticks (not wall-clock ms), so golden-snapshot e2e
  tests are bit-identical across runs and turbo-on vs turbo-off.
- Cursor blink is CPU-tick-driven too (`screen.tick_cursor`, called
  from the runner) — wall-clock `setTimeout` would desync with
  turbo.
- `machine.log(...)` is the injectable logger: web/terminal/
  component builders set it to `console.log`; tests set it to
  `() => {}` to silence "установлен размер экрана…" noise. Core
  modules use `this.machine.log(...)`, never `console.log`.
- Keyboard shortcuts: `Cmd/Ctrl+K` then a letter key (`D` for
  debugger, `A` for assembler, etc.).
- Icon buttons in toolbar are non-focusable (`tabindex=-1`) to
  prevent accidental activation via Enter/Space.
- Dialogs blur active element on close to prevent focus returning to
  triggering button.
- `BASE_PATH` env var sets deployment base path (e.g.
  `BASE_PATH=/alpha bun run build`).
- URL auto-load: `?file=` / `?run=` (load + run) and `?load=` (load
  only) in `boot.ts`. Value can be a catalog name, absolute URL, or
  `data:[;name=<filename>];base64,<payload>` data URL. `name=` hint
  drives extension-based parser selection; defaults to `inline.bin`.
  URL values are `decodeURIComponent`-ed before decoding; URL-safe
  base64 (`-_`) is normalized to standard (`+/`).
- URL `?monitor=<filename>` selects which monitor ROM to load at
  boot (default `mon32.bin`). Two ROMs ship in `static/files/`:
  - `mon32.bin` — vanilla, byte 0x2DC = `0x93` (i8275 SCN4 transparent
    field-attribute mode). Default. Right for programs authored with
    `[FA][char][FA][char]…` layout (e.g. `tree2025.rk`).
  - `mon32-color.bin` — patched, byte 0x2DC = `0xD3` (visible mode).
    Alternate for the colorized RK86 corpus (dizzy75, squash,
    boulder, rise, piton). Web: `?monitor=mon32-color.bin`.
    Terminal: `-m static/files/mon32-color.bin`.
- i8275 F-bit (SCN4 byte 4 bit 6) captured by `memory.ts` → set on
  `screen.transparent_attr`. `renderer.ts` and `TerminalRenderer.update()`
  branch between visible (1 src byte/cell, FA blanks the cell) and
  transparent (FA byte + next byte → 16-char FIFO, FA cell shows
  the FIFO byte) paths. F1/F2 stops DMA. Latched FA state (color +
  blink) persists across rows, resets only at frame start (VRTC).
  Color uses 86rk's inverted palette — bit set DISABLES the wired
  colour; default attr (no bits) is white, all bits is black.
- Drag-n-drop on the canvas (`onDrop` in `+page.svelte`) auto-runs:
  load via `uploadFile`, then `setTimeout(runLoadedFile, 500)` to
  inject the monitor G-command. Load-only paths: toolbar upload
  button, catalog "Загрузить", `?load=` URL.

### classic-specific

- ESM (`"type": "module"`). Tests use `bun:test`.
- Source files in `classic/src/*.js` define globals (no exports).
  Tests load them via `(0, eval)(fs.readFileSync(..., 'utf-8'))` —
  indirect eval runs in global scope so `var X = …` declarations
  become `globalThis.X` properties readable from strict-mode
  modules.
- `classic/tools/build-catalog.js` uses `twig` (not `swig`) and
  reads its template via
  `new URL('./catalog.template', import.meta.url)` rather than
  `__dirname + path.join`.
- `fs.readdirSync(...).sort()` is mandatory in build tools to keep
  the output deterministic across runtimes.

## Naming conventions

- don't use suffix "El", use "Element"
- don't use suffix "Btn", use "Button"
- don't use name "res", use "result"

## JavaScript conventions

- don't use "var", use "let" or "const"
