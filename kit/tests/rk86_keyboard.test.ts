import { beforeEach, expect, test } from "bun:test";

import { Keyboard } from "../src/lib/core/rk86_keyboard.ts";

let keyboard!: Keyboard;

beforeEach(() => {
    keyboard = new Keyboard();
    keyboard.modifiers = 0xe6;
    keyboard.state = [0x0f, 0x1e, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78];
});

test("keyboard export", () => {
    const exported = keyboard.export();
    expect(exported.modifiers).toBe("0xE6");
    expect(exported.state).toEqual(["0x0F", "0x1E", "0x2D", "0x3C", "0x4B", "0x5A", "0x69", "0x78"]);
});

test("keyboard import", () => {
    const imported = new Keyboard();
    imported.import(keyboard!.export());
    expect(imported.state).toEqual(keyboard.state);
    expect(imported.modifiers).toBe(keyboard.modifiers);
});
