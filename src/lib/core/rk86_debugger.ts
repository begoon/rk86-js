import { i8080_opcode } from "./i8080_disasm.js";
import type { Machine } from "./rk86_machine.js";

export type BreakpointType = "exec" | "read" | "write" | "opcode";

export interface Breakpoint {
    id: number;
    type: BreakpointType;
    // For exec/read/write: memory address. For opcode: opcode value 0..0xFF.
    address: number;
    // Read/write range; ignored (forced to 1) for exec and opcode.
    length: number;
    // 0 = stop on every hit; N = stop on the Nth hit (hits resets to 0 after).
    count: number;
    hits: number;
    temp: boolean;
    active: boolean;
}

export interface BreakpointInput {
    type: BreakpointType;
    address: number;
    length?: number;
    count?: number;
    temp?: boolean;
    active?: boolean;
}

export type BreakpointsListener = (breakpoints: Breakpoint[]) => void;

const STORAGE_KEY = "rk86:debugger:breakpoints";
const STORAGE_VERSION = 1;

export default class Debugger {
    machine: Machine;
    breaks: Breakpoint[] = [];
    private nextId = 1;
    private listeners = new Set<BreakpointsListener>();

    // Fast-path flags so the per-instruction / per-memory-access tracer can
    // bail out cheaply when nothing of that kind is armed.
    hasActiveExec = false;
    hasActiveOpcode = false;
    hasActiveReadWrite = false;

    // After hitting a breakpoint we must execute the current instruction
    // once on resume, otherwise it would re-trigger the same breakpoint
    // immediately. Set by stop-on-hit, cleared on the next tracer entry.
    private executeAfterBreakpoint = false;

    // Single-step state machine. -1 = inactive, 0 = first "before" after
    // resume (execute the instruction, then move to 1), 1 = stop before
    // the next instruction.
    private stopAfterNextInstruction = -1;

    constructor(machine: Machine) {
        this.machine = machine;
        this.load();
        this.recomputeFlags();
    }

    // ---- Breakpoint store -----------------------------------------------

    list(): Breakpoint[] {
        return this.breaks;
    }

    subscribe(listener: BreakpointsListener): () => void {
        this.listeners.add(listener);
        listener(this.breaks);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        for (const l of this.listeners) l(this.breaks);
    }

    add(input: BreakpointInput): Breakpoint {
        const bp: Breakpoint = {
            id: this.nextId++,
            type: input.type,
            address: input.address & 0xffff,
            length: this.normalizeLength(input.type, input.length ?? 1),
            count: input.count ?? 0,
            hits: 0,
            temp: input.temp ?? false,
            active: input.active ?? true,
        };
        if (input.type === "opcode") bp.address &= 0xff;
        this.breaks.push(bp);
        this.afterMutation();
        return bp;
    }

    update(id: number, patch: Partial<Omit<Breakpoint, "id" | "hits">>): void {
        const bp = this.breaks.find((b) => b.id === id);
        if (!bp) return;
        if (patch.type !== undefined) bp.type = patch.type;
        if (patch.address !== undefined) {
            bp.address = bp.type === "opcode" ? patch.address & 0xff : patch.address & 0xffff;
        }
        if (patch.length !== undefined) bp.length = this.normalizeLength(bp.type, patch.length);
        if (patch.count !== undefined) {
            bp.count = patch.count;
            bp.hits = 0;
        }
        if (patch.temp !== undefined) bp.temp = patch.temp;
        if (patch.active !== undefined) bp.active = patch.active;
        // After a type change, re-clamp length and address width.
        bp.length = this.normalizeLength(bp.type, bp.length);
        if (bp.type === "opcode") bp.address &= 0xff;
        else bp.address &= 0xffff;
        this.afterMutation();
    }

    remove(id: number): void {
        const i = this.breaks.findIndex((b) => b.id === id);
        if (i < 0) return;
        this.breaks.splice(i, 1);
        this.afterMutation();
    }

    resetHits(): void {
        for (const b of this.breaks) b.hits = 0;
        this.notify();
    }

    private normalizeLength(type: BreakpointType, length: number): number {
        if (type === "exec" || type === "opcode") return 1;
        return Math.max(1, Math.min(0x10000, length | 0));
    }

    private afterMutation() {
        this.recomputeFlags();
        this.save();
        this.notify();
    }

    private recomputeFlags() {
        this.hasActiveExec = false;
        this.hasActiveOpcode = false;
        this.hasActiveReadWrite = false;
        for (const b of this.breaks) {
            if (!b.active) continue;
            if (b.type === "exec") this.hasActiveExec = true;
            else if (b.type === "opcode") this.hasActiveOpcode = true;
            else this.hasActiveReadWrite = true;
        }
    }

    // ---- Persistence ----------------------------------------------------

