import { beforeEach, expect, test } from "bun:test";

import { I8080 } from "../src/lib/core/i8080.ts";
import { hex8, hex16 } from "../src/lib/core/hex.js";
import { Memory } from "../src/lib/core/rk86_memory.js";

import { ADI } from "./cpu/adi_data.ts";
import { ACI } from "./cpu/aci_data.ts";
import { SUI } from "./cpu/sui_data.ts";
import { SBI } from "./cpu/sbi_data.ts";
import { ANI } from "./cpu/ani_data.ts";
import { ORI } from "./cpu/ori_data.ts";
import { XRI } from "./cpu/xri_data.ts";
import { RLC } from "./cpu/rlc_data.ts";
import { RRC } from "./cpu/rrc_data.ts";
import { RAL } from "./cpu/ral_data.ts";
import { RAR } from "./cpu/rar_data.ts";
import { INR } from "./cpu/inr_data.ts";
import { DCR } from "./cpu/dcr_data.ts";
import { CMA } from "./cpu/cma_data.ts";
import { STC } from "./cpu/stc_data.ts";
import { CMC } from "./cpu/cmc_data.ts";
import { ADD_B } from "./cpu/add_b_data.ts";
import { ADC_B } from "./cpu/adc_b_data.ts";
import { SUB_B } from "./cpu/sub_b_data.ts";
import { SBB_B } from "./cpu/sbb_b_data.ts";
import { ANA_B } from "./cpu/ana_b_data.ts";
import { ORA_B } from "./cpu/ora_b_data.ts";
import { XRA_B } from "./cpu/xra_b_data.ts";
import { CMP_B } from "./cpu/cmp_b_data.ts";
import { DAD_B } from "./cpu/dad_b_data.ts";
import { DAD_D } from "./cpu/dad_d_data.ts";
import { DAD_H } from "./cpu/dad_h_data.ts";
import { DAD_SP } from "./cpu/dad_sp_data.ts";
import { INX_B } from "./cpu/inx_b_data.ts";
import { INX_D } from "./cpu/inx_d_data.ts";
import { INX_H } from "./cpu/inx_h_data.ts";
import { INX_SP } from "./cpu/inx_sp_data.ts";
import { DCX_B } from "./cpu/dcx_b_data.ts";
import { DCX_D } from "./cpu/dcx_d_data.ts";
import { DCX_H } from "./cpu/dcx_h_data.ts";
import { DCX_SP } from "./cpu/dcx_sp_data.ts";
import { PUSH_POP_PSW } from "./cpu/push_pop_psw_data.ts";
import { MOV } from "./cpu/mov_data.ts";
import { LXI_B } from "./cpu/lxi_b_data.ts";
import { LXI_D } from "./cpu/lxi_d_data.ts";
import { LXI_H } from "./cpu/lxi_h_data.ts";
import { LXI_SP } from "./cpu/lxi_sp_data.ts";
import { MVI_B } from "./cpu/mvi_b_data.ts";
import { MVI_C } from "./cpu/mvi_c_data.ts";
import { MVI_D } from "./cpu/mvi_d_data.ts";
import { MVI_E } from "./cpu/mvi_e_data.ts";
import { MVI_H } from "./cpu/mvi_h_data.ts";
import { MVI_L } from "./cpu/mvi_l_data.ts";
import { MVI_M } from "./cpu/mvi_m_data.ts";
import { MVI_A } from "./cpu/mvi_a_data.ts";
import { LDAX_B } from "./cpu/ldax_b_data.ts";
import { LDAX_D } from "./cpu/ldax_d_data.ts";
import { STAX_B } from "./cpu/stax_b_data.ts";
import { STAX_D } from "./cpu/stax_d_data.ts";
import { LDA } from "./cpu/lda_data.ts";
import { STA } from "./cpu/sta_data.ts";
import { LHLD } from "./cpu/lhld_data.ts";
import { SHLD } from "./cpu/shld_data.ts";
import { PUSH_POP_B } from "./cpu/push_pop_b_data.ts";
import { PUSH_POP_D } from "./cpu/push_pop_d_data.ts";
import { PUSH_POP_H } from "./cpu/push_pop_h_data.ts";
import { XCHG } from "./cpu/xchg_data.ts";
import { XTHL } from "./cpu/xthl_data.ts";
import { SPHL } from "./cpu/sphl_data.ts";
import { PCHL } from "./cpu/pchl_data.ts";
import { JMP } from "./cpu/jmp_data.ts";
import { JNZ } from "./cpu/jnz_data.ts";
import { JZ } from "./cpu/jz_data.ts";
import { JNC } from "./cpu/jnc_data.ts";
import { JC } from "./cpu/jc_data.ts";
import { JPO } from "./cpu/jpo_data.ts";
import { JPE } from "./cpu/jpe_data.ts";
import { JP } from "./cpu/jp_data.ts";
import { JM } from "./cpu/jm_data.ts";
import { CALL } from "./cpu/call_data.ts";
import { RET } from "./cpu/ret_data.ts";
import { RST } from "./cpu/rst_data.ts";
import { EI_DI } from "./cpu/ei_di_data.ts";
import { DAA } from "./cpu/daa_data.ts";
import { CPI } from "./cpu/cpi_data.ts";

