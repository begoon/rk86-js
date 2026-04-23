import { ui } from "../../routes/state.svelte.js";
import { hex16 } from "../core/hex.js";
import { I8080 } from "../core/i8080.js";
import type { RK86File } from "../core/rk86_file_parser.js";
import * as FileParser from "../core/rk86_file_parser.js";
import { rk86_font_image } from "../core/rk86_font.js";
import { Keyboard } from "../core/rk86_keyboard.js";
import type { SequenceAction } from "../core/rk86_keyboard_injector.js";
import { convert_keyboard_sequence } from "../core/rk86_keyboard_injector.js";
import type { Machine, MachineBuilder } from "../core/rk86_machine.js";
import { Memory } from "../core/rk86_memory.js";
import { Runner } from "../core/rk86_runner.js";
import { Screen } from "../core/rk86_screen.js";
import { rk86_snapshot, rk86_snapshot_restore } from "../core/rk86_snapshot.js";
import { CanvasRenderer } from "./renderer.js";
import { saveAs } from "./saver.js";
import { Sound } from "./sound.js";
import { Tape } from "./tape.js";
const elements = new Map();

// ---

class IO {
    input = (port: number): number => 0;
    output = (port: number, w8: number): void => {};
    interrupt = (iff: number): void => {};
}

export class UI {
    machine: Machine;
    canvas: HTMLCanvasElement;
    ips!: HTMLElement;
    tps!: HTMLElement;
    meta_press_count = 0;
    command_mode = false;
    screenshot_name = "rk86-screen";
    screenshot_count = 1;
    memory_snapshot_name = "rk86-memory";
    memory_snapshot_count = 1;
    terminal!: { put: (str: string) => void; history: string[] };
    i8080disasm: unknown;
    visualizer: unknown;
    visualizer_visible = false;
    on_visualizer_hit: ((opcode: number) => void) | undefined;
    on_pause_changed: ((value: boolean) => void) | undefined;
    refreshDebugger: (() => void) | undefined;

    constructor(machine: Machine, canvas: HTMLCanvasElement) {
        this.machine = machine;
        this.canvas = canvas;

        if (!this.canvas || !this.canvas.getContext) {
            console.log("tag <canvas> is not supported in the browser");
            return;
        }
    }

    start_update_perf = () => setInterval(() => this.update_perf(), 2000);

