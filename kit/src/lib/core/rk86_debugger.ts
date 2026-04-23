import { saveAs } from "../web/saver.js";
import "./format.js";
import { hex16 } from "./hex.js";
import type { I8080 } from "./i8080.js";
import { i8080_opcode } from "./i8080_disasm.js";
import { rk86_check_sum } from "./rk86_check_sum.js";
import type { Machine } from "./rk86_machine.js";

interface Breakpoint {
    type: string;
    active: string;
    address: number;
    count: number;
    hits: number;
    temporary?: string;
}

import { parseNumber } from "./parse_number.js";

export default class Debugger {
    static from_rk86_table = [
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        [" ", "!", '"', "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/"],
        ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?"],
        ["@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"],
        ["P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_"],
        ["Ю", "А", "Б", "Ц", "Д", "Е", "Ф", "Г", "Х", "И", "Й", "К", "Л", "М", "Н", "О"],
        ["П", "Я", "Р", "С", "Т", "У", "Ж", "В", "Ь", "Ы", "З", "Ш", "Э", "Щ", "Ч", "~"],
    ].flat();

    machine: Machine;
    dump_cmd_last_address: number;
    dump_cmd_last_length: number;
    download_cmd_snapshot_address: number;
    download_cmd_snapshot_length: number;
    download_cmd_filename_count: number;
    execute_after_breakpoint: boolean;
    stop_after_next_instruction: number;
    step_over_address: number;
    breaks: Record<number, Breakpoint | null>;
    commands: Record<string, [Function, string]>;
    disasm_cmd_last_address = 0;
    disasm_cmd_last_length = 16;

    constructor(machine: Machine) {
        this.machine = machine;

        this.dump_cmd_last_address = 0;
        this.dump_cmd_last_length = 128;

        this.download_cmd_snapshot_address = 0;
        this.download_cmd_snapshot_length = 0x8000;
        this.download_cmd_filename_count = 0;

        this.execute_after_breakpoint = false;

        this.stop_after_next_instruction = -1;
        this.step_over_address = -1;

        this.breaks = {
            1: { type: "exec", address: 0xf86c, active: "yes", count: 0, hits: 0 },
            2: { type: "read", address: 0x0100, active: "no", count: 0, hits: 0 },
            3: { type: "write", address: 0x0200, active: "no", count: 0, hits: 0 },
            4: { type: "exec", address: 0xfca5, active: "no", count: 7, hits: 0 },
        };

        this.commands = {
            d: [this.dump_cmd, "дамп памяти / d [адрес[, кол-во_байт]]"],
            dd: [this.download_cmd, "скачать память / dd [адрес=0 [, кол-во_байт=0x8000]]"],
            i: [this.cpu_cmd, "состояние процессора / i"],
            z: [this.disasm_cmd, "дизассемблирование / z [адрес [, кол-во_инструкций]]"],
            w: [this.write_byte_cmd, "записать байты / w адрес байт1, [байт2, [байт3]...]"],
            ww: [this.write_word_cmd, "записать слова / ww адрес слово1, [слово2, [слово3]...]"],
            wc: [this.write_char_cmd, "записать символы / wc адрес строка"],
            t: [this.debug_cmd, "управление отладкой / t [on|off]"],
            p: [this.pause_cmd, "остановить процессор / p"],
            r: [this.resume_cmd, "продолжить выполнение / r"],
            g: [this.go_cmd, "перейти по адресу / g 0xf86c"],
            gr: [this.reset_cmd, "сброс / gr"],
            gs: [this.restart_cmd, "перезапуск / gs"],
            s: [this.single_step_cmd, "шаг / s"],
            so: [this.step_over_cmd, "шаг через / so"],
            bl: [this.list_breakpoints_cmd, "список точек останова / bl"],
            be: [this.edit_breakpoints_cmd, "создать/изменить точку останова / be 1 type:exec address:0xf86c count:3"],
            bd: [this.delete_breakpoints_cmd, "удалить точку останова / bd 1"],
            cs: [this.check_sum_cmd, "контрольная сумма / cs адрес_начала, адрес_конца"],
            h: [this.history_cmd, "предыдущие команды / h"],
            "?": [this.help_cmd, "справка / ?"],
        };
    }

