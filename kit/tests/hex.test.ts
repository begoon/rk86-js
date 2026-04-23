import { expect, test } from "bun:test";
import { fromHex, hex16, hex8, hexArray } from "../src/lib/core/hex.js";

test("hex8", () => {
    expect(hex8(0)).toBe("00");
    expect(hex8(0xff)).toBe("FF");
    expect(hex8(0xff)).toBe("FF");
    expect(hex8(0xe6)).toBe("E6");
    expect(hex8(0xaabb)).toBe("BB");

    expect(hex8(0, "0x")).toBe("0x00");
    expect(hex8(0xff, "$")).toBe("$FF");
});

test("hex16", () => {
    expect(hex16(0)).toBe("0000");
    expect(hex16(0xffff)).toBe("FFFF");
    expect(hex16(0xc0de)).toBe("C0DE");
    expect(hex16(0xbeefbeef)).toBe("BEEF");

    expect(hex16(0, "0x")).toBe("0x0000");
    expect(hex16(0xffff, "$")).toBe("$FFFF");
});

test("hexArray", () => {
    expect(hexArray([0])).toBe("00");
    expect(hexArray([0, 1, 2, 3])).toBe("00 01 02 03");
});

test("fromHex", () => {
    expect(fromHex(0)).toBe(0);
    expect(fromHex(100)).toBe(100);
    expect(fromHex("0")).toBe(0);
    expect(fromHex("10")).toBe(10);
    expect(fromHex("0x00")).toBe(0x00);
    expect(fromHex("0xFF")).toBe(0xff);
    expect(fromHex("0xE6")).toBe(0xe6);
    expect(fromHex("0x0000")).toBe(0x0000);
    expect(fromHex("0xFFFF")).toBe(0xffff);
    expect(fromHex("0xC0DE")).toBe(0xc0de);
});
