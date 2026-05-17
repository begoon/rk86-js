// Intel 8080 (KR580VM80A) microprocessor core model
//
// Copyright (C) 2012-2025 Alexander Demin <alexander@demin.ws>
//
// Credits
//
// Viacheslav Slavinsky, Vector-06C FPGA Replica
// http://code.google.com/p/vector06cc/
//
// Dmitry Tselikov, Bashrikia-2M and Radio-86RK on Altera DE1
// http://bashkiria-2m.narod.ru/fpga.html
//
// Ian Bartholomew, 8080/8085 CPU Exerciser
// http://www.idb.me.uk/sunhillow/8080.html
//
// Frank Cringle, The original exerciser for the Z80.
//
// Thanks to zx.pk.ru and nedopc.org/forum communities.
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2, or (at your option)
// any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.

import { fromHex, hex16, hex8 } from "./hex.ts";

interface I8080Machine {
    memory: {
        read(addr: number): number;
        write(addr: number, value: number): void;
    };
    io: {
        input(port: number): number;
        output(port: number, value: number): void;
        interrupt(iff: number): void;
    };
}

export interface I8080Snapshot {
    a: string;
    sf: number;
    zf: number;
    hf: number;
    pf: number;
    cf: number;
    bc: string;
    de: string;
    hl: string;
    sp: string;
    pc: string;
    iff: number;
}

export class I8080 {
    memory: I8080Machine["memory"];
    io: I8080Machine["io"];

    sp: number = 0;
    pc: number = 0;
    iff: number = 0;

    pf: number = 0;
    hf: number = 0;
    sf: number = 0;
    zf: number = 0;
    cf: number = 0;

    // Registers: b, c, d, e, h, l, m, a
    //            0  1  2  3  4  5  6  7
    regs = [0, 0, 0, 0, 0, 0, 0, 0];

    private static readonly F_CARRY = 0x01;
    private static readonly F_UN1 = 0x02;
    private static readonly F_PARITY = 0x04;
    private static readonly F_UN3 = 0x08;
    private static readonly F_HCARRY = 0x10;
    private static readonly F_UN5 = 0x20;
    private static readonly F_ZERO = 0x40;
    private static readonly F_NEG = 0x80;

