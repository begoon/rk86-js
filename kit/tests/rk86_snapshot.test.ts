import { beforeEach, expect, test } from "bun:test";

import { I8080 } from "../src/lib/core/i8080.ts";
import { Keyboard } from "../src/lib/core/rk86_keyboard.ts";
import { Memory } from "../src/lib/core/rk86_memory.js";
import { Screen } from "../src/lib/core/rk86_screen.js";

import { rk86_snapshot, rk86_snapshot_restore } from "../src/lib/core/rk86_snapshot.js";

const document = {};
const window = { setTimeout() {} };

const version = "0.0.0";

let machine: Machine;

const memory = {
    read: (addr: number): number => {
        throw new Error(`unexpected memory read from address ${addr}`);
    },
    write: (addr: number, value: number): void => {
        throw new Error(`unexpected memory write to address ${addr} with value ${value}`);
    },
};

const io = {
    input: (port: number): number => {
        throw new Error(`unexpected IO read from port ${port}`);
    },
    output: (port: number, value: number): void => {
        throw new Error(`unexpected IO write to port ${port} with value ${value}`);
    },
    interrupt: (iff: number): void => {
        throw new Error(`unexpected interrupt with IFF ${iff}`);
    },
};

function create_cpu() {
    const cpu = new I8080({ memory, io });
    cpu.set_a(0xe6);
    cpu.sf = 1;
    cpu.zf = 0;
    cpu.hf = 1;
    cpu.pf = 0;
    cpu.cf = 1;
    cpu.set_b(0x11);
    cpu.set_c(0x22);
    cpu.set_d(0x33);
    cpu.set_e(0x44);
    cpu.set_h(0x55);
    cpu.set_l(0x66);
    cpu.sp = 0x7788;
    cpu.pc = 0x9999;
    cpu.iff = 1;
    return cpu;
}

function create_keyboard() {
    const keyboard = new Keyboard();
    keyboard.modifiers = 0xe6;
    keyboard.state = [0x0f, 0x1e, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78];
    return keyboard;
}

function create_memory() {
    const memory = new Memory({} as unknown as Machine);
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
}

function create_screen() {
    const screen = new Screen({} as unknown as Machine);
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
    return screen;
}

beforeEach(() => {
    machine = {
        io,
        cpu: create_cpu(),
        memory: create_memory(),
        keyboard: create_keyboard(),
        screen: create_screen(),
        ui: {},
        log: () => {},
    } as unknown as Machine;
    machine.screen.machine = machine;
});

const normalize = (v: string) => JSON.stringify(JSON.parse(v), null, 4);

import { type Machine } from "../src/lib/core/rk86_machine.js";
import EXPECTED_SNAPSHOT from "./test_snapshot.json" with { type: "json" };

test("export", () => {
    expect.assertions(4172);

    Date.prototype.toISOString = () => "created";

    if (!machine) throw new Error("machine is not defined");

    const snapshot = normalize(rk86_snapshot(machine, version));
    const expected_snapshot = JSON.stringify(EXPECTED_SNAPSHOT, null, 4);

    const snapshot_lines = snapshot.split("\n");
    const expected_lines = expected_snapshot.split("\n");
    for (let i = 0; i < expected_lines.length; i += 1) {
        const diff_context =
            "\n\nACTUAL\n\n" +
            snapshot_lines
                .slice(i - 1, i + 2)
                .map((v) => `> ${v}`)
                .join("\n") +
            "\n" +
            "\n" +
            "EXPECTED\n\n" +
            expected_lines.slice(i - 1, i + 2).join("\n") +
            "\n";

        expect(snapshot_lines[i], diff_context).toBe(expected_lines[i]);
    }
});

