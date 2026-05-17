import { expect, test } from "bun:test";

import { rk86_check_sum } from "../src/lib/core/rk86_check_sum.js";

test("extract_rk86_word", () => {
    expect(rk86_check_sum([])).toBe(0x0000);
    expect(rk86_check_sum([0x00])).toBe(0x0000);
    expect(rk86_check_sum([0xff])).toBe(0x00ff);
    expect(rk86_check_sum([0xc3, 0x36, 0xf8])).toBe(0xf9f1);
    expect(rk86_check_sum([0x00, 0x00])).toBe(0x0000);
    expect(rk86_check_sum([0xff, 0xff])).toBe(0xfffe);
    expect(rk86_check_sum([0x01, 0x02])).toBe(0x0103);
    expect(rk86_check_sum([0x80, 0x80, 0x01])).toBe(0x0101);
    expect(rk86_check_sum([0x01, 0x01, 0x01, 0x01])).toBe(0x0304);
    expect(rk86_check_sum(new Array(256).fill(0x00))).toBe(0x0000);
    expect(rk86_check_sum(new Array(256).fill(0xff))).toBe(0xff00);
});