    help_cmd(args: string[]): void {
        const commands = this.commands;
        for (let cmd of Object.keys(commands)) {
            const [handler, description] = commands[cmd];
            this.put("%s - %s\n".format(cmd.padEnd(2, " "), description));
        }
    }

    dump_cmd(args: string[]): void {
        let from = parseNumber(args[0], this.dump_cmd_last_address);
        let sz = parseNumber(args[1], this.dump_cmd_last_length);

        this.dump_cmd_last_length = sz;

        const { memory } = this.machine;

        const WIDTH = 16;
        while (sz > 0) {
            let bytes = "";
            let chars = "";
            const chunk_sz = Math.min(WIDTH, sz);
            for (let i = 0; i < chunk_sz; ++i) {
                const byte = memory.read_raw(from + i);
                bytes += "%02X ".format(byte);
                chars += byte >= 32 && byte < 127 ? Debugger.from_rk86_table[byte] : ".";
            }
            if (sz < WIDTH) {
                bytes += " ".repeat((WIDTH - sz) * 3);
                chars += " ".repeat(WIDTH - sz);
            }
            this.put("%04X: %s | %s\n".format(from, bytes, chars).replace(/ /g, "&nbsp;"));
            sz -= chunk_sz;
            from = (from + chunk_sz) & 0xffff;
        }
        this.dump_cmd_last_address = from;
    }

    download_cmd(args: string[]): void {
        this.download_cmd_snapshot_address = parseNumber(args[0], this.download_cmd_snapshot_address);
        this.download_cmd_snapshot_length = parseNumber(args[1], this.download_cmd_snapshot_length);

        this.download_cmd_filename_count += 1;
        const filename = "rk86-memory-%04X-%04X-%d.bin".format(
            this.download_cmd_snapshot_address,
            this.download_cmd_snapshot_length,
            this.download_cmd_filename_count,
        );

        this.machine.log(
            `скачивание ${hex16(this.download_cmd_snapshot_address)}:${hex16(
                this.download_cmd_snapshot_length,
            )} -> ${filename}`,
        );

        const { memory } = this.machine;
        const content = memory.snapshot(
            this.download_cmd_snapshot_address,
            this.download_cmd_snapshot_address + this.download_cmd_snapshot_length,
        );
        const blob = new Blob([new Uint8Array(content)], { type: "application/octet-stream" });

        saveAs(blob, filename);
    }

    disasm_print(address: number, nb_instr: number, current_addr?: number): number {
        let addr = address;
        let n = nb_instr;
        const { memory } = this.machine;
        while (n-- > 0) {
            let binary = [];
            for (let i = 0; i < 3; ++i) binary.push(memory.read_raw(addr + i));
            const [opcode, arg1, arg2] = binary;
            const instr = i8080_opcode(opcode, arg1, arg2);

            let bytes = "";
            let chars = "";
            for (let i = 0; i < instr.length; ++i) {
                const byte = binary[i];
                bytes += "%02X".format(byte);
                chars += byte >= 32 && byte < 127 ? Debugger.from_rk86_table[byte] : ".";
            }
            bytes += "&nbsp;".repeat((binary.length - instr.length) * 2);
            chars += "&nbsp;".repeat(binary.length - instr.length);

            const current = current_addr && addr == current_addr ? ">" : " ";
            this.put("%04X: %s%s %s %s\n".format(addr, current, bytes, chars, instr.instr));
            addr += instr.length;
        }
        return addr;
    }

