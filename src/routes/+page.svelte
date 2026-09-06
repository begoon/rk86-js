<script lang="ts">
    import { type Machine } from "$lib/core/rk86_machine";
    import { Keyboard as RkKeyboard } from "$lib/core/rk86_keyboard";

    let shortcutsDialog = $state<HTMLDialogElement>();
    let hintText = $state("");

    import { asset, resolve } from "$app/paths";
    import { COLOR_MODES, COLOR_MODE_LABELS, type ColorMode } from "$lib/core/rk86_colors";
    import { version } from "$lib/rk86_version";
    import { main as boot, type HostCallbacks } from "$lib/web/boot";
    import Debugger from "$lib/core/rk86_debugger";
    import { rk86_snapshot, rk86_snapshot_restore } from "$lib/core/rk86_snapshot";
    import {
        loadFreezes,
        saveFreeze,
        deleteFreezeFromStore,
        trimFreezes,
        type Freeze,
    } from "$lib/web/freeze_store";
    import { saveAs } from "$lib/web/saver";
    import { CLASSIC_PROFILE_NAME, type MachineProfile } from "$lib/core/rk86_profile";
    import { loadAllProfiles, saveActiveProfileName, saveCustomProfiles } from "$lib/web/profile_store";
    import { emit_rk86_binary, RK86_EXTENSIONS } from "$lib/core/rk86_file_emit";
    import BreakpointEditor from "./BreakpointEditor.svelte";
    import CatalogSelector from "./CatalogSelector.svelte";
    import Disassembler from "./Disassembler.svelte";
    import FreezeSelector from "./FreezeSelector.svelte";
    import Keyboard from "./Keyboard.svelte";
    import MemoryMap from "./MemoryMap.svelte";
    import CursorInfo from "./CursorInfo.svelte";
    import ProfileEditor from "./ProfileEditor.svelte";
    import RkTextConverter from "./RkTextConverter.svelte";
    import { debuggerState, ui } from "./state.svelte";
    import Visualizer from "./Visualizer.svelte";

    let keyboardVisible = $state(false);
    let catalogDialog = $state<HTMLDialogElement>();
    let catalogSelector = $state<CatalogSelector>();
    let textConverterDialog = $state<HTMLDialogElement>();
    let memorySaveDialog = $state<HTMLDialogElement>();
    let iasmDialog = $state<HTMLDialogElement>();
    let memSaveStart = $state("0000");
    let memSaveEnd = $state("FFFF");
    let memSaveExt = $state("bin");

    const memSaveSize = $derived.by(() => {
        const s = parseInt(memSaveStart, 16);
        const e = parseInt(memSaveEnd, 16);
        if (isNaN(s) || isNaN(e) || s > e || s < 0 || e > 0xffff) return 0;
        return e - s + 1;
    });

    let pausedBeforeMemSave: boolean | null = null;

    function openMemorySaveDialog() {
        if (memorySaveDialog?.open) return;
        pausedBeforeMemSave = paused;
        if (!paused) machine?.pause(true);
        memorySaveDialog?.showModal();
    }

    function onMemorySaveClose() {
        (document.activeElement as HTMLElement)?.blur();
        if (pausedBeforeMemSave !== null && paused !== pausedBeforeMemSave) {
            machine?.pause(pausedBeforeMemSave);
        }
        pausedBeforeMemSave = null;
    }

    function doMemorySave() {
        if (!machine) return;
        const s = parseInt(memSaveStart, 16);
        const e = parseInt(memSaveEnd, 16);
        if (isNaN(s) || isNaN(e) || s > e || s < 0 || e > 0xffff) return;
        const size = e - s + 1;
        const snapshot = machine.memory.snapshot(s, size);
        const ext = memSaveExt.toLowerCase();
        const bytes = ext === "bin"
            ? new Uint8Array(snapshot)
            : emit_rk86_binary(ext, s, e, snapshot);
        const base = ui.selectedFileName ? `${ui.selectedFileName}-memory` : "rk86-memory";
        const range = `${s.toString(16).toUpperCase().padStart(4, "0")}-${e.toString(16).toUpperCase().padStart(4, "0")}`;
        const filename = `${base}-${range}.${ext}`;
        saveAs(new Blob([bytes.buffer as ArrayBuffer], { type: "application/octet-stream" }), filename);
        memorySaveDialog?.close();
    }

    function onMemSaveKey(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            doMemorySave();
        }
    }

    const FREEZE_CAP = 20;
    let freezes = $state<Freeze[]>([]);
    let freezeDialog = $state<HTMLDialogElement>();
    let freezeFlash = $state(false);
    let freezeFlashTimeout: ReturnType<typeof setTimeout>;

    $effect(() => {
        loadFreezes().then((loaded) => {
            freezes = loaded.slice(0, FREEZE_CAP);
        });
    });

    function freezeNow() {
        if (!machine || !canvas) return;
        const snapshot = rk86_snapshot(machine, version);
        const thumbnail = canvas.toDataURL("image/png");
        const entry: Freeze = {
            id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `f-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            createdAt: Date.now(),
            fileName: ui.selectedFileName,
            thumbnail,
            snapshot,
        };
        freezes = [entry, ...freezes].slice(0, FREEZE_CAP);
        saveFreeze(entry);
        trimFreezes(FREEZE_CAP);
        freezeFlash = true;
        clearTimeout(freezeFlashTimeout);
        freezeFlashTimeout = setTimeout(() => (freezeFlash = false), 400);
    }

    function openFreezeSelector() {
        if (freezes.length === 0) return;
        freezeDialog?.showModal();
    }

    function restoreFreeze(id: string) {
        const freeze = freezes.find((f) => f.id === id);
        if (!freeze || !machine) return;
        rk86_snapshot_restore(JSON.parse(freeze.snapshot), machine);
        freezeDialog?.close();
    }

    function deleteFreeze(id: string) {
        freezes = freezes.filter((f) => f.id !== id);
        deleteFreezeFromStore(id);
        if (freezes.length === 0) freezeDialog?.close();
    }

    function openCatalog() {
        catalogDialog?.showModal();
        setTimeout(() => catalogSelector?.focus(), 0);
    }

    let profileDialog = $state<HTMLDialogElement>();
    // Редактор монтируется заново при каждом открытии (см. {#if} в разметке),
    // чтобы список и выбор обновлялись из localStorage.
    let profileEditorOpen = $state(false);
    let profiles = $state<MachineProfile[]>([]);

    function openProfileEditor() {
        profiles = loadAllProfiles();
        profileEditorOpen = true;
        profileDialog?.showModal();
    }

    function saveProfiles(next: MachineProfile[]) {
        profiles = next;
        saveCustomProfiles(next);
    }

    // Активирует профиль: меняет раскладку памяти на лету (ПЗУ в buf
    // сохраняется) и перезапускает эмулятор, чтобы монитор стартовал
    // с чистым ОЗУ по новым адресам.
    function applyProfile(profile: MachineProfile) {
        if (!machine) return;
        machine.memory.set_profile(profile);
        saveActiveProfileName(profile.name);
        machine.restart();
        profileDialog?.close();
    }
    let uploadInput = $state<HTMLInputElement>();

    let canvas = $state<HTMLCanvasElement>();

    let machine = $state<Machine>();
    let emulatorKeyDown: ((code: string) => void) | undefined;
    let emulatorKeyUp: ((code: string) => void) | undefined;

    $effect(() => {
        if (!canvas) return;
        const host: HostCallbacks = {
            canvas,
            onkeydown: (h) => (emulatorKeyDown = h),
            onkeyup: (h) => (emulatorKeyUp = h),
        };
        boot(host).then((m) => {
            if (!m) {
                console.error("ошибка при инициализации эмулятора");
                return;
            }
            m.ui.on_visualizer_hit = (opcode: number) => {
                ui.visualizerOpcode = opcode;
            };
            m.ui.on_pause_changed = (value: boolean) => {
                paused = value;
            };
            m.ui.refreshDebugger = () => {
                disassemblerRef?.refresh();
                memoryMapRef?.refresh();
                cursorInfoRef?.refresh();
            };
            m.ui.openDebugger = () => {
                if (!debuggerVisible) toggleDebugger();
            };
            machine = m;
            // The classic assembler iframe (static/i8080asm/) calls
            // window.rk86.focusEmulator() after "Run"/"Upload"; close its
            // dialog and route the keyboard back to the emulator canvas.
            const bridge = (window as unknown as { rk86?: { focusEmulator: () => void } }).rk86;
            if (bridge) {
                const focusCanvas = bridge.focusEmulator;
                bridge.focusEmulator = () => {
                    iasmDialog?.close();
                    canvasFocused = true;
                    focusCanvas();
                };
            }
            hardwareIdMode = m.runner.hardware_id_enabled;
            dbg = new Debugger(machine);
            dbg.subscribe((bps) => {
                debuggerState.breakpoints = bps.slice();
            });
        });
    });

    function cycleColorMode() {
        const idx = COLOR_MODES.indexOf(ui.colorMode);
        const next: ColorMode = COLOR_MODES[(idx + 1) % COLOR_MODES.length];
        ui.colorMode = next;
        if (machine) machine.screen.color_mode = next;
        try {
            localStorage.setItem("rk86:color-mode", next);
        } catch {}
    }

    function cycleRenderMode() {
        const next = ui.renderMode === "vg75" ? "monitor" : "vg75";
        ui.renderMode = next;
        machine?.screen.set_render_mode(next);
        try {
            localStorage.setItem("rk86:render-mode", next);
        } catch {}
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            canvas?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    function togglePaused() {
        paused = !paused;
        machine?.pause(paused);
        if (paused) {
            disassemblerRef?.refresh();
            memoryMapRef?.refresh();
            cursorInfoRef?.refresh();
        }
    }

    let pausedBeforeShortcuts: boolean | null = null;

    function openShortcuts() {
        if (shortcutsDialog?.open) return;
        pausedBeforeShortcuts = paused;
        if (!paused) machine?.pause(true);
        shortcutsDialog?.showModal();
    }

    function onShortcutsClose() {
        (document.activeElement as HTMLElement)?.blur();
        if (pausedBeforeShortcuts !== null && paused !== pausedBeforeShortcuts) {
            machine?.pause(pausedBeforeShortcuts);
        }
        pausedBeforeShortcuts = null;
    }

    function openAssembler() {
        window.open(asset("/asm/"), "_blank", "noopener");
    }

    function openIasm() {
        iasmDialog?.showModal();
    }

    function openC8080() {
        window.open(asset("/c8080/"), "_blank", "noopener");
    }

    function openPlm80() {
        window.open(asset("/plm80/"), "_blank", "noopener");
    }

    function openTape() {
        window.open(asset("/tape/"), "_blank", "noopener");
    }
    function openFileAnalyzer() {
        window.open(asset("/file/"), "_blank", "noopener");
    }

    function toggleVisualizer() {
        visualizerVisible = !visualizerVisible;
        if (machine) machine.ui.visualizer_visible = visualizerVisible;
    }

    function toggleTurbo() {
        turboMode = !turboMode;
        if (machine) machine.runner.turbo = turboMode;
    }

    function toggleHardwareId() {
        hardwareIdMode = !hardwareIdMode;
        if (machine) machine.runner.hardware_id_enabled = hardwareIdMode;
    }

    function toggleRusLat() {
        emulatorKeyDown?.("F10");
        setTimeout(() => emulatorKeyUp?.("F10"), 100);
    }

    function toggleDebugger() {
        if (debuggerVisible && canvas && canvasPlaceholder) {
            canvasPlaceholder.appendChild(canvas);
        }
        debuggerVisible = !debuggerVisible;
        debuggerState.visible = debuggerVisible;
        if (dbg) {
            if (debuggerVisible) dbg.attach();
            else dbg.detach();
        }
    }

    const shortcuts: Record<string, () => void> = {
        f: toggleFullscreen,
        c: () => machine?.reset(),
        r: () => machine?.restart(),
        p: togglePaused,
        s: toggleSound,
        a: openAssembler,
        v: toggleVisualizer,
        d: toggleDebugger,
        t: toggleTurbo,
        j: toggleQwerty,
        i: toggleHardwareId,
        b: () => (keyboardVisible = !keyboardVisible),
        l: () => openCatalog(),
        o: () => window.open(resolve("/catalog"), "_blank"),
        u: () => uploadInput?.click(),
        g: () => machine?.runLoadedFile(),
        w: () => machine?.ui.emulator_snapshot(),
        z: freezeNow,
        x: openFreezeSelector,
        n: () => textConverterDialog?.showModal(),
        m: openProfileEditor,
    };

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (shortcutsDialog?.open) {
                shortcutsDialog.close();
            } else {
                openShortcuts();
            }
            return;
        }
        if (shortcutsDialog?.open) {
            const action = shortcuts[e.key];
            if (action) {
                e.preventDefault();
                shortcutsDialog.close();
                action();
            }
            return;
        }
        if (catalogDialog?.open) return;
        if (freezeDialog?.open) return;
        if (profileDialog?.open) return;
        if (debuggerVisible && dbg && !canvasFocused) {
            if (e.key === "F5") {
                e.preventDefault();
                togglePaused();
                return;
            }
            if (e.key === "F11" && e.shiftKey) {
                e.preventDefault();
                if (paused) dbg.stepOut();
                return;
            }
            if (e.key === "F11") {
                e.preventDefault();
                if (paused) dbg.step();
                return;
            }
            if (e.key === "F10" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const cursor = disassemblerRef?.getCursor();
                if (paused && cursor !== null && cursor !== undefined) dbg.runToCursor(cursor);
                return;
            }
            if (e.key === "F10") {
                e.preventDefault();
                if (paused) dbg.stepOver();
                return;
            }
            if (e.key === "F9") {
                e.preventDefault();
                const cursor = disassemblerRef?.getCursor();
                if (cursor !== null && cursor !== undefined) dbg.toggleExecAt(cursor);
                return;
            }
        }
        if (debuggerVisible && !canvasFocused) return;
        if (qwertyMode) {
            if (QWERTY_SWALLOW_MODIFIERS.includes(e.key)) return;
            const inj = CHAR_TO_RK[e.key];
            if (inj) {
                e.preventDefault();
                qwertyInject(inj);
                return;
            }
            // Fall through for Enter, Backspace, Tab, Arrow*, F1..F12, etc.
        }
        // Клавиша уходит в матрицу РК — браузеру её отдавать нельзя.
        // Иначе Firefox на "/" и "'" открывает Quick Find: фокус уезжает в
        // строку поиска, keyup до нас не доходит, и монитор бесконечно
        // автоповторяет зажатый символ. Сочетания с Ctrl/Cmd/Alt не трогаем,
        // чтобы не ломать браузерные шорткаты.
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.code in RkKeyboard.key_table) {
            e.preventDefault();
        }
        emulatorKeyDown?.(e.code);
    }

    // Потеря фокуса окном (Quick Find, переключение вкладки/окна, alert)
    // съедает keyup — отпускаем всё, чтобы клавиша не осталась зажатой.
    function releaseAllKeys() {
        machine?.keyboard.reset();
    }

    function onKeyUp(e: KeyboardEvent) {
        if (catalogDialog?.open) return;
        if (freezeDialog?.open) return;
        if (debuggerVisible && !canvasFocused) return;
        if (qwertyMode) {
            if (QWERTY_SWALLOW_MODIFIERS.includes(e.key)) return;
            // Character keys had their own injected down/up — swallow physical up.
            if (e.key && e.key.length === 1 && CHAR_TO_RK[e.key]) return;
        }
        emulatorKeyUp?.(e.code);
    }

    let paused = $state(false);
    let fullscreen = $state(false);

    let visualizerVisible = $state(false);
    let turboMode = $state(false);
    let qwertyMode = $state(false);

    // QWERTY mode: read e.key (the character the OS produced after applying
    // its keyboard layout) and inject the RK keystroke that types that
    // character on screen — toggling РУС/ЛАТ via F10 if needed, holding
    // ShiftLeft if needed. Works regardless of whether the OS layout is
    // US-QWERTY or Russian (browser already did the translation).
    type Inject = { code: string; shift?: boolean; rus?: boolean };

    const CHAR_TO_RK: Record<string, Inject> = (() => {
        const m: Record<string, Inject> = {};
        const cyr: Record<string, string> = {
            А: "KeyA", Б: "KeyB", В: "KeyW", Г: "KeyG", Д: "KeyD", Е: "KeyE",
            Ж: "KeyV", З: "KeyZ", И: "KeyI", Й: "KeyJ", К: "KeyK", Л: "KeyL",
            М: "KeyM", Н: "KeyN", О: "KeyO", П: "KeyP", Р: "KeyR", С: "KeyS",
            Т: "KeyT", У: "KeyU", Ф: "KeyF", Х: "KeyH", Ц: "KeyC", Ч: "Quote",
            Ш: "BracketLeft", Щ: "BracketRight", Ы: "KeyY", Ь: "KeyX",
            Э: "Backslash", Ю: "F7", Я: "KeyQ", Ё: "KeyE",
        };
        for (const [ch, code] of Object.entries(cyr)) {
            m[ch] = { code, rus: true };
            m[ch.toLowerCase()] = { code, rus: true };
        }
        for (let c = 0x41; c <= 0x5a; c++) {
            const u = String.fromCharCode(c);
            m[u] = { code: "Key" + u, rus: false };
            m[String.fromCharCode(c + 32)] = { code: "Key" + u, rus: false };
        }
        for (let d = 0; d <= 9; d++) m[String(d)] = { code: "Digit" + d };
        const shifted: Record<string, string> = {
            "!": "Digit1", '"': "Digit2", "#": "Digit3", $: "Digit4",
            "%": "Digit5", "&": "Digit6", "'": "Digit7", "(": "Digit8",
            ")": "Digit9", "+": "Semicolon", "=": "Minus",
        };
        for (const [ch, code] of Object.entries(shifted)) m[ch] = { code, shift: true };
        Object.assign(m, {
            " ": { code: "Space" } as Inject,
            // Plain ASCII punctuation — RK uses Shift for the shifted glyph,
            // mode doesn't matter for these keys.
            ",": { code: "Comma" } as Inject,
            ".": { code: "Period" } as Inject,
            "/": { code: "Slash" } as Inject,
            "<": { code: "Comma", shift: true } as Inject,
            ">": { code: "Period", shift: true } as Inject,
            "?": { code: "Slash", shift: true } as Inject,
            ";": { code: "Semicolon" } as Inject,
            "-": { code: "Minus" } as Inject,
            // РУС/ЛАТ-distinguished keys: each position holds a Cyrillic
            // glyph in РУС and a Latin/symbol glyph in ЛАТ.
            "[": { code: "BracketLeft", rus: false } as Inject,
            "]": { code: "BracketRight", rus: false } as Inject,
            "\\": { code: "Backslash", rus: false } as Inject,
            "@": { code: "F7", rus: false } as Inject,
            ":": { code: "F6", rus: false } as Inject,
            "*": { code: "F6", rus: true } as Inject,
            "^": { code: "Quote", rus: false } as Inject,
        });
        return m;
    })();

    const QWERTY_PRESS_MS = 80;

    function qwertyInject(inj: Inject) {
        let t = 0;
        if (inj.rus !== undefined && ui.rusLat !== inj.rus) {
            setTimeout(() => emulatorKeyDown?.("F10"), t);
            setTimeout(() => emulatorKeyUp?.("F10"), t + QWERTY_PRESS_MS);
            t += QWERTY_PRESS_MS + 30;
        }
        if (inj.shift) {
            setTimeout(() => emulatorKeyDown?.("ShiftLeft"), t);
            t += 20;
        }
        setTimeout(() => emulatorKeyDown?.(inj.code), t);
        setTimeout(() => emulatorKeyUp?.(inj.code), t + QWERTY_PRESS_MS);
        t += QWERTY_PRESS_MS;
        if (inj.shift) setTimeout(() => emulatorKeyUp?.("ShiftLeft"), t + 20);
    }

    const QWERTY_SWALLOW_MODIFIERS = ["Shift", "Control", "Alt", "Meta", "CapsLock"];

    function toggleQwerty() {
        qwertyMode = !qwertyMode;
    }
    let hardwareIdMode = $state(false);
    let debuggerVisible = $state(false);
    let disassemblerRef = $state<Disassembler>();
    let breakpointEditorRef = $state<BreakpointEditor>();
    let memoryMapRef = $state<MemoryMap>();
    let cursorInfoRef = $state<CursorInfo>();
    let canvasFocused = $state(false);
    let lastDataAddr = $state("0000");
    let debuggerCanvasSlot = $state<HTMLDivElement>();
    let canvasPlaceholder = $state<HTMLDivElement>();
    let hoverCharX = $state<number | null>(null);
    let hoverCharY = $state<number | null>(null);
    let hoverMarker = $state<{ left: number; top: number; width: number; height: number } | null>(null);
    let hoverHideTimer: ReturnType<typeof setTimeout> | undefined;

    function updateHover(e: MouseEvent) {
        if (!canvas || !machine) return;
        const width = machine.memory.video_screen_size_x;
        const height = machine.memory.video_screen_size_y;
        if (!width || !height) return;
        const box = canvas.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || !canvas.width || !canvas.height) return;
        // object-fit: contain letterboxes the bitmap inside the canvas
        // element — map the mouse to the rendered content rect, not the
        // element box (in debugger mode the canvas is unscaled, fit = 1
        // and the content rect equals the element box).
        const fit = Math.min(box.width / canvas.width, box.height / canvas.height);
        const contentWidth = canvas.width * fit;
        const contentHeight = canvas.height * fit;
        const contentLeft = box.left + (box.width - contentWidth) / 2;
        const contentTop = box.top + (box.height - contentHeight) / 2;
        const px = (e.clientX - contentLeft) / contentWidth;
        const py = (e.clientY - contentTop) / contentHeight;
        if (px < 0 || px >= 1 || py < 0 || py >= 1) {
            clearHover();
            return;
        }
        hoverCharX = Math.floor(px * width);
        hoverCharY = Math.floor(py * height);
        // Marker rect in pixels relative to the container's padding box
        // (absolute positioning origin).
        const container = e.currentTarget as HTMLElement;
        const containerBox = container.getBoundingClientRect();
        const originX = containerBox.left + container.clientLeft;
        const originY = containerBox.top + container.clientTop;
        const cellWidth = contentWidth / width;
        const cellHeight = contentHeight / height;
        hoverMarker = {
            left: contentLeft - originX + hoverCharX * cellWidth,
            top: contentTop - originY + hoverCharY * cellHeight,
            width: cellWidth,
            height: cellHeight,
        };
        clearTimeout(hoverHideTimer);
        hoverHideTimer = setTimeout(clearHover, 2000);
    }

    function clearHover() {
        hoverCharX = null;
        hoverCharY = null;
        hoverMarker = null;
        clearTimeout(hoverHideTimer);
        hoverHideTimer = undefined;
    }

    function onCanvasWrapClick() {
        if (canvasFocused && hoverCharX != null && hoverCharY != null && machine) {
            const width = machine.memory.video_screen_size_x || 0;
            const addr =
                (machine.memory.video_memory_base + hoverCharY * width + hoverCharX) & 0xffff;
            disassemblerRef?.gotoDataCentered(addr);
            return;
        }
        canvasFocused = true;
    }

    $effect(() => {
        if (canvas && debuggerVisible && debuggerCanvasSlot) {
            debuggerCanvasSlot.appendChild(canvas);
        }
    });

    let dbg = $state<Debugger>();

    let soundEnabled = $state(false);
    let soundImageVisible = $state(false);
    let soundImageTimeout: ReturnType<typeof setTimeout>;

    function toggleSound() {
        soundEnabled = !soundEnabled;
        machine?.runner.init_sound(soundEnabled);
        soundImageVisible = true;
        clearTimeout(soundImageTimeout);
        soundImageTimeout = setTimeout(() => (soundImageVisible = false), 2000);
    }

    let mainElement = $state<HTMLElement>();
    $effect(() => {
        if (mainElement) {
            mainElement.querySelectorAll("#header button, #header a").forEach((el) => {
                (el as HTMLElement).tabIndex = -1;
            });
        }
    });

    let dragActive = $state(false);
    let dragDepth = 0;

    function onDragEnter(e: DragEvent) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
        dragDepth += 1;
        dragActive = true;
    }

    function onDragOver(e: DragEvent) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }

    function onDragLeave(e: DragEvent) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        dragDepth -= 1;
        if (dragDepth <= 0) {
            dragDepth = 0;
            dragActive = false;
        }
    }

    async function onDrop(e: DragEvent) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
        dragDepth = 0;
        dragActive = false;
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        await machine?.uploadFile(file);
        // Mirror catalog `onrun`: load, brief delay, then inject the
        // monitor G command so the dropped program starts the same way
        // as Catalog → Запустить.
        setTimeout(() => machine?.runLoadedFile(), 500);
    }
</script>

<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} on:blur={releaseAllKeys} />
<svelte:document
    on:fullscreenchange={() => (fullscreen = Boolean(document.fullscreenElement))}
    on:visibilitychange={() => document.hidden && releaseAllKeys()}
/>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<main
    bind:this={mainElement}
    class:drag-active={dragActive}
    ondragenter={onDragEnter}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
    onmouseover={(e) => {
        const button = (e.target as HTMLElement).closest("[data-text]") as HTMLElement | null;
        hintText = button?.dataset.text ?? "";
    }}
    onmouseout={(e) => {
        const button = (e.target as HTMLElement).closest("[data-text]") as HTMLElement | null;
        if (button) hintText = "";
    }}
>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        id="header"
        class={fullscreen ? "hidden" : ""}
        onmousedown={(e) => {
            const focusable = (e.target as HTMLElement).closest("button, a");
            if (focusable) e.preventDefault();
        }}
    >
        <button class="icon" data-text="Сигнал RESET" onclick={() => machine?.reset()}>
            <img class="icon" src="i/reset.svg" alt="Сигнал RESET" />
        </button>
        <button class="icon" data-text="Перезапустить эмулятор" onclick={() => machine?.restart()}>
            <img class="icon" src="i/power-off.svg" alt="Перезапустить эмулятор" />
        </button>
        <button class="icon" data-text="Приостановить процессор" onclick={togglePaused}>
            {#if paused}
                <img class="icon" src="i/paused.svg" alt="Процессор приостановлен" />
            {:else}
                <img class="icon" src="i/pause.svg" alt="Приостановить процессор" />
            {/if}
        </button>
        <button class="icon" data-text="Полноэкранный режим" onclick={toggleFullscreen}>
            <img class="icon" src="i/fullscreen.svg" alt="Полноэкранный режим" />
        </button>
        <button
            type="button"
            class="icon"
            class:active={keyboardVisible}
            data-text="Клавиатура"
            onclick={() => (keyboardVisible = !keyboardVisible)}
        >
            <img class="icon" src="i/keyboard.svg" alt="Клавиатура" />
        </button>
        <button
            type="button"
            class="icon"
            data-text="Помощь"
            onclick={() => window.open("https://github.com/begoon/rk86-js/blob/master/info/HELP.md", "_blank")}
        >
            <img class="icon" src="i/help.svg" alt="Помощь" />
        </button>
        <a href={resolve("/catalog")} class="icon" data-text="Каталог программ">
            <img class="icon" src="i/open-catalog.svg" alt="Каталог программ" />
        </a>
        <a href="/web/" target="_blank" rel="noopener" class="icon" data-text="Веб-компоненты">
            <img class="icon" src="i/web.svg" alt="Веб-компоненты" />
        </a>
        <a href="https://hub.rk86.ru" target="_blank" rel="noopener" class="icon" data-text="Хаб">
            <img class="icon" src="i/hub.svg" alt="Хаб" />
        </a>
        <a href="https://github.com/begoon/rk86-js/issues" target="_blank" rel="noopener" class="icon" data-text="Сообщить об ошибке">
            <img class="icon" src="i/bug.svg" alt="Сообщить об ошибке" />
        </a>
        <a
            href="https://donate.stripe.com/eVa9ATeZr18u2o8289"
            target="_blank"
            rel="noopener"
            style="margin: 0 auto; color: white; font-family: monospace; align-self: center;"
        >Поддержать проект</a>
        <!-- Кнопки справа -->
        <div style="display: flex; align-items: center; gap: 4px">
            <button class="icon" data-text="Запись на ленту">
                {#if ui.tapeActivityActive}
                    {#if ui.tapeHighlight}
                        <img class="icon" src="i/tape-data.svg" alt="Данные ленты" />
                    {:else}
                        <img class="icon" src="i/tape-preamble.svg" alt="Преамбула ленты" />
                    {/if}
                {/if}
            </button>
            <button
                type="button"
                class="icon"
                data-text="Выбрать файл из каталога"
                onclick={() => openCatalog()}
            >
                <img class="icon" src="i/catalog.svg" alt="Выбрать файл из каталога" />
            </button>
            <input
                bind:this={uploadInput}
                style="display: none"
                type="file"
                onchange={async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) await machine?.uploadFile(file);
                    if (uploadInput) uploadInput.value = "";
                }}
            />
            <button type="button" class="icon" data-text="Загрузить внешний файл" onclick={() => uploadInput?.click()}>
                <img class="icon" src="i/upload.svg" alt="Загрузить внешний файл" />
            </button>
            <button type="button" class="icon" data-text="Запустить программу" onclick={() => machine?.runLoadedFile()}>
                <img class="icon" src="i/run.svg" alt="Запустить программу" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Ассемблер"
                onclick={openAssembler}
            >
                <img class="icon" src="i/asm.svg" alt="Ассемблер" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Классический ассемблер"
                onclick={openIasm}
            >
                <img class="icon" src="i/iasm.svg" alt="Классический ассемблер" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Компилятор C"
                onclick={openC8080}
            >
                <img class="icon" src="i/c8080.svg" alt="Компилятор C" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Компилятор PL/M-80"
                onclick={openPlm80}
            >
                <img class="icon" src="i/plm80.svg" alt="Компилятор PL/M-80" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Кириллица → РК"
                onclick={() => textConverterDialog?.showModal()}
            >
                <img class="icon" src="i/koi7.svg" alt="Кириллица → РК" />
            </button>
            <button
                type="button"
                class="icon"
                class:active={turboMode}
                data-text="Турбо-режим"
                onclick={toggleTurbo}
            >
                <img class="icon" src="i/turbo.svg" alt="Турбо" />
            </button>
            <button
                type="button"
                class="icon"
                class:active={qwertyMode}
                data-text="Прямой ввод"
                onclick={toggleQwerty}
            >
                <img class="icon" src="i/qwerty.svg" alt="QWERTY → ЙЦУКЕН" />
            </button>
            <button
                type="button"
                class="icon"
                class:active={hardwareIdMode}
                data-text="Аппаратный ID (STC×4)"
                onclick={toggleHardwareId}
            >
                <img class="icon" src="i/hwid.svg" alt="Аппаратный ID" />
            </button>
            <button
                type="button"
                class="icon"
                class:active={debuggerVisible}
                data-text="Отладчик"
                onclick={toggleDebugger}
            >
                <img class="icon" src="i/debug.svg" alt="Отладчик" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Визуализатор WAV-лент"
                onclick={openTape}
            >
                <img class="icon" src="i/tape.svg" alt="Визуализатор WAV-лент" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Анализатор РК-файла"
                onclick={openFileAnalyzer}
            >
                <img class="icon" src="i/file-analyzer.svg" alt="Анализатор РК-файла" />
            </button>
            <button
                type="button"
                class="icon"
                class:active={visualizerVisible}
                data-text="Визуализация"
                onclick={toggleVisualizer}
            >
                <img class="icon" src="i/visualizer.svg" alt="Визуализация" />
            </button>
            <button type="button" class="icon" data-text="Снимок экрана" onclick={() => machine?.ui.screenshot()}>
                <img class="icon" src="i/screenshot.svg" alt="Снимок экрана" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Сохранить память в файл"
                onclick={openMemorySaveDialog}
            >
                <img class="icon" src="i/memory.svg" alt="Сохранить память в файл" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Сохранить полное состояние"
                onclick={() => machine?.ui.emulator_snapshot()}
            >
                <img class="icon" src="i/snapshot.svg" alt="Сохранить полное состояние" />
            </button>
            <button
                type="button"
                class="icon"
                class:flashing={freezeFlash}
                data-text="Заморозить состояние ({freezes.length}/{FREEZE_CAP})"
                onclick={freezeNow}
            >
                <img class="icon" src="i/freeze.svg" alt="Заморозить состояние" />
            </button>
            <button
                type="button"
                class="icon"
                disabled={freezes.length === 0}
                data-text={freezes.length === 0 ? "Нет замороженных состояний" : `Восстановить состояние (${freezes.length})`}
                onclick={openFreezeSelector}
            >
                <img class="icon" src="i/restore.svg" alt="Восстановить состояние" />
            </button>
            <button
                type="button"
                class="icon"
                class:active={ui.profileName !== CLASSIC_PROFILE_NAME}
                data-text="Профили оборудования"
                onclick={openProfileEditor}
            >
                <img class="icon" src="i/profile.svg" alt="Профили оборудования" />
            </button>
            <button type="button" class="icon" data-text="Включить/выключить звук" onclick={toggleSound}>
                {#if soundEnabled}
                    <img class="icon" src="i/sound.svg" alt="Включить звук" />
                {:else}
                    <img class="icon" src="i/sound-muted.svg" alt="Выключить звук" />
                {/if}
            </button>
            <span id="sound_image" class={soundImageVisible ? "visible" : ""}>{soundEnabled ? "🔉" : "🔇"}</span>
            <button type="button" data-text="Переключить РУС/ЛАТ (F10)" onclick={toggleRusLat}>
                <span
                    style="font-family: monospace; background: white; color: black; padding: 2px 4px; border-radius: 2px"
                    >{ui.rusLat ? "РУС" : "ЛАТ"}</span
                >
            </button>
        </div>
    </div>
    <div id="hint" style="opacity: {hintText ? 1 : 0}">{hintText}</div>
    {#if debuggerVisible && machine}
        <div class="debugger-layout">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="debugger-canvas-wrap"
                class:canvas-focused={canvasFocused}
                onclick={onCanvasWrapClick}
                onmousemove={updateHover}
                onmouseleave={clearHover}
                data-text={canvasFocused ? "" : "Кликнуть для ввода"}
                bind:this={debuggerCanvasSlot}
            >
                {#if hoverMarker}
                    <div
                        class="light-pen-marker"
                        style="left: {hoverMarker.left}px; top: {hoverMarker.top}px; width: {hoverMarker.width}px; height: {hoverMarker.height}px;"
                    ></div>
                {/if}
            </div>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="debugger-map" onclick={() => (canvasFocused = false)}>
                <MemoryMap
                    bind:this={memoryMapRef}
                    memory={machine.memory}
                    ongotodata={(addr) => disassemblerRef?.gotoDataCentered(addr)}
                    ongotocode={(addr) => disassemblerRef?.gotoCodeCentered(addr)}
                />
            </div>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="debugger-disasm" onclick={() => (canvasFocused = false)}>
                <Disassembler
                    bind:this={disassemblerRef}
                    memory={machine.memory}
                    cpu={machine.cpu}
                    pc={() => machine!.cpu.pc}
                    dbg={dbg!}
                    initialDataAddr={lastDataAddr}
                    ondatachange={(addr) => (lastDataAddr = addr)}
                    onrunToCursor={(addr) => dbg?.runToCursor(addr)}
                />
            </div>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="debugger-bps" onclick={() => (canvasFocused = false)}>
                {#if dbg!}
                    <BreakpointEditor
                        bind:this={breakpointEditorRef}
                        dbg={dbg!}
                        {paused}
                        ongo={() => { dbg!.go(); cursorInfoRef?.refresh(); }}
                        onpause={() => { machine!.pause(true); disassemblerRef?.refresh(); memoryMapRef?.refresh(); cursorInfoRef?.refresh(); }}
                        onstep={() => dbg!.step()}
                        onstepover={() => dbg!.stepOver()}
                        onstepout={() => dbg!.stepOut()}
                    />
                {/if}
            </div>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="debugger-cursor-info" onclick={() => (canvasFocused = false)}>
                <CursorInfo
                    bind:this={cursorInfoRef}
                    memory={machine.memory}
                    screen={machine.screen}
                    hoverX={hoverCharX}
                    hoverY={hoverCharY}
                    ongotodata={(addr) => disassemblerRef?.gotoDataCentered(addr)}
                />
            </div>
        </div>
    {/if}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        bind:this={canvasPlaceholder}
        class="canvas-placeholder"
        style={debuggerVisible ? "display: none" : ""}
        onmousemove={updateHover}
        onmouseleave={clearHover}
    >
        <canvas bind:this={canvas}></canvas>
        {#if !debuggerVisible && hoverMarker}
            <div
                class="light-pen-marker"
                style="left: {hoverMarker.left}px; top: {hoverMarker.top}px; width: {hoverMarker.width}px; height: {hoverMarker.height}px;"
            ></div>
        {/if}
    </div>
    {#if visualizerVisible}
        <Visualizer onclose={toggleVisualizer} />
    {/if}
    <div id="footer" style="display: flex; gap: 10px" class={fullscreen ? "hidden" : ""}>
        <div class="gauge">
            <span class="dimmed">ИНСТР</span>
            <span>{Math.floor(ui.ips * 1000).toLocaleString()}</span>
        </div>
        <div class="gauge">
            <span class="dimmed">ТАКТ</span>
            <span>{Math.floor(ui.tps * 1000).toLocaleString()}</span>
        </div>
        <div class="gauge">
            <span class="dimmed">ЭКРАН</span>
            <span>{ui.videoMemoryBase.toString(16).toUpperCase()}</span>
        </div>
        <div class="gauge">
            <span class="dimmed">РАЗМЕР</span>
            <span>{ui.screenWidth}x{ui.screenHeight}:{ui.screenCharHeight}</span>
        </div>
        <div class="gauge">
            <span class="dimmed">ЦВЕТ</span>
            <button type="button" class="color-mode" tabindex={-1} onclick={cycleColorMode} title="Переключить режим цвета">
                {COLOR_MODE_LABELS[ui.colorMode]}
            </button>
        </div>
        <div class="gauge">
            <span class="dimmed">СИНХР</span>
            <button
                type="button"
                class="color-mode"
                tabindex={-1}
                onclick={cycleRenderMode}
                title={ui.renderMode === "vg75" ? "ВГ75 (~50 Гц) — клик: переключить на монитор (requestAnimationFrame)" : "Монитор (requestAnimationFrame) — клик: переключить на ВГ75"}
            >
                {ui.renderMode === "vg75" ? "ВГ75" : "МОНИТОР"}
            </button>
        </div>
        <div class="gauge">
            <span class={ui.modifierUS ? "modifier_active" : "dimmed"}>УС</span>
            <span class={ui.modifierSS ? "modifier_active" : "dimmed"}>СС</span>
        </div>
        <div class="gauge">
            <span class="dimmed">ЛЕНТА</span>
            <span class={ui.tapeHighlight ? "tape_active" : ""}>{ui.tapeWrittenBytes.toString(16).toUpperCase().padStart(4, "0")}</span>
        </div>
        {#if ui.profileName !== CLASSIC_PROFILE_NAME}
            <div class="gauge">
                <span class="dimmed">ПРОФИЛЬ</span>
                <button type="button" class="color-mode" tabindex={-1} onclick={openProfileEditor} title="Профили оборудования">
                    {ui.profileName}
                </button>
            </div>
        {/if}
        <div class="gauge">
            <span class="dimmed">ВЕРСИЯ</span>
            <span>{version}</span>
        </div>
        {#if ui.selectedFileName}
            <div class="gauge">
                <span class="dimmed">ФАЙЛ</span>
                <span>{ui.selectedFileName}</span>
                {#if ui.selectedFileSize}
                    <span class="dimmed">
                        {ui.selectedFileStart.toString(16).toUpperCase().padStart(4, "0")}-{ui.selectedFileEnd
                            .toString(16)
                            .toUpperCase()
                            .padStart(4, "0")}
                    </span>
                    <span>{ui.selectedFileSize.toString(16).toUpperCase().padStart(4, "0")}</span>
                {/if}
                <span class="dimmed">G{ui.selectedFileEntry.toString(16).toUpperCase().padStart(4, "0")}</span>
            </div>
        {/if}
        <button type="button" id="shortcut-hint" onclick={openShortcuts}>CMD/CTRL-K</button>
    </div>
    {#if dragActive}
        <div id="drop-overlay">Перетащите файл сюда</div>
    {/if}
</main>

<dialog
    id="shortcuts"
    bind:this={shortcutsDialog}
    onclick={(e) => {
        if (e.target === e.currentTarget) shortcutsDialog?.close();
    }}
    onclose={onShortcutsClose}
>
    <div>
        <h1 style="font-weight: bold">CMD-k + ...</h1>
        <style>
            mark {
                background-color: #ffcc00;
                color: black;
                padding: 2px 4px;
                border-radius: 4px;
            }
        </style>
        <div id="shortcuts-panel" style="display: grid; grid-template-columns: repeat(2, 1fr)">
            <style>
                #shortcuts-panel div {
                    padding: 4px;
                    white-space: nowrap;
                    text-align: left;
                    display: grid;
                    grid-template-columns: 2em auto;
                    gap: 0 0.5em;
                }
                #shortcuts-panel mark {
                    background-color: #ffcc00;
                    color: black;
                    padding: 2px 4px;
                    border-radius: 4px;
                    text-align: center;
                    margin-right: 4px;
                    text-transform: uppercase;
                }
            </style>
            <!-- --- -->
            <div><mark>l</mark> выбрать файл</div>
            <div><mark>o</mark> открыть каталог</div>
            <div><mark>u</mark> загрузить внешний файл</div>
            <div><mark>g</mark> запустить программу</div>
            <div><mark>a</mark> ассемблер</div>
            <div><mark>d</mark> отладчик</div>
            <div><mark>v</mark> визуализация</div>
            <div><mark>p</mark> приостановить процессор</div>
            <div><mark>c</mark> сигнал RESET</div>
            <div><mark>r</mark> перезапустить эмулятор</div>
            <div><mark>s</mark> звук</div>
            <div><mark>f</mark> полноэкранный режим</div>
            <div><mark>w</mark> сохранить состояние эмулятора</div>
            <div><mark>z</mark> заморозить состояние</div>
            <div><mark>x</mark> восстановить состояние</div>
            <div><mark>b</mark> помощь по клавиатуре</div>
            <div><mark>n</mark> кириллица → RK86</div>
            <div><mark>j</mark> прямой ввод</div>
            <div><mark>m</mark> профили оборудования</div>
        </div>
    </div>
</dialog>

{#if keyboardVisible}
    <Keyboard
        rusLat={ui.rusLat}
        onclose={() => (keyboardVisible = false)}
        onkeydown={(code) => emulatorKeyDown?.(code)}
        onkeyup={(code) => emulatorKeyUp?.(code)}
    />
{/if}

<dialog
    id="catalog-dialog"
    bind:this={catalogDialog}
    onclick={(e) => {
        if (e.target === e.currentTarget) catalogDialog?.close();
    }}
    onclose={() => (document.activeElement as HTMLElement)?.blur()}
>
    <CatalogSelector
        bind:this={catalogSelector}
        onrun={async (name) => {
            catalogDialog?.close();
            await machine?.loadCatalogFile(name);
            setTimeout(() => machine?.runLoadedFile(), 500);
        }}
        onload={(name) => {
            catalogDialog?.close();
            machine?.loadCatalogFile(name);
        }}
        ondebug={async (name, entry) => {
            catalogDialog?.close();
            if (!debuggerVisible) toggleDebugger();
            dbg?.add({ type: "exec", address: entry, temp: true });
            await machine?.loadCatalogFile(name);
            setTimeout(() => machine?.runLoadedFile(), 500);
        }}
        onclose={() => catalogDialog?.close()}
    />
</dialog>

<dialog
    id="freeze-dialog"
    bind:this={freezeDialog}
    onclick={(e) => {
        if (e.target === e.currentTarget) freezeDialog?.close();
    }}
    onclose={() => (document.activeElement as HTMLElement)?.blur()}
>
    <FreezeSelector
        {freezes}
        onselect={restoreFreeze}
        ondelete={deleteFreeze}
        onclose={() => freezeDialog?.close()}
    />
</dialog>

<dialog
    id="profile-dialog"
    bind:this={profileDialog}
    onclick={(e) => {
        if (e.target === e.currentTarget) profileDialog?.close();
    }}
    onclose={() => {
        profileEditorOpen = false;
        (document.activeElement as HTMLElement)?.blur();
    }}
>
    {#if profileEditorOpen}
        <ProfileEditor
            {profiles}
            activeName={ui.profileName}
            onchange={saveProfiles}
            onapply={applyProfile}
            onclose={() => profileDialog?.close()}
        />
    {/if}
</dialog>

<dialog
    id="text-converter-dialog"
    bind:this={textConverterDialog}
    onclick={(e) => {
        if (e.target === e.currentTarget) textConverterDialog?.close();
    }}
    onclose={() => (document.activeElement as HTMLElement)?.blur()}
>
    <RkTextConverter onclose={() => textConverterDialog?.close()} />
</dialog>

<dialog
    id="memory-save-dialog"
    bind:this={memorySaveDialog}
    onclick={(e) => {
        if (e.target === e.currentTarget) memorySaveDialog?.close();
    }}
    onclose={onMemorySaveClose}
>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="mem-save" onkeydown={onMemSaveKey}>
        <h3>Сохранить память</h3>
        <div class="row">
            <label for="mem-save-start">Начало:</label>
            <input id="mem-save-start" type="text" maxlength="4" bind:value={memSaveStart} />
            <label for="mem-save-end">Конец:</label>
            <input id="mem-save-end" type="text" maxlength="4" bind:value={memSaveEnd} />
        </div>
        <div class="row">
            <span class="label">Длина:</span>
            <span class="value">{memSaveSize > 0 ? memSaveSize.toString(16).toUpperCase().padStart(4, "0") + ` (${memSaveSize})` : "—"}</span>
        </div>
        <div class="row">
            <label for="mem-save-fmt">Формат:</label>
            <select id="mem-save-fmt" bind:value={memSaveExt}>
                {#each RK86_EXTENSIONS as ext}
                    <option value={ext}>.{ext}</option>
                {/each}
            </select>
        </div>
        <div class="actions">
            <button type="button" class="save" onclick={doMemorySave} disabled={memSaveSize <= 0}>Сохранить</button>
        </div>
    </div>
</dialog>

<dialog
    id="iasm-dialog"
    bind:this={iasmDialog}
    onclick={(e) => {
        if (e.target === e.currentTarget) iasmDialog?.close();
    }}
    onclose={() => (document.activeElement as HTMLElement)?.blur()}
>
    <div class="iasm">
        <button type="button" class="iasm-close" title="Закрыть" onclick={() => iasmDialog?.close()}>✕</button>
        <iframe class="iasm-frame" title="Классический ассемблер" src={asset("/i8080asm/")}></iframe>
    </div>
</dialog>

<style>
    :global(body) {
        margin: 0;
        font-family: sans-serif;
    }
    #header,
    #footer {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 4px;
        width: 100%;
        padding: 8px;
        flex-shrink: 0; /* do not shrink header/footer */
        font-size: 0.75rem;
    }
    #header.hidden,
    #footer.hidden,
    .icon {
        width: 2em;
        height: 2em;
        vertical-align: middle;
    }
    button.icon {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px 2px;
        border: none;
        cursor: pointer;
    }
    button.active {
        padding: 2px;
        outline: 2px solid white;
        border-radius: 8px;
    }
    button.flashing {
        outline: 2px solid #4cf;
        border-radius: 8px;
        padding: 2px;
    }
    button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
    button {
        font-family: monospace;
    }
    #sound_image {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translateX(-50%) translateY(-50%);
        font-size: 10em;
        opacity: 0;
        transition: opacity 0.5s ease;
        pointer-events: none;
        z-index: 2000;
    }
    #sound_image.visible {
        opacity: 1;
    }
    .debugger-layout {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: 1fr auto auto;
        grid-template-rows: auto auto 1fr;
        gap: 0;
        width: 100%;
        overflow: hidden;
    }
    .debugger-canvas-wrap {
        grid-row: 1;
        grid-column: 1;
        width: fit-content;
        height: fit-content;
        cursor: pointer;
        border: 2px solid #333;
        position: relative;
    }
    .light-pen-marker {
        position: absolute;
        border: 2px solid red;
        box-sizing: border-box;
        pointer-events: none;
    }
    .debugger-map {
        grid-row: 1;
        grid-column: 2;
        padding: 4px;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        background-color: #000;
    }
    .canvas-placeholder {
        flex: 1;
        min-height: 0;
        min-width: 0;
        /* main is a column flexbox with align-items: start, so without
         * an explicit width the placeholder shrink-wraps its content.
         * Chrome resolves the canvas width:100% cycle via aspect-ratio
         * to the full width; Safari falls back to the canvas bitmap's
         * intrinsic width (narrow column on the left). */
        width: 100%;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }
    .canvas-placeholder canvas {
        width: 100%;
        height: 100%;
        aspect-ratio: 78 / 50;
        object-fit: contain;
        outline: 1px solid #666;
        outline-offset: -1px;
    }
    .debugger-canvas-wrap:hover,
    .canvas-focused {
        border-color: #4a9;
    }
    .debugger-disasm {
        /* Disassembler renders TWO sibling roots (.disasm-code and
         * .disasm-regs-data); flatten this wrapper so each lands in
         * its own grid cell — code in rows 1-2 col 3, regs+data in
         * row 3 col 3 next to the breakpoints. */
        display: contents;
    }
    .debugger-bps {
        grid-row: 3;
        grid-column: 1;
        overflow: hidden;
        border-top: 1px solid #333;
        min-height: 0;
        display: flex;
    }
    .debugger-bps > :global(*) {
        flex: 1;
        min-height: 0;
    }
    .debugger-cursor-info {
        grid-row: 2;
        grid-column: 1 / 3;
        border-top: 1px solid #333;
        display: flex;
        align-items: center;
        gap: 16px;
    }
    .dimmed {
        opacity: 0.6;
    }
    .modifier_active {
        color: #ffcc00;
    }
    .gauge {
        display: flex;
        width: fit-content;
        height: fit-content;
        gap: 4px;
        font-family: monospace;
    }
    .color-mode {
        all: unset;
        cursor: pointer;
        font-family: monospace;
        color: inherit;
    }
    .color-mode:hover {
        color: #ffcc00;
    }
    #shortcuts {
        position: fixed;
        top: 50%;
        left: 50%;
        translate: -50% -50%;
        margin: 0;
        background-color: #333333;
        color: white;
        padding: 10px;
        font-size: 1.2em;
        text-align: center;
        border: none;
        outline: none;
        border-radius: 8px;
    }
    #shortcuts::backdrop,
    #catalog-dialog::backdrop,
    #freeze-dialog::backdrop,
    #profile-dialog::backdrop,
    #text-converter-dialog::backdrop,
    #memory-save-dialog::backdrop,
    #iasm-dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.5);
    }
    #catalog-dialog,
    #freeze-dialog,
    #profile-dialog,
    #text-converter-dialog,
    #memory-save-dialog,
    #iasm-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        translate: -50% -50%;
        margin: 0;
        background-color: #222;
        color: white;
        padding: 16px;
        border: none;
        outline: none;
        border-radius: 8px;
    }
    #iasm-dialog {
        padding: 0;
        width: 90vw;
        height: 90vh;
        max-width: 90vw;
        max-height: 90vh;
        overflow: hidden;
    }
    .iasm {
        position: relative;
        width: 100%;
        height: 100%;
    }
    .iasm-frame {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
        background: white;
    }
    .iasm-close {
        position: absolute;
        top: 6px;
        right: 6px;
        z-index: 1;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 4px;
        background: rgba(34, 34, 34, 0.85);
        color: white;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
    }
    .iasm-close:hover {
        background: #444;
    }
    .mem-save h3 {
        margin: 0 0 12px;
        font-size: 1em;
        font-weight: 600;
    }
    .mem-save .row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
        font-family: monospace;
    }
    .mem-save label, .mem-save .label {
        color: #b0b6c0;
    }
    .mem-save .row > .label {
        width: 7ch;
    }
    .mem-save input[type="text"] {
        background: #2c333d;
        color: white;
        border: 1px solid #3a424d;
        border-radius: 4px;
        padding: 4px 6px;
        font-family: monospace;
        width: 6ch;
        text-transform: uppercase;
    }
    .mem-save select {
        background: #2c333d;
        color: white;
        border: 1px solid #3a424d;
        border-radius: 4px;
        padding: 4px 6px;
        font-family: monospace;
    }
    .mem-save .value {
        color: #b0d8ff;
    }
    .mem-save .actions {
        margin-top: 12px;
        text-align: right;
    }
    .mem-save .save {
        background: #4a6dbe;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 14px;
        cursor: pointer;
        font: inherit;
    }
    .mem-save .save:hover { background: #5b7fcf; }
    .mem-save .save:disabled {
        background: #444;
        cursor: not-allowed;
    }
    #shortcut-hint {
        all: unset;
        margin-left: auto;
        font-family: monospace;
        color: white;
        cursor: pointer;
    }
    #hint {
        position: fixed;
        right: 0;
        bottom: 0;
        transition: opacity 0.3s ease;
        font-size: 3em;
        background-color: white;
        color: black;
        white-space: nowrap;
        padding: 8px 10px;
        border-radius: 4px;
        z-index: 1000;
        pointer-events: none;
    }
    main {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: center;
        overflow: hidden;
        background-color: #000000;
        color: #ffffff;
    }
    .tape_active {
        color: white;
        background-color: green;
    }
    #drop-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.6);
        color: white;
        font-family: monospace;
        font-size: 2em;
        border: 4px dashed #ffcc00;
        z-index: 3000;
        pointer-events: none;
    }
</style>
