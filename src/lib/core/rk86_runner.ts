import type { Machine } from "./rk86_machine.js";
import { COLOR_MODES } from "./rk86_colors.js";
import type { SoundAdapter } from "./rk86_sound_interface.js";

export interface ExecuteOptions {
    terminate_address?: number;
    on_terminate?: () => void;
    exit_on_halt?: boolean;
    // Web trap: fired right after an HLT executes (PC has been pinned back
    // to the HLT opcode by the CPU). Return true to stop the batch (callback
    // is expected to have paused the runner); return false/void to keep
    // running (HLT will pin PC and effectively spin in place).
    on_halt?: () => boolean | void;
    // Fires every BATCH_TICKS-tick CPU boundary (≈10 мс эмулируемого
    // времени). Намеренно НЕ зависит от wall-clock: терминал/e2e-тесты
    // диспатчат `--input`-события сравнивая `at_ticks <= total_ticks`,
    // что должно совпадать tick-в-tick между прогонами.
    on_batch_complete?: () => void;
    // Turbo: гонит CPU «как можно быстрее на main thread» (без wall-clock-
    // пэйсинга), уступая управление каждые ~5 мс через setTimeout(0).
    // В обычном режиме планировщик ровно держит ~1.78 МГц CPU на
    // wall-clock (см. execute).
    turbo?: boolean;
}

export class Runner {
    paused = false;
    turbo = false;
    hardware_id_enabled = false;
    stc_streak = 0;
    tracer: ((when: string) => void) | null = null;
    last_instructions: number[] = [];
    total_ticks = 0;
    total_instructions = 0;
    last_iff = 0;
    sound: SoundAdapter | null = null;
    sound_factory?: () => SoundAdapter;
    instructions_per_millisecond = 0;
    ticks_per_millisecond = 0;
    FREQ = 1780000;
    execute_timer: ReturnType<typeof setTimeout> | undefined;
    machine: Machine;

    // Гранулярность on_batch_complete / tick_cursor: тиков, после
    // которых дёргаются хуки. Исторически = FREQ/100 ≈ 10 мс эмуляции;
    // e2e-тесты диспатчат `--input`-события на этих границах, поэтому
    // менять без необходимости нельзя.
    BATCH_TICKS: number;
    // Тиков на 1 мс wall-clock при real-time-пэйсинге (1.78 МГц CPU).
    TICKS_PER_WALL_MS: number;

    constructor(machine: Machine) {
        this.machine = machine;
        this.BATCH_TICKS = this.FREQ / 100;
        this.TICKS_PER_WALL_MS = this.FREQ / 1000;

        this.machine.io.interrupt = (iff: number) => this.interrupt(iff);
        this.machine.cpu.jump(this.machine.memory.profile.boot_address);
    }

    interrupt(iff: number) {
        if (!this.sound || this.turbo) return;
        if (this.last_iff == iff) return;
        this.last_iff = iff;
        this.sound.out(iff, this.total_ticks);
    }

    init_sound(enabled: boolean) {
        if (enabled && this.sound == null && this.sound_factory) {
            this.sound = this.sound_factory();
            this.machine.log("звук включен");
        } else if (!enabled) {
            this.sound?.done?.();
            this.sound = null;
            this.machine.log("звук выключен");
        }
    }

