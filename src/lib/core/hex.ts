function hex(v: number, prefix?: string): string {
    return v.toString(16).toUpperCase();
}

export function hex8(v: number, prefix?: string): string {
    return (prefix ? prefix : "") + hex(v & 0xff, prefix).padStart(2, "0");
}

export function hex16(v: number, prefix?: string): string {
    return (prefix ? prefix : "") + hex(v & 0xffff, prefix).padStart(4, "0");
}

export function hexArray(array: number[]): string {
    return array.map((c) => hex8(c)).join(" ");
}

export function fromHex(v: string | number): number {
    if (typeof v === "string") {
        return v.startsWith("0x") ? parseInt(v, 16) : parseInt(v);
    }
    return v;
}
