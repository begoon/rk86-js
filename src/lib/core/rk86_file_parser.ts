export interface RK86File {
    name: string;
    size: number;
    start: number;
    end: number;
    entry: number;
    image: number[];
}

export const extract_rk86_word = function (v: number[], i: number): number {
    return ((v[i] & 0xff) << 8) | (v[i + 1] & 0xff);
};

export const to_text = (binary: number[]): string => binary.reduce((a, x) => a + String.fromCharCode(x), "");

export const is_hex_file = (image: number[]): boolean => to_text(image.slice(0, 6)) === "#!rk86";

interface ParseResult {
    ok: boolean;
    json?: any;
}

export const parse = (binary?: number[] | Uint8Array | null): ParseResult => {
    try {
        if (!binary) return { ok: false };
        if (binary instanceof Uint8Array) binary = Array.from(binary);
        const text = to_text(binary);
        return { ok: true, json: JSON.parse(text) };
    } catch {
        return { ok: false };
    }
};

export const convert_hex_to_binary = function (text: string): number[] {
    const lines = text
        .split("\n")
        .filter((line) => line.trim().length)
        .filter((line) => !line.startsWith(";") && !line.startsWith("#"));

    const image = [];
    for (const line of lines) {
        const hex_line = line.slice(5).trim();
        const binary_line = hex_line.split(" ").map((v) => parseInt(v, 16));
        image.push(...binary_line);
    }
    return image;
};

export const file_ext = (filename: string): string => {
    const groups = filename.match(".*\\.(.*)$");
    return groups ? groups[1] : "";
};

export const parse_rk86_binary = (name: string, input: number[]): RK86File => {
    let file = {} as RK86File;
    file.name = name.split("/").slice(-1)[0];

    let image = input;
    if (is_hex_file(image)) {
        const text = to_text(image);
        image = convert_hex_to_binary(text);
        file = { ...file, ...extact_metadata(text) };
        if (file.start != null) file.start = parseInt(file.start as any, 16);
        if (file.entry != null) file.entry = parseInt(file.entry as any, 16);
    }

    if (image.length > 0x10000) {
        throw new Error(`ошибка: длина файла [${file.name}] ${image.length} превышает 65556`);
    }

    const ext = file_ext(file.name);

    if (ext === "bin" || ext === "") {
        file.size = image.length;
        if (file.start == null) {
            file.start = file.name.match(/^mon/) ? 0x10000 - file.size : 0;
        }
        file.end = file.start + file.size - 1;
        file.image = image;
        if (file.entry == null) {
            file.entry = file.start;
        }
    } else {
        let i = 0;
        if ((image[i] & 0xff) == 0xe6) ++i;
        file.start = extract_rk86_word(image, i);
        file.end = extract_rk86_word(image, i + 2);
        i += 4;
        file.size = file.end - file.start + 1;
        file.image = image.slice(i, i + file.size);
        file.entry = file.entry != null ? file.entry : file.start;
        if (file.name == "PVO.GAM") file.entry = 0x3400;
    }
    return file;
};

export function extact_metadata(text: string): Record<string, unknown> {
    const initial: Record<string, unknown> = {};
    return [...text.matchAll(/!([^ =\t\n\r]+?)=([^ \t\r\n]+)/g)]
        .map((group) => group.slice(1))
        .reduce((a, [key, value]) => ((a[key] = value), a), initial);
}