    // «Fair»-планировщик: каждый квант через
    // `setTimeout(0)` догоняет CPU по фактически прошедшему wall-clock,
    // а не работает фиксированными 10-мс батчами со сном между ними.
    // Зачем: между батчами в старой модели был ровно 10 мс зазор без
    // событий в Web Audio — слышно как 100 Гц-буз поверх музыки. И
    // рендер всегда видел «согласованное» состояние конца батча — нет
    // mid-frame-эффектов (вроде «срыва кадровой синхронизации»). Теперь
    // CPU работает плотно микро-квантами.
    //
    // Турбо здесь — это «гнать как можно быстрее за TURBO_BUDGET_MS на
    // main thread», без wall-clock-пэйсинга. Как и раньше.
    //
    // Чтобы не сломать детерминизм e2e-тестов (которые диспатчат
    // клавиатурные события по `at_ticks <= total_ticks`), хуки
    // `on_batch_complete` и `tick_cursor` дёргаются строго по
    // CPU-тиковым границам кратным BATCH_TICKS — независимо от того,
    // сколько микро-квантов прошло.
    execute(options: ExecuteOptions = {}) {
        const { terminate_address, on_terminate, exit_on_halt, on_halt, on_batch_complete } = options;
        if (options.turbo !== undefined) this.turbo = options.turbo;
        clearTimeout(this.execute_timer);

        const QUANTUM_BUDGET_MS = 5;
        const TURBO_BUDGET_MS = 50; // даёт ~30-50× от real-time, как старое «100 батчей за макротаск»
        const MAX_DT_MS = 100; // огр. catch-up после tab-suspend
        const PAUSED_TICK_MS = 50;
        const PERF_WINDOW_MS = 500; // окно для замера IPS/TPS (wall-clock)

        let next_batch_boundary = this.total_ticks + this.BATCH_TICKS;
        let last_call_time = performance.now();
        let perf_window_start_wall = last_call_time;
        let perf_window_start_instructions = this.total_instructions;
        let perf_window_start_ticks = this.total_ticks;

        const tick = (): void => {
            if (this.paused) {
                last_call_time = performance.now();
                perf_window_start_wall = last_call_time;
                perf_window_start_instructions = this.total_instructions;
                perf_window_start_ticks = this.total_ticks;
                next_batch_boundary = this.total_ticks + this.BATCH_TICKS;
                this.execute_timer = setTimeout(tick, PAUSED_TICK_MS);
                return;
            }

            const call_start = performance.now();
            const dt_ms = Math.min(call_start - last_call_time, MAX_DT_MS);
            last_call_time = call_start;

            const target_total = this.turbo
                ? Number.POSITIVE_INFINITY
                : this.total_ticks + dt_ms * this.TICKS_PER_WALL_MS;
            const deadline = call_start + (this.turbo ? TURBO_BUDGET_MS : QUANTUM_BUDGET_MS);

            let terminated = false;

            while (!this.paused && !terminated && this.total_ticks < target_total && performance.now() < deadline) {
                if (this.tracer) {
                    this.tracer("before");
                    if (this.paused) break;
                }
                this.last_instructions.push(this.machine.cpu.pc);
                if (this.last_instructions.length > 5) this.last_instructions.shift();

                const opcode_pc = this.machine.cpu.pc;
                this.machine.memory.invalidate_access_variables();
                const instruction_ticks = this.machine.cpu.instruction();
                this.total_ticks += instruction_ticks;
                this.total_instructions += 1;

                if (this.hardware_id_enabled) {
                    if (this.machine.memory.read_raw(opcode_pc) === 0x37) {
                        if (++this.stc_streak >= 4) {
                            this.stc_streak = 0;
                            this.fire_hardware_id();
                        }
                    } else {
                        this.stc_streak = 0;
                    }
                }

                if (this.tracer) {
                    this.tracer("after");
                    if (this.paused) break;
                }
                if (this.machine.ui.visualizer_visible && this.machine.ui.on_visualizer_hit) {
                    this.machine.ui.on_visualizer_hit(this.machine.memory.read_raw(this.machine.cpu.pc));
                }
                if (terminate_address !== undefined && this.machine.cpu.pc === terminate_address) {
                    on_terminate?.();
                    return;
                }
                if (this.machine.memory.read_raw(this.machine.cpu.pc) === 0x76) {
                    if (exit_on_halt) {
                        on_terminate?.();
                        return;
                    }
                    if (on_halt && on_halt()) {
                        terminated = true;
                        break;
                    }
                }

                // Хуки на BATCH_TICKS-выровненных границах — даёт
                // детерминизм для e2e-тестов и стабильный мерцание курсора.
                if (this.total_ticks >= next_batch_boundary) {
                    this.machine.screen.tick_cursor(
                        this.total_ticks,
                        this.FREQ * (this.machine.screen.cursor_rate / 1000),
                    );
                    on_batch_complete?.();
                    next_batch_boundary += this.BATCH_TICKS;
                }
            }

            // Скользящее окно метрик: считаем по wall-clock, а не по
            // времени работы внутри кванта — иначе при коротких квантах
            // с большими yield-перерывами IPS получится завышенным.
            const window_elapsed = performance.now() - perf_window_start_wall;
            if (window_elapsed >= PERF_WINDOW_MS) {
                this.instructions_per_millisecond =
                    (this.total_instructions - perf_window_start_instructions) / window_elapsed;
                this.ticks_per_millisecond = (this.total_ticks - perf_window_start_ticks) / window_elapsed;
                perf_window_start_wall = performance.now();
                perf_window_start_instructions = this.total_instructions;
                perf_window_start_ticks = this.total_ticks;
            }

            this.execute_timer = setTimeout(tick, 0);
        };

        tick();
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }

    reset() {
        this.machine.cpu.jump(this.machine.memory.profile.boot_address);
        this.machine.keyboard.reset();
    }

    // Hardware-ID hook fired after four consecutive STC instructions when
    // `hardware_id_enabled` is on. Real i8080 leaves CF=1 after STC×4;
    // we clear it to signal "this is an emulator" and load capability
    // bytes into registers. Protocol documented in info/RK86.md.
    private fire_hardware_id() {
        const colorIdx = COLOR_MODES.indexOf(this.machine.screen.color_mode);
        this.machine.cpu.set_a(1); // emulator id: 1 = rk86-js
        this.machine.cpu.set_b(colorIdx < 0 ? 0 : colorIdx);
        this.machine.cpu.set_c(this.turbo ? 1 : 0);
        this.machine.cpu.cf = 0;
    }
}