let memory: Memory;
let cpu: I8080;

const flags = (cpu: I8080) => cpu.store_flags().toString(2).padStart(8, "0");

beforeEach(() => {
    memory = new Memory(undefined);
    const io = {
        input: (_port: number): number => 0,
        output: (_port: number, _value: number): void => {},
        interrupt: (_iff: number): void => {},
    };
    cpu = new I8080({ memory, io });
});

// --- Basic tests ---

test("init", () => {
    expect(cpu.pc).toBe(0x0000);
    expect(cpu.sp).toBe(0x0000);
    expect(cpu.a()).toBe(0x00);
    expect(cpu.b()).toBe(0x00);
    expect(cpu.c()).toBe(0x00);
    expect(cpu.d()).toBe(0x00);
    expect(cpu.e()).toBe(0x00);
    expect(cpu.h()).toBe(0x00);
    expect(cpu.l()).toBe(0x00);
});

test("instruction wrapping", () => {
    memory.write_raw(0xffff, 0xfe); // CPI
    memory.write_raw(0x0000, 0xaa);
    cpu.pc = 0xffff;
    cpu.instruction();
    expect(cpu.pc).toBe(0x0001);
});

test("unused flags bits defaults", () => {
    cpu.retrieve_flags(0);
    expect(cpu.store_flags()).toBe(0b00000010);
    cpu.retrieve_flags(0xff);
    expect(cpu.store_flags()).toBe(0b11010111);
});

// --- DAA ---

test("daa/*", () => {
    let i = 0;
    for (let cf = 0; cf < 2; cf++) {
        for (let hf = 0; hf < 2; hf++) {
            for (let a = 0; a < 256; a++) {
                cpu.pc = 0;
                cpu.cf = cf;
                cpu.hf = hf;
                cpu.set_a(a);
                cpu.execute(0x27);
                const result = `cf:${cf} hf:${hf} a:${hex8(a)} -> a:${hex8(cpu.a())} flags:${flags(cpu)}`;
                expect(result).toBe(DAA[i]);
                i++;
            }
        }
    }
});

// --- CPI ---

test("cpi/*", () => {
    let i = 0;
    for (let a = 0; a < 256; a++) {
        for (let imm8 = 0; imm8 < 256; imm8++) {
            cpu.pc = 0;
            cpu.set_a(a);
            cpu.retrieve_flags(0x00);
            memory.write_raw(0, imm8);
            cpu.execute(0xfe);
            const result = `a:${hex8(a)} imm8:${hex8(imm8)} -> a:${hex8(cpu.a())} flags:${flags(cpu)}`;
            expect(result).toBe(CPI[i]);
            i++;
        }
    }
});

// --- ALU immediate without carry: ADI, SUI, ANI, ORI, XRI ---

function testAluImm(name: string, opcode: number, data: string[]) {
    test(`${name}/*`, () => {
        let i = 0;
        for (let a = 0; a < 256; a++) {
            for (let imm8 = 0; imm8 < 256; imm8++) {
                cpu.pc = 0;
                cpu.set_a(a);
                cpu.retrieve_flags(0x00);
                memory.write_raw(0, imm8);
                cpu.execute(opcode);

                const result = `a:${hex8(a)} imm8:${hex8(imm8)} -> a:${hex8(cpu.a())} flags:${flags(cpu)}`;
                expect(result).toBe(data[i]);
                i++;
            }
        }
    });
}

