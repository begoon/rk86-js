import { beforeEach, expect, test } from "bun:test";

import { Screen } from "../src/lib/core/rk86_screen.js";

let screen: Screen;

beforeEach(() => {
    screen = new Screen({});
    screen.scale_x = 1;
    screen.scale_y = 2;
    screen.width = 3;
    screen.height = 4;
    screen.cursor_state = true;
    screen.cursor_x = 6;
    screen.cursor_y = 7;
    screen.video_memory_base = 0x1111;
    screen.video_memory_size = 0x2222;
    screen.light_pen_x = 8;
    screen.light_pen_y = 9;
    screen.light_pen_active = 1;
});

test("screen export", () => {
    const exported = screen.export();

    expect(exported.scale_x).toBe(1);
    expect(exported.scale_y).toBe(2);
    expect(exported.width).toBe(3);
    expect(exported.height).toBe(4);
    expect(exported.cursor_state).toBe(1);
    expect(exported.cursor_x).toBe(6);
    expect(exported.cursor_y).toBe(7);
    expect(exported.video_memory_base).toBe("0x1111");
    expect(exported.video_memory_size).toBe("0x2222");
    expect(exported.light_pen_x).toBe(8);
    expect(exported.light_pen_y).toBe(9);
    expect(exported.light_pen_active).toBe(1);
});

test("screen import", () => {
    const imported = new Screen({});
    imported.import(screen.export());

    expect(imported.scale_x).toBe(screen.scale_x);
    expect(imported.scale_y).toBe(screen.scale_y);
    expect(imported.width).toBe(screen.width);
    expect(imported.height).toBe(screen.height);
    expect(imported.cursor_state).toBe(screen.cursor_state);
    expect(imported.cursor_x).toBe(screen.cursor_x);
    expect(imported.cursor_y).toBe(screen.cursor_y);
    expect(imported.video_memory_base).toBe(screen.video_memory_base);
    expect(imported.video_memory_size).toBe(screen.video_memory_size);
    expect(imported.light_pen_x).toBe(screen.light_pen_x);
    expect(imported.light_pen_y).toBe(screen.light_pen_y);
    expect(imported.light_pen_active).toBe(screen.light_pen_active);
});
