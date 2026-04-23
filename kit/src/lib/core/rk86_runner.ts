import type { Machine } from "./rk86_machine.js";
import type { SoundAdapter } from "./rk86_sound_interface.js";

export interface ExecuteOptions {
    terminate_address?: number;
    on_terminate?: () => void;
    exit_on_halt?: boolean;
    on_batch_complete?: () => void;
    // Run many batches back-to-back per macrotask, yielding with setTimeout(0)
    // between calls. Tests see the same per-tick behavior (on_batch_complete
    // still fires every batch) but the wall-clock runs ~100x faster.
    turbo?: boolean;
}

export class Runner {
    paused = false;
    tracer: ((when: string) => void) | null = null;
    last_instructions: number[] = [];
    previous_batch_time = 0;
    total_ticks = 0;
    last_iff_raise_ticks = 0;
    last_iff = 0;
    sound: SoundAdapter | null = null;
    sound_factory?: () => SoundAdapter;
    instructions_per_millisecond = 0;
    ticks_per_millisecond = 0;
    FREQ = 1780000;
    TICK_PER_MS: number;
    execute_timer: ReturnType<typeof setTimeout> | undefined;
    machine: Machine;

    constructor(machine: Machine) {
        this.machine = machine;
        this.TICK_PER_MS = this.FREQ / 100;

        this.machine.io.interrupt = (iff: number) => this.interrupt(iff);
        this.machine.cpu.jump(0xf800);
    }

    interrupt(iff: number) {
        if (!this.sound) return;
        if (this.last_iff == iff) return;
        if (this.last_iff == 0 && iff == 1) {
            this.last_iff_raise_ticks = this.total_ticks;
        }
        if (this.last_iff == 1 && iff == 0) {
            const tone_ticks = this.total_ticks - this.last_iff_raise_ticks;
            const tone = this.FREQ / (tone_ticks * 2);
            const duration = 1 / tone;
            this.sound.play(tone, duration);
        }
        this.last_iff = iff;
    }

    init_sound(enabled: boolean) {
        if (enabled && this.sound == null && this.sound_factory) {
            this.sound = this.sound_factory();
            this.machine.log("звук включен");
        } else if (!enabled) {
            this.sound = null;
            this.machine.log("звук выключен");
        }
    }

    execute(options: ExecuteOptions = {}) {
        const { terminate_address, on_terminate, exit_on_halt, on_batch_complete, turbo } = options;
        clearTimeout(this.execute_timer);
        const bursts = turbo ? 100 : 1;
        for (let burst = 0; burst < bursts; burst++) {
            if (this.paused) break;
            let batch_ticks = 0;
            let batch_instructions = 0;
            while (batch_ticks < this.TICK_PER_MS) {
                if (this.tracer) {
                    this.tracer("before");
                    if (this.paused) break;
                }
                this.last_instructions.push(this.machine.cpu.pc);
                if (this.last_instructions.length > 5) {
                    this.last_instructions.shift();
                }
                this.machine.memory.invalidate_access_variables();
                const instruction_ticks = this.machine.cpu.instruction();
                batch_ticks += instruction_ticks;
                this.total_ticks += instruction_ticks;

                if (this.tracer) {
                    this.tracer("after");
                    if (this.paused) break;
                }
                if (this.machine.ui.visualizer_visible && this.machine.ui.on_visualizer_hit) {
                    this.machine.ui.on_visualizer_hit(this.machine.memory.read_raw(this.machine.cpu.pc));
                }
                batch_instructions += 1;
                if (terminate_address !== undefined && this.machine.cpu.pc === terminate_address) {
                    on_terminate?.();
                    return;
                }
                if (exit_on_halt && this.machine.memory.read_raw(this.machine.cpu.pc) === 0x76) {
                    on_terminate?.();
                    return;
                }
            }
            const now = performance.now();
            const elapsed = now - this.previous_batch_time;
            this.previous_batch_time = now;

            this.instructions_per_millisecond = batch_instructions / elapsed;
            this.ticks_per_millisecond = batch_ticks / elapsed;
            this.machine.screen.tick_cursor(this.total_ticks, this.FREQ * (this.machine.screen.cursor_rate / 1000));
            on_batch_complete?.();
        }
        this.execute_timer = setTimeout(() => this.execute(options), turbo ? 0 : 10);
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }

    reset() {
        this.machine.cpu.jump(0xf800);
        this.machine.keyboard.reset();
    }
}