testAluImm("adi", 0xc6, ADI);
testAluImm("sui", 0xd6, SUI);
testAluImm("ani", 0xe6, ANI);
testAluImm("ori", 0xf6, ORI);
testAluImm("xri", 0xee, XRI);

// --- ALU immediate with carry: ACI, SBI ---

function testAluImmCarry(name: string, opcode: number, data: string[]) {
    test(`${name}/*`, () => {
        let i = 0;
        for (const cf of [0, 1]) {
            for (let a = 0; a < 256; a++) {
                for (let imm8 = 0; imm8 < 256; imm8++) {
                    cpu.pc = 0;
                    cpu.set_a(a);
                    cpu.retrieve_flags(0x00);
                    cpu.cf = cf;
                    memory.write_raw(0, imm8);
                    cpu.execute(opcode);

                    const result = `cf:${cf} a:${hex8(a)} imm8:${hex8(imm8)} -> a:${hex8(cpu.a())} flags:${flags(cpu)}`;
                    expect(result).toBe(data[i]);
                    i++;
                }
            }
        }
    });
}

testAluImmCarry("aci", 0xce, ACI);
testAluImmCarry("sbi", 0xde, SBI);

// --- Register ALU ops without carry ---

function testAluReg(name: string, opcode: number, data: string[]) {
    test(`${name}/*`, () => {
        let i = 0;
        for (let a = 0; a < 256; a++) {
            for (let b = 0; b < 256; b++) {
                cpu.pc = 0;
                cpu.set_a(a);
                cpu.set_b(b);
                cpu.retrieve_flags(0x00);
                cpu.execute(opcode);

                const result = `a:${hex8(a)} b:${hex8(b)} -> a:${hex8(cpu.a())} flags:${flags(cpu)}`;
                expect(result).toBe(data[i]);
                i++;
            }
        }
    });
}

function testAluRegCarry(name: string, opcode: number, data: string[]) {
    test(`${name}/*`, () => {
        let i = 0;
        for (const cf of [0, 1]) {
            for (let a = 0; a < 256; a++) {
                for (let b = 0; b < 256; b++) {
                    cpu.pc = 0;
                    cpu.set_a(a);
                    cpu.set_b(b);
                    cpu.retrieve_flags(0x00);
                    cpu.cf = cf;
                    cpu.execute(opcode);

                    const result = `cf:${cf} a:${hex8(a)} b:${hex8(b)} -> a:${hex8(cpu.a())} flags:${flags(cpu)}`;
                    expect(result).toBe(data[i]);
                    i++;
                }
            }
        }
    });
}

testAluReg("add_b", 0x80, ADD_B);
testAluRegCarry("adc_b", 0x88, ADC_B);
testAluReg("sub_b", 0x90, SUB_B);
testAluRegCarry("sbb_b", 0x98, SBB_B);
testAluReg("ana_b", 0xa0, ANA_B);
testAluReg("ora_b", 0xb0, ORA_B);
testAluReg("xra_b", 0xa8, XRA_B);
testAluReg("cmp_b", 0xb8, CMP_B);

// --- Rotate: RLC, RRC, RAL, RAR ---

function testRotate(name: string, opcode: number, data: string[]) {
    test(`${name}/*`, () => {
        let i = 0;
        for (let cf = 0; cf < 2; cf++) {
            for (let a = 0; a < 256; a++) {
                cpu.pc = 0;
                cpu.set_a(a);
                cpu.cf = cf;
                cpu.execute(opcode);

                const result = `cf:${cf} a:${hex8(a)} -> a:${hex8(cpu.a())} cf:${cpu.cf}`;
                expect(result).toBe(data[i]);
                i++;
            }
        }
    });
}

testRotate("rlc", 0x07, RLC);
testRotate("rrc", 0x0f, RRC);
testRotate("ral", 0x17, RAL);
testRotate("rar", 0x1f, RAR);

// --- INR/DCR ---

function testIncrDecr(name: string, opcode: number, data: string[]) {
    test(`${name}/*`, () => {
        for (let v = 0; v < 256; v++) {
            cpu.pc = 0;
            cpu.set_b(v);
            cpu.retrieve_flags(0x00);
            cpu.execute(opcode);

            const result = `r:${hex8(v)} -> r:${hex8(cpu.b())} flags:${flags(cpu)}`;
            expect(result).toBe(data[v]);
        }
    });
}

