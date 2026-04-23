import fs from "node:fs/promises";
import type { Tracer } from "./test_console_tracer.ts";
import type { Memory } from "./test_machine.ts";

export async function load_file(name: string, memory: Memory, tracer: Tracer) {
    const image = await fs.readFile("./test/files/" + name);
    image.forEach((byte, i) => memory.write(0x100 + i, byte));
    tracer.writeln(`> LOAD ${name} ${image.length}`);
}