    private parity_table = [
        [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
        [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
        [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
        [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
        [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
        [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
        [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
        [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
        [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
        [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
        [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
        [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
        [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
        [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    ].flat();

    private half_carry_table = [0, 0, 1, 0, 1, 0, 1, 1];
    private sub_half_carry_table = [0, 1, 1, 1, 0, 0, 0, 1];

    constructor(machine: I8080Machine) {
        this.memory = machine.memory;
        this.io = machine.io;
    }

    export(): I8080Snapshot {
        const h8 = (n: number) => "0x" + hex8(n);
        const h16 = (n: number) => "0x" + hex16(n);
        return {
            a: h8(this.a()),
            sf: this.sf ? 1 : 0,
            zf: this.zf ? 1 : 0,
            hf: this.hf ? 1 : 0,
            pf: this.pf ? 1 : 0,
            cf: this.cf ? 1 : 0,
            bc: h16(this.bc()),
            de: h16(this.de()),
            hl: h16(this.hl()),
            sp: h16(this.sp),
            pc: h16(this.pc),
            iff: this.iff ? 1 : 0,
        };
    }

    import(snapshot: I8080Snapshot) {
        const h = fromHex;
        this.set_a(h(snapshot.a));
        this.sf = snapshot.sf;
        this.zf = snapshot.zf;
        this.hf = snapshot.hf;
        this.pf = snapshot.pf;
        this.cf = snapshot.cf;
        this.set_rp(0, h(snapshot.bc));
        this.set_rp(2, h(snapshot.de));
        this.set_rp(4, h(snapshot.hl));
        this.set_rp(6, h(snapshot.sp));
        this.pc = h(snapshot.pc);
        this.iff = h(snapshot.iff);
    }

    memory_read_byte(addr: number): number {
        return this.memory.read(addr & 0xffff) & 0xff;
    }

    memory_write_byte(addr: number, w8: number) {
        this.memory.write(addr & 0xffff, w8 & 0xff);
    }

    memory_read_word(addr: number): number {
        return (this.memory_read_byte(addr + 1) << 8) | this.memory_read_byte(addr);
    }

    memory_write_word(addr: number, w16: number) {
        this.memory_write_byte(addr + 1, w16 >> 8);
        this.memory_write_byte(addr, w16 & 0xff);
    }

    reg(r: number): number {
        return r != 6 ? this.regs[r] : this.memory_read_byte(this.hl());
    }

    set_reg(r: number, value: number) {
        const v8 = value & 0xff;
        if (r != 6) this.regs[r] = v8;
        else this.memory_write_byte(this.hl(), v8);
    }

    rp(r: number): number {
        // r - 00 (bc), 01 (de), 10 (hl), 11 (sp)
        return r != 6 ? (this.regs[r] << 8) | this.regs[r + 1] : this.sp;
    }

    set_rp(r: number, w16: number) {
        if (r != 6) {
            this.set_reg(r, w16 >> 8);
            this.set_reg(r + 1, w16 & 0xff);
        } else this.sp = w16;
    }

    store_flags(): number {
        let f = 0;
        if (this.sf) f |= I8080.F_NEG;
        else f &= ~I8080.F_NEG;
        if (this.zf) f |= I8080.F_ZERO;
        else f &= ~I8080.F_ZERO;
        if (this.hf) f |= I8080.F_HCARRY;
        else f &= ~I8080.F_HCARRY;
        if (this.pf) f |= I8080.F_PARITY;
        else f &= ~I8080.F_PARITY;
        if (this.cf) f |= I8080.F_CARRY;
        else f &= ~I8080.F_CARRY;
        f |= I8080.F_UN1; // UN1_FLAG is always 1.
        f &= ~I8080.F_UN3; // UN3_FLAG is always 0.
        f &= ~I8080.F_UN5; // UN5_FLAG is always 0.
        return f;
    }

    retrieve_flags(f: number) {
        this.sf = f & I8080.F_NEG ? 1 : 0;
        this.zf = f & I8080.F_ZERO ? 1 : 0;
        this.hf = f & I8080.F_HCARRY ? 1 : 0;
        this.pf = f & I8080.F_PARITY ? 1 : 0;
        this.cf = f & I8080.F_CARRY ? 1 : 0;
    }

    bc(): number {
        return this.rp(0);
    }

    de(): number {
        return this.rp(2);
    }

    hl(): number {
        return this.rp(4);
    }

    b(): number {
        return this.reg(0);
    }

    c(): number {
        return this.reg(1);
    }

    d(): number {
        return this.reg(2);
    }

    e(): number {
        return this.reg(3);
    }

    h(): number {
        return this.reg(4);
    }

    l(): number {
        return this.reg(5);
    }

    a(): number {
        return this.reg(7);
    }

    set_b(v: number) {
        this.set_reg(0, v);
    }

    set_c(v: number) {
        this.set_reg(1, v);
    }

    set_d(v: number) {
        this.set_reg(2, v);
    }

    set_e(v: number) {
        this.set_reg(3, v);
    }

    set_h(v: number) {
        this.set_reg(4, v);
    }

    set_l(v: number) {
        this.set_reg(5, v);
    }

    set_a(v: number) {
        this.set_reg(7, v);
    }

    next_pc_byte(): number {
        const v = this.memory_read_byte(this.pc);
        this.pc = (this.pc + 1) & 0xffff;
        return v;
    }

    next_pc_word(): number {
        return this.next_pc_byte() | (this.next_pc_byte() << 8);
    }

    inr(r: number) {
        let v = this.reg(r);
        v = (v + 1) & 0xff;
        this.set_reg(r, v);
        this.sf = (v & 0x80) != 0 ? 1 : 0;
        this.zf = v == 0 ? 1 : 0;
        this.hf = (v & 0x0f) == 0 ? 1 : 0;
        this.pf = this.parity_table[v];
    }

    dcr(r: number) {
        let v = this.reg(r);
        v = (v - 1) & 0xff;
        this.set_reg(r, v);
        this.sf = (v & 0x80) != 0 ? 1 : 0;
        this.zf = v == 0 ? 1 : 0;
        this.hf = !((v & 0x0f) == 0x0f) ? 1 : 0;
        this.pf = this.parity_table[v];
    }

    add_im8(v: number, carry: number) {
        let a = this.a();
        const w16 = a + v + carry;
        const index = ((a & 0x88) >> 1) | ((v & 0x88) >> 2) | ((w16 & 0x88) >> 3);
        a = w16 & 0xff;
        this.sf = (a & 0x80) != 0 ? 1 : 0;
        this.zf = a == 0 ? 1 : 0;
        this.hf = this.half_carry_table[index & 0x7] ? 1 : 0;
        this.pf = this.parity_table[a] ? 1 : 0;
        this.cf = (w16 & 0x0100) != 0 ? 1 : 0;
        this.set_a(a);
    }

    add(r: number, carry: number) {
        this.add_im8(this.reg(r), carry);
    }

    sub_im8(v: number, carry: number) {
        let a = this.a();
        const w16 = (a - v - carry) & 0xffff;
        const index = ((a & 0x88) >> 1) | ((v & 0x88) >> 2) | ((w16 & 0x88) >> 3);
        a = w16 & 0xff;
        this.sf = (a & 0x80) != 0 ? 1 : 0;
        this.zf = a == 0 ? 1 : 0;
        this.hf = !this.sub_half_carry_table[index & 0x7] ? 1 : 0;
        this.pf = this.parity_table[a] ? 1 : 0;
        this.cf = (w16 & 0x0100) != 0 ? 1 : 0;
        this.set_a(a);
    }

    sub(r: number, carry: number) {
        this.sub_im8(this.reg(r), carry);
    }

    cmp_im8(v: number) {
        const a = this.a();
        this.sub_im8(v, 0);
        this.set_a(a);
    }

    cmp(r: number) {
        this.cmp_im8(this.reg(r));
    }

    ana_im8(v: number) {
        let a = this.a();
        this.hf = ((a | v) & 0x08) != 0 ? 1 : 0;
        a &= v;
        this.sf = (a & 0x80) != 0 ? 1 : 0;
        this.zf = a == 0 ? 1 : 0;
        this.pf = this.parity_table[a] ? 1 : 0;
        this.cf = 0;
        this.set_a(a);
    }

    ana(r: number) {
        this.ana_im8(this.reg(r));
    }

    xra_im8(v: number) {
        let a = this.a();
        a ^= v;
        this.sf = (a & 0x80) != 0 ? 1 : 0;
        this.zf = a == 0 ? 1 : 0;
        this.hf = 0;
        this.pf = this.parity_table[a];
        this.cf = 0;
        this.set_a(a);
    }

    xra(r: number) {
        this.xra_im8(this.reg(r));
    }

    ora_im8(v: number) {
        let a = this.a();
        a |= v;
        this.sf = (a & 0x80) != 0 ? 1 : 0;
        this.zf = a == 0 ? 1 : 0;
        this.hf = 0;
        this.pf = this.parity_table[a];
        this.cf = 0;
        this.set_a(a);
    }

    ora(r: number) {
        this.ora_im8(this.reg(r));
    }

    // r - 0 (bc), 2 (de), 4 (hl), 6 (sp)
    dad(r: number) {
        const hl = this.hl() + this.rp(r);
        this.cf = (hl & 0x10000) != 0 ? 1 : 0;
        this.set_h(hl >> 8);
        this.set_l(hl & 0xff);
    }

    call(w16: number) {
        this.push(this.pc);
        this.pc = w16;
    }

    ret(): number {
        return (this.pc = this.pop());
    }

    pop(): number {
        const v = this.memory_read_word(this.sp);
        this.sp = (this.sp + 2) & 0xffff;
        return v;
    }

    push(v: number) {
        this.sp = (this.sp - 2) & 0xffff;
        this.memory_write_word(this.sp, v);
    }

    rst(addr: number) {
        this.push(this.pc);
        this.pc = addr;
    }

    execute(opcode: number): number {
        let cpu_cycles = -1;

        switch (opcode) {
            default:
                alert("Oops! Unhandled opcode " + opcode.toString(16));
                break;

            // nop, 0x00, 00rrr000
            // r - 000(0) to 111(7)
            case 0x00: // nop
            // Undocumented NOP: 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, 0x38
            case 0x08: // nop
            case 0x10: // nop
            case 0x18: // nop
            case 0x20: // nop
            case 0x28: // nop
            case 0x30: // nop
            case 0x38: // nop
                cpu_cycles = 4;
                break;

            // lxi, 0x01, 00rr0001
            // rr - 00 (bc), 01 (de), 10 (hl), 11 (sp)
            case 0x01: // lxi b, data16
            case 0x11: // lxi d, data16
            case 0x21: // lxi h, data16
            case 0x31: // lxi sp, data16
                cpu_cycles = 10;
                this.set_rp(opcode >> 3, this.next_pc_word());
                break;

            // stax, 0x02, 000r0010
            // r - 0 (bc), 1 (de)
            case 0x02: // stax b
            case 0x12: // stax d
                cpu_cycles = 7;
                this.memory_write_byte(this.rp(opcode >> 3), this.a());
                break;

            // inx, 0x03, 00rr0011
            // rr - 00 (bc), 01 (de), 10 (hl), 11 (sp)
            case 0x03: // inx b
            case 0x13: // inx d
            case 0x23: // inx h
            /* ---- */ // inx sp
            case 0x33: {
                cpu_cycles = 5;
                const r = opcode >> 3;
                this.set_rp(r, (this.rp(r) + 1) & 0xffff);
                break;
            }

            // inr, 0x04, 00rrr100
            // rrr - b, c, d, e, h, l, m, a
            case 0x04: // inr b
            case 0x0c: // inr c
            case 0x14: // inr d
            case 0x1c: // inr e
            case 0x24: // inr h
            case 0x2c: // inr l
            case 0x34: // inr m
            case 0x3c: // inr a
                cpu_cycles = opcode != 0x34 ? 5 : 10;
                this.inr(opcode >> 3);
                break;

            // dcr, 0x05, 00rrr100
            // rrr - b, c, d, e, h, l, m, a
            case 0x05: // dcr b
            case 0x0d: // dcr c
            case 0x15: // dcr d
            case 0x1d: // dcr e
            case 0x25: // dcr h
            case 0x2d: // dcr l
            case 0x35: // dcr m
            case 0x3d: // dcr a
                cpu_cycles = opcode != 0x35 ? 5 : 10;
                this.dcr(opcode >> 3);
                break;

            // mvi, 0x06, 00rrr110
            // rrr - b, c, d, e, h, l, m, a
            case 0x06: // mvi b, data8
            case 0x0e: // mvi c, data8
            case 0x16: // mvi d, data8
            case 0x1e: // mvi e, data8
            case 0x26: // mvi h, data8
            case 0x2e: // mvi l, data8
            case 0x36: // mvi m, data8
            case 0x3e: // mvi a, data8
                cpu_cycles = opcode != 0x36 ? 7 : 10;
                this.set_reg(opcode >> 3, this.next_pc_byte());
                break;

            // rlc
            case 0x07: {
                cpu_cycles = 4;
                const a = this.a();
                this.cf = (a & 0x80) != 0 ? 1 : 0;
                this.set_a(((a << 1) & 0xff) | this.cf);
                break;
            }

            // dad, 0x09, 00rr1001
            // rr - 00 (bc), 01 (de), 10 (hl), 11 (sp)
            case 0x09: // dad b
            case 0x19: // dad d
            case 0x29: // dad hl
            case 0x39: // dad sp
                cpu_cycles = 10;
                this.dad((opcode & 0x30) >> 3);
                break;

            // ldax, 0x0A, 000r1010
            // r - 0 (bc), 1 (de)
            case 0x0a: // ldax b
            /* ---- */ // ldax d
            case 0x1a: {
                cpu_cycles = 7;
                const r = (opcode & 0x10) >> 3;
                this.set_a(this.memory_read_byte(this.rp(r)));
                break;
            }

            // dcx, 0x0B, 00rr1011
            // rr - 00 (bc), 01 (de), 10 (hl), 11 (sp)
            case 0x0b: // dcx b
            case 0x1b: // dcx d
            case 0x2b: // dcx h
            /* ---- */ // dcx sp
            case 0x3b: {
                cpu_cycles = 5;
                const r = (opcode & 0x30) >> 3;
                this.set_rp(r, (this.rp(r) - 1) & 0xffff);
                break;
            }

            case 0x0f: // rrc
                cpu_cycles = 4;
                this.cf = this.a() & 0x01;
                this.set_a((this.a() >> 1) | (this.cf << 7));
                break;

            // ral
            case 0x17: {
                cpu_cycles = 4;
                const w8 = this.cf;
                this.cf = (this.a() & 0x80) != 0 ? 1 : 0;
                this.set_a((this.a() << 1) | w8);
                break;
            }

            // rar
            case 0x1f: {
                cpu_cycles = 4;
                const w8 = this.cf;
                this.cf = this.a() & 0x01;
                this.set_a((this.a() >> 1) | (w8 << 7));
                break;
            }

            // shld addr
            case 0x22: {
                cpu_cycles = 16;
                const w16 = this.next_pc_word();
                this.memory_write_byte(w16, this.l());
                this.memory_write_byte(w16 + 1, this.h());
                break;
            }

            // daa
            case 0x27: {
                cpu_cycles = 4;
                let carry = this.cf;
                let add = 0;
                const a = this.a();
                if (this.hf || (a & 0x0f) > 9) add = 0x06;
                if (this.cf || a >> 4 > 9 || (a >> 4 >= 9 && (a & 0xf) > 9)) {
                    add |= 0x60;
                    carry = 1;
                }
                this.add_im8(add, 0);
                this.pf = this.parity_table[this.a()];
                this.cf = carry;
                break;
            }

            // ldhl addr
            case 0x2a: {
                cpu_cycles = 16;
                const w16 = this.next_pc_word();
                this.regs[5] = this.memory_read_byte(w16);
                this.regs[4] = this.memory_read_byte(w16 + 1);
                break;
            }

            case 0x2f: // cma
                cpu_cycles = 4;
                this.set_a(this.a() ^ 0xff);
                break;

            case 0x32: // sta addr
                cpu_cycles = 13;
                this.memory_write_byte(this.next_pc_word(), this.a());
                break;

            case 0x37: // stc
                cpu_cycles = 4;
                this.cf = 1;
                break;

            case 0x3a: // lda addr
                cpu_cycles = 13;
                this.set_a(this.memory_read_byte(this.next_pc_word()));
                break;

            case 0x3f: // cmc
                cpu_cycles = 4;
                this.cf = this.cf ? 0 : 1;
                break;

            // mov, 0x40, 01dddsss
            // ddd, sss - b, c, d, e, h, l, m, a
            //            0  1  2  3  4  5  6  7
            case 0x40: // mov b, b
            case 0x41: // mov b, c
            case 0x42: // mov b, d
            case 0x43: // mov b, e
            case 0x44: // mov b, h
            case 0x45: // mov b, l
            case 0x46: // mov b, m
            case 0x47: // mov b, a

            case 0x48: // mov c, b
            case 0x49: // mov c, c
            case 0x4a: // mov c, d
            case 0x4b: // mov c, e
            case 0x4c: // mov c, h
            case 0x4d: // mov c, l
            case 0x4e: // mov c, m
            case 0x4f: // mov c, a

            case 0x50: // mov d, b
            case 0x51: // mov d, c
            case 0x52: // mov d, d
            case 0x53: // mov d, e
            case 0x54: // mov d, h
            case 0x55: // mov d, l
            case 0x56: // mov d, m
            case 0x57: // mov d, a

            case 0x58: // mov e, b
            case 0x59: // mov e, c
            case 0x5a: // mov e, d
            case 0x5b: // mov e, e
            case 0x5c: // mov e, h
            case 0x5d: // mov e, l
            case 0x5e: // mov e, m
            case 0x5f: // mov e, a

            case 0x60: // mov h, b
            case 0x61: // mov h, c
            case 0x62: // mov h, d
            case 0x63: // mov h, e
            case 0x64: // mov h, h
            case 0x65: // mov h, l
            case 0x66: // mov h, m
            case 0x67: // mov h, a

            case 0x68: // mov l, b
            case 0x69: // mov l, c
            case 0x6a: // mov l, d
            case 0x6b: // mov l, e
            case 0x6c: // mov l, h
            case 0x6d: // mov l, l
            case 0x6e: // mov l, m
            case 0x6f: // mov l, a

            case 0x70: // mov m, b
            case 0x71: // mov m, c
            case 0x72: // mov m, d
            case 0x73: // mov m, e
            case 0x74: // mov m, h
            case 0x75: // mov m, l
            case 0x77: // mov m, a

            case 0x78: // mov a, b
            case 0x79: // mov a, c
            case 0x7a: // mov a, d
            case 0x7b: // mov a, e
            case 0x7c: // mov a, h
            case 0x7d: // mov a, l
            case 0x7e: // mov a, m
            /* ---- */ // mov a, a
            case 0x7f: {
                const src = opcode & 7;
                const dst = (opcode >> 3) & 7;
                cpu_cycles = src == 6 || dst == 6 ? 7 : 5;
                this.set_reg(dst, this.reg(src));
                break;
            }

            // hlt
            case 0x76:
                cpu_cycles = 4;
                this.pc = (this.pc - 1) & 0xffff;
                break;

            // add, 0x80, 10000rrr
            // rrr - b, c, d, e, h, l, m, a
            case 0x80: // add b
            case 0x81: // add c
            case 0x82: // add d
            case 0x83: // add e
            case 0x84: // add h
            case 0x85: // add l
            case 0x86: // add m
            case 0x87: // add a

            // adc, 0x88, 10001rrr
            // rrr - b, c, d, e, h, l, m, a
            case 0x88: // adc b
            case 0x89: // adc c
            case 0x8a: // adc d
            case 0x8b: // adc e
            case 0x8c: // adc h
            case 0x8d: // adc l
            case 0x8e: // adc m
            /* ---- */ // adc a
            case 0x8f: {
                const r = opcode & 0x07;
                cpu_cycles = r != 6 ? 4 : 7;
                this.add(r, opcode & 0x08 ? this.cf : 0);
                break;
            }

            // sub, 0x90, 10010rrr
            // rrr - b, c, d, e, h, l, m, a
            case 0x90: // sub b
            case 0x91: // sub c
            case 0x92: // sub d
            case 0x93: // sub e
            case 0x94: // sub h
            case 0x95: // sub l
            case 0x96: // sub m
            case 0x97: // sub a

            // sbb, 0x98, 10011rrr
            // rrr - b, c, d, e, h, l, m, a
            case 0x98: // sbb b
            case 0x99: // sbb c
            case 0x9a: // sbb d
            case 0x9b: // sbb e
            case 0x9c: // sbb h
            case 0x9d: // sbb l
            case 0x9e: // sbb m

            case 0x9f: {
                const r = opcode & 0x07;
                cpu_cycles = r != 6 ? 4 : 7;
                this.sub(r, opcode & 0x08 ? this.cf : 0);
                break;
            }

            case 0xa0: // ana b
            case 0xa1: // ana c
            case 0xa2: // ana d
            case 0xa3: // ana e
            case 0xa4: // ana h
            case 0xa5: // ana l
            case 0xa6: // ana m
            /* ---- */ // ana a
            case 0xa7: {
                const r = opcode & 0x07;
                cpu_cycles = r != 6 ? 4 : 7;
                this.ana(r);
                break;
            }

            case 0xa8: // xra b
            case 0xa9: // xra c
            case 0xaa: // xra d
            case 0xab: // xra e
            case 0xac: // xra h
            case 0xad: // xra l
            case 0xae: // xra m
            /* ---- */ // xra a
            case 0xaf: {
                const r = opcode & 0x07;
                cpu_cycles = r != 6 ? 4 : 7;
                this.xra(r);
                break;
            }

            case 0xb0: // ora b
            case 0xb1: // ora c
            case 0xb2: // ora d
            case 0xb3: // ora e
            case 0xb4: // ora h
            case 0xb5: // ora l
            case 0xb6: // ora m
            /* ---- */ // ora a
            case 0xb7: {
                const r = opcode & 0x07;
                cpu_cycles = r != 6 ? 4 : 7;
                this.ora(r);
                break;
            }

            case 0xb8: // cmp b
            case 0xb9: // cmp c
            case 0xba: // cmp d
            case 0xbb: // cmp e
            case 0xbc: // cmp h
            case 0xbd: // cmp l
            case 0xbe: // cmp m
            /* ---- */ // cmp a
            case 0xbf: {
                const r = opcode & 0x07;
                cpu_cycles = r != 6 ? 4 : 7;
                this.cmp(r);
                break;
            }

            // rnz, rz, rnc, rc, rpo, rpe, rp, rm
            // 0xC0, 11ccd000
            // cc - 00 (zf), 01 (cf), 10 (pf), 11 (sf)
            // d - 0 (negate) or 1.
            case 0xc0: // rnz
            case 0xc8: // rz
            case 0xd0: // rnc
            case 0xd8: // rc
            case 0xe0: // rpo
            case 0xe8: // rpe
            case 0xf0: // rp
            /* ---- */ // rm
            case 0xf8: {
                const flags = [this.zf, this.cf, this.pf, this.sf];
                const r = (opcode >> 4) & 0x03;
                const direction = (opcode & 0x08) != 0 ? 1 : 0;
                cpu_cycles = 5;
                if (flags[r] == direction) {
                    cpu_cycles = 11;
                    this.ret();
                }
                break;
            }

            // pop, 0xC1, 11rr0001
            // rr - 00 (bc), 01 (de), 10 (hl), 11 (psw)
            case 0xc1: // pop b
            case 0xd1: // pop d
            case 0xe1: // pop h
            /* ---- */ // pop psw
            case 0xf1: {
                cpu_cycles = 11;
                const r = (opcode & 0x30) >> 3;
                const w16 = this.pop();
                if (r != 6) {
                    this.set_rp(r, w16);
                } else {
                    this.set_a(w16 >> 8);
                    this.retrieve_flags(w16 & 0xff);
                }
                break;
            }

            // jnz, jz, jnc, jc, jpo, jpe, jp, jm
            // 0xC2, 11ccd010
            // cc - 00 (zf), 01 (cf), 10 (pf), 11 (sf)
            // d - 0 (negate) or 1.
            case 0xc2: // jnz addr
            case 0xca: // jz addr
            case 0xd2: // jnc addr
            case 0xda: // jc addr
            case 0xe2: // jpo addr
            case 0xea: // jpe addr
            case 0xf2: // jp addr
            /* ---- */ // jm addr
            case 0xfa: {
                cpu_cycles = 10;
                const flags = [this.zf, this.cf, this.pf, this.sf];
                const r = (opcode >> 4) & 0x03;
                const direction = (opcode & 0x08) != 0 ? 1 : 0;
                const w16 = this.next_pc_word();
                this.pc = flags[r] == direction ? w16 : this.pc;
                break;
            }

            // jmp, 0xc3, 1100r011
            case 0xc3: // jmp addr
            case 0xcb: // jmp addr, undocumented
                cpu_cycles = 10;
                this.pc = this.next_pc_word();
                break;

            // cnz, cz, cnc, cc, cpo, cpe, cp, cm
            // 0xC4, 11ccd100
            // cc - 00 (zf), 01 (cf), 10 (pf), 11 (sf)
            // d - 0 (negate) or 1.
            case 0xc4: // cnz addr
            case 0xcc: // cz addr
            case 0xd4: // cnc addr
            case 0xdc: // cc addr
            case 0xe4: // cpo addr
            case 0xec: // cpe addr
            case 0xf4: // cp addr
            /* ---- */ // cm addr
            case 0xfc: {
                const flags = [this.zf, this.cf, this.pf, this.sf];
                const r = (opcode >> 4) & 0x03;
                const direction = (opcode & 0x08) != 0 ? 1 : 0;
                const w16 = this.next_pc_word();
                cpu_cycles = 11;
                if (flags[r] == direction) {
                    cpu_cycles = 17;
                    this.call(w16);
                }
                break;
            }

            // push, 0xC5, 11rr0101
            // rr - 00 (bc), 01 (de), 10 (hl), 11 (psw)
            case 0xc5: // push b
            case 0xd5: // push d
            case 0xe5: // push h
            /* ---- */ // push psw
            case 0xf5: {
                cpu_cycles = 11;
                const r = (opcode & 0x30) >> 3;
                const w16 = r != 6 ? this.rp(r) : (this.a() << 8) | this.store_flags();
                this.push(w16);
                break;
            }

            case 0xc6: // adi data8
                cpu_cycles = 7;
                this.add_im8(this.next_pc_byte(), 0);
                break;

            // rst, 0xC7, 11aaa111
            // aaa - 000(0)-111(7), address = aaa*8 (0 to 0x38).
            case 0xc7: // rst 0
            case 0xcf: // rst 1
            case 0xd7: // rst 2
            case 0xdf: // rst 3
            case 0xe7: // rst 4
            case 0xef: // rst 5
            case 0xf7: // rst 6
            case 0xff: // rst 7
                this.rst(opcode & 0x38);
                cpu_cycles = 11;
                break;

            // ret, 0xc9, 110r1001
            case 0xc9: // ret
            case 0xd9: // ret, undocumented
                cpu_cycles = 10;
                this.ret();
                break;

            // call, 0xcd, 11rr1101
            case 0xcd: // call addr
            case 0xdd: // call, undocumented
            case 0xed:
            case 0xfd:
                cpu_cycles = 17;
                this.call(this.next_pc_word());
                break;

            case 0xce: // aci data8
                cpu_cycles = 7;
                this.add_im8(this.next_pc_byte(), this.cf);
                break;

            case 0xd3: // out port8
                cpu_cycles = 10;
                this.io.output(this.next_pc_byte(), this.a());
                break;

            case 0xd6: // sui data8
                cpu_cycles = 7;
                this.sub_im8(this.next_pc_byte(), 0);
                break;

            case 0xdb: // in port8
                cpu_cycles = 10;
                this.set_a(this.io.input(this.next_pc_byte()));
                break;

            case 0xde: // sbi data8
                cpu_cycles = 7;
                this.sub_im8(this.next_pc_byte(), this.cf);
                break;

            // xthl
            case 0xe3: {
                cpu_cycles = 18;
                const w16 = this.memory_read_word(this.sp);
                this.memory_write_word(this.sp, this.hl());
                this.set_l(w16 & 0xff);
                this.set_h(w16 >> 8);
                break;
            }

            case 0xe6: // ani data8
                cpu_cycles = 7;
                this.ana_im8(this.next_pc_byte());
                break;

            case 0xe9: // pchl
                cpu_cycles = 5;
                this.pc = this.hl();
                break;

            // xchg
            case 0xeb: {
                cpu_cycles = 4;
                const l = this.l();
                this.set_l(this.e());
                this.set_e(l);
                const h = this.h();
                this.set_h(this.d());
                this.set_d(h);
                break;
            }

            case 0xee: // xri data8
                cpu_cycles = 7;
                this.xra_im8(this.next_pc_byte());
                break;

            // di/ei, 1111c011
            // c - 0 (di), 1 (ei)
            case 0xf3: // di
            case 0xfb: // ei
                cpu_cycles = 4;
                this.iff = (opcode & 0x08) != 0 ? 1 : 0;
                this.io.interrupt(this.iff);
                break;

            case 0xf6: // ori data8
                cpu_cycles = 7;
                this.ora_im8(this.next_pc_byte());
                break;

            case 0xf9: // sphl
                cpu_cycles = 5;
                this.sp = this.hl();
                break;

            case 0xfe: // cpi data8
                cpu_cycles = 7;
                this.cmp_im8(this.next_pc_byte());
                break;
        }
        return cpu_cycles;
    }

    instruction(): number {
        return this.execute(this.next_pc_byte());
    }

    jump(addr: number) {
        this.pc = addr & 0xffff;
    }
}