testIncrDecr("inr", 0x04, INR);
testIncrDecr("dcr", 0x05, DCR);

// --- CMA ---

test("cma/*", () => {
    for (let a = 0; a < 256; a++) {
        cpu.pc = 0;
        cpu.set_a(a);
        cpu.execute(0x2f);

        const result = `a:${hex8(a)} -> a:${hex8(cpu.a())}`;
        expect(result).toBe(CMA[a]);
    }
});

// --- STC ---

test("stc/*", () => {
    for (let cf = 0; cf < 2; cf++) {
        cpu.cf = cf;
        cpu.execute(0x37);
        expect(`cf:${cf} -> cf:${cpu.cf}`).toBe(STC[cf]);
    }
});

// --- CMC ---

test("cmc/*", () => {
    for (let cf = 0; cf < 2; cf++) {
        cpu.cf = cf;
        cpu.execute(0x3f);
        expect(`cf:${cf} -> cf:${cpu.cf}`).toBe(CMC[cf]);
    }
});

// --- DAD ---

function testDad(name: string, opcode: number, rpIndex: number, data: string[]) {
    test(`${name}/*`, () => {
        let i = 0;
        for (let hl = 0; hl < 0x10000; hl += 0x100) {
            for (let rp = 0; rp < 0x10000; rp += 0x100) {
                cpu.pc = 0;
                cpu.set_rp(4, hl);
                if (rpIndex === 6) cpu.sp = rp;
                else if (rpIndex !== 4) cpu.set_rp(rpIndex, rp);
                cpu.cf = 0;
                cpu.execute(opcode);

                const rpVal = rpIndex === 4 ? hl : rp;
                const result = `hl:${hex16(hl)} rp:${hex16(rpVal)} -> hl:${hex16(cpu.hl())} cf:${cpu.cf}`;
                expect(result).toBe(data[i]);
                i++;
            }
        }
    });
}

testDad("dad_b", 0x09, 0, DAD_B);
testDad("dad_d", 0x19, 2, DAD_D);
testDad("dad_h", 0x29, 4, DAD_H);
testDad("dad_sp", 0x39, 6, DAD_SP);

// --- INX/DCX ---

function testInxDcx(name: string, opcode: number, rpIndex: number, data: string[]) {
    test(`${name}/*`, () => {
        const testValues = [0x0000, 0x0001, 0x00ff, 0x0100, 0x7fff, 0x8000, 0xfffe, 0xffff];
        for (let v = 0; v < 0x10000; v += 0x100) testValues.push(v);
        const unique = [...new Set(testValues)].sort((a, b) => a - b);

        for (let i = 0; i < unique.length; i++) {
            const v = unique[i];
            cpu.pc = 0;
            if (rpIndex === 6) cpu.sp = v;
            else cpu.set_rp(rpIndex, v);
            cpu.execute(opcode);

            const result = rpIndex === 6 ? cpu.sp : cpu.rp(rpIndex);
            expect(`rp:${hex16(v)} -> rp:${hex16(result)}`).toBe(data[i]);
        }
    });
}

testInxDcx("inx_b", 0x03, 0, INX_B);
testInxDcx("inx_d", 0x13, 2, INX_D);
testInxDcx("inx_h", 0x23, 4, INX_H);
testInxDcx("inx_sp", 0x33, 6, INX_SP);
testInxDcx("dcx_b", 0x0b, 0, DCX_B);
testInxDcx("dcx_d", 0x1b, 2, DCX_D);
testInxDcx("dcx_h", 0x2b, 4, DCX_H);
testInxDcx("dcx_sp", 0x3b, 6, DCX_SP);

// --- PUSH/POP PSW round-trip ---

test("push_pop_psw/*", () => {
    let i = 0;
    for (let a = 0; a < 256; a++) {
        for (let f = 0; f < 256; f += 4) {
            cpu.pc = 0;
            cpu.sp = 0x2000;
            cpu.set_a(a);
            cpu.retrieve_flags(f);
            const origFlags = flags(cpu);

            cpu.execute(0xf5); // PUSH PSW
            cpu.set_a(0x00);
            cpu.retrieve_flags(0x00);
            cpu.execute(0xf1); // POP PSW

            const result = `a:${hex8(a)} flags:${origFlags} -> a:${hex8(cpu.a())} flags:${flags(cpu)}`;
            expect(result).toBe(PUSH_POP_PSW[i]);
            i++;
        }
    }
});