    resize_canvas(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    fullscreen() {
        this.canvas.requestFullscreen();
    }

    reset() {
        this.machine.keyboard.reset();
        this.machine.cpu.jump(0xf800);
        console.log("%creset", "color: lightgreen; font-weight: bold");
    }

    restart() {
        this.machine.memory.zero_ram();
        this.reset();
    }

    update_ruslat = (value: number): void => {
        ui.rusLat = Boolean(value);
    };

    update_perf() {
        ui.ips = this.machine.runner.instructions_per_millisecond;
        ui.tps = this.machine.runner.ticks_per_millisecond;
    }

    update_video_memory_address(address: number): void {
        ui.videoMemoryBase = address;
    }

    update_screen_geometry(width: number, height: number): void {
        ui.screenWidth = width;
        ui.screenHeight = height;
    }

    computer_snapshot_name = "rk86-snapshot";
    computer_snapshot_count = 1;

    emulator_snapshot() {
        const json = rk86_snapshot(this.machine, "2.0.0");
        const filename = `${this.computer_snapshot_name}-${this.computer_snapshot_count}.json`;
        const blob = new Blob([json], { type: "application/json" });
        saveAs(blob, filename);
        this.computer_snapshot_count += 1;
    }

    screenshot() {
        const filename = `${this.screenshot_name}-${this.screenshot_count}.png`;
        this.screenshot_count += 1;
        this.canvas.toBlob((blob: Blob | null) => blob && saveAs(blob, filename));
    }

    memory_snapshot() {
        const snapshot = new Uint8Array(this.machine.memory.snapshot(0, 0x10000));
        const blob = new Blob([snapshot], { type: "application/octet-stream" });
        const filename = `${this.memory_snapshot_name}-${this.memory_snapshot_count}.bin`;
        saveAs(blob, filename);
        this.memory_snapshot_count += 1;
    }

    update_activity_indicator = (active: boolean): void => {
        ui.tapeActivityActive = active;
    };

    update_written_bytes = (count: number): void => {
        ui.tapeWrittenBytes = count;
    };

    hightlight_written_bytes = (on: boolean): void => {
        ui.tapeHighlight = on;
    };
}

function filenameURL(name: string): string {
    if (name.startsWith("http") || name.startsWith("$lib/")) return name;
    return "files/" + name;
}

const basename = (url: string): string => url.split("/").at(-1) || url;

export interface DecodedDataURL {
    name: string;
    content: number[];
}

export function decode_data_url(url: string): DecodedDataURL | undefined {
    if (!url.startsWith("data:")) return undefined;
    const comma = url.indexOf(",");
    if (comma < 0) return undefined;
    const params = url.substring(5, comma).split(";");
    const payload = url.substring(comma + 1);
    if (!params.includes("base64")) {
        console.error(`встроенный data URL должен быть base64: ${params.join(";")}`);
        return undefined;
    }
    const nameParam = params.find((p) => p.startsWith("name="));
    const name = nameParam ? decodeURIComponent(nameParam.slice(5)) : "inline.bin";
    try {
        const normalized = decodeURIComponent(payload).replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(normalized);
        const bytes = new Array<number>(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        console.log(`декодирован встроенный data URL [${name}], длиной ${bytes.length} байт`);
        return { name, content: bytes };
    } catch (error) {
        console.error(`ошибка декодирования data URL: ${error}`);
        return undefined;
    }
}

async function fetch_file(name: string): Promise<number[] | undefined> {
    const inline = decode_data_url(name);
    if (inline) return inline.content;
    const url = filenameURL(name);
    console.log(`скачиваем файл [${url}]`);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`ошибка HTTP: ${response.status}`);
        const content = Array.from(new Uint8Array(await response.arrayBuffer()));
        console.log(`скачен файл [${basename(url)}] длиной ${content.length} байт`);
        return content;
    } catch (error) {
        console.error(`ошибка загрузки файла ${url}: ${error}`);
    }
}

const KEY_CODES: Record<number, string> = {
    8: "Backspace",
    9: "Tab",
    13: "Enter",
    16: "ShiftRight",
    17: "ControlLeft",
    32: "Space",
    35: "F9",
    36: "F8",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    46: "Backquote",
    48: "Digit0",
    49: "Digit1",
    50: "Digit2",
    51: "Digit3",
    52: "Digit4",
    53: "Digit5",
    54: "Digit6",
    55: "Digit7",
    56: "Digit8",
    57: "Digit9",
    65: "KeyA",
    66: "KeyB",
    67: "KeyC",
    68: "KeyD",
    69: "KeyE",
    70: "KeyF",
    71: "KeyG",
    72: "KeyH",
    73: "KeyI",
    74: "KeyJ",
    75: "KeyK",
    76: "KeyL",
    77: "KeyM",
    78: "KeyN",
    79: "KeyO",
    80: "KeyP",
    81: "KeyQ",
    82: "KeyR",
    83: "KeyS",
    84: "KeyT",
    85: "KeyU",
    86: "KeyV",
    87: "KeyW",
    88: "KeyX",
    89: "KeyY",
    90: "KeyZ",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    121: "F10",
    186: "Semicolon",
    188: "Comma",
    189: "Minus",
    190: "Period",
    192: "Quote",
    191: "Slash",
    219: "BracketLeft",
    221: "BracketRight",
    226: "Backslash",
};

function translate_key(key: string | number): string {
    if (typeof key === "string") return key;
    return KEY_CODES[key];
}

async function load_catalog_file(name: string): Promise<RK86File | undefined> {
    const content = await fetch_file(name);
    if (!content) return undefined;
    console.log(`загрузка файла [${name}] из каталога размером ${content.length} байт`);
    const file = FileParser.parse_rk86_binary(name, content);
    console.log(
        `загружен файл двоичный РК86`,
        `[${file.name}]`,
        `c адреса ${hex16(file.start)} до ${hex16(file.end)},`,
        `запуск: G${hex16(file.entry)}`,
    );
    return file;
}