    cpu_cmd() {
        const { cpu, runner, memory } = this.machine;
        this.put(
            "PC=%04X A=%02X F=%s%s%s%s%s HL=%04X DE=%04X BC=%04X SP=%04X".format(
                cpu.pc,
                cpu.a(),
                cpu.cf ? "C" : "-",
                cpu.pf ? "P" : "-",
                cpu.hf ? "H" : "-",
                cpu.zf ? "Z" : "-",
                cpu.sf ? "S" : "-",
                cpu.hl(),
                cpu.de(),
                cpu.bc(),
                cpu.sp,
            ),
        );
        this.put("");

        const { last_instructions } = runner;
        for (let i = 0; i < last_instructions.length; ++i) {
            const addr = last_instructions[i];
            this.disasm_print(addr, 1, cpu.pc);
        }
        this.disasm_print(cpu.pc, 5, cpu.pc);

        const hex = (addr: number, title: string): void => {
            let bytes = "";
            let chars = "";
            for (let i = 0; i < 16; ++i) {
                const byte = memory.read_raw(addr + i);
                bytes += "%02X ".format(byte);
                chars += byte >= 32 && byte < 127 ? Debugger.from_rk86_table[byte] : ".";
            }
            this.put("%s=%04X: %s | %s".format(title, addr, bytes, chars));
        };

        hex(cpu.pc, "PC");
        hex(cpu.sp, "SP");
        hex(cpu.hl(), "HL");
        hex(cpu.de(), "DE");
        hex(cpu.bc(), "BC");
    }

    disasm_cmd(args: string[]) {
        const { cpu } = this.machine;

        let from = parseNumber(args[0]);
        if (isNaN(from)) from = this.disasm_cmd_last_address || cpu.pc;

        let sz = parseNumber(args[1]);
        if (isNaN(sz)) sz = this.disasm_cmd_last_length || 16;
        this.disasm_cmd_last_length = sz;

        this.disasm_cmd_last_address = this.disasm_print(from, sz);
    }

    write_byte_cmd(args: string[]) {
        if (args.length < 2) {
            this.put("w адрес байт1, [байт2, [байт3]...]");
            return;
        }

        let addr = parseNumber(args[0], 0) & 0xffff;

        const { memory } = this.machine;

        for (let i = 1; i < args.length; ++i) {
            const byte = parseNumber(args[i]) & 0xff;
            if (isNaN(byte)) break;
            this.put("%04X: %02X -> %02X".format(addr, memory.read_raw(addr), byte));
            memory.write_raw(addr, byte);
            addr = (addr + 1) & 0xffff;
        }
    }

    write_word_cmd(args: string[]) {
        if (args.length < 2) {
            this.put("ww адрес слово1, [слово2, [слово3]...]");
            return;
        }

        const { memory } = this.machine;

        let addr = parseNumber(args[0], 0) & 0xffff;

        for (let i = 1; i < args.length; ++i) {
            const w16 = parseNumber(args[i]) & 0xffff;
            if (isNaN(w16)) break;

            const l = w16 & 0xff;
            const h = w16 >> 8;

            this.put("%04X: %02X -> %02X".format(addr, memory.read_raw(addr), l));
            memory.write_raw(addr, l);
            addr = (addr + 1) & 0xffff;

            this.put("%04X: %02X -> %02X".format(addr, memory.read_raw(addr), h));
            memory.write_raw(addr, h);
            addr = (addr + 1) & 0xffff;
        }
    }

    write_char_cmd(args: string[]) {
        if (args.length < 2) {
            this.put("wc адрес строка");
            return;
        }

        const { memory } = this.machine;

        let addr = parseNumber(args[0], 0) & 0xffff;

        const str = args[1];
        if (!str?.length) return;

        for (let i = 0; i < str.length; ++i) {
            const ch = str.charCodeAt(i) & 0xff;

            this.put("%04X: %02X -> %02X".format(addr, memory.read_raw(addr), ch));
            memory.write_raw(addr, ch);
            addr = (addr + 1) & 0xffff;
        }
    }

    print_breakpoint(n: number, breakpoint: Breakpoint): void {
        const active = breakpoint.active == "yes" ? "активен" : "отключен";
        const count = breakpoint.count ? " count:%d/%d".format(breakpoint.count, breakpoint.hits) : "";
        this.put("breakpoint #%s %s %s %04X%s".format(n, breakpoint.type, active, breakpoint.address, count));
    }

