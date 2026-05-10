import type { Machine } from "../core/rk86_machine.js";
import type { Renderer } from "../core/rk86_renderer_interface.js";

export type { Renderer };

const CHAR_WIDTH = 6;
const CHAR_HEIGHT = 8;
const CHAR_HEIGHT_GAP = 2;
const CURSOR_HEIGHT = 1;

// RGB mapping for i8275 field-attribute pins on RK86 color mod, matching
// 86rk.ru's `august_video_86rk.rgb()` (inverted scheme — bit set DISABLES
// the wired color):
//
//   r = hglt ? 0x00 : 0xFF   // bit 0 set → red OFF
//   g = gpa1 ? 0x00 : 0xFF   // bit 3 set → green OFF
//   b = gpa0 ? 0x00 : 0xFF   // bit 2 set → blue OFF
//
// So the default attr (no bits set) is WHITE on black background, and
// programs use FA bytes to subtract individual color channels.
//
// Field-attribute byte bits (Intel 8275 datasheet, confirmed against
// MAME / Emu80 / 86rk):
//   D7 D6 = 1 0  (FA marker)
//   D5    = U    (Underline)
//   D4    = R    (Reverse)
//   D3    = GPA1 → disables Green
//   D2    = GPA0 → disables Blue
//   D1    = B    (Blink)
//   D0    = H    → disables Red
//
// With color_index = (H << 2) | (G1 << 1) | G0 the palette lays out as:
//   0 (no attr)   → white
//   1 (G0)        → yellow  (B off)
//   2 (G1)        → magenta (G off)
//   3 (G0+G1)     → red
//   4 (H)         → cyan    (R off)
//   5 (H+G0)      → green
//   6 (H+G1)      → blue
//   7 (H+G0+G1)   → black   (all off — chars become invisible)
const COLORS = [
    "#ffffff", // 0  white (no bits — default)
    "#ffff00", // 1  yellow  (G0)
    "#ff00ff", // 2  magenta (G1)
    "#ff0000", // 3  red     (G0+G1)
    "#00ffff", // 4  cyan    (H)
    "#00ff00", // 5  green   (H+G0)
    "#0000ff", // 6  blue    (H+G1)
    "#000000", // 7  black   (H+G0+G1)
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

        // i8275 byte classification:
        //   $00-$7F  normal char → glyph in current color
        //   $80-$BF  field attribute → latches color (and acts on the
        //                              cell per the chip's F-mode flag)
        //   $C0-$EF  character attribute → blank (RK86 doesn't emit)
        //   $F0-$FF  special control → end of row (≥$F8 ends frame DMA)
        //
        // The chip has two FA modes (selected by bit 6 of the i8275
        // reset's 4th param byte, captured into screen.transparent_attr):
        //
        // Visible (bit 6 = 1): FA cell is blanked; following cells use
        // the new color. Renderer reads exactly `width` source bytes per
        // row; FA cells render as the screen's background.
        //
        // Transparent (bit 6 = 0): FA cell is replaced by a FIFO char
        // (the byte fetched immediately after the FA in the DMA stream).
        // The chip consumes `width + K` source bytes per row where K is
        // the FA count for that row; programs authored for this mode
        // (e.g. `tree2025.rk` with `[FA][char][FA][char]…` per row, F1
        // at end-of-row to stop DMA) get tightly-packed cells.
        //
        // One-cell offset (Emu80 RCM_COLOR1): cell N is rendered with
        // the latched color of cell N+1 (the new color appears one cell
        // BEFORE the FA byte). Last cell of each row uses its own color.
        // Latched FA state (color + blink). Persists across rows;
        // resets only at the start of each frame (matching the i8275
        // VRTC reset and 86rk/MAME behavior). Programs like dizzy rely
        // on this — e.g. row 8 ends with F8D (all attrs = invisible
        // black) and row 9's bare $76 chars are then drawn invisible
        // because the latch carries over.
        let color = DEFAULT_COLOR;
        let blink = false;
        // Blink phase: i8275 toggles VSP at ~1.5 Hz (32-frame cycle at
        // 50 Hz). We use wall-clock to drive it independent of update()
        // rate; cache key changes with `ch` (which goes to 0 when the
        // cell is in its hidden phase) so blinking cells redraw.
        const blinkOff = Math.floor(Date.now() / 320) % 2 === 1;
        let addr = screen.video_memory_base;
        let frameStopped = false;
        const transparent = screen.transparent_attr;
        const FA_PENDING = -1;
        const cells: { ch: number; color: number; blink: boolean }[] = new Array(screen.width);
        for (let y = 0; y < screen.height; ++y) {
            const rowBase = y * screen.width;

            if (transparent) {
                // Transparent mode: fetch up to `width + K` source bytes
                // per row, building row-buffer + FIFO. F1/F2 stops DMA.
                const fifo: number[] = [];
                let fifoFlag = false;
                let cellCount = 0;
                let rowStopped = frameStopped;
                let bytesFetched = 0;
                while (cellCount < screen.width && !rowStopped) {
                    const raw = memory.read(addr + bytesFetched);
                    bytesFetched++;
                    if (fifoFlag) {
                        fifo.push(raw);
                        fifoFlag = false;
                        continue;
                    }
                    if (raw >= 0xf0) {
                        cells[cellCount++] = { ch: 0, color, blink };
                        rowStopped = true;
                        if (raw >= 0xf8) frameStopped = true;
                    } else if (raw >= 0xc0) {
                        cells[cellCount++] = { ch: 0, color, blink };
                    } else if (raw >= 0x80) {
                        color = ((raw & 0x01) << 2) | ((raw & 0x0c) >> 2);
                        blink = (raw & 0x02) !== 0;
                        cells[cellCount++] = { ch: FA_PENDING, color, blink };
                        fifoFlag = true;
                    } else {
                        cells[cellCount++] = { ch: raw, color, blink };
                    }
                }
                while (cellCount < screen.width) cells[cellCount++] = { ch: 0, color, blink };
                let fifoIdx = 0;
                for (let x = 0; x < screen.width; ++x) {
                    if (cells[x].ch === FA_PENDING) {
                        cells[x].ch = (fifo[fifoIdx] ?? 0) & 0x7f;
                        fifoIdx++;
                    }
                }
                addr += bytesFetched;
                // If the row terminated early without consuming `width`
                // source bytes (e.g. F1 at column M), the chip skips the
                // remainder; advance addr to the next row's start to
                // match the in-memory `width`-byte stride that programs
                // use. Programs that need a non-`width` stride (and
                // there aren't many on RK86) would need actual i8257
                // address tracking, which we don't model.
                const expected = (y + 1) * screen.width;
                if (addr - screen.video_memory_base < expected) {
                    addr = screen.video_memory_base + expected;
                }
            } else {
                // Visible mode: 1 source byte per cell, FA blanks the cell.
                let rowStopped = frameStopped;
                for (let x = 0; x < screen.width; ++x) {
                    const raw = memory.read(addr + x);
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
                        blink = (raw & 0x02) !== 0;
                        ch = 0;
                    } else {
                        ch = raw;
                    }
                    cells[x] = { ch, color, blink };
                }
                addr += screen.width;
            }

            // Render: cell N uses its own latched color (no Emu80
            // m_hgltOffset / m_gpaOffset shift — 86rk's chip captures
            // CurAttr at the start of each cell's processing, so a
            // normal char displays in the *previously-latched* color
            // and an FA cell displays as blank in the *previously-
            // latched* color too). Blinking cells are hidden during the
            // off phase.
            for (let x = 0; x < screen.width; ++x) {
                const ch = cells[x].blink && blinkOff ? 0 : cells[x].ch;
                const displayColor = cells[x].color;
                const cacheKey = ch | (displayColor << 8);
                if (this.cache[rowBase + x] !== cacheKey) {
                    this.drawChar(x, y, ch, displayColor);
                    this.cache[rowBase + x] = cacheKey;
                }
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
