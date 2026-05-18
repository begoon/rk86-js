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
    // Fires every TICK_PER_MS-tick CPU boundary (≈10 мс эмулируемого
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

    // «Fair»-планировщик в стиле 86rk.ru: каждый квант через
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
    // CPU-тиковым границам кратным TICK_PER_MS — независимо от того,
    // сколько микро-квантов прошло.
    execute(options: ExecuteOptions = {}) {
        const { terminate_address, on_terminate, exit_on_halt, on_halt, on_batch_complete } = options;
        if (options.turbo !== undefined) this.turbo = options.turbo;
        clearTimeout(this.execute_timer);

        const QUANTUM_BUDGET_MS = 5;
        const TURBO_BUDGET_MS = 5;
        const MAX_DT_MS = 100; // огр. catch-up после tab-suspend
        const PAUSED_TICK_MS = 50;
        const PERF_ALPHA = 0.1;

        let next_batch_boundary = this.total_ticks + this.TICK_PER_MS;
        let last_call_time = performance.now();

        const tick = (): void => {
            if (this.paused) {
                last_call_time = performance.now();
                next_batch_boundary = this.total_ticks + this.TICK_PER_MS;
                this.execute_timer = setTimeout(tick, PAUSED_TICK_MS);
                return;
            }

            const call_start = performance.now();
            const dt_ms = Math.min(call_start - last_call_time, MAX_DT_MS);
            last_call_time = call_start;

            const target_total = this.turbo
                ? Number.POSITIVE_INFINITY
                : this.total_ticks + dt_ms * this.TICK_PER_MS;
            const deadline = call_start + (this.turbo ? TURBO_BUDGET_MS : QUANTUM_BUDGET_MS);

            let quantum_instructions = 0;
            let quantum_ticks = 0;
            let terminated = false;

            while (
                !this.paused &&
                !terminated &&
                this.total_ticks < target_total &&
                performance.now() < deadline
            ) {
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
                quantum_ticks += instruction_ticks;
                quantum_instructions += 1;

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

                // Хуки на TICK_PER_MS-выровненных границах — даёт
                // детерминизм для e2e-тестов и стабильный курсор-мерцания.
                if (this.total_ticks >= next_batch_boundary) {
                    this.machine.screen.tick_cursor(
                        this.total_ticks,
                        this.FREQ * (this.machine.screen.cursor_rate / 1000),
                    );
                    on_batch_complete?.();
                    next_batch_boundary += this.TICK_PER_MS;
                }
            }

            const elapsed = performance.now() - call_start;
            if (elapsed > 0 && quantum_instructions > 0) {
                const ips_now = quantum_instructions / elapsed;
                const tps_now = quantum_ticks / elapsed;
                this.instructions_per_millisecond = this.instructions_per_millisecond
                    ? (1 - PERF_ALPHA) * this.instructions_per_millisecond + PERF_ALPHA * ips_now
                    : ips_now;
                this.ticks_per_millisecond = this.ticks_per_millisecond
                    ? (1 - PERF_ALPHA) * this.ticks_per_millisecond + PERF_ALPHA * tps_now
                    : tps_now;
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
        this.machine.cpu.jump(0xf800);
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
