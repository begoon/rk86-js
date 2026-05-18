import { DEFAULT_COLOR_MODE, type ColorMode } from "./rk86_colors.js";
import { fromHex, hex16 } from "./hex.js";
import type { Machine } from "./rk86_machine.js";
import type { Renderer } from "./rk86_renderer_interface.js";

export interface ScreenSnapshot {
    scale_x: number;
    scale_y: number;
    width: number;
    height: number;
    cursor_state: number;
    cursor_x: number;
    cursor_y: number;
    video_memory_base: string;
    video_memory_size: string;
    light_pen_x: number;
    light_pen_y: number;
    light_pen_active: number;
}

export type RenderMode = "vg75" | "monitor";

export class Screen {
    // Тактовая частота символьного клока ВГ75 в РК86: pixel_clock (8 МГц) /
    // font_width (6) ≈ 1.333 МГц. Используется для расчёта FramePeriod
    // из регистров ВГ75 (см. frame_period_ms).
    static CHAR_CLOCK_HZ = 8_000_000 / 6;
    // Фолбэк, когда рендер вызывается до инициализации ВГ75 (ready=false).
    static #IDLE_RENDER_MS = 40;

    machine: Machine;
    cursor_rate: number;
    scale_x: number;
    scale_y: number;
    width: number;
    height: number;
    cursor_state: boolean;
    cursor_x: number;
    cursor_y: number;
    light_pen_x: number;
    light_pen_y: number;
    light_pen_active: number;
    video_memory_base = 0;
    video_memory_size = 0;
    transparent_attr = false;
    // Total scan lines per character row (= char_height of the i8275 SCN3
    // low nibble + 1). The charROM glyph is always 8 scan lines tall; any
    // excess scan lines become an inter-row gap below the glyph. The RK86
    // monitor programs 10 (8-line glyph + 2-line gap); programs that want
    // gap-less line graphics drop this to 8.
    char_height = 10;
    // Scan line index (0-based) where the i8275 asserts LTEN, drawing the
    // underline bar. From SCN3 high nibble. Standard monitor's 0x79 →
    // line 7 (the last scan line of an 8-line glyph in a 10-line row);
    // programs may move it higher or lower.
    underline_scanline = 7;
    color_mode: ColorMode = DEFAULT_COLOR_MODE;
    ready = false;
    // HRTC chars и VRTC rows из инициализации ВГ75 (SCN4 нижний ниббл,
    // SCN2 верхние 2 бита). Дефолты совпадают со значениями, которые
    // ставит штатный монитор РК86 (SCN2 = 0x1D → V=1, SCN4 = 0x93 →
    // H=8). Используются в frame_period_ms().
    hrtc_chars = 8;
    vrtc_rows = 1;
    // Режим перерисовки канваса:
    //   "vg75"    — setTimeout с периодом frame_period_ms() (~50 Гц).
    //   "monitor" — requestAnimationFrame на каждом vblank хоста.
    // Терминал и Node-окружения работают только в "vg75" (rAF отсутствует).
    render_mode: RenderMode = "vg75";

    private renderer!: Renderer;

    constructor(machine: Machine) {
        this.machine = machine;

        this.cursor_rate = 500;

        this.scale_x = 1;
        this.scale_y = 1;

        this.width = 78;
        this.height = 30;

        this.cursor_state = false;
        this.cursor_x = 0;
        this.cursor_y = 0;

        this.light_pen_x = 0;
        this.light_pen_y = 0;
        this.light_pen_active = 0;
    }

    export(): ScreenSnapshot {
        const h16 = (n: number) => "0x" + hex16(n);
        return {
            scale_x: this.scale_x,
            scale_y: this.scale_y,
            width: this.width,
            height: this.height,
            cursor_state: this.cursor_state ? 1 : 0,
            cursor_x: this.cursor_x,
            cursor_y: this.cursor_y,
            video_memory_base: h16(this.video_memory_base),
            video_memory_size: h16(this.video_memory_size),
            light_pen_x: this.light_pen_x,
            light_pen_y: this.light_pen_y,
            light_pen_active: this.light_pen_active,
        };
    }

