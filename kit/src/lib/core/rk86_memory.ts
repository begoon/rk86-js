import { fromHex, hex16 } from "./hex.js";
import * as hexMap from "./hex_map";
import type { RK86File } from "./rk86_file_parser.js";
import type { Machine } from "./rk86_machine.js";

interface MemorySnapshot {
    vg75_c001_00_cmd: number;
    video_screen_size_x_buf: number;
    video_screen_size_y_buf: number;
    vg75_c001_80_cmd: number;
    cursor_x_buf: number;
    cursor_y_buf: number;
    vg75_c001_60_cmd: number;
    ik57_e008_80_cmd: number;
    tape_8002_as_output: number;
    video_memory_base_buf: string;
    video_memory_size_buf: string;
    video_memory_base: string;
    video_memory_size: string;
    video_screen_size_x: number;
    video_screen_size_y: number;
    video_screen_cursor_x: number;
    video_screen_cursor_y: number;
    last_access_address: string;
    last_access_operation: string | undefined;
    memory: Record<string, string>;
}

export class Memory {
    buf: number[] = [];
    update_ruslat: (value: number) => void = () => {};

    machine: Machine;

    vg75_c001_00_cmd: number = 0;
    video_screen_size_x_buf: number = 0;
    video_screen_size_y_buf: number = 0;
    ik57_e008_80_cmd: number = 0;
    vg75_c001_80_cmd: number = 0;
    cursor_x_buf: number = 0;
    cursor_y_buf: number = 0;
    vg75_c001_60_cmd: number = 0;
    tape_8002_as_output: number = 0;
    video_memory_base_buf: number = 0;
    video_memory_size_buf: number = 0;
    video_memory_base: number = 0;
    video_memory_size: number = 0;
    video_screen_size_x: number = 0;
    video_screen_size_y: number = 0;
    video_screen_cursor_x: number = 0;
    video_screen_cursor_y: number = 0;
    last_access_address: number = 0;
    last_access_operation: string | undefined = undefined;

    constructor(machine: Machine) {
        this.machine = machine;

        this.init();
        this.invalidate_access_variables();
    }

    init() {
        this.buf = new Array(0x10000).fill(0);

        this.vg75_c001_00_cmd = 0;
        this.video_screen_size_x_buf = 0;
        this.video_screen_size_y_buf = 0;
        this.ik57_e008_80_cmd = 0;
        this.vg75_c001_80_cmd = 0;
        this.cursor_x_buf = 0;
        this.cursor_y_buf = 0;
        this.vg75_c001_60_cmd = 0;
        this.tape_8002_as_output = 0;
        this.video_memory_base_buf = 0;
        this.video_memory_size_buf = 0;
        this.video_memory_base = 0;
        this.video_memory_size = 0;
        this.video_screen_size_x = 0;
        this.video_screen_size_y = 0;
        this.video_screen_cursor_x = 0;
        this.video_screen_cursor_y = 0;
    }

    zero_ram() {
        for (let i = 0; i < 0x8000; ++i) this.buf[i] = 0;
    }

    snapshot(from: number, sz: number): number[] {
        return this.buf.slice(from, from + sz);
    }

    export() {
        const h16 = (n: number) => "0x" + hex16(n);
        return {
            vg75_c001_00_cmd: this.vg75_c001_00_cmd,
            video_screen_size_x_buf: this.video_screen_size_x_buf,
            video_screen_size_y_buf: this.video_screen_size_y_buf,
            vg75_c001_80_cmd: this.vg75_c001_80_cmd,
            cursor_x_buf: this.cursor_x_buf,
            cursor_y_buf: this.cursor_y_buf,
            vg75_c001_60_cmd: this.vg75_c001_60_cmd,
            ik57_e008_80_cmd: this.ik57_e008_80_cmd,
            tape_8002_as_output: this.tape_8002_as_output,
            video_memory_base_buf: h16(this.video_memory_base_buf),
            video_memory_size_buf: h16(this.video_memory_size_buf),
            video_memory_base: h16(this.video_memory_base),
            video_memory_size: h16(this.video_memory_size),
            video_screen_size_x: this.video_screen_size_x,
            video_screen_size_y: this.video_screen_size_y,
            video_screen_cursor_x: this.video_screen_cursor_x,
            video_screen_cursor_y: this.video_screen_cursor_y,
            last_access_address: h16(this.last_access_address),
            last_access_operation: this.last_access_operation,
            memory: hexMap.create(this.buf),
        };
    }

