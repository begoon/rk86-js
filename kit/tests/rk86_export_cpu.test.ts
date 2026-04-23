import { beforeEach, expect, test } from "bun:test";

import { I8080 } from "../src/lib/core/i8080.ts";

let cpu: I8080;

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

beforeEach(() => {
    cpu = new I8080({ memory, io });
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
});

test("cpu export", () => {
    const exported = cpu.export();
    expect(exported.a).toBe("0xE6");
    expect(exported.sf).toBe(1);
    expect(exported.zf).toBe(0);
    expect(exported.hf).toBe(1);
    expect(exported.pf).toBe(0);
    expect(exported.cf).toBe(1);
    expect(exported.bc).toBe("0x1122");
    expect(exported.de).toBe("0x3344");
    expect(exported.hl).toBe("0x5566");
    expect(exported.sp).toBe("0x7788");
    expect(exported.pc).toBe("0x9999");
    expect(exported.iff).toBe(1);
});

test("cpu import", () => {
    const imported = new I8080({ memory, io });
    imported.import(cpu.export());
    expect(imported.a()).toBe(cpu.a());
    expect(imported.sf).toBe(cpu.sf);
    expect(imported.zf).toBe(cpu.zf);
    expect(imported.hf).toBe(cpu.hf);
    expect(imported.pf).toBe(cpu.pf);
    expect(imported.cf).toBe(cpu.cf);
    expect(imported.b()).toBe(cpu.b());
    expect(imported.c()).toBe(cpu.c());
    expect(imported.d()).toBe(cpu.d());
    expect(imported.e()).toBe(cpu.e());
    expect(imported.h()).toBe(cpu.h());
    expect(imported.l()).toBe(cpu.l());
    expect(imported.sp).toBe(cpu.sp);
    expect(imported.pc).toBe(cpu.pc);
});
