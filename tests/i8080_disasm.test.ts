import { expect, test } from "bun:test";
import { i8080_opcode } from "../src/lib/core/i8080_disasm.js";

test("i8080_opcode", () => {
    expect(i8080_opcode(0x00)).toEqual({
        cmd: "NOP",
        length: 1,
        instr: "NOP",
    });
    expect(i8080_opcode(0x08)).toEqual({
        cmd: "NOP?",
        length: 1,
        bad: true,
        instr: "NOP?",
    });
    expect(i8080_opcode(0x01, 0xab, 0xcd)).toEqual({
        cmd: "LXI",
        arg1: "B",
        arg2: "CDAB",
        data2: true,
        length: 3,
        instr: "LXI   B, CDAB",
    });
    expect(i8080_opcode(0x02)).toEqual({
        cmd: "STAX",
        arg1: "B",
        length: 1,
        instr: "STAX  B",
    });
    expect(i8080_opcode(0x03)).toEqual({
        cmd: "INX",
        arg1: "B",
        length: 1,
        instr: "INX   B",
    });
    expect(i8080_opcode(0xcd, 0xaa, 0xbb)).toEqual({
        cmd: "CALL",
        code: true,
        arg1: "BBAA",
        length: 3,
        instr: "CALL  BBAA",
    });
    expect(i8080_opcode(0x32, 0xaa, 0xbb)).toEqual({
        cmd: "STA",
        arg1: "BBAA",
        data1: true,
        length: 3,
        instr: "STA   BBAA",
    });
    expect(i8080_opcode(0x78)).toEqual({
        cmd: "MOV",
        arg1: "A",
        arg2: "B",
        length: 1,
        instr: "MOV   A, B",
    });
    expect(i8080_opcode(0x06, 0xdd)).toEqual({
        cmd: "MVI",
        arg1: "B",
        arg2: "DD",
        length: 2,
        instr: "MVI   B, DD",
    });
});
