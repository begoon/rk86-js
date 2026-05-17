import { expect, test } from "bun:test";
import { create, parse } from "../src/lib/core/hex_map.ts";

test("create", () => {
    expect(create([0])).toEqual({ ":0000": "00" });
    expect(create([0, 1, 2, 3])).toEqual({ ":0000": "00 01 02 03" });
    expect(create([0, 1, 2, 3, 4, 5, 6, 7], 4)).toEqual({
        ":0000": "00 01 02 03",
        ":0004": "04 05 06 07",
    });
    expect(create([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])).toEqual({
        ":0000": "00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F",
        ":0010": "10",
    });
});

test("parse", () => {
    const data = [];
    for (let i = 0; i < 0x10000; ++i) data[i] = (i * 3) & 0xff;
    const created = create(data);
    expect(Object.keys(created).length).toBe(4096);

    const parsed = [];
    let i = 0;
    for (const [label, line] of Object.entries(created)) {
        expect(label.startsWith(":")).toBe(true);
        const address = label.slice(1);
        expect(address.length).toBe(4);
        const address_i = parseInt(address, 16);
        expect(address_i).toBe(i);

        const line_values = line.split(" ").map((v) => parseInt(v, 16));
        expect(line_values.length).toBe(16);

        for (let j = 0; j < line_values.length; j++) {
            parsed[address_i + j] = line_values[j];
        }

        i += 16;
    }

    expect(parsed.length).toBe(data.length);
    for (let i = 0; i < data.length; i++) {
        expect(parsed[i]).toBe(data[i]);
    }
});

test("create/parse", () => {
    const data = [];
    for (let i = 0; i < 0x10000; ++i) data[i] = i & 0xff;
    const created = create(data);
    const parsed = parse(created);

    expect(parsed.length).toBe(data.length);
    for (let i = 0; i < data.length; i++) {
        expect(parsed[i]).toBe(data[i]);
    }
});