    process_breakpoint(i: number, breakpoint: Breakpoint): void {
        this.print_breakpoint(i, breakpoint);
        this.pause_cmd();
        this.execute_after_breakpoint = true;
    }

    tracer_callback(cpu: I8080, when: string): void | false {
        // After entering into the single step mode ('s' command) we have to
        // execute one instruction (because CPU commands are executed AFTER
        // processing console commands) and then stop before the next one.
        // So the 's' command sets "stop_after_next_instruction" to 0, we
        // catch that in this callback, execute and current command, then set
        // "stop_after_next_instruction" to 1 and then use this as the
        // condition to stop before the next instruction.
        if (this.stop_after_next_instruction == 1) {
            this.pause_cmd();
            this.stop_after_next_instruction = -1;
            return;
        }

        if (this.stop_after_next_instruction == 0) this.stop_after_next_instruction = 1;

        // After hitting a breakpoint, we have to forcibly execute the current
        // instruction. Otherwise it will hit the same breakpoint immediatelly
        // and execution will be stuck.
        if (this.execute_after_breakpoint) {
            this.execute_after_breakpoint = false;
            return false;
        }

        const breakpoint_hit = (breakpoint: Breakpoint, breakpoint_index: number): void => {
            if (!breakpoint.count) this.process_breakpoint(breakpoint_index, breakpoint);
            else {
                breakpoint.hits += 1;
                if (breakpoint.hits == breakpoint.count) {
                    this.process_breakpoint(breakpoint_index, breakpoint);
                    breakpoint.hits = 0;
                }
            }
            if (breakpoint.temporary == "yes") this.breaks[breakpoint_index] = null;
        };

        for (let i in Object.keys(this.breaks)) {
            const breakpoint = this.breaks[i];
            if (breakpoint == null || breakpoint.active != "yes") continue;
            // process "exec" breakpoints only before the current instruction.
            const { cpu } = this.machine;
            if (when == "before" && breakpoint.address == cpu.pc && breakpoint.type == "exec") {
                breakpoint_hit(breakpoint, Number(i));
            }
            // process "read/write" breakpoints only after the current instruction.
            if (when == "after") {
                const address = this.machine.memory.last_access_address;
                const operation = this.machine.memory.last_access_operation;
                if (breakpoint.address == address && breakpoint.type == operation) {
                    breakpoint_hit(breakpoint, Number(i));
                }
            }
        }
    }

    debug_cmd(args: string[]): void {
        const state = args[0];
        const { runner } = this.machine;

        if (state == "on" || state == "off") {
            if (state == "on") {
                this.put("Трассировка включена");
                runner.tracer = (when: string) => {
                    return this.tracer_callback(this.machine.cpu, when);
                };
            } else {
                runner.tracer = null;
                this.put("Трассировка выключена");
            }
        } else {
            this.put("Трассировка %s".format(runner.tracer ? "включена" : "выключена"));
        }
    }

    check_tracer_active() {
        if (this.machine.runner.tracer == null) {
            this.put("Трассировка не активна. Используйте команду 't' для активации.");
            return false;
        }
        return true;
    }

    list_breakpoints_cmd(args: string[]): void {
        for (let [i, b] of Object.entries(this.breaks)) {
            if (b == null) continue;
            this.print_breakpoint(Number(i), b);
        }
    }

    edit_breakpoints_cmd(args: string[]): void {
        if (args.length < 2)
            return this.bad_command("be n type:exec|read|write address:0x1234 [count:N] [temporary:yes|no]");

        const n = parseInt(args[0]);
        if (isNaN(n)) return this.bad_command("n - номер брейкпоинта для создания/редактирования");

        if (this.breaks[n] == null) this.breaks[n] = { type: "?", active: "no", address: 0, count: 0, hits: 0 };
        const breakpoint = this.breaks[n];

        for (let i = 1; i < args.length; ++i) {
            const split = args[i].split(/[:=]/);

            const arg = split.shift() as keyof Breakpoint;
            const rawValue = split.shift();

            if (!arg || !rawValue) return this.bad_command();

            if (arg === "count" || arg === "address" || arg === "hits") {
                const n = parseInt(rawValue, 10);
                if (isNaN(n)) return this.bad_command();
                breakpoint[arg] = n;
                if (arg === "count") breakpoint.hits = 0;
            } else {
                breakpoint[arg] = rawValue as any;
            }
        }
    }