// --- MOV r,r ---

test("mov/*", () => {
    const regNames = ["B", "C", "D", "E", "H", "L", "M", "A"];
    let i = 0;

    for (let dst = 0; dst < 8; dst++) {
        if (dst === 6) continue;
        for (let src = 0; src < 8; src++) {
            if (src === 6) continue;
            for (let v = 0; v < 256; v += 17) {
                cpu.pc = 0;
                for (let r = 0; r < 8; r++) if (r !== 6) cpu.set_reg(r, 0);
                cpu.set_reg(src, v);

                const opcode = 0x40 | (dst << 3) | src;
                cpu.execute(opcode);

                const dstVal = cpu.reg(dst);
                const result = `mov ${regNames[dst]},${regNames[src]}: src:${hex8(v)} -> dst:${hex8(dstVal)}`;
                expect(result).toBe(MOV[i]);
                i++;
            }
        }
    }
});

// --- LXI ---

function testLxi(name: string, opcode: number, rpIndex: number, data: string[]) {
    test(`${name}/*`, () => {
        let i = 0;
        for (let v = 0; v < 0x10000; v += 0x100) {
            cpu.pc = 0;
            memory.write_raw(0, v & 0xff);
            memory.write_raw(1, (v >> 8) & 0xff);
            cpu.execute(opcode);
            const result = rpIndex === 6 ? cpu.sp : cpu.rp(rpIndex);
            expect(`imm16:${hex16(v)} -> rp:${hex16(result)}`).toBe(data[i]);
            i++;
        }
    });
}

testLxi("lxi_b", 0x01, 0, LXI_B);
testLxi("lxi_d", 0x11, 2, LXI_D);
testLxi("lxi_h", 0x21, 4, LXI_H);
testLxi("lxi_sp", 0x31, 6, LXI_SP);

// --- MVI ---

function testMvi(name: string, opcode: number, regIndex: number, data: string[]) {
    test(`${name}/*`, () => {
        if (regIndex === 6) cpu.set_rp(4, 0x4000);
        for (let v = 0; v < 256; v++) {
            cpu.pc = 0;
            memory.write_raw(0, v);
            cpu.execute(opcode);
            const result = regIndex === 6 ? memory.read_raw(0x4000) : cpu.reg(regIndex);
            expect(`imm8:${hex8(v)} -> r:${hex8(result)}`).toBe(data[v]);
        }
    });
}

testMvi("mvi_b", 0x06, 0, MVI_B);
testMvi("mvi_c", 0x0e, 1, MVI_C);
testMvi("mvi_d", 0x16, 2, MVI_D);
testMvi("mvi_e", 0x1e, 3, MVI_E);
testMvi("mvi_h", 0x26, 4, MVI_H);
testMvi("mvi_l", 0x2e, 5, MVI_L);
testMvi("mvi_m", 0x36, 6, MVI_M);
testMvi("mvi_a", 0x3e, 7, MVI_A);

// --- LDAX/STAX ---

function testLdax(name: string, opcode: number, rpIndex: number, data: string[]) {
    test(`${name}/*`, () => {
        for (let v = 0; v < 256; v++) {
            cpu.pc = 0;
            cpu.set_rp(rpIndex, 0x3000);
            memory.write_raw(0x3000, v);
            cpu.execute(opcode);
            expect(`val:${hex8(v)} -> a:${hex8(cpu.a())}`).toBe(data[v]);
        }
    });
}

function testStax(name: string, opcode: number, rpIndex: number, data: string[]) {
    test(`${name}/*`, () => {
        for (let v = 0; v < 256; v++) {
            cpu.pc = 0;
            cpu.set_a(v);
            cpu.set_rp(rpIndex, 0x3000);
            memory.write_raw(0x3000, 0);
            cpu.execute(opcode);
            expect(`a:${hex8(v)} -> val:${hex8(memory.read_raw(0x3000))}`).toBe(data[v]);
        }
    });
}

testLdax("ldax_b", 0x0a, 0, LDAX_B);
testLdax("ldax_d", 0x1a, 2, LDAX_D);
testStax("stax_b", 0x02, 0, STAX_B);
testStax("stax_d", 0x12, 2, STAX_D);

// --- LDA/STA ---

