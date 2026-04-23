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

export class Screen {
    static #update_rate = 40; // 25fps

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
    ready = false;

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
        this.render_loop();
    }

    // CPU-tick-driven cursor blink. Wall-clock setTimeout made cursor_state
    // non-deterministic under --turbo (blinks decouple from emulated time).
    // Called by the runner on every batch; we advance our own tick counter.
    private last_flip_ticks = 0;
    tick_cursor(total_ticks: number, ticks_per_flip: number): void {
        while (total_ticks - this.last_flip_ticks >= ticks_per_flip) {
            this.cursor_state = !this.cursor_state;
            this.last_flip_ticks += ticks_per_flip;
        }
    }

    private render_loop() {
        if (this.ready) this.renderer.update();
        setTimeout(() => this.render_loop(), Screen.#update_rate);
    }

    private last_width = -1;
    private last_height = -1;

    set_geometry(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.video_memory_size = width * height;

        this.machine.ui.update_screen_geometry(this.width, this.height);

        if (this.last_width === this.width && this.last_height === this.height) return;

        this.machine.log(`установлен размер экрана: ${width} x ${height}`);
        this.last_width = this.width;
        this.last_height = this.height;
        if (this.last_video_memory_base !== -1) this.ready = true;
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
