import { fromHex, hex8 } from "./hex.js";

export interface KeyboardSnapshot {
    state: string[];
    modifiers: string;
}

export class Keyboard {
    state!: number[];
    modifiers!: number;

    keydown = (code: string) => {
        // SHIFT
        if (code === "ShiftLeft" || code === "ShiftRight") this.modifiers &= ~SS;
        // CTRL
        if (code === "ControlLeft") this.modifiers &= ~US;
        // F10
        if (code === "F10") this.modifiers &= ~RL;
        const key = Keyboard.key_table[code];
        if (key) this.state[key[0]] &= ~key[1];
    };

    keyup = (code: string) => {
        // SHIFT
        if (code === "ShiftLeft" || code === "ShiftRight") this.modifiers |= SS;
        // CTRL
        if (code === "ControlLeft") this.modifiers |= US;
        // F10
        if (code === "F10") this.modifiers |= RL;
        const key = Keyboard.key_table[code];
        if (key) this.state[key[0]] |= key[1];
    };

    onkeydown = (code: string) => this.keydown(code);
    onkeyup = (code: string) => this.keyup(code);

    constructor() {
        this.reset();
    }

    reset() {
        this.state = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
        this.modifiers = 0xff;
    }

    export(): KeyboardSnapshot {
        const h8 = (n: number) => "0x" + hex8(n);
        return {
            state: this.state.map(h8),
            modifiers: h8(this.modifiers),
        };
    }

    import(snapshot: KeyboardSnapshot) {
        this.state = snapshot.state.map(fromHex);
        this.modifiers = fromHex(snapshot.modifiers);
    }

    static key_table: Record<string, [number, number]> = {
        F8: [0, 0x01], // ↖︎ (home)
        F9: [0, 0x02], // СТР (clean screen)
        F5: [0, 0x04], // AP2 (ESC)
        F1: [0, 0x08], // Ф1
        F2: [0, 0x10], // Ф2
        F3: [0, 0x20], // Ф3
        F4: [0, 0x40], // Ф4
        Tab: [1, 0x01],
        Backquote: [1, 0x02],
        Enter: [1, 0x04],
        Backspace: [1, 0x08],
        ArrowLeft: [1, 0x10],
        ArrowUp: [1, 0x20],
        ArrowRight: [1, 0x40],
        ArrowDown: [1, 0x80],
        Digit0: [2, 0x01],
        Digit1: [2, 0x02],
        Digit2: [2, 0x04],
        Digit3: [2, 0x08],
        Digit4: [2, 0x10],
        Digit5: [2, 0x20],
        Digit6: [2, 0x40],
        Digit7: [2, 0x80],
        Digit8: [3, 0x01],
        Digit9: [3, 0x02],
        F6: [3, 0x04], // "*" (RUS), ":" (LAT)
        Semicolon: [3, 0x08],
        Comma: [3, 0x10],
        Minus: [3, 0x20],
        Period: [3, 0x40],
        Slash: [3, 0x80],
        F7: [4, 0x01], // "Ю" (RUS), "@" (LAT)
        KeyA: [4, 0x02],
        KeyB: [4, 0x04],
        KeyC: [4, 0x08],
        KeyD: [4, 0x10],
        KeyE: [4, 0x20],
        KeyF: [4, 0x40],
        KeyG: [4, 0x80],
        KeyH: [5, 0x01],
        KeyI: [5, 0x02],
        KeyJ: [5, 0x04],
        KeyK: [5, 0x08],
        KeyL: [5, 0x10],
        KeyM: [5, 0x20],
        KeyN: [5, 0x40],
        KeyO: [5, 0x80],
        KeyP: [6, 0x01],
        KeyQ: [6, 0x02],
        KeyR: [6, 0x04],
        KeyS: [6, 0x08],
        KeyT: [6, 0x10],
        KeyU: [6, 0x20],
        KeyV: [6, 0x40],
        KeyW: [6, 0x80],
        KeyX: [7, 0x01],
        KeyY: [7, 0x02],
        KeyZ: [7, 0x04],
        BracketLeft: [7, 0x08],
        Backslash: [7, 0x10],
        BracketRight: [7, 0x20],
        Quote: [7, 0x40],
        Space: [7, 0x80],
    };
}

const SS = 0x20;
const US = 0x40;
const RL = 0x80;