function parseAndPlaceFile(
    machine: Machine,
    simulate_keyboard: (commands: SequenceAction[]) => void,
    name: string,
    binary: number[],
): void {
    ui.selectedFile = undefined;
    ui.selectedFileName = "";

    console.log(`размещаем файл [${name}] длиной ${binary.length} в память эмулятора`);
    const { ok, json } = FileParser.parse(binary);
    if (ok) {
        rk86_snapshot_restore(json, machine, simulate_keyboard);
        const pc = parseInt(json.cpu.pc);
        console.log(`образ [${name}] загружен, PC=${hex16(pc)}`);
        ui.selectedFileName = name;
        ui.selectedFileStart = 0;
        ui.selectedFileEnd = 0;
        ui.selectedFileSize = 0;
        ui.selectedFileEntry = pc;
        return;
    }
    try {
        const file = FileParser.parse_rk86_binary(name, binary);
        machine.memory.load_file(file);
        console.log(
            `загружен файл [${name}] ` +
                `c адреса ${hex16(file.start, "0x")} по ${hex16(file.end, "0x")}, ` +
                `запуск: G${file.entry.toString(16)}`,
        );
        ui.selectedFile = file;
        ui.selectedFileName = file.name;
        ui.selectedFileStart = file.start;
        ui.selectedFileEnd = file.end;
        ui.selectedFileSize = file.end - file.start + 1;
        ui.selectedFileEntry = file.entry;
    } catch (e) {
        console.error(e);
    }
}

function command_injector(keyboard: Keyboard, sequence: SequenceAction[], i: number): void {
    if (i >= sequence.length) return;
    const { keys, duration, action } = sequence[i];
    const call = action === "down" ? keyboard.onkeydown : keyboard.onkeyup;
    if (action !== "pause") {
        if (Array.isArray(keys)) {
            keys.forEach((key) => call(translate_key(key)));
        } else {
            call(translate_key(keys));
        }
    }
    setTimeout(() => command_injector(keyboard, sequence, i + 1), +duration);
}

export interface HostCallbacks {
    canvas: HTMLCanvasElement;
    onkeydown: (handler: (code: string) => void) => void;
    onkeyup: (handler: (code: string) => void) => void;
}

