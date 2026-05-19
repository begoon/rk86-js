import { rk86_check_sum } from "./rk86_check_sum.js";

export const RK86_EXTENSIONS = ["rk", "rkr", "gam", "pki", "bin"] as const;
export type Rk86Ext = (typeof RK86_EXTENSIONS)[number];

export function emit_rk86_binary(
    ext: string,
    start: number,
    end: number,
    payload: number[] | Uint8Array,
): Uint8Array {
    const data = payload instanceof Uint8Array ? Array.from(payload) : payload.slice();
    const e = ext.toLowerCase();
    if (e === "bin") return new Uint8Array(data);
    if (e !== "rk" && e !== "rkr" && e !== "pki" && e !== "gam") {
        throw new Error(`неизвестное расширение: ${ext}`);
    }
    const header = [
        (start >> 8) & 0xff,
        start & 0xff,
        (end >> 8) & 0xff,
        end & 0xff,
    ];
    const sum = rk86_check_sum(data);
    const trailer = [0xe6, (sum >> 8) & 0xff, sum & 0xff];
    const prefix = e === "pki" || e === "gam" ? [0xe6] : [];
    return new Uint8Array([...prefix, ...header, ...data, ...trailer]);
}

export function replace_ext(name: string, newExt: string): string {
    const i = name.lastIndexOf(".");
    if (i === -1) return `${name}.${newExt}`;
    return `${name.slice(0, i + 1)}${newExt}`;
}
