import { attrToRgb, hasCellOffset, rgbToCssHex, type ColorMode } from "../core/rk86_colors.js";
import type { Machine } from "../core/rk86_machine.js";
import type { Renderer } from "../core/rk86_renderer_interface.js";

export type { Renderer };

const CHAR_WIDTH = 6;
const CHAR_HEIGHT = 8;
const CHAR_HEIGHT_GAP = 2;
const CURSOR_HEIGHT = 1;

// i8275 byte classification (used in both visible and transparent FA modes):
//   $00-$7F  normal char
//   $80-$BF  field attribute (latches color/blink; FA cell blanked or
//            replaced by FIFO byte depending on the chip's F-bit)
//   $C0-$EF  character attribute (RK86 doesn't emit; rendered blank)
//   $F0-$FF  special control — end of row (≥$F8 also ends frame DMA)
//
// Visible FA mode (transparent_attr = false): chip reads `width` source
// bytes per row, FA cells are blanked.
//
// Transparent FA mode (transparent_attr = true): FA byte is replaced by
// the next DMA-fetched byte via a 16-char FIFO. Chip consumes `width + K`
// source bytes per row where K is the FA count; row ended by F1+.
//
// Cell-offset (mono/color1/color2 only): in visible mode, cell N's color
// is taken from cell N+1's FA attrs — i.e. the FA byte colors the cell
// IMMEDIATELY BEFORE it in screen order. color3 (Апогей) keeps the FA
// byte's attrs on the FA cell and following cells (no offset).

export class CanvasRenderer implements Renderer {
    private machine!: Machine;
    private ctx!: CanvasRenderingContext2D;
    private font!: HTMLImageElement;
    private fontByColor = new Map<number, HTMLCanvasElement>();
    private cache: number[] = [];

    private cachedWidth = 0;
    private cachedHeight = 0;
    private cachedVideoBase = -1;
    private cachedColorMode: ColorMode | "" = "";

    private lastCursorX = 0;
    private lastCursorY = 0;

    connect(machine: Machine): void {
        this.machine = machine;
        this.ctx = machine.ui.canvas.getContext("2d")!;

        this.font = new Image();
        this.font.onload = () => this.resetCache(this.cache.length);
        this.font.src = machine.font;

        const canvas = machine.ui.canvas;
        canvas.onmousemove = this.handleMousemove.bind(this);
        canvas.onmouseup = () => (machine.screen.light_pen_active = 0);
        canvas.onmousedown = () => (machine.screen.light_pen_active = 1);
    }

    private tintedFont(rgb: number): HTMLCanvasElement | null {
        if (!this.font.complete || this.font.naturalWidth === 0) return null;
        const cached = this.fontByColor.get(rgb);
        if (cached) return cached;
        const off = document.createElement("canvas");
        off.width = this.font.width;
        off.height = this.font.height;
        const offCtx = off.getContext("2d")!;
        offCtx.drawImage(this.font, 0, 0);
        // Font is a 1-bit BMP (white glyph on black). "multiply" tints
        // white pixels to the desired color while leaving black black.
        offCtx.globalCompositeOperation = "multiply";
        offCtx.fillStyle = rgbToCssHex(rgb);
        offCtx.fillRect(0, 0, off.width, off.height);
        this.fontByColor.set(rgb, off);
        return off;
    }

    update(): void {
        const { screen, memory } = this.machine;
        const mode = screen.color_mode;

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

        if (screen.video_memory_base !== this.cachedVideoBase) {
            this.resetCache(screen.width * screen.height);
            this.cachedVideoBase = screen.video_memory_base;
        }

        if (mode !== this.cachedColorMode) {
            this.resetCache(screen.width * screen.height);
            this.cachedColorMode = mode;
        }

        // Latched FA state (color + blink). Persists across rows; only
        // resets at frame start (VRTC). dizzy75 row 8 ends with F8D — the
        // "all attrs set" black color must persist into row 9.
        let latchedAttrs = 0;
        let blink = false;
        const blinkOff = Math.floor(Date.now() / 320) % 2 === 1;
        let addr = screen.video_memory_base;
        let frameStopped = false;
        const transparent = screen.transparent_attr;
        const offset = hasCellOffset(mode) && !transparent;
        const FA_PENDING = -1;
        type Cell = { ch: number; attrs: number; blink: boolean; isFA: boolean };
        const cells: Cell[] = new Array(screen.width);
        for (let y = 0; y < screen.height; ++y) {
            const rowBase = y * screen.width;

            if (transparent) {
                // Fetch up to `width + K` source bytes per row (FA bytes
                // pull a second byte into a FIFO that fills the FA cells
                // at the end). F1+ stops DMA early.
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
                        cells[cellCount++] = { ch: 0, attrs: latchedAttrs, blink, isFA: false };
                        rowStopped = true;
                        if (raw >= 0xf8) frameStopped = true;
                    } else if (raw >= 0xc0) {
                        cells[cellCount++] = { ch: 0, attrs: latchedAttrs, blink, isFA: false };
                    } else if (raw >= 0x80) {
                        latchedAttrs = raw;
                        blink = (raw & 0x02) !== 0;
                        cells[cellCount++] = { ch: FA_PENDING, attrs: latchedAttrs, blink, isFA: true };
                        fifoFlag = true;
                    } else {
                        cells[cellCount++] = { ch: raw, attrs: latchedAttrs, blink, isFA: false };
                    }
                }
                while (cellCount < screen.width)
                    cells[cellCount++] = { ch: 0, attrs: latchedAttrs, blink, isFA: false };
                let fifoIdx = 0;
                for (let x = 0; x < screen.width; ++x) {
                    if (cells[x].ch === FA_PENDING) {
                        cells[x].ch = (fifo[fifoIdx] ?? 0) & 0x7f;
                        fifoIdx++;
                    }
                }
                addr += bytesFetched;
                const expected = (y + 1) * screen.width;
                if (addr - screen.video_memory_base < expected) {
                    addr = screen.video_memory_base + expected;
                }
            } else {
                // Visible mode: exactly `width` source bytes per row;
                // FA cells render as blanks.
                let rowStopped = frameStopped;
                for (let x = 0; x < screen.width; ++x) {
                    const raw = memory.read(addr + x);
                    let ch: number;
                    let isFA = false;
                    if (rowStopped) {
                        ch = 0;
                    } else if (raw >= 0xf0) {
                        ch = 0;
                        rowStopped = true;
                        if (raw >= 0xf8) frameStopped = true;
                    } else if (raw >= 0xc0) {
                        ch = 0;
                    } else if (raw >= 0x80) {
                        latchedAttrs = raw;
                        blink = (raw & 0x02) !== 0;
                        ch = 0;
                        isFA = true;
                    } else {
                        ch = raw;
                    }
                    cells[x] = { ch, attrs: latchedAttrs, blink, isFA };
                }
                addr += screen.width;
            }