    import = (snapshot: MemorySnapshot) => {
        const h = fromHex;
        this.vg75_c001_00_cmd = snapshot.vg75_c001_00_cmd;
        this.video_screen_size_x_buf = snapshot.video_screen_size_x_buf;
        this.video_screen_size_y_buf = snapshot.video_screen_size_y_buf;
        this.vg75_c001_80_cmd = snapshot.vg75_c001_80_cmd;
        this.cursor_x_buf = snapshot.cursor_x_buf;
        this.cursor_y_buf = snapshot.cursor_y_buf;
        this.vg75_c001_60_cmd = snapshot.vg75_c001_60_cmd;
        this.ik57_e008_80_cmd = snapshot.ik57_e008_80_cmd;
        this.tape_8002_as_output = snapshot.tape_8002_as_output;
        this.video_memory_base_buf = h(snapshot.video_memory_base_buf);
        this.video_memory_size_buf = h(snapshot.video_memory_size_buf);
        this.video_memory_base = h(snapshot.video_memory_base);
        this.video_memory_size = h(snapshot.video_memory_size);
        this.video_screen_size_x = snapshot.video_screen_size_x;
        this.video_screen_size_y = snapshot.video_screen_size_y;
        this.video_screen_cursor_x = snapshot.video_screen_cursor_x;
        this.video_screen_cursor_y = snapshot.video_screen_cursor_y;
        this.last_access_address = h(snapshot.last_access_address);
        this.last_access_operation = snapshot.last_access_operation;
        this.buf = hexMap.parse(snapshot.memory);
    };

    invalidate_access_variables() {
        this.last_access_address = 0;
        this.last_access_operation = undefined;
    }

    length() {
        return 0x10000;
    }

    read_raw(address: number): number {
        const addr = address & 0xffff;
        return this.buf[addr] & 0xff;
    }

    read(address: number): number {
        const addr = address & 0xffff;
        this.last_access_address = addr;
        this.last_access_operation = "read";

        if (addr === 0x8002) return this.machine.keyboard.modifiers;

        if (addr === 0x8001) {
            const keyboard_state = this.machine.keyboard.state;
            let ch = 0xff;
            const kbd_scanline = ~this.buf[0x8000];
            for (let i = 0; i < 8; i++) if ((1 << i) & kbd_scanline) ch &= keyboard_state[i];
            return ch;
        }

        if (addr === 0xc001) {
            return 0x20 | (this.machine.screen.light_pen_active ? 0x10 : 0x00);
        }

        if (addr === 0xc000) {
            if (this.vg75_c001_60_cmd === 1) {
                this.vg75_c001_60_cmd = 2;
                return this.machine.screen.light_pen_x;
            }
            if (this.vg75_c001_60_cmd === 2) {
                this.vg75_c001_60_cmd = 0;
                return this.machine.screen.light_pen_y;
            }
            return 0x00;
        }
        return this.buf[addr];
    }

    write_raw(address: number, value8: number): void {
        const addr = address & 0xffff;
        const byte = value8 & 0xff;
        this.buf[addr] = byte;
    }

