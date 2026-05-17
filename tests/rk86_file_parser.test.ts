import { expect, test } from "bun:test";
import {
    convert_hex_to_binary,
    extact_metadata,
    extract_rk86_word,
    file_ext,
    is_hex_file,
    parse,
    parse_rk86_binary,
} from "../src/lib/core/rk86_file_parser.js";

test("extract_rk86_word", () => {
    expect(extract_rk86_word([0x11, 0x22, 0x33], 1)).toBe(0x2233);
});

const toArray = (s: string): number[] => s.split("").map((c) => c.charCodeAt(0));

test("recognize the signature", () => {
    expect(is_hex_file(toArray("#!rk86"))).toBe(true);
});

test("recognize the signature followed by newline", () => {
    expect(is_hex_file(toArray("#!rk86\n"))).toBe(true);
});

test("parse file", () => {
    expect(parse(null)).toEqual({ ok: false });
    expect(parse(undefined)).toEqual({ ok: false });
    expect(parse([1])).toEqual({ ok: false });
    expect(parse(toArray("{}"))).toEqual({ ok: true, json: {} });
    expect(parse(toArray('{"id": "rk86"}'))).toEqual({ ok: true, json: { id: "rk86" } });
    expect(parse(toArray("{}"))).toEqual({ ok: true, json: {} });
    expect(parse(new Uint8Array(toArray("{}")))).toEqual({ ok: true, json: {} });
    expect(parse(new Uint8Array(toArray('{"a": 1}')))).toEqual({ ok: true, json: { a: 1 } });
});

test("convert multiline line with signature", () => {
    const input =
        "\n" +
        "#!rk86\n" +
        "0000 01 02 03 04 05 06 07 08\n" +
        "0000 09 0A 1B 1C 0D 0E FF 00\n" +
        "0000 a0 b0 c0 d0 e0 FF\n" +
        "\n" +
        "0000 AA\n" +
        "\n";
    const expected = [
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x1b, 0x1c, 0x0d, 0x0e, 0xff, 0x00, 0xa0, 0xb0,
        0xc0, 0xd0, 0xe0, 0xff, 0xaa,
    ];
    expect(convert_hex_to_binary(input)).toEqual(expected);
});

test("extract name=name", () => {
    expect(extact_metadata("!name=name")).toEqual({ name: "name" });
});

test("extract empty name", () => {
    expect(extact_metadata("!name")).toEqual({});
});

test("extract name=name after signature", () => {
    expect(extact_metadata("#!rk86\n!name=name\n")).toEqual({ name: "name" });
});

test("extract name=name after signature on the same line", () => {
    expect(extact_metadata("#!rk86 !name=name\n")).toEqual({ name: "name" });
});

test("extract tags from multiple lines", () => {
    expect(extact_metadata("#!name=name\n!start=100 !end=200 !entry=300")).toEqual({
        name: "name",
        start: "100",
        end: "200",
        entry: "300",
    });
});

test("file_ext cases", () => {
    expect(file_ext("name.ext")).toBe("ext");
    expect(file_ext("name")).toBe("");
    expect(file_ext("name.")).toBe("");
    expect(file_ext("")).toBe("");
    expect(file_ext(".")).toBe("");
    expect(file_ext(".ext")).toBe("ext");
});

test("parse_rk86_binary - name only", () => {
    expect(parse_rk86_binary("name.rk", [0xe6, 0x11, 0x22, 0x33, 0x44, 0xaa])).toEqual({
        name: "name.rk",
        start: 0x1122,
        end: 0x3344,
        entry: 0x1122,
        size: 0x3344 - 0x1122 + 1,
        image: [0xaa],
    });
});

