export function parseNumber(input: string | undefined, default_value?: number): number {
    let str = input;
    if (typeof str !== "string" || str.length === 0) {
        if (default_value === undefined) return NaN;
        return default_value;
    }
    const value = parse(str);
    return isNaN(value) && default_value !== undefined ? default_value : value;
}

function parse(v: string): number {
    let str = v.trim().toLowerCase();
    if (str.startsWith("$")) str = "0x" + str.slice(1);
    else if (str.startsWith("0x")) str = str;
    else if (str.endsWith("h")) str = "0x" + str.slice(0, -1);
    else if (str.search(/[a-f]/i) >= 0) str = "0x" + str;
    return parseInt(str);
}