test("lda/*", () => {
    for (let v = 0; v < 256; v++) {
        cpu.pc = 0;
        memory.write_raw(0, 0x00);
        memory.write_raw(1, 0x30);
        memory.write_raw(0x3000, v);
        cpu.execute(0x3a);
        expect(`val:${hex8(v)} -> a:${hex8(cpu.a())}`).toBe(LDA[v]);
    }
});

test("sta/*", () => {
    for (let v = 0; v < 256; v++) {
        cpu.pc = 0;
        memory.write_raw(0, 0x00);
        memory.write_raw(1, 0x30);
        cpu.set_a(v);
        memory.write_raw(0x3000, 0);
        cpu.execute(0x32);
        expect(`a:${hex8(v)} -> val:${hex8(memory.read_raw(0x3000))}`).toBe(STA[v]);
    }
});

// --- LHLD/SHLD ---

test("lhld/*", () => {
    let i = 0;
    for (let v = 0; v < 0x10000; v += 0x100) {
        cpu.pc = 0;
        memory.write_raw(0, 0x00);
        memory.write_raw(1, 0x30);
        memory.write_raw(0x3000, v & 0xff);
        memory.write_raw(0x3001, (v >> 8) & 0xff);
        cpu.execute(0x2a);
        expect(`val:${hex16(v)} -> hl:${hex16(cpu.hl())}`).toBe(LHLD[i++]);
    }
});

test("shld/*", () => {
    let i = 0;
    for (let v = 0; v < 0x10000; v += 0x100) {
        cpu.pc = 0;
        memory.write_raw(0, 0x00);
        memory.write_raw(1, 0x30);
        cpu.set_rp(4, v);
        cpu.execute(0x22);
        const lo = memory.read_raw(0x3000);
        const hi = memory.read_raw(0x3001);
        expect(`hl:${hex16(v)} -> val:${hex16((hi << 8) | lo)}`).toBe(SHLD[i++]);
    }
});

// --- PUSH/POP B, D, H ---

function testPushPop(name: string, pushOp: number, popOp: number, rpIndex: number, data: string[]) {
    test(`${name}/*`, () => {
        let i = 0;
        for (let v = 0; v < 0x10000; v += 0x101) {
            cpu.pc = 0;
            cpu.sp = 0x2000;
            cpu.set_rp(rpIndex, v);
            cpu.execute(pushOp);
            cpu.set_rp(rpIndex, 0);
            cpu.execute(popOp);
            expect(`rp:${hex16(v)} -> rp:${hex16(cpu.rp(rpIndex))}`).toBe(data[i++]);
        }
    });
}

testPushPop("push_pop_b", 0xc5, 0xc1, 0, PUSH_POP_B);
testPushPop("push_pop_d", 0xd5, 0xd1, 2, PUSH_POP_D);
testPushPop("push_pop_h", 0xe5, 0xe1, 4, PUSH_POP_H);

// --- XCHG ---

test("xchg/*", () => {
    let i = 0;
    for (let de = 0; de < 0x10000; de += 0x1111) {
        for (let hl = 0; hl < 0x10000; hl += 0x1111) {
            cpu.pc = 0;
            cpu.set_rp(2, de);
            cpu.set_rp(4, hl);
            cpu.execute(0xeb);
            expect(`de:${hex16(de)} hl:${hex16(hl)} -> de:${hex16(cpu.de())} hl:${hex16(cpu.hl())}`).toBe(XCHG[i++]);
        }
    }
});

// --- XTHL ---

test("xthl/*", () => {
    let i = 0;
    for (let hl = 0; hl < 0x10000; hl += 0x1111) {
        for (let sv = 0; sv < 0x10000; sv += 0x1111) {
            cpu.pc = 0;
            cpu.sp = 0x2000;
            cpu.set_rp(4, hl);
            memory.write_raw(0x2000, sv & 0xff);
            memory.write_raw(0x2001, (sv >> 8) & 0xff);
            cpu.execute(0xe3);
            const ns = memory.read_raw(0x2000) | (memory.read_raw(0x2001) << 8);
            expect(`hl:${hex16(hl)} stack:${hex16(sv)} -> hl:${hex16(cpu.hl())} stack:${hex16(ns)}`).toBe(XTHL[i++]);
        }
    }
});

// --- SPHL ---