    write = (address: number, value8: number) => {
        const addr = address & 0xffff;
        const byte = value8 & 0xff;

        this.last_access_address = addr;
        this.last_access_operation = "write";

        if (addr >= 0xf800) return;
        this.buf[addr] = byte;

        const peripheral_reg = addr & 0xefff;

        if (peripheral_reg === 0x8003) {
            if (byte & 0x80) {
                // Mode set
            } else {
                const bit = (byte >> 1) & 0x03;
                const value = byte & 0x01;
                if (bit === 3) this.set_ruslat(value);
            }
            return;
        }

        if (peripheral_reg === 0xc001 && byte === 0x27) return;
        if (peripheral_reg === 0xc001 && byte === 0xe0) return;

        if (peripheral_reg === 0xc001 && byte === 0x80) {
            this.vg75_c001_80_cmd = 1;
            return;
        }

        if (peripheral_reg === 0xc000 && this.vg75_c001_80_cmd === 1) {
            this.vg75_c001_80_cmd += 1;
            this.cursor_x_buf = byte + 1;
            return;
        }

        if (peripheral_reg === 0xc000 && this.vg75_c001_80_cmd === 2) {
            this.cursor_y_buf = byte + 1;
            this.machine.screen.set_cursor(this.cursor_x_buf - 1, this.cursor_y_buf - 1);
            this.video_screen_cursor_x = this.cursor_x_buf;
            this.video_screen_cursor_y = this.cursor_y_buf;
            this.vg75_c001_80_cmd = 0;
            return;
        }

        if (peripheral_reg === 0xc001 && byte === 0x60) {
            if (this.machine.screen.light_pen_active) this.vg75_c001_60_cmd = 1;
            return;
        }

        if (peripheral_reg === 0xc001 && byte === 0x00) {
            this.vg75_c001_00_cmd = 1;
            return;
        }

        if (peripheral_reg === 0xc000 && this.vg75_c001_00_cmd === 1) {
            this.video_screen_size_x_buf = (byte & 0x7f) + 1;
            this.vg75_c001_00_cmd += 1;
            return;
        }

        if (peripheral_reg === 0xc000 && this.vg75_c001_00_cmd === 2) {
            this.video_screen_size_y_buf = (byte & 0x3f) + 1;
            this.vg75_c001_00_cmd += 1;
            return;
        }

        if (peripheral_reg === 0xc000 && this.vg75_c001_00_cmd === 3) {
            this.vg75_c001_00_cmd += 1;
            return;
        }

        if (peripheral_reg === 0xc000 && this.vg75_c001_00_cmd === 4) {
            this.vg75_c001_00_cmd = 0;
            if (this.video_screen_size_x_buf && this.video_screen_size_y_buf) {
                this.video_screen_size_x = this.video_screen_size_x_buf;
                this.video_screen_size_y = this.video_screen_size_y_buf;
                this.machine.screen.set_geometry(this.video_screen_size_x, this.video_screen_size_y);
            }
            return;
        }

        if (peripheral_reg === 0xe008 && byte === 0x80) {
            this.ik57_e008_80_cmd = 1;
            this.tape_8002_as_output = 1;
            return;
        }

        if (peripheral_reg === 0xe004 && this.ik57_e008_80_cmd === 1) {
            this.video_memory_base_buf = byte;
            this.ik57_e008_80_cmd += 1;
            return;
        }

        if (peripheral_reg === 0xe004 && this.ik57_e008_80_cmd === 2) {
            this.video_memory_base_buf |= byte << 8;
            this.ik57_e008_80_cmd += 1;
            return;
        }

        if (peripheral_reg === 0xe005 && this.ik57_e008_80_cmd === 3) {
            this.video_memory_size_buf = byte;
            this.ik57_e008_80_cmd += 1;
            return;
        }

        if (peripheral_reg === 0xe005 && this.ik57_e008_80_cmd === 4) {
            this.video_memory_size_buf = ((this.video_memory_size_buf | (byte << 8)) & 0x3fff) + 1;
            this.ik57_e008_80_cmd = 0;
            this.video_memory_base = this.video_memory_base_buf;
            this.video_memory_size = this.video_memory_size_buf;
            this.machine.screen.set_video_memory(this.video_memory_base);
            return;
        }

        if (peripheral_reg === 0xe008 && byte === 0xa4) {
            this.tape_8002_as_output = 0;
            return;
        }

        if (addr === 0x8002) {
            if (this.tape_8002_as_output) {
                this.tape_write_bit(byte & 0x01);
            }
            return;
        }
    };

    tape_write_bit(bit: number): void {
        this.machine.tape.write_bit(bit);
    }

    set_ruslat(value: number): void {
        if (this.update_ruslat) this.update_ruslat(value);
    }

    load_file(file: RK86File): void {
        for (let i = file.start; i <= file.end; ++i) {
            this.write_raw(i, file.image[i - file.start]);
        }
    }
}
