# Changelog

## 2026-05-09

### VG75: специальные управляющие символы 0xF0..0xFF (End of Row / End of Frame)

В микросхеме `i8275` (К580ВГ75) старший hex-блок `0xF0..0xFF`
зарезервирован под **специальные управляющие коды (Special Control
Characters)**. Эти байты не рисуются как глифы — VG75 их
интерпретирует как команды управления выводом:

- `0xF0..0xF7` — End of Row: оборвать текущую строку. VG75 не рисует
  ни байт-команду, ни оставшиеся столбцы строки. Подварианты
  отличаются атрибутами и наличием Stop-DMA.
- `0xF8..0xFF` — End of Frame / End of Screen: оборвать текущую
  строку **и все последующие**. Применяется для динамической
  обрезки кадра.

В РК86 это широко используется для аккуратного обрезания строки
до меньшей ширины, чем запрограммированные 78 столбцов VG75.
Программа squash by Дмитрий Иванов (2024), например, ставит `0xF1`
ровно на col 68 каждой строки splash-экрана — на реальном железе
это даёт чистую границу видимой области шириной 68 столбцов
(остальные 10 столбцов обрезаются самим VG75 ещё до выхода
сигнала на ТВ).

Наши renderer'ы — браузерный canvas (`kit/src/lib/web/renderer.ts`),
терминальный `dumpScreen` (`kit/src/lib/terminal/rk86_terminal.ts`)
и canvas `classic/` (`classic/src/rk86_screen.js`) — раньше читали
байты из видеопамяти напрямую и прогоняли их через декодер шрифтов.
Байт `0xF1` после strip-bit-7 (`& 0x7F`) превращался в код `0x71`,
а в charROM РК86 на этой позиции стоит «Я». Из-за этого в squash
каждая строка splash-экрана получала вертикальную колонку из «Я»
на col 68 — то, что на реальном железе и в Emu80 не отображается.

Теперь при встрече байта `0xF0..0xFF` рендер:

1. Не рисует глиф для самого байта (выводится пустая клетка).
2. Помечает текущую строку как «оборванную» — все последующие
   столбцы этой строки тоже выводятся пустыми.
3. Если байт в диапазоне `0xF8..0xFF` (End of Frame), помечает
   также весь кадр как «оборванный» — все последующие строки
   выводятся пустыми.

В кэшируемом canvas-render'е флаг truncated применяется к самому
рисованию, а кэш `cache[i]` обновляется на значение `0` (пустая
клетка). При изменении байта в памяти кэш-mismatch корректно
триггерит перерисовку.

### IK57: повторное программирование канала через flip-flop первого/второго байта

В микросхеме `i8257` (КР580ВТ57, она же ИК57) каждый из адресных
регистров каналов 16-битный, но обращение к нему идёт через 8-битные
порты. Внутренний flip-flop (F/F) определяет, в какую половину
попадёт следующая запись — в младшую или старшую. F/F сбрасывается
командой master-clear (`E008 = 0x80`) и переключается при каждой
записи в адресный регистр канала.

Старая реализация распознавала только начальную последовательность
инициализации:
`E008,80 → E004,lo → E004,hi → E005,lo → E005,hi → E008,A4`.
Любая последующая прямая запись в `E004`/`E005` без повторного
master-clear считалась случайной и просто складывалась в RAM, не
оказывая влияния на DMA. Программы, которые после инициализации
перепрограммируют адрес видеопамяти на лету, не получали ожидаемого
эффекта: DMA продолжал читать кадр со старого адреса, и игровое
поле рисовалось в одну область памяти, а на экран отображалась
другая.

Конкретный пример из squash, по адресу `0x0061`:
```
LXI  H, E004
MVI  M, BB    ; ожидание: low-byte → 0x07BB
MVI  M, 07    ; ожидание: high-byte
```
Это две последовательные записи в `E004`, рассчитанные на работу
flip-flop'а: первая ставит младший байт нового адреса канала,
вторая — старший. Без поддержки F/F эмулятор молча игнорировал
обе записи, и движок продолжал читать DMA со старого `0x134F`
(splash), хотя игра перенаправила его на свой буфер `0x07BB`.

