# Exact Byte Encoding for КР580ВГ75 / i8275 + RK86 Color Mod

This is everything you need to interpret bytes pulled by DMA from screen RAM. Citations point at the Intel 8275 datasheet for chip behavior and at MAME's i8275 implementation, which is the canonical open-source reference.

## 1. Byte classification (top bits decide everything)

Each byte fetched from screen RAM falls into exactly one of four categories, decided by the **top 2 bits**:

| Bit pattern | Range | Type |
|---|---|---|
| `0xxxxxxx` | `$00`–`$7F` | **Normal character** (7-bit code → character ROM) |
| `10xxxxxx` | `$80`–`$BF` | **Field Attribute** |
| `11xxxxxx` (and < `$F0`) | `$C0`–`$EF` | **Character Attribute** |
| `1111xxxx` | `$F0`–`$FF` | **Special Control Code** |

This classification is exactly what MAME does: `(data & 0xc0) == 0x80` → field attribute; `data >= 0xf0` → special control; `data >= 0xc0` → character attribute; else → normal character.

## 2. Field Attribute byte: `1 0 0 B H G R U`

This is the one that matters for the RK86 color mod. Bit layout (MSB→LSB):

```
bit 7  6  5  4  3  2  1  0
    1  0  0  B  H  GG GG U     ← my naming (BHGRU is conventional)
       │     │  │  │  │  └── U   = Underline (LTEN at underline scanline)
       │     │  │  └──┴───── GG  = 2 bits → drive GPA1, GPA0 pins
       │     │  └─────────── H   = Highlight (drives HLGT pin)
       │     └────────────── B   = Blink (32-frame blink, drives VSP)
       └──────────────────── reserved (must be 0)
```

The four attribute bits the chip latches and emits on its pins for **all subsequent character cells** until a new field attribute byte appears (or end-of-row, depending on programming):

- **U** (bit 0) → LTEN output, gated to underline scanline only
- **GPA0** (bit 1) → GPA0 pin
- **GPA1** (bit 2) → GPA1 pin
- **H** (bit 3) → HLGT pin (intensity)
- **B** (bit 4) → blink (chip toggles VSP at 1/32 frame rate when set)

Bits 5–7 are fixed `100` to identify this as a field attribute.

In MAME's source those are named `FAC_U`, `FAC_GG` (a 2-bit mask covering GPA0/GPA1), `FAC_H`, `FAC_B`. The handler does literally `m_field_attr = data & (FAC_H | FAC_B | FAC_GG | FAC_R | FAC_U)` — it just stores the low 5 bits and emits them as pin states.

### How RK86 color mods wire those pins

Standard mapping for the **Tolkalin scheme** (Радиолюбитель 04/1992) and Akimenko variant — both use the same byte format, the wiring on the analog side differs slightly:

| Attribute pin | RK86 color wire |
|---|---|
| GPA0 | Red |
| GPA1 | Green |
| HLGT | Blue |
| LTEN | (intensity / unused depending on mod) |

So for an emulator, the byte's GG and H bits give you the 3-bit RGB color (8 colors) directly:

```
color_index = (B<<2) | (G<<1) | R
            = ((byte >> 3) & 1)<<2 | ((byte >> 2) & 1)<<1 | ((byte >> 1) & 1)
```

The Apogee БК-01Ц uses the same byte format but **GPA0 and GPA1 are swapped** at the wiring level, so 7 of 8 colors come out different — that's the Tolkalin/Apogee software incompatibility.

## 3. Field-attribute display modes (visible vs transparent)

This is set at chip configuration time via Screen Composition command #4, the F bit (Field Attribute mode):

- **F = 0 — Visible / "attribute as space"** (the common RK86 mode): the attribute byte occupies one character cell, displayed as a blank (VSP forced for that cell). Simple to emulate: when you see `(data & 0xc0) == 0x80`, latch the attribute, output a blank cell, advance.
- **F = 1 — Transparent**: the attribute byte does **not** occupy a screen cell. The chip pulls the *next* character byte from an internal 16-character FIFO (filled by extra DMA bursts) to fill the gap. MAME shows this clearly: `data = m_fifo[!m_buffer_dma][m_fifo_idx_out++]`. If you only care about RK86 you can usually ignore this mode — most colorized RK programs use visible mode.

State reset rule: at the start of each row (or VRTC) the field attribute resets to `0`. MAME does this in `vrtc_start()`: `m_field_attr = 0`. Every row begins with the default (white in the RK86 color mod).

## 4. Character Attribute byte: `1 1 B H C C C C` (codes `$C0`–`$EF`)

These generate **graphics symbols** (line/box drawing) without using the character ROM. Bit layout:

```
bit 7  6  5  4  3  2  1  0
    1  1  B  H  C  C  C  C
          │  │  └──┴──┴──┴── 4-bit graphics shape code (CCCC, 0..15)
          │  └─────────────── H = Highlight
          └────────────────── B = Blink
```