    private save(): void {
        if (typeof localStorage === "undefined") return;
        const persistable = this.breaks
            .filter((b) => !b.temp)
            .map(({ hits: _hits, ...rest }) => rest);
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ version: STORAGE_VERSION, breakpoints: persistable }),
            );
        } catch {
            // Storage full or unavailable — ignore.
        }
    }

    private load(): void {
        if (typeof localStorage === "undefined") return;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw) as { version: number; breakpoints: Omit<Breakpoint, "hits">[] };
            if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.breakpoints)) return;
            for (const b of parsed.breakpoints) {
                this.breaks.push({
                    id: this.nextId++,
                    type: b.type,
                    address: b.address & 0xffff,
                    length: this.normalizeLength(b.type, b.length ?? 1),
                    count: b.count ?? 0,
                    hits: 0,
                    temp: false,
                    active: b.active ?? true,
                });
            }
        } catch {
            // Corrupt storage — drop it.
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    // ---- Tracer hooks ---------------------------------------------------

    // Called from the runner before and after every instruction.
    onInstruction(when: "before" | "after"): void {
        // Single-step state machine.
        if (when === "before") {
            if (this.stopAfterNextInstruction === 1) {
                this.stopAfterNextInstruction = -1;
                this.pauseAndRefresh();
                return;
            }
            if (this.stopAfterNextInstruction === 0) this.stopAfterNextInstruction = 1;

            // After a hit, run the current instruction once, then resume
            // checking on subsequent ones.
            if (this.executeAfterBreakpoint) {
                this.executeAfterBreakpoint = false;
                return;
            }

            const { cpu, memory } = this.machine;
            if (this.hasActiveExec) {
                for (const bp of this.breaks) {
                    if (!bp.active || bp.type !== "exec") continue;
                    if (bp.address === cpu.pc) this.fire(bp);
                }
            }
            if (this.hasActiveOpcode) {
                const op = memory.read_raw(cpu.pc);
                for (const bp of this.breaks) {
                    if (!bp.active || bp.type !== "opcode") continue;
                    if (bp.address === op) this.fire(bp);
                }
            }
        }
    }

    // Called from memory.read/write on every access. Only invoked when
    // hasActiveReadWrite is true — memory.ts gates on that flag.
    onMemoryAccess(operation: "read" | "write", address: number): void {
        if (this.executeAfterBreakpoint) return;
        const addr = address & 0xffff;
        for (const bp of this.breaks) {
            if (!bp.active || bp.type !== operation) continue;
            if (addr >= bp.address && addr < bp.address + bp.length) this.fire(bp);
        }
    }

    private fire(bp: Breakpoint): void {
        if (bp.count > 0) {
            bp.hits += 1;
            if (bp.hits < bp.count) {
                this.notify();
                return;
            }
            bp.hits = 0;
        }
        const wasTemp = bp.temp;
        if (wasTemp) {
            const i = this.breaks.indexOf(bp);
            if (i >= 0) this.breaks.splice(i, 1);
        }
        this.executeAfterBreakpoint = true;
        this.recomputeFlags();
        this.pauseAndRefresh();
        if (wasTemp) this.save();
        this.notify();
    }

    private pauseAndRefresh(): void {
        if (!this.machine.runner.paused) this.machine.pause(true);
        this.machine.ui.refreshDebugger?.();
    }

    // ---- Visibility / activation ---------------------------------------

    // Wire the tracer into the runner. Called when the debugger panel
    // opens. While the tracer is attached, the per-instruction hook runs
    // for every instruction; the per-access memory hook runs only when
    // hasActiveReadWrite is true.
    attach(): void {
        this.machine.runner.tracer = (when) => this.onInstruction(when as "before" | "after");
        this.machine.memory.tracer = (op, addr) => this.onMemoryAccess(op, addr);
    }

    detach(): void {
        this.machine.runner.tracer = null;
        this.machine.memory.tracer = null;
        // Cancel any pending step state.
        this.stopAfterNextInstruction = -1;
        this.executeAfterBreakpoint = false;
    }

    // ---- Stepping ------------------------------------------------------

    step(): void {
        this.stopAfterNextInstruction = 0;
        this.machine.pause(false);
    }

    stepOver(): void {
        const { cpu, memory } = this.machine;
        const op = memory.read_raw(cpu.pc);
        const instr = i8080_opcode(op, memory.read_raw(cpu.pc + 1), memory.read_raw(cpu.pc + 2));
        const next = (cpu.pc + instr.length) & 0xffff;
        this.add({ type: "exec", address: next, temp: true });
        this.machine.pause(false);
    }

    stepOut(): void {
        const { cpu, memory } = this.machine;
        // Return address sits on top of the stack: low byte at [SP], high at [SP+1].
        const lo = memory.read_raw(cpu.sp);
        const hi = memory.read_raw((cpu.sp + 1) & 0xffff);
        const ret = ((hi << 8) | lo) & 0xffff;
        this.add({ type: "exec", address: ret, temp: true });
        this.machine.pause(false);
    }

    runToCursor(addr: number): void {
        this.add({ type: "exec", address: addr & 0xffff, temp: true });
        this.machine.pause(false);
    }

    go(): void {
        this.machine.pause(false);
    }

    // ---- Convenience: toggle exec bp at an address --------------------

    toggleExecAt(addr: number): void {
        const a = addr & 0xffff;
        const existing = this.breaks.find((b) => b.type === "exec" && b.address === a && !b.temp);
        if (existing) {
            this.remove(existing.id);
        } else {
            this.add({ type: "exec", address: a });
        }
    }
}
