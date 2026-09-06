# Project

JavaScript emulator of the Radio-86RK (Intel 8080) computer. SvelteKit
+ TypeScript; also shipped as a `<radio86-emulator>` web component and
the `rk86` npm package (terminal emulator).

`docs/` is served by GitHub Pages at rk86.ru: `docs/` (root) = the
production build, `docs/beta/` = experimental slot (built with
`BASE_PATH=/beta`), `docs/monitor/` = separately maintained.

The previous vanilla JS implementation lived under `classic/` and was
removed from `master`; the last commit containing it is the tip of the
`classic` branch. The `/classic/` URL is preserved as an HTML redirect
to the root via `src/routes/classic/+page.svelte`.

## Toolchain

`bun` as runtime/test-runner and `just` as the task runner. Single root
[`Justfile`](Justfile).

Install (macOS/Linux):

```bash
curl -fsSL https://bun.sh/install | bash    # bun
brew install just                            # just (or: cargo install just)
```

See [bun.sh/docs/installation](https://bun.sh/docs/installation) and
[just.systems/man/en/packages.html](https://just.systems/man/en/packages.html)
for other platforms.

### Commands

- `just` — `just test-js build` (default)
- `just install` — `bun install`
- `bun run dev` — dev server (http://localhost:5173)
- `bun run build` — static build to `build/`
- `bun run check` — svelte-check type checking
- `just test` — unit tests + i8080 CPU tests
- `just test-ci` — full CI suite
- `just release` / `just release-root` — production deploy to `docs/`
  (no BASE_PATH)
- `just release-beta` — experimental deploy with base path to
  `docs/beta/`
- `just release-experimental` — same as `release-beta`
- `just serve [port]` — static HTTP server from `docs/`
- `just clean` — `git clean -fdx -e .claude`
- `just terminal-run [args]` — run terminal emulator locally
  (executes `src/lib/terminal/rk86_terminal.ts` under bun directly;
  does not use the regenerable `rk86.ts` bundle intermediate,
  which is produced only by `just terminal-build` when publishing)
- `just terminal-build` — bundle terminal to `packages/rk86/rk86.js`
- `just terminal-publish` — build + bump + npm publish
- `just build-asm` — assemble i8080 programs in `info/asm/`

## Structure

```
src/lib/core/       — emulator core (CPU, memory, screen, keyboard,
                      sound interface, runner, disassembler)
src/lib/web/        — browser layer (boot, canvas renderer, Web Audio
                      sound, tape with save-to-file)
src/lib/terminal/   — terminal emulator (Node.js/Bun, Unicode screen
                      rendering; --headless, --turbo, --timeout,
                      --exit-halt, --exit-address, --screen,
                      --memory[-from|-to], --snapshot,
                      --input "Key…[,*ms…]", -g <addr> (CPU jump),
                      -G <addr> (route through monitor G command)
                      for e2e testing; --online uploads file to
                      UPLOAD_SERVER and opens rk86.ru in browser)
src/lib/component/  — standalone <radio86-emulator> web component
src/routes/         — SvelteKit pages and UI components
src/routes/state.svelte.ts — reactive bridge between imperative
                             engine and Svelte
src/routes/catalog/ — program catalog page
static/             — static assets (assembler HTML, icons, ROM/
                      program files, catalog data)
tests/              — bun unit tests
tests/cpu/          — auto-generated table-driven CPU test data
                      (one file per instruction)
tests/generate_cpu_data.ts — generates tests/cpu/*_data.ts from
                             the CPU implementation
tests/rk86_terminal_e2e.test.ts — e2e tests that spawn the terminal
                                  and assert on screen/memory/
                                  snapshot dumps vs goldens in
                                  tests/data/
tests/data/         — golden snapshots (canonical JSON.stringify(…,
                      null, 4); tests/data/*.json is in
                      .prettierignore)
test/               — i8080 exerciser harness (not bun:test)
tools/              — build scripts (catalog generator, version)
packages/rk86/      — published npm package (terminal CLI)
svelte.config.js    — runs tools/build_catalog.ts + bundles the
                      web-component on every build/dev
vite.config.ts      — Tailwind + sveltekit() plugin; dev middleware
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
  (root)            — production build output
  beta/             — experimental build output (BASE_PATH=/beta)
  monitor/          — hand-maintained monitor viewer
  classic/          — generated redirect to / (from /classic route)
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

- `.svelte-kit/`, `build/` — vite/SvelteKit output
- `rk86.ts` — terminal bundle intermediate (from `just terminal-build`)
- `src/lib/tape_catalog.ts` — file list from `static/files/`
- `src/lib/catalog_data.ts` — catalog metadata from
  `static/catalog/*/info.md`
- `src/lib/rk86_version.ts` — build timestamp
- `static/radio86-emulator.js` — bundled web component
- `tests/cpu/*_data.ts` — CPU test tables (regenerate with
  `bun tests/generate_cpu_data.ts`)

The `src/lib/*` files are auto-generated via `svelte.config.js`
on every build/dev.

## Conventions

- Source of truth for programs: `static/files/` — every file must have
  `static/catalog/<name>/info.md`.
- All text in UI is in Russian.
- `info/` is the documentation directory.
- Hex-dump file format: text files starting with the shebang
  `#!rk86` (bytes `23 21 72 6B 38 36`) are parsed as hex dumps —
  4-char offset prefix (informational), then space-separated hex
  bytes; `#`-comments are ignored. Optional tags `!name=…`,
  `!start=…`, `!entry=…` (in any comment line) override the file
  name (drives extension-based parser dispatch), the load address
  for raw `.bin`, and the entry point. Implemented in
  `src/lib/core/rk86_file_parser.ts`. Documented in `info/HELP.md`.
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
  via `src/lib/web/freeze_store.ts` — not localStorage,
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
- Deterministic execution: `runner.execute()` is a wall-clock-paced
  «fair»-scheduler — each `setTimeout(0)` quantum runs CPU for at
  most `dt_ms × (FREQ / 1000)` ticks (i.e. real-time pacing at
  1.78 МГц) capped by a 5 ms main-thread budget. Turbo skips the
  wall-clock cap and just runs as many instructions as fit in a
  50 ms quantum, yielding with `setTimeout(0)` between them.
  Regardless of mode, `on_batch_complete` and `tick_cursor` fire on
  strict `BATCH_TICKS`-aligned CPU-tick boundaries (`BATCH_TICKS =
  FREQ / 100` ≈ 10 ms эмуляции) — что и держит терминальное
  `--input`-вмешательство (которое планируется по `at_ticks`)
  bit-identical между прогонами и между turbo-on/turbo-off.
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
  `BASE_PATH=/beta bun run build`).
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
- Hardware profiles (`src/lib/core/rk86_profile.ts`): `MachineProfile`
  = `{name, ram_end, rom_start, boot_address, keyboard_ppi_base,
  crtc_base, dma_base, peripheral_window}`. `RK86_CLASSIC` (ram_end
  7FFF, rom_start E000, boot F800, PPI 8000, CRTC C000, DMA E000,
  window 0x2000) is built-in, frozen, non-deletable. `Memory` takes the
  profile in its constructor (`set_profile()` recomputes `ppi_port_a/b/
  c`, `ppi_control`, `crtc_parameter/command`, `dma_ch0_address/count`,
  `dma_mode` and the decode masks `ppi_mask`/`crtc_mask`/`dma_mask`/
  `peripheral_window_mask` without touching `buf`). Masks =
  `peripheralWindowMask(window) | low-bits` (classic: 0xE003/0xE001/
  0xE00F); `peripheral_window` ∈ `PERIPHERAL_WINDOWS` (0x2000, 0x1000,
  0x800, 0x400, 0x200, 0x100) and bases must be aligned to it.
  Profiles/snapshots without `peripheral_window` normalize to 0x2000.
  Reset vector is `memory.profile.boot_address` everywhere (runner,
  boot.ts, component). RAM write rule is lenient:
  CPU writes land for `addr < rom_start`; `ram_end` drives only
  `zero_ram`, MemoryMap labels and validation. Web persistence in
  `src/lib/web/profile_store.ts`: `rk86:profiles` (`{version: 1,
  profiles}` custom only) + `rk86:profile:active` (name; absent =
  classic). Editor: `ProfileEditor.svelte`, toolbar button /
  `Cmd/Ctrl+K, M`; "Применить" calls `memory.set_profile()` then
  `machine.restart()`. Terminal and web component always use
  `RK86_CLASSIC`. Snapshot format "2" carries `profile` (hex-string
  addresses via `exportProfile`); `rk86_snapshot_restore` applies it
  (`memory.set_profile`) before `memory.import`, treats format-1
  snapshots (no `profile`) as classic, and ignores an invalid profile
  with a `machine.log` message. `memory.on_profile_changed` drives
  `ui.profileName`; the localStorage active profile is not touched by
  snapshot restore.
- i8275 F-bit (SCN4 byte 4 bit 6) captured by `memory.ts` → set on
  `screen.transparent_attr`. `renderer.ts` and `TerminalRenderer.update()`
  branch between visible (1 src byte/cell, FA blanks the cell) and
  transparent (FA byte + next byte → 16-char FIFO, FA cell shows
  the FIFO byte) paths. F1/F2 stops DMA. Latched FA state (color +
  blink + R + U) persists across rows, resets only at frame start (VRTC).
  Color uses 86rk's inverted palette — bit set DISABLES the wired
  colour; default attr (no bits) is white, all bits is black.
- i8275 SCN3 captured by `memory.ts`: low nibble → `screen.char_height`
  (scan lines per row, default 10 from monitor's `0x79`), high nibble
  → `screen.underline_scanline` (0-based LTEN line, default 7).
  `renderer.ts` reads both for canvas pitch and underline-bar position;
  cache invalidates on change. РАЗМЕР gauge shows `WxH:char_height`.
- FA byte attributes are implemented as follows:
  - Colour (HGLT D0 + GPA0 D2 + GPA1 D3) via `attrToRgb`. One-cell offset
    in `mono`/`color1`/`color2` visible mode — cell N reads colour from
    cell N+1's FA when N+1 is FA.
  - Blink (D1) via wall-clock 320 ms sample. No offset.
  - Reverse (D4) — canvas `globalCompositeOperation = "difference"` over
    a colour-filled cell. **No offset** (RVV has no offset counterpart)
    and suppressed on FA cells (VSP blanks them).
  - Underline (D5) — `scale_y`-tall bar at `screen.underline_scanline`.
    No offset, suppressed on FA cells.
- Drag-n-drop on the canvas (`onDrop` in `+page.svelte`) auto-runs:
  load via `uploadFile`, then `setTimeout(runLoadedFile, 500)` to
  inject the monitor G-command. Load-only paths: toolbar upload
  button, catalog "Загрузить", `?load=` URL.

## Naming conventions

- don't use suffix "El", use "Element"
- don't use suffix "Btn", use "Button"
- don't use name "res", use "result"

## JavaScript conventions

- don't use "var", use "let" or "const"
