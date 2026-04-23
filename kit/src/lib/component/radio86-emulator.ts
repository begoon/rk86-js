// <radio86-emulator> web component
// Usage: <radio86-emulator monitor="mon32.bin" file="CHESS.GAM"></radio86-emulator>
// Default: 1:1 pixel scale. Use scale="auto" for browser-scaled rendering.

import { I8080 } from "../core/i8080.js";
import * as FileParser from "../core/rk86_file_parser.js";
import { rk86_font_image } from "../core/rk86_font.js";
import { Keyboard } from "../core/rk86_keyboard.js";
import type { SequenceAction } from "../core/rk86_keyboard_injector.js";
import { convert_keyboard_sequence } from "../core/rk86_keyboard_injector.js";
import type { Machine, MachineBuilder } from "../core/rk86_machine.js";
import { Memory } from "../core/rk86_memory.js";
import { Runner } from "../core/rk86_runner.js";
import { Screen } from "../core/rk86_screen.js";
import { rk86_snapshot_restore } from "../core/rk86_snapshot.js";
import { CanvasRenderer } from "../web/renderer.js";
import { Tape } from "../web/tape.js";

class MinimalUI {
    canvas: HTMLCanvasElement;
    visualizer_visible = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    resize_canvas(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    update_screen_geometry(_width: number, _height: number): void {}
    update_video_memory_address(_address: number): void {}
    update_ruslat = (_value: number): void => {};
    update_activity_indicator = (_active: boolean): void => {};
    update_written_bytes = (_count: number): void => {};
    hightlight_written_bytes = (_on: boolean): void => {};
    on_visualizer_hit: ((opcode: number) => void) | undefined;
    on_pause_changed: ((value: boolean) => void) | undefined;
    start_update_perf = () => {};

    screenshot() {}
    memory_snapshot() {}
    emulator_snapshot() {}
}

class IO {
    input = (_port: number): number => 0;
    output = (_port: number, _w8: number): void => {};
    interrupt = (_iff: number): void => {};
}

async function fetchFile(base: string, name: string): Promise<number[] | undefined> {
    const url = name.startsWith("http") ? name : `${base}${name}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return Array.from(new Uint8Array(await response.arrayBuffer()));
    } catch (error) {
        console.error(`radio86-emulator: failed to fetch ${url}:`, error);
    }
}

function commandInjector(keyboard: Keyboard, sequence: SequenceAction[], i: number): void {
    if (i >= sequence.length) return;
    const { keys, duration, action } = sequence[i];
    const call = action === "down" ? keyboard.onkeydown : keyboard.onkeyup;
    if (action !== "pause") {
        if (Array.isArray(keys)) {
            keys.forEach((key) => call(typeof key === "string" ? key : String(key)));
        } else {
            call(typeof keys === "string" ? keys : String(keys));
        }
    }
    setTimeout(() => commandInjector(keyboard, sequence, i + 1), +duration);
}

export class Radio86Emulator extends HTMLElement {
    private machine?: Machine;
    private keyboard?: Keyboard;
    private canvas?: HTMLCanvasElement;
    private _keydownHandler?: (e: KeyboardEvent) => void;
    private _keyupHandler?: (e: KeyboardEvent) => void;

    static get observedAttributes() {
        return ["monitor", "file", "scale", "files-path"];
    }

    connectedCallback() {
        this.canvas = document.createElement("canvas");
        this.canvas.style.display = "block";
        this.appendChild(this.canvas);
        this.boot();
    }

    disconnectedCallback() {
        if (this._keydownHandler) document.removeEventListener("keydown", this._keydownHandler);
        if (this._keyupHandler) document.removeEventListener("keyup", this._keyupHandler);
    }

    private async boot() {
        if (!this.canvas) return;

        const monitor = this.getAttribute("monitor") || "mon32.bin";
        const file = this.getAttribute("file");
        const scale = this.getAttribute("scale");
        const filesPath = this.getAttribute("files-path") || "files/";

        const keyboard = new Keyboard();
        this.keyboard = keyboard;
        const io = new IO();

        const machineBuilder: MachineBuilder = {
            font: rk86_font_image(),
            keyboard,
            io,
            log: (...args: unknown[]) => console.log(...args),
        };
        const machine = machineBuilder as Machine;
        this.machine = machine;

        machine.ui = new MinimalUI(this.canvas) as any;
        machine.memory = new Memory(machine);
        machine.cpu = new I8080(machine);
        machine.screen = new Screen(machine);
        machine.tape = new Tape(machine);
        machine.runner = new Runner(machine);

        machine.memory.update_ruslat = machine.ui.update_ruslat;

        // Load monitor ROM
        const monitorContent = await fetchFile(filesPath, monitor);
        if (!monitorContent) {
            console.error("radio86-emulator: failed to load monitor ROM");
            return;
        }
        const monitorFile = FileParser.parse_rk86_binary(monitor, monitorContent);
        machine.memory.load_file(monitorFile);

        machine.screen.start(new CanvasRenderer());

        // 1:1 pixel mapping unless scale="auto"
        if (scale !== "auto") {
            this.canvas.style.imageRendering = "pixelated";
        }

        const simulateKeyboard = (commands: SequenceAction[]) => {
            const queue = convert_keyboard_sequence(commands);
            commandInjector(keyboard, queue, 0);
        };

        let entryPoint: number | undefined;

        if (file) {
            const content = await fetchFile(filesPath, file);
            if (content) {
                const { ok, json } = FileParser.parse(content);
                if (ok) {
                    rk86_snapshot_restore(json, machine, simulateKeyboard);
                } else {
                    const parsed = FileParser.parse_rk86_binary(file, content);
                    machine.memory.load_file(parsed);
                    entryPoint = parsed.entry;
                }
            }
        }

        machine.runner.execute();

        if (entryPoint !== undefined) {
            setTimeout(() => machine.cpu.jump(entryPoint!), 500);
        }

        // Keyboard wiring
        this._keydownHandler = (e: KeyboardEvent) => {
            keyboard.onkeydown(e.code);
        };
        this._keyupHandler = (e: KeyboardEvent) => {
            keyboard.onkeyup(e.code);
        };
        document.addEventListener("keydown", this._keydownHandler);
        document.addEventListener("keyup", this._keyupHandler);

        machine.reset = () => {
            keyboard.reset();
            machine.cpu.jump(0xf800);
        };
        machine.restart = () => {
            machine.memory.zero_ram();
            machine.reset();
        };
        machine.pause = (paused: boolean) => {
            machine.runner.paused = paused;
        };

        this.dispatchEvent(new CustomEvent("ready", { detail: { machine } }));
    }
}

if (!customElements.get("radio86-emulator")) {
    customElements.define("radio86-emulator", Radio86Emulator);
}
