export class Memory {
    memory: number[];
    read: (addr: number) => number;
    write: (addr: number, w8: number) => void;

    constructor() {
        this.memory = new Array(0x10000).fill(0);
        this.read = (addr: number): number => this.memory[addr & 0xffff] & 0xff;
        this.write = (addr: number, w8: number): void => {
            this.memory[addr & 0xffff] = w8 & 0xff;
        };
    }
}

export class IO {
    input: (port: number) => number;
    output: (port: number, w8: number) => void;
    interrupt: (iff: number) => void;

    constructor() {
        this.input = (port: number): number => 0;
        this.output = (port: number, w8: number): void => {};
        this.interrupt = (iff: number): void => {};
    }
}