            // Render. For offset modes (mono/color1/color2 in visible
            // mode), cell N's display color comes from cell N+1's attrs
            // when N+1 is an FA cell; last cell of the row uses its own.
            // R (D4) and U (D5) follow the same offset rule as colour.
            for (let x = 0; x < screen.width; ++x) {
                const cell = cells[x];
                const ch = cell.blink && blinkOff ? 0 : cell.ch;
                let attrs = cell.attrs;
                if (offset && x + 1 < screen.width && cells[x + 1].isFA) {
                    attrs = cells[x + 1].attrs;
                }
                const rgb = attrToRgb(mode, attrs);
                const reverse = (attrs & 0x10) !== 0;
                const underline = (attrs & 0x20) !== 0;
                // Cache key packs ch (7 bits, 0..127), rgb (24 bits) and
                // two flag bits above the rgb range (bit 32 / bit 33).
                // Plain * / + keeps JS in float-int land — safe up to 2^53.
                const cacheKey =
                    ch +
                    rgb * 0x100 +
                    (reverse ? 0x100000000 : 0) +
                    (underline ? 0x200000000 : 0);
                if (this.cache[rowBase + x] !== cacheKey) {
                    this.drawChar(x, y, ch, rgb, reverse, underline);
                    this.cache[rowBase + x] = cacheKey;
                }
            }
        }

        this.drawCursor(screen.cursor_x, screen.cursor_y, screen.cursor_state);
    }

    private resetCache(size: number): void {
        this.cache = [];
        for (let i = 0; i < size; ++i) this.cache[i] = -1;
    }

    private drawChar(
        x: number,
        y: number,
        ch: number,
        rgb: number,
        reverse: boolean,
        underline: boolean,
    ): void {
        const { scale_x, scale_y } = this.machine.screen;
        const dstX = x * CHAR_WIDTH * scale_x;
        const dstY = y * (CHAR_HEIGHT + CHAR_HEIGHT_GAP) * scale_y;
        const dstW = CHAR_WIDTH * scale_x;
        const dstH = CHAR_HEIGHT * scale_y;
        // Background: colour fill if reverse, black otherwise.
        this.ctx.fillStyle = reverse ? rgbToCssHex(rgb) : "#000000";
        this.ctx.fillRect(dstX, dstY, dstW, dstH);
        const fontSrc = this.tintedFont(rgb);
        if (fontSrc) {
            if (reverse) {
                // Cell is filled with rgb; tinted-font glyph pixels are
                // rgb on black bg. "difference" turns glyph→black while
                // leaving the cell bg (rgb − 0 = rgb) untouched.
                this.ctx.globalCompositeOperation = "difference";
                this.ctx.drawImage(
                    fontSrc, 2, CHAR_HEIGHT * ch, CHAR_WIDTH, CHAR_HEIGHT, dstX, dstY, dstW, dstH,
                );
                this.ctx.globalCompositeOperation = "source-over";
            } else {
                this.ctx.drawImage(
                    fontSrc, 2, CHAR_HEIGHT * ch, CHAR_WIDTH, CHAR_HEIGHT, dstX, dstY, dstW, dstH,
                );
            }
        }
        if (underline) {
            // One scaled scanline at the bottom of the glyph. In reverse
            // mode the underline becomes black so it stays visible on the
            // colour bg.
            this.ctx.fillStyle = reverse ? "#000000" : rgbToCssHex(rgb);
            this.ctx.fillRect(dstX, dstY + dstH - scale_y, dstW, scale_y);
        }
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
