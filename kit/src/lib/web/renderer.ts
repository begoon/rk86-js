import type { Machine } from "../core/rk86_machine.js";
import type { Renderer } from "../core/rk86_renderer_interface.js";

export type { Renderer };

const CHAR_WIDTH = 6;
const CHAR_HEIGHT = 8;
const CHAR_HEIGHT_GAP = 2;
const CURSOR_HEIGHT = 1;

export class CanvasRenderer implements Renderer {
    private machine!: Machine;
    private ctx!: CanvasRenderingContext2D;
    private font!: HTMLImageElement;
    private cache: number[] = [];

    private cachedWidth = 0;
    private cachedHeight = 0;
    private cachedVideoBase = -1;

    private lastCursorX = 0;
    private lastCursorY = 0;

    connect(machine: Machine): void {
        this.machine = machine;
        this.ctx = machine.ui.canvas.getContext("2d")!;

        this.font = new Image();
        this.font.src = machine.font;

        const canvas = machine.ui.canvas;
        canvas.onmousemove = this.handleMousemove.bind(this);
        canvas.onmouseup = () => (machine.screen.light_pen_active = 0);
        canvas.onmousedown = () => (machine.screen.light_pen_active = 1);
    }

    update(): void {
        const { screen, memory } = this.machine;

        // Handle geometry change.
        if (screen.width !== this.cachedWidth || screen.height !== this.cachedHeight) {
            const canvasWidth = screen.width * CHAR_WIDTH * screen.scale_x;
            const canvasHeight = screen.height * (CHAR_HEIGHT + CHAR_HEIGHT_GAP) * screen.scale_y;
            this.machine.ui.resize_canvas(canvasWidth, canvasHeight);

            this.ctx.imageSmoothingEnabled = false;
            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            this.cachedWidth = screen.width;
            this.cachedHeight = screen.height;
            this.resetCache(screen.width * screen.height);
        }

        // Handle video memory base change.
        if (screen.video_memory_base !== this.cachedVideoBase) {
            this.resetCache(screen.width * screen.height);
            this.cachedVideoBase = screen.video_memory_base;
        }

        // Draw characters.
        let addr = screen.video_memory_base;
        for (let y = 0; y < screen.height; ++y) {
            for (let x = 0; x < screen.width; ++x) {
                const i = addr - screen.video_memory_base;
                const ch = memory.read(addr);
                if (this.cache[i] !== ch) {
                    this.drawChar(x, y, ch);
                    this.cache[i] = ch;
                }
                addr += 1;
            }
        }

        // Draw cursor.
        this.drawCursor(screen.cursor_x, screen.cursor_y, screen.cursor_state);
    }

    private resetCache(size: number): void {
        this.cache = [];
        for (let i = 0; i < size; ++i) this.cache[i] = -1;
    }

    private drawChar(x: number, y: number, ch: number): void {
        const { scale_x, scale_y } = this.machine.screen;
        this.ctx.drawImage(
            this.font,
            2,
            CHAR_HEIGHT * ch,
            CHAR_WIDTH,
            CHAR_HEIGHT,
            x * CHAR_WIDTH * scale_x,
            y * (CHAR_HEIGHT + CHAR_HEIGHT_GAP) * scale_y,
            CHAR_WIDTH * scale_x,
            CHAR_HEIGHT * scale_y,
        );
    }

    private drawCursor(x: number, y: number, visible: boolean): void {
        const { scale_x, scale_y } = this.machine.screen;
        const cy = (row: number) => (row * (CHAR_HEIGHT + CHAR_HEIGHT_GAP) + CHAR_HEIGHT) * scale_y;

        if (this.lastCursorX !== x || this.lastCursorY !== y) {
            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(
                this.lastCursorX * CHAR_WIDTH * scale_x,
                cy(this.lastCursorY),
                CHAR_WIDTH * scale_x,
                CURSOR_HEIGHT * scale_y,
            );
            this.lastCursorX = x;
            this.lastCursorY = y;
        }

        const cx = x * CHAR_WIDTH * scale_x;
        this.ctx.fillStyle = visible ? "#ffffff" : "#000000";
        this.ctx.fillRect(cx, cy(y), CHAR_WIDTH * scale_x, CURSOR_HEIGHT * scale_y);
    }

    private handleMousemove(event: MouseEvent): void {
        const canvas = this.machine.ui.canvas;
        const box = canvas.getBoundingClientRect();

        const scaleX = canvas.width / box.width;
        const scaleY = canvas.height / box.height;

        const mouseX = (event.clientX - box.left) * scaleX;
        const mouseY = (event.clientY - box.top) * scaleY;

        const { scale_x, scale_y } = this.machine.screen;
        this.machine.screen.light_pen_x = Math.floor(mouseX / (CHAR_WIDTH * scale_x));
        this.machine.screen.light_pen_y = Math.floor(mouseY / ((CHAR_HEIGHT + CHAR_HEIGHT_GAP) * scale_y));
    }
}