    import(snapshot: ScreenSnapshot) {
        const h = fromHex;
        this.scale_x = h(snapshot.scale_x);
        this.scale_y = h(snapshot.scale_y);
        this.width = h(snapshot.width);
        this.height = h(snapshot.height);
        this.cursor_state = h(snapshot.cursor_state) ? true : false;
        this.cursor_x = h(snapshot.cursor_x);
        this.cursor_y = h(snapshot.cursor_y);
        this.video_memory_base = h(snapshot.video_memory_base);
        this.video_memory_size = h(snapshot.video_memory_size);
        this.light_pen_x = h(snapshot.light_pen_x);
        this.light_pen_y = h(snapshot.light_pen_y);
        this.light_pen_active = h(snapshot.light_pen_active);
    }

    apply_import() {
        this.set_geometry(this.width, this.height);
        this.set_video_memory(this.video_memory_base);
    }

    start(renderer: Renderer) {
        this.renderer = renderer;
        this.renderer.connect(this.machine);
        this.schedule_next_render();
    }

    set_render_mode(mode: RenderMode): void {
        if (this.render_mode === mode) return;
        this.render_mode = mode;
        // Активный таймер досидит до конца и сам перепланирует уже по
        // новому режиму через schedule_next_render — отдельного cancel
        // не требуется.
    }

    // Период кадра ВГ75 в миллисекундах. Формула совпадает с 86rk.ru
    // (`august_crt_8275.calc_frame_period`):
    //   chs = (CharsPerRow + HRTCCharCount) × (RowsNo + VRTCRowCount) × LinesNo
    //   period_ms = 1000 × chs / char_clock_hz
    // У РК86 со штатным монитором: (78+12) × (30+2) × 10 / 1.333МГц ≈ 21.6 мс
    // (≈ 46 Гц).
    frame_period_ms(): number {
        const chars = (this.width + this.hrtc_chars) * (this.height + this.vrtc_rows) * this.char_height;
        return (1000 * chars) / Screen.CHAR_CLOCK_HZ;
    }

    // CPU-tick-driven cursor blink. Wall-clock setTimeout made cursor_state
    // non-deterministic under --turbo (blinks decouple from emulated time).
    // Called by the runner on every batch; we advance our own tick counter.
    private last_flip_ticks = 0;
    tick_cursor(total_ticks: number, ticks_per_flip: number): void {
        if (this.machine.runner.turbo) {
            this.cursor_state = true;
            this.last_flip_ticks = total_ticks;
            return;
        }
        while (total_ticks - this.last_flip_ticks >= ticks_per_flip) {
            this.cursor_state = !this.cursor_state;
            this.last_flip_ticks += ticks_per_flip;
        }
    }

    private render_loop = () => {
        if (this.ready) this.renderer.update();
        this.schedule_next_render();
    };

    private schedule_next_render() {
        // До инициализации ВГ75 геометрия может быть нулевой → period_ms = 0,
        // что заспинит таймер. Стартовый фолбэк — фикс 40 мс.
        if (!this.ready) {
            setTimeout(this.render_loop, Screen.#IDLE_RENDER_MS);
            return;
        }
        if (this.render_mode === "monitor" && typeof requestAnimationFrame !== "undefined") {
            requestAnimationFrame(this.render_loop);
            return;
        }
        setTimeout(this.render_loop, this.frame_period_ms());
    }

    private last_width = -1;
    private last_height = -1;

    set_geometry(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.video_memory_size = width * height;

        this.machine.ui.update_screen_geometry(this.width, this.height, this.char_height);

        if (this.last_width === this.width && this.last_height === this.height) return;

        this.machine.log(`установлен размер экрана: ${width} x ${height}`);
        this.last_width = this.width;
        this.last_height = this.height;
        if (this.last_video_memory_base !== -1) this.ready = true;
    }

    set_char_height(char_height: number): void {
        if (this.char_height === char_height) return;
        this.char_height = char_height;
        this.machine.ui.update_screen_geometry(this.width, this.height, this.char_height);
    }

    private last_video_memory_base = -1;

    set_video_memory(base: number): void {
        this.video_memory_base = base;

        this.machine.ui.update_video_memory_address(this.video_memory_base);

        if (this.last_video_memory_base === this.video_memory_base) return;

        this.machine.log(
            `установлена видеопамять с адреса`,
            `${hex16(this.video_memory_base)}`,
            `размером ${hex16(this.video_memory_size)}`,
        );
        this.last_video_memory_base = this.video_memory_base;
        if (this.last_width !== -1) this.ready = true;
    }

    set_cursor(x: number, y: number): void {
        this.cursor_x = x;
        this.cursor_y = y;
    }

}
