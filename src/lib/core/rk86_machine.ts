import type { IO } from "../../../test/test_machine.js";
import type { UI } from "../web/boot.js";
import type { I8080 } from "./i8080.ts";
import type { Keyboard } from "./rk86_keyboard.ts";
import type { Memory } from "./rk86_memory.js";
import type { Runner } from "./rk86_runner.js";
import type { Screen } from "./rk86_screen.js";
import type { TapeInterface } from "./rk86_tape_interface.js";

export interface Machine {
    ui: UI;
    cpu: I8080;
    memory: Memory;
    io: IO;
    keyboard: Keyboard;
    runner: Runner;
    screen: Screen;
    tape: TapeInterface;
    font: string;
    log: (...args: unknown[]) => void;

    reset: () => void;
    restart: () => void;
    pause: (paused: boolean) => void;
    loadCatalogFile: (name: string) => Promise<void>;
    runLoadedFile: () => void;
    uploadFile: (file: File) => Promise<void>;
}

export type MachineBuilder = Partial<Machine>;
