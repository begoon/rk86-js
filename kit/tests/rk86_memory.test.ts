import { beforeEach, expect, test } from "bun:test";

import { hex16, hexArray } from "../src/lib/core/hex.js";
import { Memory } from "../src/lib/core/rk86_memory.js";

let memory!: Memory;

beforeEach(() => {
    memory = new Memory(undefined);
    memory.vg75_c001_00_cmd = 1;
    memory.video_screen_size_x_buf = 2;
    memory.video_screen_size_y_buf = 3;
    memory.vg75_c001_80_cmd = 4;
    memory.cursor_x_buf = 5;
    memory.cursor_y_buf = 6;
    memory.vg75_c001_60_cmd = 7;
    memory.ik57_e008_80_cmd = 8;
    memory.tape_8002_as_output = 1;
    memory.video_memory_base_buf = 0x1111;
    memory.video_memory_size_buf = 0x2222;
    memory.video_memory_base = 0x3333;
    memory.video_memory_size = 0x4444;
    memory.video_screen_size_x = 9;
    memory.video_screen_size_y = 10;
    memory.video_screen_cursor_x = 11;
    memory.video_screen_cursor_y = 12;
    memory.last_access_address = 0x5555;
    memory.last_access_operation = "erase";
    memory.buf = [];
    for (let i = 0; i < 0x10000; ++i) memory.buf[i] = i & 0xff;
    return memory;
});

test("memory export", () => {
    const exported = memory.export();
    expect(exported.vg75_c001_00_cmd).toBe(1);
    expect(exported.video_screen_size_x_buf).toBe(2);
    expect(exported.video_screen_size_y_buf).toBe(3);
    expect(exported.vg75_c001_80_cmd).toBe(4);
    expect(exported.cursor_x_buf).toBe(5);
    expect(exported.cursor_y_buf).toBe(6);
    expect(exported.vg75_c001_60_cmd).toBe(7);
    expect(exported.ik57_e008_80_cmd).toBe(8);
    expect(exported.tape_8002_as_output).toBe(1);
    expect(exported.video_memory_base_buf).toBe("0x1111");
    expect(exported.video_memory_size_buf).toBe("0x2222");
    expect(exported.video_memory_base).toBe("0x3333");
    expect(exported.video_memory_size).toBe("0x4444");
    expect(exported.video_screen_size_x).toBe(9);
    expect(exported.video_screen_size_y).toBe(10);
    expect(exported.video_screen_cursor_x).toBe(11);
    expect(exported.video_screen_cursor_y).toBe(12);
    expect(exported.last_access_address).toBe("0x5555");
    expect(exported.last_access_operation).toBe("erase");
    expect(Object.keys(exported.memory).length).toBe(4096);
    let i = 0;
    for (let [label, line] of Object.entries(exported.memory)) {
        expect(label).toBe(":" + hex16(i));
        expect(line).toBe(hexArray(memory.buf.slice(i, i + 16)));
        i += 16;
    }
});

test("memory import", () => {
    const imported = new Memory(undefined);
    imported.import(memory.export());

    expect(imported.vg75_c001_00_cmd).toBe(memory.vg75_c001_00_cmd);
    expect(imported.video_screen_size_x_buf).toBe(memory.video_screen_size_x_buf);
    expect(imported.video_screen_size_y_buf).toBe(memory.video_screen_size_y_buf);
    expect(imported.vg75_c001_80_cmd).toBe(memory.vg75_c001_80_cmd);
    expect(imported.cursor_x_buf).toBe(memory.cursor_x_buf);
    expect(imported.cursor_y_buf).toBe(memory.cursor_y_buf);
    expect(imported.vg75_c001_60_cmd).toBe(memory.vg75_c001_60_cmd);
    expect(imported.ik57_e008_80_cmd).toBe(memory.ik57_e008_80_cmd);
    expect(imported.tape_8002_as_output).toBe(memory.tape_8002_as_output);
    expect(imported.video_memory_base_buf).toBe(memory.video_memory_base_buf);
    expect(imported.video_memory_size_buf).toBe(memory.video_memory_size_buf);
    expect(imported.video_memory_base).toBe(memory.video_memory_base);
    expect(imported.video_memory_size).toBe(memory.video_memory_size);
    expect(imported.video_screen_size_x).toBe(memory.video_screen_size_x);
    expect(imported.video_screen_size_y).toBe(memory.video_screen_size_y);
    expect(imported.video_screen_cursor_x).toBe(memory.video_screen_cursor_x);
    expect(imported.video_screen_cursor_y).toBe(memory.video_screen_cursor_y);
    expect(imported.last_access_address).toBe(memory.last_access_address);
    expect(imported.last_access_operation).toBe(memory.last_access_operation);
    expect(imported.buf.length).toBe(0x10000);
});
