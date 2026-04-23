import type { Machine } from "./rk86_machine.js";

export interface Renderer {
    connect(machine: Machine): void;
    update(): void;
}