test.each([
    ["string", JSON.stringify(EXPECTED_SNAPSHOT)],
    ["object", EXPECTED_SNAPSHOT],
])("restore from %s", (type, snapshot) => {
    expect.assertions(50);

    const logMessages: string[] = [];
    machine.log = (...args: unknown[]) => logMessages.push(args.join(" "));

    machine.ui.update_screen_geometry = (width: number, height: number) => expect([width, height]).toEqual([3, 4]);
    machine.ui.update_video_memory_address = (base: number) => expect(base).toBe(0x1111);

    expect(rk86_snapshot_restore(snapshot, machine)).toBeTrue();

    expect(logMessages[0]).toBe("установлен размер экрана: 3 x 4");
    expect(logMessages[1]).toContain("установлена видеопамять с адреса");

    expect(machine.cpu.a()).toBe(0xe6);
    expect(machine.cpu.sf).toBe(1);
    expect(machine.cpu.zf).toBe(0);
    expect(machine.cpu.hf).toBe(1);
    expect(machine.cpu.pf).toBe(0);
    expect(machine.cpu.cf).toBe(1);
    expect(machine.cpu.bc()).toBe(0x1122);
    expect(machine.cpu.de()).toBe(0x3344);
    expect(machine.cpu.hl()).toBe(0x5566);
    expect(machine.cpu.sp).toBe(0x7788);
    expect(machine.cpu.pc).toBe(0x9999);
    expect(machine.cpu.iff).toBe(1);

    expect(machine.memory.vg75_c001_00_cmd).toBe(1);
    expect(machine.memory.video_screen_size_x_buf).toBe(2);
    expect(machine.memory.video_screen_size_y_buf).toBe(3);
    expect(machine.memory.vg75_c001_80_cmd).toBe(4);
    expect(machine.memory.cursor_x_buf).toBe(5);
    expect(machine.memory.cursor_y_buf).toBe(6);
    expect(machine.memory.vg75_c001_60_cmd).toBe(7);
    expect(machine.memory.ik57_e008_80_cmd).toBe(8);
    expect(machine.memory.tape_8002_as_output).toBe(1);
    expect(machine.memory.video_memory_base_buf).toBe(0x1111);
    expect(machine.memory.video_memory_size_buf).toBe(0x2222);
    expect(machine.memory.video_memory_base).toBe(0x3333);
    expect(machine.memory.video_memory_size).toBe(0x4444);
    expect(machine.memory.video_screen_size_x).toBe(9);
    expect(machine.memory.video_screen_size_y).toBe(10);
    expect(machine.memory.video_screen_cursor_x).toBe(11);
    expect(machine.memory.video_screen_cursor_y).toBe(12);
    expect(machine.memory.last_access_address).toBe(0x5555);
    expect(machine.memory.last_access_operation).toBe("erase");

    expect(machine.keyboard.modifiers).toBe(0xe6);
    expect(machine.keyboard.state).toEqual([0x0f, 0x1e, 0x2d, 0x3c, 0x4b, 0x5a, 0x69, 0x78]);

    expect(machine.screen.scale_x).toBe(1);
    expect(machine.screen.scale_y).toBe(2);
    expect(machine.screen.width).toBe(3);
    expect(machine.screen.height).toBe(4);
    expect(machine.screen.cursor_state).toBe(true);
    expect(machine.screen.cursor_x).toBe(6);
    expect(machine.screen.cursor_y).toBe(7);
    expect(machine.screen.video_memory_base).toBe(0x1111);
    expect(machine.screen.video_memory_size).toBe(12); // 3x4
    expect(machine.screen.light_pen_x).toBe(8);
    expect(machine.screen.light_pen_y).toBe(9);
    expect(machine.screen.light_pen_active).toBe(1);
});

test("restore failure", () => {
    expect(rk86_snapshot_restore("{}")).toBeFalse();
    expect(rk86_snapshot_restore('{"id": "x"}')).toBeFalse();
    expect(rk86_snapshot_restore({})).toBeFalse();
    expect(rk86_snapshot_restore({ id: "x" })).toBeFalse();
});
