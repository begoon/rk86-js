import { expect, test } from "bun:test";

import { Keyboard } from "../src/lib/core/rk86_keyboard.js";
import type { Machine } from "../src/lib/core/rk86_machine.js";
import { Memory } from "../src/lib/core/rk86_memory.js";
import { RK86_CLASSIC, type MachineProfile } from "../src/lib/core/rk86_profile.js";

// Профиль с ОЗУ до 9FFF, ППИ клавиатуры в A000-BFFF, ПЗУ от F000.
const shifted: MachineProfile = {
    name: "SHIFTED",
    ram_end: 0x9fff,
    rom_start: 0xf000,
    boot_address: 0xf800,
    keyboard_ppi_base: 0xa000,
    crtc_base: 0xc000,
    dma_base: 0xe000,
    peripheral_window: 0x2000,
};

// 32 КБ ОЗУ, ПЗУ от C000, восемь окон по 2 КБ в 8000-BFFF:
// ППИ клавиатуры в 8000, ВГ75 в 8800, ВТ57 в 9000.
const small: MachineProfile = {
    name: "SRAM2K",
    ram_end: 0x7fff,
    rom_start: 0xc000,
    boot_address: 0xc000,
    keyboard_ppi_base: 0x8000,
    crtc_base: 0x8800,
    dma_base: 0x9000,
    peripheral_window: 0x800,
};

function build(profile: MachineProfile) {
    const keyboard = new Keyboard();
    const screen = {
        set_video_memory: (_address: number) => {},
        set_cursor: (_x: number, _y: number) => {},
        set_char_height: (_h: number) => {},
        set_geometry: (..._args: number[]) => {},
        light_pen_active: false,
        transparent_attr: false,
        underline_scanline: 7,
        hrtc_chars: 0,
        vrtc_rows: 0,
    };
    const machine = { keyboard, screen, log: () => {} } as unknown as Machine;
    const memory = new Memory(machine, profile);
    machine.memory = memory;
    return { machine, memory, keyboard, screen };
}

test("default profile is RK86_CLASSIC with classic register addresses", () => {
    const memory = new Memory({} as Machine);
    expect(memory.profile).toBe(RK86_CLASSIC);
    expect(memory.peripheral_window_mask).toBe(0xe000);
    expect(memory.ppi_mask).toBe(0xe003);
    expect(memory.crtc_mask).toBe(0xe001);
    expect(memory.dma_mask).toBe(0xe00f);
    expect(memory.ppi_port_a).toBe(0x8000);
    expect(memory.ppi_port_c).toBe(0x8002);
    expect(memory.crtc_parameter).toBe(0xc000);
    expect(memory.crtc_command).toBe(0xc001);
    expect(memory.dma_ch0_address).toBe(0xe004);
    expect(memory.dma_mode).toBe(0xe008);
});

test("set_profile recomputes register addresses and keeps buf", () => {
    const { memory } = build(RK86_CLASSIC);
    memory.write_raw(0xf800, 0xc3);
    memory.set_profile(shifted);
    expect(memory.ppi_port_a).toBe(0xa000);
    expect(memory.ppi_port_b).toBe(0xa001);
    expect(memory.ppi_control).toBe(0xa003);
    expect(memory.read_raw(0xf800)).toBe(0xc3);
});

test("keyboard matrix is read through the profile's PPI base", () => {
    const { memory, keyboard } = build(shifted);
    keyboard.keydown("Space"); // row 7, bit 0x80
    memory.write(0xa000, 0x7f); // select scan row 7 via port A
    expect(memory.read(0xa001)).toBe(0x7f);
    // Classic PPI window is plain RAM in this profile: no keyboard there.
    memory.write(0x8000, 0x7f);
    expect(memory.read(0x8001)).toBe(0x00);
    expect(memory.read(0x8000)).toBe(0x7f);
});

test("modifiers are read from the profile's PPI port C", () => {
    const { memory, keyboard } = build(shifted);
    expect(memory.read(0xa002)).toBe(keyboard.modifiers);
    expect(memory.read(0xa002 | 0x1ffc)).toBe(keyboard.modifiers); // mirror inside the window
});

test("RUS/LAT is driven through the profile's PPI control register", () => {
    const { memory } = build(shifted);
    let ruslat = -1;
    memory.update_ruslat = (v) => (ruslat = v);
    memory.write(0xa003, 0x07); // BSR: bit 3 set
    expect(ruslat).toBe(1);
    memory.write(0x8003, 0x06); // plain RAM in this profile
    expect(ruslat).toBe(1);
    expect(memory.read_raw(0x8003)).toBe(0x06);
});

