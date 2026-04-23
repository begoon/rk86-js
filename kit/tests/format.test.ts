import { expect, test } from "bun:test";

import "../src/lib/core/format.js";

test("plain text without format specifiers", () => {
    expect("hello".format()).toBe("hello");
    expect("no specifiers here".format()).toBe("no specifiers here");
    expect("".format()).toBe("");
});

test("%d - decimal integer", () => {
    expect("%d".format(123)).toBe("123");
    expect("%d".format(0)).toBe("0");
    expect("%d".format(-42)).toBe("-42");
    expect("%d".format(3.7)).toBe("3");
});

test("%x - lowercase hex", () => {
    expect("%x".format(255)).toBe("ff");
    expect("%x".format(0)).toBe("0");
    expect("%x".format(123)).toBe("7b");
});

test("%X - uppercase hex", () => {
    expect("%X".format(255)).toBe("FF");
    expect("%X".format(123)).toBe("7B");
});

test("%o - octal", () => {
    expect("%o".format(8)).toBe("10");
    expect("%o".format(0)).toBe("0");
    expect("%o".format(255)).toBe("377");
});

test("%b - binary", () => {
    expect("%b".format(5)).toBe("101");
    expect("%b".format(0)).toBe("0");
    expect("%b".format(255)).toBe("11111111");
});

test("%s - string", () => {
    expect("%s".format("test")).toBe("test");
    expect("%s".format("")).toBe("");
    expect("%s".format(123)).toBe("123");
});

test("%c - character from code", () => {
    expect("%c".format(65)).toBe("A");
    expect("%c".format(48)).toBe("0");
    expect("%c".format(32)).toBe(" ");
});

test("%u - unsigned (absolute value)", () => {
    expect("%u".format(-123)).toBe("123");
    expect("%u".format(42)).toBe("42");
    expect("%u".format(0)).toBe("0");
});

test("%f - float", () => {
    expect("%f".format(3.14159)).toBe("3.14159");
    expect("%f".format(0)).toBe("0");
    expect("%f".format(-1.5)).toBe("-1.5");
});

test("%e - exponential", () => {
    expect("%e".format(123456)).toBe("1.23456e+5");
    expect("%e".format(0)).toBe("0e+0");
});

test("%% - literal percent", () => {
    expect("%%".format()).toBe("%");
    expect("100%%".format()).toBe("100%");
    expect("%%d".format()).toBe("%d");
});

test("width padding with spaces (default)", () => {
    expect("%4d".format(42)).toBe("  42");
    expect("%6s".format("hi")).toBe("    hi");
    expect("%4x".format(15)).toBe("   f");
});

test("width padding with zeros", () => {
    expect("%04d".format(42)).toBe("0042");
    expect("%04x".format(0x0f)).toBe("000f");
    expect("%04X".format(0xab)).toBe("00AB");
    expect("%02x".format(0)).toBe("00");
    expect("%08b".format(5)).toBe("00000101");
});

test("left-align with -", () => {
    expect("%-4d".format(42)).toBe("42  ");
    expect("%-6s".format("hi")).toBe("hi    ");
});

test("precision for floats", () => {
    expect("%.2f".format(3.14159)).toBe("3.14");
    expect("%.0f".format(3.7)).toBe("4");
    expect("%.4f".format(1.0)).toBe("1.0000");
});

test("precision for exponential", () => {
    expect("%.2e".format(123456)).toBe("1.23e+5");
});

test("precision for strings (truncation)", () => {
    expect("%.3s".format("hello")).toBe("hel");
    expect("%.10s".format("hi")).toBe("hi");
});

test("+ flag for positive sign", () => {
    expect("%+d".format(42)).toBe("+42");
    expect("%+d".format(-42)).toBe("-42");
    expect("%+f".format(1.5)).toBe("+1.5");
});

test("multiple specifiers in one string", () => {
    expect("%d + %d = %d".format(1, 2, 3)).toBe("1 + 2 = 3");
    expect("%s=%d".format("x", 10)).toBe("x=10");
    expect("%04X:%04X".format(0xdead, 0xbeef)).toBe("DEAD:BEEF");
});

test("mixed text and specifiers", () => {
    expect("value: %d!".format(42)).toBe("value: 42!");
    expect("hex(%02X)".format(10)).toBe("hex(0A)");
});

test("too few arguments throws", () => {
    expect(() => "%d %d".format(1)).toThrow("Format: Too few arguments");
});

test("type mismatch throws", () => {
    expect(() => "%d".format("abc")).toThrow("Expecting number");
});

test("real-world patterns from the codebase", () => {
    expect("%04X".format(0xf800)).toBe("F800");
    expect("%02X".format(0xe6)).toBe("E6");
    expect("PC=%04X A=%02X".format(0x1234, 0xff)).toBe("PC=1234 A=FF");
    expect("%04X: %s".format(0, "NOP")).toBe("0000: NOP");
    expect("%s - %s".format("d", "dump memory")).toBe("d - dump memory");
});
