# Changelog

## 2026-04-20

### Assembler

- Replaced the in-page `static/i8080asm.html` iframe assembler with asm8's
  standalone playground at `static/asm/`. The toolbar "Ассемблер" button now
  opens `{base}/asm/` in a new tab. Dropped the `window.parent.machine`
  cross-iframe contract and the `window.machine` / `UI.toggle_assembler`
  exposures that supported it.
- Bumped `asm8080` dep to `^1.0.21` (same package as `asm8`).
- Playground "run"/"download" produces `.rk` files (not `.bin`): 4-byte big-
  endian header (`start`, `end`) + compact payload covering `min(start)..
  max(end)` (gaps zero-filled) + 3-byte trailer (`0xE6`, `rk86_check_sum`
  big-endian). Programs assembled with `org 3000h` no longer carry 12 KB of
  leading zeros.
- Example `.asm` files live under `static/asm/examples/*.asm` and are
  fetched by the playground at load time (one file per `const`, all 11
  fetches kicked off in parallel, awaited per-example on use). Edit a file
  and reload — no rebuild of `playground.js` needed.
- New `?handoff=<uuid>` URL param on the emulator: data URLs in `?run=`
  overflow browser URL limits (~8 KB, Chrome returns 431) for larger
  programs. The playground writes the `.rk` as JSON `{ts, url}` to
  `localStorage["asm8-handoff:<uuid>"]`, opens the emulator with that id,
  and the emulator reads + deletes the key one-shot. Stale keys (>1 h) are
  swept at the next write.
- `?run=` / `?file=` / `?handoff=` autorun now routes through
  `machine.runLoadedFile()` (monitor G-injection), unified with the toolbar
  "Запустить программу" button. Fixes ALIAZ1-style keyboard-state bugs that
  `cpu.jump(entry)` caused.
- Vite dev middleware (in `vite.config.ts`) rewrites `/asm/` and `/asm` to
  `/asm/index.html`; in production the static adapter's output is served
  natively by the webserver and this is a no-op.

### Naming / style conventions (CLAUDE.md)

- `El` suffix → `Element`, `Btn` → `Button`, `res` → `result`; prefer
  `let`/`const` over `var`. Applied throughout `static/asm/playground.js`
  after the asm8 drop-in.

### Terminal emulator

- `--snapshot <файл>` — save the full JSON state snapshot on exit (same format
  as the web emulator, round-trips through `rk86_snapshot_restore`).
- `--input` now accepts `*N` pause tokens between keys, e.g.
  `"KeyD,Enter,*500,KeyG,Enter"` inserts a 500 ms pause.
- `--turbo` — run the emulator without the real-time throttle. E2e tests with
  clear exit conditions (HLT / exit-address) finish ~100× faster while
  producing bit-identical snapshots to non-turbo runs.
- `-G <адрес>` — start a loaded program via the monitor's `G` command
  (keyboard injection) instead of `cpu.jump`. Complement to `-g` (direct
  jump) when the program expects a fresh monitor prompt.

### Determinism

- `--input` key injection is now scheduled by **CPU ticks** rather than
  wall-clock `setTimeout`. Every key event fires at a fixed emulated tick
  regardless of host load, so `--snapshot` output is byte-stable across runs
  and CI environments.
- Cursor blink (`screen.cursor_state`) is CPU-tick-driven (was wall-clock
  `setTimeout`). At real-time speed it still blinks every ~0.5 s wall; under
  turbo / CPU starvation it stays in sync with emulated time.
- `armed` option removed from `runner.execute()` — it was guarding the
  terminate-address check during monitor boot, but stock mon32 never executes
  HLT and never reaches `0xFFFE` during its init path.

### Web UI

- "Запустить программу" (Run) button now injects `G<addr><Enter>` through the
  monitor instead of `cpu.jump(entry)`. Fixes keyboard-state inconsistencies
  in programs that rely on the monitor being at a clean prompt (e.g.
  ALIAZ1).

### Engine

- `Machine.log: (...args: unknown[]) => void` — injectable logger replacing
  hard-coded `console.log` in `Screen`, `Runner`, `Debugger`. Silences
  "установлен размер экрана…" spam in tests; web/terminal/component builders
  set it to `console.log`.
- `runner.execute()` gained `on_batch_complete?: () => void` (fires at the
  end of each `TICK_PER_MS`-tick batch, ~10 ms of emulated time) and
  `turbo?: boolean`. Both are used by the terminal to drive deterministic
  tick-scheduled input and fast e2e tests.

### Tests

- New golden tests in `tests/rk86_terminal_e2e.test.ts` for the D-dump /
  G-exit flow and the M-command / HLT flow — compare the full JSON snapshot
  **and** the screen dump against committed goldens in `tests/data/`.
- Diff helper reports mismatches as `path/to/golden.json:LINE` with
  `expected:`/`actual:` pairs (clickable in modern terminals / IDEs). Both
  sides are re-serialised via `JSON.parse → JSON.stringify(…, null, 4)` so
  formatter-inlined arrays in the committed golden can't misalign the diff.
- `tests/data/*.json` added to `.prettierignore` so committed goldens stay
  in the canonical form the diff's line numbers refer to.
- Full suite: 166 tests pass; e2e file ~8.5 s (was ~15 s).

## 2026-04-18

### Terminal emulator: headless mode + e2e testing

Added a headless mode to `src/lib/terminal/rk86_terminal.ts` so the emulator can
be driven and inspected by automated tests without a TTY.

New CLI flags:

- `--headless` — suppress all screen rendering and stdin setup (no ANSI output,
  no raw-mode keyboard)
- `--timeout <sec>` — exit after N seconds
- `--memory <file>` — on exit, dump a byte range of emulator memory to a
  binary file
- `--memory-from <addr>` — start of the dump range (default `0x0000`)
- `--memory-to <addr>` — end of the dump range, inclusive (default `0xFFFF`)
- `--screen <file>` — on exit, save the 78×30 screen as a text file (30 lines,
  `\r\n` terminators). Bytes `\0`, `\t`, `\n`, `\r` are replaced with `.` to
  avoid misdisplay; other `<0x20` bytes render as RK-86 pseudo-graphics
- `--input <seq>` — comma-separated list of WebKit key codes (e.g.
  `KeyD,Digit0,Comma,KeyF,KeyF,Enter`) injected one at a time after the
  emulator settles (same mechanism as snapshot keyboard injection)

All exit paths (`--exit-halt`, `--exit-address`, `--timeout`, `SIGINT`) funnel
through a single `doExit()` that flushes the screen/memory files before
`process.exit`.

### Tests

Added `tests/rk86_terminal_e2e.test.ts` — 4 e2e tests that spawn the terminal
binary in `--headless` mode and assert on the resulting `--screen` / `--memory`
files:

- timeout + screen dump format (31 lines × 78 cols, contains `РАДИО-86РК`)
- memory dump byte-exact range (monitor ROM at `F800` starts with `C3`)
- monitor `D 0,FF` command produces a hex grid on screen
- monitor `M` writes HLT at `0000`, `G 0` runs, `--exit-halt` fires within 8s

Full suite: 164 tests pass.

### Documentation

- `packages/rk86/README.md` — expanded invocation examples, full options list,
  new "Безголовый режим (headless) и автотесты" section with two worked
  examples (monitor `D` dump and `M`/`G` write-HLT-and-run)
- `CLAUDE.md` — terminal emulator line mentions headless-mode flags;
  `tests/rk86_terminal_e2e.test.ts` added to the test inventory
