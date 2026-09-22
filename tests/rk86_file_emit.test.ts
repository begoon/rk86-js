import { expect, test } from "bun:test";
import { emit_rk86_binary } from "../src/lib/core/rk86_file_emit.js";

test("RKS uses little-endian addresses and checksum without sync bytes", () => {
    // FF + 02 carries into the checksum high byte; the final FF affects only low.
    const expected = [0x34, 0x12, 0x36, 0x12, 0xff, 0x02, 0xff, 0x00, 0x02];
    expect(Array.from(emit_rk86_binary("rks", 0x1234, 0x1236, [0xff, 0x02, 0xff]))).toEqual(expected);
    expect(Array.from(emit_rk86_binary("RKS", 0x1234, 0x1236, new Uint8Array([0xff, 0x02, 0xff])))).toEqual(expected);
});
