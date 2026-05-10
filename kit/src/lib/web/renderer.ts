import type { Machine } from "../core/rk86_machine.js";
import type { Renderer } from "../core/rk86_renderer_interface.js";

export type { Renderer };

const CHAR_WIDTH = 6;
const CHAR_HEIGHT = 8;
const CHAR_HEIGHT_GAP = 2;
const CURSOR_HEIGHT = 1;

// RGB mapping for i8275 field-attribute pins on RK86 color mod, matching
// Emu80's RCM_COLOR1 (the de-facto reference for RK86 colorized programs).
// Wiring: GPA0 → Green, GPA1 → Blue, HLGT → Red.
//
// Field-attribute byte bits (Intel 8275 datasheet, confirmed against
// Emu80's Crt8275.cpp):
//   D7 D6 = 1 0  (FA marker)
//   D5    = U    (Underline)
//   D4    = R    (Reverse)
//   D3    = GPA1 → Blue
//   D2    = GPA0 → Green
//   D1    = B    (Blink)
//   D0    = H    → Red
//
// color_index packed as (R << 2) | (B << 1) | G:
//   0 (no attr) — falls back to light gray (Emu80 default)
//   1 (G=1)             → green
//   2 (B=1)             → blue
//   3 (G+B)             → cyan
//   4 (R=1)             → red
//   5 (R+G)             → yellow
//   6 (R+B)             → magenta
//   7 (R+G+B)           → white
const COLORS = [
    "#c0c0c0", // 0  light gray (fallback when no attr latched)
    "#00ff00", // 1  green
    "#0000ff", // 2  blue
    "#00ffff", // 3  cyan
    "#ff0000", // 4  red
    "#ffff00", // 5  yellow
    "#ff00ff", // 6  magenta
    "#ffffff", // 7  white
];
const DEFAULT_COLOR = 0;

export class CanvasRenderer implements Renderer {
    private machine!: Machine;
    private ctx!: CanvasRenderingContext2D;
    private font!: HTMLImageElement;
    private fontByColor: HTMLCanvasElement[] = [];
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
        this.font.onload = () => this.buildColorFonts();
        this.font.src = machine.font;

        const canvas = machine.ui.canvas;
        canvas.onmousemove = this.handleMousemove.bind(this);
        canvas.onmouseup = () => (machine.screen.light_pen_active = 0);
        canvas.onmousedown = () => (machine.screen.light_pen_active = 1);
    }

    private buildColorFonts(): void {
        for (let c = 0; c < 8; c++) {
            const off = document.createElement("canvas");
            off.width = this.font.width;
            off.height = this.font.height;
            const offCtx = off.getContext("2d")!;
            offCtx.drawImage(this.font, 0, 0);
            // Font is a 1-bit BMP (white glyph on black background, no
            // alpha). Use "multiply" to tint white pixels to the desired
            // color while leaving black pixels black: white×color = color,
            // black×color = black.
            offCtx.globalCompositeOperation = "multiply";
            offCtx.fillStyle = COLORS[c];
            offCtx.fillRect(0, 0, off.width, off.height);
            this.fontByColor[c] = off;
        }
        // Force redraw with the new fonts on next update.
        this.resetCache(this.cache.length);
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

        // Draw characters using i8275 visible field-attribute mode (the
        // common RK86 mode per the spec). Byte classification:
        //   $00-$7F  normal character → glyph in current color
        //   $80-$BF  field attribute  → latch color/highlight/blink for
        //                              following cells, this cell renders
        //                              as a blank in the new color
        //   $C0-$EF  character attribute → blank (RK86 doesn't generate)
        //   $F0-$FF  special control → end of row / end of screen
        // Field attribute resets to the default at start of each row.
        //
        // One-cell offset: Emu80 RCM_COLOR1 displays cell N with the
        // latched attrs of cell N+1, so the new color appears one cell
        // BEFORE the FA byte. Most colorized RK programs are tuned for
        // this (without it, color regions look "asymmetrical to the
        // right"). The last cell of a row uses its own latched attrs.
        let addr = screen.video_memory_base;
        let frameStopped = false;
        for (let y = 0; y < screen.height; ++y) {
            let rowStopped = frameStopped;
            let color = DEFAULT_COLOR;
            for (let x = 0; x < screen.width; ++x) {
                const i = addr - screen.video_memory_base;
                const raw = memory.read(addr);

                let ch: number;
                if (rowStopped) {
                    ch = 0;
                } else if (raw >= 0xf0) {
                    ch = 0;
                    rowStopped = true;
                    if (raw >= 0xf8) frameStopped = true;
                } else if (raw >= 0xc0) {
                    ch = 0;
                } else if (raw >= 0x80) {
                    color = ((raw & 0x01) << 2) | ((raw & 0x0c) >> 2);
                    ch = 0;
                } else {
                    ch = raw;
                }

                let displayColor = color;
                if (x + 1 < screen.width && !rowStopped) {
                    const nextRaw = memory.read(addr + 1);
                    if (nextRaw >= 0x80 && nextRaw < 0xc0) {
                        displayColor = ((nextRaw & 0x01) << 2) | ((nextRaw & 0x0c) >> 2);
                    }
                }

                const cacheKey = ch | (displayColor << 8);
                if (this.cache[i] !== cacheKey) {
                    this.drawChar(x, y, ch, displayColor);
                    this.cache[i] = cacheKey;
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

    private drawChar(x: number, y: number, ch: number, color: number = DEFAULT_COLOR): void {
        const { scale_x, scale_y } = this.machine.screen;
        const dstX = x * CHAR_WIDTH * scale_x;
        const dstY = y * (CHAR_HEIGHT + CHAR_HEIGHT_GAP) * scale_y;
        const dstW = CHAR_WIDTH * scale_x;
        const dstH = CHAR_HEIGHT * scale_y;
        // Clear cell to black before drawing the colored glyph (so a color
        // change shows even if the new glyph has zero foreground pixels).
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(dstX, dstY, dstW, dstH);
        const fontSrc = this.fontByColor[color] ?? this.font;
        this.ctx.drawImage(fontSrc, 2, CHAR_HEIGHT * ch, CHAR_WIDTH, CHAR_HEIGHT, dstX, dstY, dstW, dstH);
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
