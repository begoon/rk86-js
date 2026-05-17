import { expect, test } from "bun:test";

import { Keyboard } from "../src/lib/core/rk86_keyboard.js";
import type { Machine } from "../src/lib/core/rk86_machine.js";
import { Memory } from "../src/lib/core/rk86_memory.js";
import { IO } from "../test/test_machine.js";

// Production builders (web/terminal/component) wire `io` so that 8080
// IN/OUT port instructions go through the memory bus at address
// `port | (port << 8)`. This matches real 8080 hardware (port number
// is placed on both halves of the address bus) and is required for
// programs like NALET.RK that scan the keyboard via IN/OUT instead of
// memory-mapped LDA/STA.

function buildMachine() {
    const keyboard = new Keyboard();
    const io = new IO();
    const machine = { keyboard, io, log: () => {} } as unknown as Machine;
    machine.memory = new Memory(machine);
    io.input = (port: number) => machine.memory.read(port | (port << 8));
    io.output = (port: number, w8: number) => machine.memory.write(port | (port << 8), w8);
    return { machine, keyboard, io };
}

test("OUT to PPI port A (0x80) lands at mirrored memory address 0x8080", () => {
    const { machine, io } = buildMachine();
    io.output(0x80, 0xfd);
    expect(machine.memory.buf[0x8080]).toBe(0xfd);
});

test("IN from PPI port B (0x81) reflects keyboard matrix via mirrored address 0x8181", () => {
    const { keyboard, io } = buildMachine();
    // Drive scan row 7 (PA bit 7 low) via OUT.
    io.output(0x80, 0x7f);

    // No key pressed → port B reads 0xFF.
    expect(io.input(0x81)).toBe(0xff);

    // Press Space (row 7, bit 0x80) → port B clears bit 7.
    keyboard.keydown("Space");
    expect(io.input(0x81)).toBe(0x7f);

    // Release Space → back to 0xFF.
    keyboard.keyup("Space");
    expect(io.input(0x81)).toBe(0xff);
});

test("IN from PPI port C (0x82) returns keyboard modifiers", () => {
    const { keyboard, io } = buildMachine();
    expect(io.input(0x82)).toBe(0xff);

    keyboard.keydown("ShiftLeft");
    expect(io.input(0x82) & 0x20).toBe(0); // SS bit low

    keyboard.keyup("ShiftLeft");
    expect(io.input(0x82) & 0x20).toBe(0x20);
});
