import { hex16, hexArray } from "./hex.ts";

export function create(array: number[], width = 16): Record<string, string> {
    const v: Record<string, string> = {};
    for (let i = 0; i < array.length; i += width) {
        v[":" + hex16(i).toString()] = hexArray(array.slice(i, i + width));
    }
    return v;
}

export function parse(hex: Record<string, string>): number[] {
    const array: number[] = [];
    for (let [label, line] of Object.entries(hex)) {
        const address = parseInt(label.slice(1), 16);
        const line_values = line.split(" ").map((value) => parseInt(value, 16));
        for (let j = 0; j < line_values.length; j++) {
            array[address + j] = line_values[j];
        }
    }
    return array;
}
