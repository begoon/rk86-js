import type { Machine } from "../core/rk86_machine.js";
import type { Renderer } from "../core/rk86_renderer_interface.js";

export type { Renderer };

const CHAR_WIDTH = 6;
const CHAR_HEIGHT = 8;
const CHAR_HEIGHT_GAP = 2;
const CURSOR_HEIGHT = 1;

// Tolkalin (Радиолюбитель 04/1992) RGB mapping for i8275 field-attribute
// pins on RK86 color mod: GPA0=Red, GPA1=Green, HLGT=Blue. Color index =
// (byte >> 1) & 0x07 from a field-attribute byte ($80-$BF). Index 7 (white)
// is the default when no field attribute has been latched yet on a row.
const COLORS = [
    "#000000", // 0  black
    "#ff0000", // 1  red
    "#00ff00", // 2  green
    "#ffff00", // 3  yellow
    "#0000ff", // 4  blue
    "#ff00ff", // 5  magenta
    "#00ffff", // 6  cyan
    "#ffffff", // 7  white
];
const DEFAULT_COLOR = 7;

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

        // Draw characters using i8275 transparent field-attribute mode
        // (RK86 monitor's default). Byte classification:
        //   $00-$7F  normal character → consume one display cell
        //   $80-$BF  field attribute  → latch new color/highlight/blink,
        //                              **does NOT consume a display cell**
        //   $C0-$EF  character attribute → blank (RK86 doesn't generate)
        //   $F0-$FF  special control → end of row / end of screen
        // In transparent mode the chip skips a display cell when it sees
        // an attribute byte. The visible cells advance only on chars; the
        // attribute byte changes color of all following cells in the row.
        // Field attribute is reset to the default (white) at start of each
        // row. Programs that put attr+char pairs in vmem (e.g. tree2025.rk)
        // rely on this — without it the whole row gets stretched as each
        // attr byte takes a blank cell. See info/rk86_i8275_color_spec.md.
        let addr = screen.video_memory_base;
        let frameStopped = false;
        for (let y = 0; y < screen.height; ++y) {
            let rowStopped = frameStopped;
            let color = DEFAULT_COLOR;
            let dstX = 0;
            const baseI = y * screen.width;
            for (let srcX = 0; srcX < screen.width; ++srcX) {
                const raw = memory.read(addr);
                addr += 1;
                if (rowStopped) continue;
                if (raw >= 0xf0) {
                    rowStopped = true;
                    if (raw >= 0xf8) frameStopped = true;
                    continue;
                }
                if (raw >= 0xc0) {
                    // Char attribute — render as blank in current color.
                    if (dstX < screen.width) {
                        const cacheKey = (color << 8);
                        if (this.cache[baseI + dstX] !== cacheKey) {
                            this.drawChar(dstX, y, 0, color);
                            this.cache[baseI + dstX] = cacheKey;
                        }
                        dstX++;
                    }
                    continue;
                }
                if (raw >= 0x80) {
                    // Field attribute — latch color, don't consume a cell.
                    color = (raw >> 1) & 0x07;
                    continue;
                }
                // Normal character — render at current dst cell.
                if (dstX < screen.width) {
                    const cacheKey = raw | (color << 8);
                    if (this.cache[baseI + dstX] !== cacheKey) {
                        this.drawChar(dstX, y, raw, color);
                        this.cache[baseI + dstX] = cacheKey;
                    }
                    dstX++;
                }
            }
            // Blank cells past the last char/attr/EOR consumed.
            while (dstX < screen.width) {
                if (this.cache[baseI + dstX] !== (color << 8)) {
                    this.drawChar(dstX, y, 0, color);
                    this.cache[baseI + dstX] = (color << 8);
                }
                dstX++;
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
