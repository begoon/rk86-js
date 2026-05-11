import { expect, test } from "bun:test";
import { parseNumber } from "../src/lib/core/parse_number.ts";

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