Добавлено поле `ik57_ff` (общий F/F) с поведением:
- Сбрасывается в 0 при `E008 = 0x80` (master clear) — синхронно с
  тем, как существующая state-machine `ik57_e008_80_cmd`
  переходит в режим инициализации.
- Переключается при каждой прямой записи в `E004` или `E005`
  (когда `ik57_e008_80_cmd === 0`, то есть первичная инициализация
  уже завершена и порт открыт для текущего управления).
- На «втором» байте (F/F = 1) применяет 16-битное значение через
  `screen.set_video_memory(...)` для `E004` и через обновление
  `video_memory_size` для `E005`, после чего сбрасывает F/F
  обратно в 0.

`ik57_ff` добавлен в JSON-снапшот; импорт делает поле опциональным
(`?? 0` в `kit`, `!= null ? h(...) : 0` в `classic`), чтобы старые
снапшоты без него корректно загружались. Соответственно обновлены
golden-фикстуры в `kit/tests/data/*.json`,
`kit/tests/test_snapshot.json` и `classic/tests/snapshot.json`,
а также количество ожидаемых assertions в
`kit/tests/rk86_snapshot.test.ts` (4172 → 4173).

### VG75: корректный сигнал VRTC в регистре состояния `0xC001`

Чтение регистра состояния VG75 по адресу `0xC001` всегда возвращало
константу `0x20` — то есть бит 5 (VRTC, vertical retrace) был
постоянно поднят. Программы, использующие классическую идиому
ожидания вертикальной синхронизации (`LXI H,C001 / MOV A,M / ANI 20 /
JZ`), выходили из цикла ожидания мгновенно: кадровая синхронизация
полностью игнорировалась, и эмулируемая программа выполняла своё
тело кадра на максимальной скорости процессора, без покадровой
паузы.

Симптом, на котором это поймалось: игра squash by Дмитрий Иванов
(2024). Полный цикл «splash → запуск игры → потеря 3 жизней → game
over → splash» проходил за ~35 мс CPU-времени — ниже порога
восприятия, экран не успевал ни обновиться, ни прокачать DMA, и
визуально это выглядело как «пробел не работает».

Теперь бит 5 (VRTC) переключается в зависимости от позиции внутри
эмулируемого кадра: ноль на первые ~90% кадра (активная развёртка),
единица на оставшиеся ~10% (обратный ход кадровой развёртки).
Эмулируемый кадр = `1 780 000 / 50 = 35 600` тиков, окно VRTC = 3 560
тиков (~10%). Отсчёт ведётся от `runner.total_ticks` —
детерминированно в рамках одного запуска и бит-в-бит совпадает между
turbo- и реал-тайм-режимами (что важно для goldens-тестов терминала).

В `classic/src/main.js` добавлено `memory.runner = runner;`, чтобы
обработчик чтения `C001` имел доступ к счётчику тиков (в `kit/`
`Memory` уже держит ссылку на `Machine` и через неё дотягивается до
runner'а).

После исправления игра squash идёт со зримой кадровой частотой:
один полный цикл занимает ~2.5 с CPU-времени (3 жизни, ~830 мс на
каждую) вместо прежних ~35 мс.

## 2026-05-04

### Freeze / restore (in-memory snapshots)

- New toolbar buttons: **«Заморозить состояние»** (snowflake) and
  **«Восстановить состояние»** (clock-rewind). Freezes are kept in-memory
  for the page session — up to 20, FIFO eviction of the oldest. No
  persistence across reloads (use the existing «Сохранить полное состояние»
  button or per-row download for a file).
- Each freeze stores a full `rk86_snapshot(...)` JSON plus a thumbnail
  captured via `canvas.toDataURL("image/png")` at freeze time.
- Restore selector is a modal list (newest first) showing thumbnail,
  absolute time, relative time, and the filename loaded at freeze time
  (or "(нет файла)" if none). Per-row actions: download (↓) and
  delete (✕).
- Selector keys: `↑`/`↓` navigate, `Enter` applies the freeze,
  `S` downloads the selected freeze as
  `<filename>-YYYYMMDD-hhmmss.json` (or `rk86-snapshot-…` if no file
  was loaded), `D` deletes, `Esc` closes.
- Cmd/Ctrl+K shortcuts: `Z` = freeze, `X` = open restore selector.

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