    bad_command(text?: string): void {
        this.put(text ?? "?");
    }

    delete_breakpoints_cmd(args: string[]): void {
        if (args.length < 2) return this.bad_command("bd n - удалить брейкпоинт #n");

        const n = parseInt(args[1]);
        if (isNaN(n)) return this.bad_command("n - номер брейкпоинта для удаления");

        this.breaks[n] = null;
    }

    pause_cmd() {
        if (this.machine.runner.paused) return;
        this.machine.pause(true);
        this.cpu_cmd();
        this.put("остановлено на %04X".format(this.machine.cpu.pc));
        this.machine.ui.refreshDebugger?.();
    }

    resume_cmd() {
        if (!this.machine.runner.paused) return;
        this.machine.pause(false);
    }

    reset_cmd() {
        this.machine.reset();
    }

    restart_cmd() {
        this.machine.restart();
    }

    go_cmd(args: string[]): void {
        if (args.length < 1) {
            this.put("g addr - перейти по адресу");
            return;
        }
        const addr = parseInt(args[0]) & 0xffff;
        if (isNaN(addr)) return this.bad_command();
        this.machine.cpu.jump(addr);
    }

    single_step_cmd() {
        if (!this.check_tracer_active()) return;
        this.stop_after_next_instruction = 0;
        this.resume_cmd();
    }

    step_over_cmd() {
        const { cpu, memory } = this.machine;
        const binary = [];
        for (let i = 0; i < 3; ++i) binary[binary.length] = memory.read_raw(cpu.pc + i);
        const [opcode, arg1, arg2] = binary;
        const instr = i8080_opcode(opcode, arg1, arg2);
        const breakpoint: Breakpoint = {
            type: "exec",
            address: (cpu.pc + instr.length) & 0xffff,
            active: "yes",
            temporary: "yes",
            count: 0,
            hits: 0,
        };
        this.breaks[1000] = breakpoint;
        this.resume_cmd();
    }

    check_sum_cmd(args: string[]): void {
        if (args.length < 2) return this.bad_command("cs start end - вычислить контрольную сумму");

        const from = parseInt(args[0]);
        if (isNaN(from)) return this.bad_command("start - начальный адрес диапазона");

        const to = parseInt(args[1]);
        if (isNaN(to)) return this.bad_command("end - конечный адрес диапазона");

        const image = this.machine.memory.snapshot(from, to + 1 - from);
        const checksum = rk86_check_sum(image);
        this.put("%04X-%04X: %04X".format(from, to, checksum));
    }

    history_cmd() {
        const history = this.machine.ui.terminal.history || [];
        const limit = 10;
        if (history.length === 0) return;
        const from = Math.max(0, history.length - limit);
        this.machine.log(history);
        history.slice(from).forEach((cmd: string, index: number) => {
            this.put("%d: %s".format(from + index + 1, cmd));
        });
        this.put("\nКлавиши вверх/вниз для навигации по истории команд.");
    }

    put(str: string): void {
        this.machine.ui.terminal.put(str);
    }

    run(cmd: string): void {
        let line = cmd.trim();
        if (line.length == 0) return;

        const argv = line.split(/\s+/);
        const argc = argv.length;

        this.put("\n");

        if (argv.length > 0) {
            const cmd = argv[0];
            const args = argv.slice(1);
            const entry = this.commands[cmd.toLowerCase()];
            if (entry) {
                const [handler, description] = entry;
                this.machine.log(description, args);
                handler.call(this, args);
            } else {
                this.put("неизвестная команда: %s\n".format(cmd));
                this.put("введите '?' для получения списка команд\n");
            }
        }
    }
}
