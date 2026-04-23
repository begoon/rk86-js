import type { Machine } from "../core/rk86_machine.js";
import type { TapeInterface } from "../core/rk86_tape_interface.js";

export class Tape implements TapeInterface {
    machine: Machine;
    previous_bit_ticks = 0;
    bit_started = false;
    bit_count = 0;
    current_byte = 0;
    written_bytes: number[] = [];
    written_bytes_from_e6 = 0;
    output_block_count = 0;
    output_timer: ReturnType<typeof setTimeout> | null = null;

    constructor(machine: Machine) {
        this.machine = machine;
    }

    save(bytes: number[]): void {
        const binary = new Uint8Array(bytes);
        const blob = new Blob([binary], { type: "image/gif" });
        const filename = `rk86-tape-${this.output_block_count}.bin`;
        Tape.saveAs(blob, filename);
        this.output_block_count += 1;
    }

    log(bytes: number[]): void {
        for (let i = 0; i < bytes.length; i += 16) {
            const line = bytes.slice(i, i + 16);
            console.log(
                i.toString(16).padStart(4, "0").toUpperCase() + ":",
                line.map((byte) => byte.toString(16).padStart(2, "0")).join(" "),
            );
        }
    }

    write_ended = (): void => {
        this.bit_started = false;
        this.current_byte = 0;
        this.bit_count = 0;
        this.written_bytes = [];
        this.written_bytes_from_e6 = 0;

        const ui = this.machine.ui;
        ui.update_activity_indicator(false);
        ui.hightlight_written_bytes(false);
    };

    flush = (): void => {
        const sync_byte_index = this.written_bytes.findIndex((byte) => byte === 0xe6);
        if (sync_byte_index === -1) {
            console.error("sync byte E6 is not found");
            this.log(this.written_bytes);
        } else {
            console.log(`${sync_byte_index} bytes before sync byte`);
            const bytes = this.written_bytes.slice(sync_byte_index);
            this.log(bytes);
            this.save(bytes);
        }
        this.write_ended();
    };

    write_bit = (bit: number): void => {
        const runner_ticks = this.machine.runner.total_ticks;
        const time = runner_ticks - this.previous_bit_ticks;

        if (time > 10000) {
            // If there is no writes in ~5ms, reset the buffer, current
            // current_byte and bit counter.
            console.log("reset tape buffer due to timeout");
            this.write_ended();
        }

        if (!this.bit_started) {
            this.bit_started = true;
        } else {
            this.bit_started = false;
            this.current_byte |= (bit ? 0x80 : 0x00) >> this.bit_count;

            if (this.bit_count < 7) {
                this.bit_count += 1;
            } else {
                this.written_bytes.push(this.current_byte);

                if (this.current_byte === 0xe6 || this.written_bytes_from_e6 > 0) {
                    this.written_bytes_from_e6 += 1;
                }

                if (this.written_bytes.length === 1) {
                    this.machine.ui.update_activity_indicator(true);
                    this.machine.ui.update_written_bytes(0);
                }

                if (this.written_bytes_from_e6 === 1) this.machine.ui.hightlight_written_bytes(true);
                if (this.written_bytes_from_e6 > 0) this.machine.ui.update_written_bytes(this.written_bytes_from_e6);

                if (this.output_timer) clearTimeout(this.output_timer);
                this.output_timer = setTimeout(this.flush, 1000);

                this.current_byte = 0;
                this.bit_count = 0;
            }
        }

        this.previous_bit_ticks = runner_ticks;
    };

    static saveAs(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
}