The chip generates the symbol via the LA0/LA1 (Line Attribute) outputs combined with VSP and LTEN, scanline by scanline. The lookup tables for which lines/segments to draw on which scanline are in MAME's `character_attribute[3][16]` table:

```cpp
const int i8275_device::character_attribute[3][16] = {
    { 2, 2, 4, 4, 2, 4, 4, 4, 2, 4, 4, 0, 2, 0, 0, 0 }, // lc <  underline
    { 8,12, 8,12, 1,12, 8, 1, 1, 4, 1, 0, 2, 0, 0, 0 }, // lc == underline
    { 4, 4, 2, 2, 4, 4, 4, 2, 2, 4, 4, 0, 2, 0, 0, 0 }, // lc >  underline
};
```

**RK86 ignores character attributes entirely** — the character ROM (К573РФ1) holds 128 glyphs and the firmware never emits codes ≥ `$C0` as data. For an RK86 emulator you can treat `$C0`–`$EF` as "blank cell" (or implement them properly for completeness).

## 5. Special Control codes: `$F0`–`$FF`

| Code | Name | Effect |
|---|---|---|
| `$F0` | End of Row | Force end of current row (start displaying blanks until next row) |
| `$F1` | End of Row, Stop DMA | Same + halt DMA for this row |
| `$F2` | End of Screen | Force end of screen (blank everything until VRTC) |
| `$F3` | End of Screen, Stop DMA | Same + halt DMA until next frame |
| `$F4`–`$FF` | (reserved / undefined) | Treat as end-of-row in practice |

MAME implementation:
```cpp
case SCC_END_OF_ROW:        // 0xF0
case SCC_END_OF_ROW_DMA:    // 0xF1
    end_of_row |= 1 << n;
    break;
case SCC_END_OF_SCREEN:     // 0xF2
case SCC_END_OF_SCREEN_DMA: // 0xF3
    m_end_of_screen = true;
    break;
```

The cell containing the special code is itself blanked (`attr = FAC_B`).

## 6. Pseudocode for emulator screen-render inner loop

```python
field_attr = 0       # reset at start of every row in visible mode

for cell in dma_row_buffer:
    top2 = cell & 0xC0

    if top2 == 0x00 or top2 == 0x40:
        # Normal character $00-$7F
        char_code = cell & 0x7F
        draw_char(char_code, color_from(field_attr),
                  highlight=field_attr.H, blink=field_attr.B)

    elif top2 == 0x80:
        # Field attribute $80-$BF: latch new attribute, blank this cell
        field_attr.U  = (cell >> 0) & 1
        field_attr.G0 = (cell >> 1) & 1   # → Red wire on Tolkalin RK86
        field_attr.G1 = (cell >> 2) & 1   # → Green
        field_attr.H  = (cell >> 3) & 1   # → Blue
        field_attr.B  = (cell >> 4) & 1
        # In visible mode: this cell shows blank (with NEW color applied or OLD —
        # see note below). In transparent mode: pull char from FIFO instead.
        draw_blank_cell()

    elif cell >= 0xF0:
        # Special control: $F0/F1 = end of row, $F2/F3 = end of screen
        if cell in (0xF0, 0xF1):
            blank_rest_of_row()
            break
        elif cell in (0xF2, 0xF3):
            blank_rest_of_screen()
            return

    else:
        # Character attribute $C0-$EF: graphics symbol (rare on RK86)
        cccc = (cell >> 2) & 0x0F
        draw_graphics_symbol(cccc, lc, underline_line)
```

### Subtle point: when does the new color "take effect"?

There's a real ambiguity in the i8275 about whether the attribute byte's own cell shows the *old* color or the *new* color. The Apogee BK-01Ц adds a 155ИР1 latch that delays the attribute by one cell, which shifts color regions one cell to the right relative to characters. The pure Tolkalin scheme has no such latch — the new attribute applies starting from the *next* cell, and the attribute cell itself is blank in the previous color. Most existing RK colorized games are tuned to the Tolkalin behavior, so emulate that as the default.

## 7. Practical references

- **Intel 8275 datasheet**: http://www.elektronikjk.pl/elementy_czynne/IC/8275.pdf — the authoritative spec for chip behavior, command formats, and timing
- **MAME i8275.cpp**: https://github.com/mamedev/mame/blob/master/src/devices/video/i8275.cpp — battle-tested open-source implementation of all of the above. The `char_from_buffer()` function is exactly the byte-classifier you need.
- **Emu80 source**: https://github.com/vpyk/emu80v4 — has both Tolkalin and Akimenko color schemes already implemented for RK86 specifically, worth reading for the RGB lookup details
- **RK8266** (https://github.com/klad-me/RK8266): a minimal real-hardware RK86 emulator on ESP8266 — small enough to read end-to-end

The MAME implementation is the one to point at first — it's correct, well-commented, and handles every edge case (FIFO for transparent attributes, blink timing, end-of-row blanking, character attribute graphics tables) you'll eventually run into.
