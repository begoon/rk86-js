// Color modes for the RK86 i8275 field-attribute byte.
//
// Reference: Emu80 v4 (vpyk/emu80v4), src/Rk86.cpp Rk86Renderer::getCurFgColor
// + setColorMode. The four modes are user-selectable; default is "color1"
// (Толкалин), matching Emu80's default.
//
// FA byte bit layout (Intel 8275 datasheet, visible/transparent both):
//   D7 D6 = 1 0   FA marker
//   D5    = U     underline
//   D4    = R     reverse
//   D3    = GPA1
//   D2    = GPA0
//   D1    = B     blink
//   D0    = H     highlight
//
// Mode polarity:
//   color1 Толкалин: bit SET = channel ON  (no attr → grey 0xC0C0C0)
//   color2 Акименко: bit SET = channel OFF (no attr → white)
//   color3 Апогей:   bit SET = channel OFF (no attr → white)
//
// Channel mapping (which FA bit drives which RGB channel):
//   color1: gpa1→B, gpa0→G, hglt→R
//   color2: gpa0→R, gpa1→G, hglt→B
//   color3: gpa0→B, gpa1→G, hglt→R
//
// Cell-offset (visible FA mode): for mono/color1/color2 the FA byte's attrs
// apply to the cell *preceding* the FA in screen order — the renderer reads
// attrs from cell N+1 when coloring cell N. color3 uses standard semantics
// (FA's attrs apply to the FA cell and following cells).

export type ColorMode = "mono" | "color1" | "color2" | "color3";

export const COLOR_MODES: ColorMode[] = ["mono", "color1", "color2", "color3"];

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
    mono: "ЧЕРНО-БЕЛЫЙ",
    color1: "ТОЛКАЛИН",
    color2: "АКИМЕНКО",
    color3: "АПОГЕЙ",
};

export const DEFAULT_COLOR_MODE: ColorMode = "color1";

export function isColorMode(value: unknown): value is ColorMode {
    return typeof value === "string" && (COLOR_MODES as string[]).includes(value);
}

// Computes the foreground RGB color (0xRRGGBB) for a cell given its latched
// FA attributes. `attrs` is the FA byte (with the $80 marker bit; ignored).
// Returns the foreground color; background is always black.
export function attrToRgb(mode: ColorMode, attrs: number): number {
    const hglt = (attrs & 0x01) !== 0;
    const gpa0 = (attrs & 0x04) !== 0;
    const gpa1 = (attrs & 0x08) !== 0;
    switch (mode) {
        case "color1": {
            const rgb = (gpa1 ? 0x0000ff : 0) | (gpa0 ? 0x00ff00 : 0) | (hglt ? 0xff0000 : 0);
            return rgb === 0 ? 0xc0c0c0 : rgb;
        }
        case "color2":
            return (gpa0 ? 0 : 0xff0000) | (gpa1 ? 0 : 0x00ff00) | (hglt ? 0 : 0x0000ff);
        case "color3":
            return (gpa0 ? 0 : 0x0000ff) | (gpa1 ? 0 : 0x00ff00) | (hglt ? 0 : 0xff0000);
        case "mono":
        default:
            return 0xc0c0c0;
    }
}

// True if the mode reads FA attrs from the cell after the current one
// (offset semantics — see emu80 m_hgltOffset/m_gpaOffset).
export function hasCellOffset(mode: ColorMode): boolean {
    return mode !== "color3";
}

export function rgbToCssHex(rgb: number): string {
    return "#" + rgb.toString(16).padStart(6, "0");
}

// Picks the nearest ANSI 30-37 base color for a given RGB. Used by the
// terminal renderer where we don't have a 24-bit palette to spend.
export function rgbToAnsiBaseFg(rgb: number): number {
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    // ANSI 30..37: black, red, green, yellow, blue, magenta, cyan, white.
    // Use luminance-aware nearest match against the standard palette.
    const palette: [number, number, number, number][] = [
        [30, 0, 0, 0],
        [31, 0xff, 0, 0],
        [32, 0, 0xff, 0],
        [33, 0xff, 0xff, 0],
        [34, 0, 0, 0xff],
        [35, 0xff, 0, 0xff],
        [36, 0, 0xff, 0xff],
        [37, 0xff, 0xff, 0xff],
    ];
    let best = 37;
    let bestDist = Infinity;
    for (const [code, pr, pg, pb] of palette) {
        const dr = r - pr;
        const dg = g - pg;
        const db = b - pb;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            best = code;
        }
    }
    return best;
}