test("parse_rk86_binary variations", () => {
    expect(parse_rk86_binary("folder/name.rk", [0xe6, 0x22, 0x11, 0x44, 0x33, 0x66])).toEqual({
        name: "name.rk",
        start: 0x2211,
        end: 0x4433,
        entry: 0x2211,
        size: 0x4433 - 0x2211 + 1,
        image: [0x66],
    });

    expect(parse_rk86_binary("https://domain.com/path/name.rk", [0xe6, 0x11, 0x22, 0x33, 0x44, 0xaa])).toEqual({
        name: "name.rk",
        start: 0x1122,
        end: 0x3344,
        entry: 0x1122,
        size: 0x3344 - 0x1122 + 1,
        image: [0xaa],
    });

    expect(parse_rk86_binary("PVO.GAM", [0xe6, 0x11, 0x22, 0x33, 0x44, 0xaa])).toEqual({
        name: "PVO.GAM",
        start: 0x1122,
        end: 0x3344,
        entry: 0x3400,
        size: 0x3344 - 0x1122 + 1,
        image: [0xaa],
    });

    expect(parse_rk86_binary("mon32.bin", [0x11, 0x22])).toEqual({
        name: "mon32.bin",
        start: 0xfffe,
        end: 0xffff,
        entry: 0xfffe,
        size: 2,
        image: [0x11, 0x22],
    });

    expect(parse_rk86_binary("mon32", [0x11, 0x22])).toEqual({
        name: "mon32",
        start: 0xfffe,
        end: 0xffff,
        entry: 0xfffe,
        size: 2,
        image: [0x11, 0x22],
    });

    expect(parse_rk86_binary("binary.bin", [0x11, 0x22])).toEqual({
        name: "binary.bin",
        start: 0,
        end: 1,
        entry: 0,
        size: 2,
        image: [0x11, 0x22],
    });

    expect(parse_rk86_binary("binary", [0x11, 0x22, 0x33])).toEqual({
        name: "binary",
        start: 0,
        end: 2,
        entry: 0,
        size: 3,
        image: [0x11, 0x22, 0x33],
    });
});

test("throws when file is too long", () => {
    expect(() => parse_rk86_binary("long.pki", new Array(0x10001))).toThrow(
        "ошибка: длина файла [long.pki] 65537 превышает 65556",
    );
});

test("parse_rk86_binary, name stays, start/entry=0", () => {
    const image = toArray("#!rk86\n0000 11\n");
    expect(parse_rk86_binary("random", image)).toEqual({
        name: "random",
        start: 0,
        end: 0,
        entry: 0,
        size: 1,
        image: [0x11],
    });
});

test("parse_rk86_binary, name from tags", () => {
    const image = toArray("#!rk86 !name=image.bin \n0000 11\n");
    expect(parse_rk86_binary("random", image)).toEqual({
        name: "image.bin",
        start: 0,
        end: 0,
        entry: 0,
        size: 1,
        image: [0x11],
    });
});

test("parse_rk86_binary, start from tags", () => {
    const image = toArray("#!rk86 !name=image.bin !start=0100 \n0000 11\n");
    expect(parse_rk86_binary("random", image)).toEqual({
        name: "image.bin",
        start: 0x0100,
        end: 0x0100,
        entry: 0x0100,
        size: 1,
        image: [0x11],
    });
});

test("parse_rk86_binary, entry from tags", () => {
    const image = toArray("#!rk86 !name=image.bin !start=0100 !entry=0200 \n0000 11\n");
    expect(parse_rk86_binary("random", image)).toEqual({
        name: "image.bin",
        start: 0x0100,
        end: 0x0100,
        entry: 0x0200,
        size: 1,
        image: [0x11],
    });
});

test("RK file should ignore start from tags", () => {
    const image = toArray("#!rk86 !start=0100\n0000 E6 11 22 11 23 AA BB\n");
    expect(parse_rk86_binary("image.rk", image)).toEqual({
        name: "image.rk",
        start: 0x1122,
        end: 0x1123,
        entry: 0x1122,
        size: 2,
        image: [0xaa, 0xbb],
    });
});

test("RK file should use entry from tags", () => {
    const image = toArray("#!rk86 !name=image.rk !start=0100 !entry=0200\n0000 E6 11 22 11 23 AA BB\n");
    expect(parse_rk86_binary("random", image)).toEqual({
        name: "image.rk",
        start: 0x1122,
        end: 0x1123,
        entry: 0x0200,
        size: 2,
        image: [0xaa, 0xbb],
    });
});

test("parse_rk86_hex - entry from tags", () => {
    const name = "random";
    const hex = "#!rk86 !name=image.rk !start=0100 !entry=0200\n0000 E6 11 22 11 23 AA BB\n";
    expect(parse_rk86_binary(name, toArray(hex))).toEqual({
        name: "image.rk",
        start: 0x1122,
        end: 0x1123,
        entry: 0x0200,
        size: 2,
        image: [0xaa, 0xbb],
    });
});