test("sphl/*", () => {
    let i = 0;
    for (let hl = 0; hl < 0x10000; hl += 0x100) {
        cpu.pc = 0;
        cpu.set_rp(4, hl);
        cpu.execute(0xf9);
        expect(`hl:${hex16(hl)} -> sp:${hex16(cpu.sp)}`).toBe(SPHL[i++]);
    }
});

// --- PCHL ---

test("pchl/*", () => {
    let i = 0;
    for (let hl = 0; hl < 0x10000; hl += 0x100) {
        cpu.pc = 0;
        cpu.set_rp(4, hl);
        cpu.execute(0xe9);
        expect(`hl:${hex16(hl)} -> pc:${hex16(cpu.pc)}`).toBe(PCHL[i++]);
    }
});

// --- JMP ---

test("jmp/*", () => {
    let i = 0;
    for (let addr = 0; addr < 0x10000; addr += 0x100) {
        cpu.pc = 0;
        memory.write_raw(0, addr & 0xff);
        memory.write_raw(1, (addr >> 8) & 0xff);
        cpu.execute(0xc3);
        expect(`addr:${hex16(addr)} -> pc:${hex16(cpu.pc)}`).toBe(JMP[i++]);
    }
});

// --- Conditional jumps ---

function testCondJump(name: string, opcode: number, flag: string, data: string[]) {
    test(`${name}/*`, () => {
        for (let fv = 0; fv < 2; fv++) {
            cpu.pc = 0;
            memory.write_raw(0, 0x00);
            memory.write_raw(1, 0x50);
            (cpu as any)[flag] = fv;
            cpu.execute(opcode);
            expect(`${flag}:${fv} -> pc:${hex16(cpu.pc)}`).toBe(data[fv]);
        }
    });
}

testCondJump("jnz", 0xc2, "zf", JNZ);
testCondJump("jz", 0xca, "zf", JZ);
testCondJump("jnc", 0xd2, "cf", JNC);
testCondJump("jc", 0xda, "cf", JC);
testCondJump("jpo", 0xe2, "pf", JPO);
testCondJump("jpe", 0xea, "pf", JPE);
testCondJump("jp", 0xf2, "sf", JP);
testCondJump("jm", 0xfa, "sf", JM);

// --- CALL/RET ---

test("call/*", () => {
    let i = 0;
    for (let addr = 0; addr < 0x10000; addr += 0x1000) {
        cpu.pc = 0x100;
        cpu.sp = 0x2000;
        memory.write_raw(0x100, addr & 0xff);
        memory.write_raw(0x101, (addr >> 8) & 0xff);
        cpu.execute(0xcd);
        const retAddr = memory.read_raw(0x1ffe) | (memory.read_raw(0x1fff) << 8);
        expect(`from:0100 to:${hex16(addr)} -> pc:${hex16(cpu.pc)} sp:${hex16(cpu.sp)} ret:${hex16(retAddr)}`).toBe(CALL[i++]);
    }
});

test("ret/*", () => {
    let i = 0;
    for (let addr = 0; addr < 0x10000; addr += 0x1000) {
        cpu.pc = 0;
        cpu.sp = 0x1ffe;
        memory.write_raw(0x1ffe, addr & 0xff);
        memory.write_raw(0x1fff, (addr >> 8) & 0xff);
        cpu.execute(0xc9);
        expect(`ret_addr:${hex16(addr)} -> pc:${hex16(cpu.pc)} sp:${hex16(cpu.sp)}`).toBe(RET[i++]);
    }
});

// --- RST ---

test("rst/*", () => {
    for (let n = 0; n < 8; n++) {
        cpu.pc = 0x100;
        cpu.sp = 0x2000;
        cpu.execute(0xc7 | (n << 3));
        expect(`rst:${n} -> pc:${hex16(cpu.pc)} sp:${hex16(cpu.sp)}`).toBe(RST[n]);
    }
});

// --- EI/DI ---

test("ei_di/*", () => {
    let i = 0;
    for (const start of [0, 1]) {
        cpu.iff = start;
        cpu.pc = 0;
        cpu.execute(0xfb);
        expect(`ei: iff:${start} -> iff:${cpu.iff}`).toBe(EI_DI[i++]);
    }
    for (const start of [0, 1]) {
        cpu.iff = start;
        cpu.pc = 0;
        cpu.execute(0xf3);
        expect(`di: iff:${start} -> iff:${cpu.iff}`).toBe(EI_DI[i++]);
    }
});