test("DMA channel 0 programming works at the profile's DMA base", () => {
    const { memory, screen } = build(shifted);
    let video = -1;
    screen.set_video_memory = (address: number) => (video = address);
    memory.write(0xe008, 0x80);
    memory.write(0xe004, 0x00);
    memory.write(0xe004, 0x76);
    memory.write(0xe005, 0xff);
    memory.write(0xe005, 0x49);
    expect(video).toBe(0x7600);
    expect(memory.video_memory_base).toBe(0x7600);
});

test("CPU writes land in memory only below rom_start", () => {
    const { memory } = build(shifted);
    memory.write(0x9fff, 0x11);
    memory.write(0xeffe, 0x22); // above ram_end but below rom_start: lenient RAM
    memory.write(0xf000, 0x33);
    memory.write(0xffff, 0x44);
    expect(memory.read_raw(0x9fff)).toBe(0x11);
    expect(memory.read_raw(0xeffe)).toBe(0x22);
    expect(memory.read_raw(0xf000)).toBe(0x00);
    expect(memory.read_raw(0xffff)).toBe(0x00);
});

test("zero_ram clears exactly 0000..ram_end", () => {
    const { memory } = build(shifted);
    for (let i = 0; i < 0x10000; i++) memory.buf[i] = 0xaa;
    memory.zero_ram();
    expect(memory.read_raw(0x0000)).toBe(0x00);
    expect(memory.read_raw(0x9fff)).toBe(0x00);
    expect(memory.read_raw(0xa000)).toBe(0xaa);
    expect(memory.read_raw(0xf800)).toBe(0xaa);
});

test("classic profile: zero_ram clears 0000..7FFF only", () => {
    const { memory } = build(RK86_CLASSIC);
    for (let i = 0; i < 0x10000; i++) memory.buf[i] = 0x55;
    memory.zero_ram();
    expect(memory.read_raw(0x7fff)).toBe(0x00);
    expect(memory.read_raw(0x8000)).toBe(0x55);
});

test("2 KB window: decode masks follow the profile", () => {
    const { memory } = build(small);
    expect(memory.peripheral_window_mask).toBe(0xf800);
    expect(memory.ppi_mask).toBe(0xf803);
    expect(memory.crtc_mask).toBe(0xf801);
    expect(memory.dma_mask).toBe(0xf80f);
});

test("2 KB window: registers are mirrored inside the window only", () => {
    const { memory, keyboard } = build(small);
    expect(memory.read(0x8002)).toBe(keyboard.modifiers);
    expect(memory.read(0x87fe)).toBe(keyboard.modifiers); // last mirror inside 8000-87FF
    // 8800-8FFF is the CRTC window in this profile: 8802 is the CRTC
    // parameter register (reads 00), not PPI port C and not memory.
    memory.write_raw(0x8802, 0x5a);
    expect(memory.read(0x8802)).toBe(0x00);
    // A000 would be a PPI mirror with the classic 8 KB window; here the
    // window A000-A7FF is unmapped and reads fall through to memory.
    memory.write_raw(0xa002, 0x3c);
    expect(memory.read(0xa002)).toBe(0x3c);
});

test("2 KB window: DMA is programmed at 9000 and ROM window C000-FFFF is plain memory for writes", () => {
    const { memory, screen } = build(small);
    let video = -1;
    screen.set_video_memory = (address: number) => (video = address);
    memory.write(0x9008, 0x80);
    memory.write(0x9004, 0x00);
    memory.write(0x9004, 0x76);
    memory.write(0x9005, 0xff);
    memory.write(0x9005, 0x49);
    expect(video).toBe(0x7600);
    // Classic DMA address E008 is ROM here: write is ignored, no DMA side effect.
    video = -1;
    memory.write(0xe008, 0x80);
    memory.write(0xe004, 0x00);
    memory.write(0xe004, 0x50);
    memory.write(0xe005, 0xff);
    memory.write(0xe005, 0x49);
    expect(video).toBe(-1);
    expect(memory.read_raw(0xe004)).toBe(0x00);
});

test("2 KB window: CRTC command register at 8801", () => {
    const { memory } = build(small);
    memory.write(0x8801, 0x00); // reset command: next 4 parameter bytes
    memory.write(0x8800, 0x4f); // 80 columns
    memory.write(0x8800, 0x59); // 26 rows, blink 8
    memory.write(0x8800, 0x79);
    memory.write(0x8800, 0x73);
    expect(memory.video_screen_size_x_buf).toBe(80);
    expect(memory.video_screen_size_y_buf).toBe(26);
});