export async function main(host: HostCallbacks) {
    const { canvas } = host;
    const keyboard = new Keyboard();
    const io = new IO();

    const machineBuilder: MachineBuilder = {
        font: rk86_font_image(),
        keyboard,
        io,
        log: (...args: unknown[]) => console.log(...args),
    };
    const machine = machineBuilder as Machine;

    machine.ui = new UI(machine, canvas);
    machine.ui.canvas = canvas;

    machine.memory = new Memory(machine);
    console.log("память инициализирована");

    machine.cpu = new I8080(machine);
    console.log("процессор инициализирован");

    machine.screen = new Screen(machine);
    console.log("экран инициализирован");

    machine.tape = new Tape(machine);
    console.log("магнитофон инициализирован");

    machine.runner = new Runner(machine);
    machine.runner.sound_factory = () => new Sound();
    console.log("исполнитель инициализирован");

    machine.memory.update_ruslat = machine.ui.update_ruslat;

    function simulate_keyboard(commands: SequenceAction[]): void {
        const queue = convert_keyboard_sequence(commands);
        command_injector(keyboard, queue, 0);
    }

    async function loadAutoexecFile(name: string): Promise<void> {
        const inline = decode_data_url(name);
        if (inline) {
            parseAndPlaceFile(machine, simulate_keyboard, inline.name, inline.content);
            return;
        }
        const content = await fetch_file(name);
        if (!content) return;
        parseAndPlaceFile(machine, simulate_keyboard, name, content);
    }

    const monitor = await load_catalog_file("mon32.bin");
    if (!monitor) {
        alert("ошибка загрузки монитора mon32.bin");
        return;
    }
    machine.memory.load_file(monitor);
    console.log("монитор загружен в память");

    machine.screen.start(new CanvasRenderer());
    console.log("экран запущен");

    const url = window.location.href;

    let match;
    const auto_run = (match = url.match(/(file|run)=([^&]+)/)) ? decodeURIComponent(match[2]) : null;
    const auto_load = (match = url.match(/load=([^&]+)/)) ? decodeURIComponent(match[1]) : null;
    const handoff_id = (match = url.match(/handoff=([^&]+)/)) ? decodeURIComponent(match[1]) : null;

    // `handoff=<uuid>` is a same-origin handoff from the asm8 playground: it
    // writes `{ts, url}` JSON to localStorage under `asm8-handoff:<uuid>`
    // (url = data-URL carrying the assembled .rk) to avoid URL-length limits,
    // then opens us with the id. Read + delete + treat as a regular auto-run.
    let handoff_url: string | null = null;
    if (handoff_id) {
        const key = `asm8-handoff:${handoff_id}`;
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                localStorage.removeItem(key);
                const payload = JSON.parse(raw);
                if (typeof payload?.url === "string") handoff_url = payload.url;
            }
        } catch {}
        if (!handoff_url) console.warn(`handoff ключ не найден или повреждён: ${key}`);
    }

    if (handoff_url) {
        console.log(`автозагрузка и запуск handoff ${handoff_id}`);
        await loadAutoexecFile(handoff_url);
    } else if (auto_run) {
        console.log(`автозагрузка и запуск файла ${auto_run}`);
        await loadAutoexecFile(auto_run);
    } else if (auto_load) {
        console.log(`автозагрузка файла (без запуска) ${auto_load}`);
        await loadAutoexecFile(auto_load);
    }

    machine.runner.execute();

    if ((auto_run || handoff_url) && ui.selectedFile) {
        // Route through the monitor's G command (same path as the toolbar
        // "Run" button) instead of cpu.jump, so the monitor is at a clean
        // prompt and keyboard state is consistent — otherwise programs like
        // ALIAZ1 inherit stale state and misbehave.
        setTimeout(() => machine.runLoadedFile(), 500);
    }

    function reset() {
        machine.keyboard.reset();
        machine.cpu.jump(0xf800);
    }

    function restart() {
        machine.memory.zero_ram();
        reset();
    }

    function pause(value: boolean) {
        machine.runner.paused = value;
        machine.ui.on_pause_changed?.(value);
    }

    machine.reset = reset;
    machine.restart = restart;
    machine.pause = pause;

    machine.loadCatalogFile = async (name: string) => {
        const content = await fetch_file(name);
        if (!content) return;
        parseAndPlaceFile(machine, simulate_keyboard, name, content);
    };

    machine.runLoadedFile = () => {
        if (!ui.selectedFile) return;
        // Route through the monitor's G command instead of jumping the CPU
        // directly: a direct jump can leave the monitor mid-prompt-loop with
        // inconsistent keyboard state that the program then inherits.
        const hex = ui.selectedFile.entry.toString(16).toUpperCase();
        const digitKeys = [...hex].map((c) => (c >= "0" && c <= "9" ? `Digit${c}` : `Key${c}`));
        const sequence: SequenceAction[] = [
            { keys: "KeyG", duration: 100, action: "press" },
            ...digitKeys.map((k) => ({ keys: k, duration: 100, action: "press" as const })),
            { keys: "Enter", duration: 100, action: "press" },
        ];
        simulate_keyboard(sequence);
    };

    machine.uploadFile = async (file: File) => {
        const data = await file.arrayBuffer();
        const binary = Array.from(new Uint8Array(data));
        console.log(`загружен внешний файл [${file.name}], размер ${binary.length} байт`);
        parseAndPlaceFile(machine, simulate_keyboard, file.name, binary);
    };

    function updateModifiers() {
        ui.modifierSS = (keyboard.modifiers & 0x20) === 0;
        ui.modifierUS = (keyboard.modifiers & 0x40) === 0;
    }

    host.onkeydown((code) => {
        keyboard.onkeydown(code);
        updateModifiers();
    });
    host.onkeyup((code) => {
        keyboard.onkeyup(code);
        updateModifiers();
    });

    machine.ui.start_update_perf();
    return machine;
}
