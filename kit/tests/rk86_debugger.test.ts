import { expect, test } from "bun:test";
import Debugger from "../src/lib/core/rk86_debugger.ts";
import type { Machine } from "../src/lib/core/rk86_machine.js";
import { parseNumber } from "../src/lib/core/parse_number.ts";
import { Memory } from "../src/lib/core/rk86_memory.js";

test("parseNumber", () => {
    expect(parseNumber("")).toBe(NaN);
    expect(parseNumber(undefined, 100)).toBe(100);

    expect(parseNumber("@")).toBe(NaN);
    expect(parseNumber("@", 100)).toBe(100);

    expect(parseNumber("0x1A")).toBe(26);
    expect(parseNumber("$1A")).toBe(26);
    expect(parseNumber("1Ah")).toBe(26);
    expect(parseNumber("1A")).toBe(26);
    expect(parseNumber("19")).toBe(19);
    expect(parseNumber("a")).toBe(10); // 'a-f' start hexadecimal
    expect(parseNumber("19")).toBe(19);

    expect(parseNumber("10")).toBe(10);
    expect(parseNumber("0")).toBe(0);

    expect(parseNumber("abc")).toBe(0xabc);
    expect(parseNumber("1.5")).toBe(1);
});

test("Debugger.disasm_print", () => {
    const memory = new Memory(undefined);
    memory.write_raw(0x0000, 0x27); // DAA
    memory.write_raw(0x0001, 0xfe); // CPI data8
    memory.write_raw(0x0002, 0xaa); // data8 value
    memory.write_raw(0x0003, 0x76); // HLT

    const dbg = new Debugger({ memory } as unknown as Machine);

    const output: string[] = [];

    const clean = (v: string) => v.replaceAll("&nbsp;", " ");

    dbg.put = (msg) => output.push(clean(msg).trim());

    dbg.disasm_print(0x0000, 3, 1);
    expect(output).toEqual([
        "0000:  27     '   DAA",
        "0001: >FEAA   ..  CPI   AA",
        "0003:  76     Ж   HLT",
        //
    ]);
});
