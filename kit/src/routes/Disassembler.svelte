<script lang="ts">
    import { i8080_opcode, i8080_cycles, type I8080Instruction } from "$lib/core/i8080_disasm";

    import type { I8080 } from "$lib/core/i8080";
    import type { Memory } from "$lib/core/rk86_memory";
    import type Debugger from "$lib/core/rk86_debugger";
    import { debuggerState } from "./state.svelte";

    let {
        memory,
        cpu,
        pc,
        dbg,
        initialDataAddr = "0000",
        ondatachange,
        onrunToCursor,
    }: {
        memory: Memory;
        cpu: I8080;
        pc: () => number;
        dbg: Debugger;
        initialDataAddr?: string;
        ondatachange?: (addr: string) => void;
        onrunToCursor?: (addr: number) => void;
    } = $props();

    const hex = (v: number, w: number) => v.toString(16).toUpperCase().padStart(w, "0");
    const hex8 = (v: number) => hex(v, 2);
    const hex16 = (v: number) => hex(v, 4);
    const DATA_WIDTH = 16;

    function wrap(addr: number): number {
        return (addr + memory.length()) % memory.length();
    }

    function disasm(addr: number): I8080Instruction {
        return i8080_opcode(memory.read_raw(addr), memory.read_raw(addr + 1), memory.read_raw(addr + 2));
    }

    let codeAddr = $state("0000");
    let codeLines = $state(22);

    type CondInfo = { flag: "sf" | "zf" | "pf" | "cf"; name: string; want: 0 | 1 };

    function conditionFor(cmd: string): CondInfo | null {
        switch (cmd) {
            case "JNZ": case "CNZ": case "RNZ": return { flag: "zf", name: "Z", want: 0 };
            case "JZ":  case "CZ":  case "RZ":  return { flag: "zf", name: "Z", want: 1 };
            case "JNC": case "CNC": case "RNC": return { flag: "cf", name: "C", want: 0 };
            case "JC":  case "CC":  case "RC":  return { flag: "cf", name: "C", want: 1 };
            case "JPO": case "CPO": case "RPO": return { flag: "pf", name: "P", want: 0 };
            case "JPE": case "CPE": case "RPE": return { flag: "pf", name: "P", want: 1 };
            case "JP":  case "CP":  case "RP":  return { flag: "sf", name: "S", want: 0 };
            case "JM":  case "CM":  case "RM":  return { flag: "sf", name: "S", want: 1 };
            default: return null;
        }
    }

    function jumpArrow(fromAddr: number, target: number): string {
        target &= 0xffff;
        if (target > fromAddr) return "↓";
        if (target < fromAddr) return "↑";
        return "↻";
    }

    function hasImm8(cmd: string): boolean {
        switch (cmd) {
            case "MVI": case "ADI": case "ACI": case "SUI": case "SBI":
            case "ANI": case "XRI": case "ORI": case "CPI":
            case "IN":  case "OUT":
                return true;
            default:
                return false;
        }
    }

    function returnAddress(): number {
        const sp = cpu.sp;
        const lo = memory.read_raw(sp);
        const hi = memory.read_raw(wrap(sp + 1));
        return (hi << 8) | lo;
    }

    // svelte-ignore state_referenced_locally
    let dataAddr = $state(initialDataAddr);
    let dataLines = $state(12);

    let codePane = $state<HTMLDivElement>();
    let dataPane = $state<HTMLDivElement>();
    let lineHeight = $state(0);

    function measureLineHeight(): number {
        if (lineHeight) return lineHeight;
        const probe = codePane?.querySelector(".code-line") as HTMLElement | null;
        if (probe && probe.offsetHeight > 0) {
            lineHeight = probe.offsetHeight;
        }
        return lineHeight || 12;
    }

    function recomputeRows() {
        const lh = measureLineHeight();
        if (!lh) return;
        if (codePane) {
            const rows = Math.max(4, Math.floor(codePane.clientHeight / lh));
            if (rows !== codeLines) codeLines = rows;
        }
        if (dataPane) {
            const rows = Math.max(2, Math.floor(dataPane.clientHeight / lh));
            if (rows !== dataLines) dataLines = rows;
        }
    }

    let cursorAddr = $state<number | null>(null);
    let dataFlashAddr = $state<number | null>(null);
    let dataFlashKey = $state(0);
    let dataFlashTimer: ReturnType<typeof setTimeout> | undefined;
    let codeFlashAddr = $state<number | null>(null);
    let codeFlashTimer: ReturnType<typeof setTimeout> | undefined;

    // Bump on every render trigger so memory edits / step events refresh
    // even though `memory` itself is not reactive.
    let revision = $state(0);

    export function refresh() {
        prevSnapshot = {
            a: regsView.a, fByte: regsView.fByte,
            bc: regsView.bc, de: regsView.de, hl: regsView.hl,
            sp: regsView.sp, psw: regsView.psw,
        };
        const p = pc();
        if (!pcVisible(p)) {
            codeAddr = hex16(walkBack(p, Math.floor(codeLines / 2)));
        }
        cursorAddr = p;
        revision++;
    }

    export function goCodePC() {
        const p = pc();
        codeAddr = hex16(walkBack(p, Math.floor(codeLines / 2)));
        cursorAddr = p;
        revision++;
    }

    function pcVisible(p: number): boolean {
        const start = parseInt("0x" + codeAddr) | 0;
        let addr = isNaN(start) ? 0 : start & 0xffff;
        for (let i = 0; i < codeLines; i++) {
            if (addr === p) return true;
            addr = wrap(addr + disasm(addr).length);
        }
        return false;
    }

    function walkBack(from: number, steps: number): number {
        let addr = from;
        for (let n = 0; n < steps; n++) {
            let i;
            for (i = 3; i > 0; --i) {
                const d = disasm(wrap(addr - i));
                if (d.length === i) break;
            }
            addr = wrap(addr - (i > 0 ? i : 1));
        }
        return addr;
    }

    type CodeLine = {
        addr: number;
        instr: I8080Instruction;
        bytes: number[];
        chars: string;
    };

    const codeView = $derived.by((): CodeLine[] => {
        revision; // dependency
        const target = parseInt("0x" + codeAddr) | 0;
        const start = isNaN(target) ? 0 : target & 0xffff;
        let addr = start;
        const lines: CodeLine[] = [];
        for (let i = 0; i < codeLines; i++) {
            const instr = disasm(addr);
            const bytes: number[] = [];
            let chars = "";
            for (let j = 0; j < instr.length; j++) {
                const b = memory.read_raw(addr + j);
                bytes.push(b);
                chars += String.fromCharCode(b < 32 || b > 127 ? 0x2e : b);
            }
            lines.push({ addr, instr, bytes, chars });
            addr = wrap(addr + instr.length);
        }
        return lines;
    });

    type DataLine = {
        addr: number;
        bytes: number[];
        chars: string;
    };

    const dataView = $derived.by((): DataLine[] => {
        revision; // dependency
        const start = parseInt("0x" + dataAddr) | 0;
        let addr = isNaN(start) ? 0 : start & 0xffff;
        const lines: DataLine[] = [];
        for (let i = 0; i < dataLines; i++) {
            const bytes: number[] = [];
            let chars = "";
            for (let j = 0; j < DATA_WIDTH; j++) {
                const b = memory.read_raw(addr + j);
                bytes.push(b);
                chars += String.fromCharCode(b < 32 || b > 127 ? 0x2e : b);
            }
            lines.push({ addr, bytes, chars });
            addr = wrap(addr + DATA_WIDTH);
        }
        return lines;
    });

    type RegsSnapshot = { a: number; fByte: number; bc: number; de: number; hl: number; sp: number; psw: number };
    let prevSnapshot = $state<RegsSnapshot | null>(null);

    // Regs are also a $derived value so flag/register edits repaint.
    const regsView = $derived.by(() => {
        revision; // dependency
        const r = cpu.regs;
        const a = r[7];
        const sf = cpu.sf, zf = cpu.zf, hf = cpu.hf, pf = cpu.pf, cf = cpu.cf;
        const fByte = (sf << 7) | (zf << 6) | (hf << 4) | (pf << 2) | 0x02 | cf;
        return {
            a,
            b: r[0],
            c: r[1],
            d: r[2],
            e: r[3],
            h: r[4],
            l: r[5],
            bc: (r[0] << 8) | r[1],
            de: (r[2] << 8) | r[3],
            hl: (r[4] << 8) | r[5],
            sp: cpu.sp,
            pc: cpu.pc,
            sf, zf, hf, pf, cf,
            iff: cpu.iff,
            fByte,
            psw: (a << 8) | fByte,
        };
    });

    const changes = $derived.by(() => {
        const r = regsView;
        const p = prevSnapshot;
        if (!p) return { a: false, f: false, bc: false, de: false, hl: false, sp: false, psw: false };
        return {
            a: r.a !== p.a,
            f: r.fByte !== p.fByte,
            bc: r.bc !== p.bc,
            de: r.de !== p.de,
            hl: r.hl !== p.hl,
            sp: r.sp !== p.sp,
            psw: r.psw !== p.psw,
        };
    });

    const stackView = $derived.by(() => {
        revision; // dependency
        const sp = cpu.sp;
        const start = sp;
        const out: { addr: number; lo: number; hi: number; word: number; isSP: boolean }[] = [];
        for (let j = 0; j < 12; j += 2) {
            const addr = wrap(start + j);
            const lo = memory.read_raw(addr);
            const hi = memory.read_raw(wrap(addr + 1));
            out.push({ addr, lo, hi, word: (hi << 8) | lo, isSP: addr === sp });
        }
        const spLo = memory.read_raw(sp);
        const spHi = memory.read_raw(wrap(sp + 1));
        return { start, items: out, spLo, spHi, spWord: (spHi << 8) | spLo };
    });

    function codeShift(direction: number, one = false) {
        let addr = parseInt("0x" + codeAddr);
        let n = direction * (one ? 1 : codeLines);
        if (n < 0) {
            while (n++ < 0) addr = walkBack(addr, 1);
        } else {
            while (n-- > 0) addr = wrap(addr + disasm(addr).length);
        }
        codeAddr = hex16(addr);
    }

    function dataShift(direction: number, one = false) {
        const offset = one ? 1 : DATA_WIDTH;
        const from = parseInt("0x" + dataAddr);
        dataAddr = hex16(wrap(from + offset * direction));
    }

    // ---- Hex cell editing -------------------------------------------------

    let editingCell = $state<string | null>(null); // "code-<addr>" or "data-<addr>"
    let editingValue = $state("");
    let editFlash = $state<{ key: string; ok: boolean } | null>(null);

    function startEdit(kind: "code" | "data", addr: number, current: number) {
        editingCell = `${kind}-${addr}`;
        editingValue = hex8(current);
        // Focus + select happens in the on:introend handler below via autofocus action.
    }

    function commitEditValue(addr: number): void {
        const v = parseInt(editingValue, 16);
        const key = editingCell!;
        if (!isNaN(v) && v >= 0 && v <= 0xff) {
            memory.write_raw(addr, v);
            const after = memory.read_raw(addr);
            editFlash = { key, ok: after === v };
            setTimeout(() => {
                if (editFlash?.key === key) editFlash = null;
            }, 600);
        }
    }

    function commitEdit(addr: number) {
        commitEditValue(addr);
        editingCell = null;
        revision++;
    }

    function commitAndMove(addr: number, delta: number) {
        commitEditValue(addr);
        const kind = editingCell!.startsWith("code-") ? "code" : "data";
        const nextAddr = (addr + delta + 0x10000) & 0xffff;
        if (kind === "data") {
            const top = parseInt("0x" + dataAddr) & 0xffff;
            const visibleSize = dataLines * DATA_WIDTH;
            const offset = (nextAddr - top + 0x10000) & 0xffff;
            if (offset >= visibleSize) {
                dataAddr = hex16(
                    (delta > 0 ? top + DATA_WIDTH : top - DATA_WIDTH + 0x10000) & 0xffff,
                );
            }
        } else {
            // Code: re-center if the byte we're moving to is off-screen.
            if (!pcVisible(nextAddr)) {
                codeAddr = hex16(walkBack(nextAddr, Math.floor(codeLines / 2)));
            }
        }
        editingCell = `${kind}-${nextAddr}`;
        editingValue = hex8(memory.read_raw(nextAddr));
        revision++;
    }

    function cancelEdit() {
        editingCell = null;
    }

    function onHexInputKey(e: KeyboardEvent, addr: number) {
        if (e.key === "Enter") {
            e.preventDefault();
            commitEdit(addr);
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
        } else if (e.key === "Tab") {
            e.preventDefault();
            commitAndMove(addr, e.shiftKey ? -1 : 1);
        }
    }

    // ---- Register / flag editing ------------------------------------------

    let editingReg = $state<string | null>(null);
    let editingRegValue = $state("");

    function startRegEdit(name: string, value: number, width: number) {
        editingReg = name;
        editingRegValue = hex(value, width);
    }

    function commitRegEdit(name: string) {
        const v = parseInt(editingRegValue, 16);
        if (!isNaN(v)) {
            switch (name) {
                case "A": cpu.set_a(v & 0xff); break;
                case "B": cpu.regs[0] = v & 0xff; break;
                case "C": cpu.regs[1] = v & 0xff; break;
                case "D": cpu.regs[2] = v & 0xff; break;
                case "E": cpu.regs[3] = v & 0xff; break;
                case "H": cpu.regs[4] = v & 0xff; break;
                case "L": cpu.regs[5] = v & 0xff; break;
                case "BC": cpu.set_rp(0, v & 0xffff); break;
                case "DE": cpu.set_rp(2, v & 0xffff); break;
                case "HL": cpu.set_rp(4, v & 0xffff); break;
                case "SP": cpu.sp = v & 0xffff; break;
                case "PC": cpu.pc = v & 0xffff; break;
            }
        }
        editingReg = null;
        revision++;
    }

    function onRegInputKey(e: KeyboardEvent, name: string) {
        if (e.key === "Enter") {
            e.preventDefault();
            commitRegEdit(name);
        } else if (e.key === "Escape") {
            e.preventDefault();
            editingReg = null;
        }
    }

    function toggleFlag(name: "sf" | "zf" | "hf" | "pf" | "cf" | "iff") {
        cpu[name] = cpu[name] ? 0 : 1;
        revision++;
    }

    // ---- Breakpoint awareness for code view -------------------------------

    function execBpAt(addr: number): boolean {
        for (const b of debuggerState.breakpoints) {
            if (b.type === "exec" && b.active && !b.temp && b.address === addr) return true;
        }
        return false;
    }

    function toggleBpAt(addr: number) {
        dbg.toggleExecAt(addr);
    }

    export function getCursor(): number | null {
        return cursorAddr;
    }

    function selectCursor(addr: number) {
        cursorAddr = addr;
    }

    // ---- Click-through for register/data addresses ------------------------

    function gotoCode(addr: number) {
        codeAddr = hex16(addr);
        cursorAddr = addr;
    }

    function gotoData(addr: number) {
        dataAddr = hex16(addr);
    }

    export function gotoCodeCentered(addr: number) {
        codeAddr = hex16(walkBack(addr, Math.floor(codeLines / 2)));
        cursorAddr = addr;
        flashCodeRow(addr);
    }

    function flashCodeRow(addr: number) {
        codeFlashAddr = null;
        clearTimeout(codeFlashTimer);
        requestAnimationFrame(() => {
            codeFlashAddr = addr & 0xffff;
            codeFlashTimer = setTimeout(() => {
                codeFlashAddr = null;
            }, 1500);
        });
    }

    export function gotoDataCentered(addr: number) {
        const middleRow = Math.floor(dataLines / 2);
        const top = (addr - middleRow * DATA_WIDTH + 0x10000) & 0xffff;
        // Align to row boundary so the target row contains the target byte.
        const rowAligned = (top - (top % DATA_WIDTH) + (addr % DATA_WIDTH)) & 0xffff;
        dataAddr = hex16(rowAligned & ~(DATA_WIDTH - 1));
        flashDataRow(addr);
    }

    function flashDataRow(addr: number) {
        // Clear first so re-clicking the same target restarts the animation.
        dataFlashAddr = null;
        clearTimeout(dataFlashTimer);
        requestAnimationFrame(() => {
            dataFlashAddr = addr & 0xffff;
            dataFlashKey++;
            dataFlashTimer = setTimeout(() => {
                dataFlashAddr = null;
            }, 1500);
        });
    }

    function autofocus(node: HTMLInputElement) {
        node.focus();
        node.select();
    }

    import { onMount, onDestroy } from "svelte";
    let resizeObserver: ResizeObserver | undefined;
    onMount(() => {
        goCodePC();
        recomputeRows();
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => recomputeRows());
            if (codePane) resizeObserver.observe(codePane);
            if (dataPane) resizeObserver.observe(dataPane);
        }
        // After the first render, line height is known — re-measure once more.
        requestAnimationFrame(() => recomputeRows());
    });
    onDestroy(() => resizeObserver?.disconnect());

    $effect(() => {
        ondatachange?.(dataAddr);
    });

    // ---- Context menu for code rows ---------------------------------------

    let menu = $state<{ x: number; y: number; addr: number } | null>(null);
    function openContextMenu(e: MouseEvent, addr: number) {
        e.preventDefault();
        cursorAddr = addr;
        menu = { x: e.clientX, y: e.clientY, addr };
    }
    function closeMenu() {
        menu = null;
    }
</script>

<svelte:window on:click={() => menu && closeMenu()} on:resize={closeMenu} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="disasm" onkeydown={(e) => e.stopPropagation()} onkeyup={(e) => e.stopPropagation()}>
    <div class="toolbar">
        <button type="button" onclick={() => codeShift(-1)}>«</button>
        <button type="button" onclick={() => codeShift(-1, true)}>‹</button>
        <input
            type="text"
            bind:value={codeAddr}
            style="width: calc(4ch + 4px)"
            onkeydown={(e) => { if (e.key === "Enter") revision++; }}
        />
        <button type="button" onclick={() => revision++} data-text="Перейти по адресу">▶</button>
        <button type="button" onclick={() => codeShift(1, true)}>›</button>
        <button type="button" onclick={() => codeShift(1)}>»</button>
        <span class="pc-jump" data-text="Перейти на PC">
            PC:<!-- svelte-ignore a11y_click_events_have_key_events --><!-- svelte-ignore a11y_no_static_element_interactions --><span class="reg-link" onclick={goCodePC}>{hex16(regsView.pc)}</span>
        </span>
    </div>
    <hr />
    <div class="code pane" bind:this={codePane}>
        {#each codeView as line (line.addr)}
            {@const isPC = line.addr === regsView.pc}
            {@const isCursor = line.addr === cursorAddr}
            {@const hasBp = execBpAt(line.addr)}
            {@const isFlashCode = codeFlashAddr !== null && codeFlashAddr >= line.addr && codeFlashAddr < line.addr + line.instr.length}
            {@const condInfo = conditionFor(line.instr.cmd)}
            {@const condTaken = condInfo ? regsView[condInfo.flag] === condInfo.want : undefined}
            {@const cycles = i8080_cycles(line.bytes[0], condTaken ?? true)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <div
                class="code-line"
                class:pc={isPC}
                class:cursor={isCursor}
                class:flash={isFlashCode}
                onclick={() => selectCursor(line.addr)}
                oncontextmenu={(e) => openContextMenu(e, line.addr)}
            >
                <span class="addr" class:bp={hasBp} onclick={(e) => { e.stopPropagation(); toggleBpAt(line.addr); }} data-text="Точка останова">{hex16(line.addr)}</span>:&nbsp;<!--
                -->{#each [0, 1, 2] as j}
                    {#if j < line.bytes.length}
                        {@const cellKey = `code-${line.addr + j}`}
                        {#if editingCell === cellKey}
                            <input
                                class="hex-edit"
                                type="text"
                                maxlength="2"
                                data-key={cellKey}
                                bind:value={editingValue}
                                use:autofocus
                                onblur={(e) => {
                                    const k = (e.currentTarget as HTMLInputElement).dataset.key;
                                    if (editingCell === k) commitEdit(line.addr + j);
                                }}
                                onkeydown={(e) => onHexInputKey(e, line.addr + j)}
                            />
                        {:else}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span
                                class="hex-cell"
                                class:flash-ok={editFlash?.key === cellKey && editFlash.ok}
                                class:flash-bad={editFlash?.key === cellKey && !editFlash.ok}
                                onclick={(e) => { e.stopPropagation(); startEdit("code", line.addr + j, line.bytes[j]); }}
                            >{hex8(line.bytes[j])}</span>
                        {/if}
                    {:else}
                        <span class="hex-cell empty">&nbsp;&nbsp;</span>
                    {/if}
                {/each}
                <span class="chars">&nbsp;{line.chars}{" ".repeat(3 - line.bytes.length)}&nbsp;</span>
                <span class="cmd" class:bad={line.instr.bad}>{line.instr.cmd}</span>
                <span class="args">
                    {#if line.instr.arg1}
                        {#if line.instr.code}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span class="arg-code" onclick={(e) => { e.stopPropagation(); gotoCodeCentered(parseInt(line.instr.arg1!, 16)); }}>{line.instr.arg1}</span>
                        {:else if line.instr.data1}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <span class="arg-data" onclick={(e) => { e.stopPropagation(); gotoDataCentered(parseInt(line.instr.arg1!, 16)); }}>{line.instr.arg1}</span>
                        {:else}
                            <span>{line.instr.arg1}</span>
                        {/if}
                    {/if}{#if line.instr.arg2}, {#if line.instr.data2}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <span class="arg-data" onclick={(e) => { e.stopPropagation(); gotoDataCentered(parseInt(line.instr.arg2!, 16)); }}>{line.instr.arg2}</span>
                    {:else}<span>{line.instr.arg2}</span>{/if}{/if}
                </span>
                <span class="hint">
                    {#if line.instr.cmd === "JMP" || line.instr.cmd === "CALL"}
                        <span class="cond-take">{jumpArrow(line.addr, parseInt(line.instr.arg1!, 16))}</span>
                    {:else if line.instr.cmd === "RET"}
                        {@const retAddr = returnAddress()}
                        <span class="memval">[{hex16(retAddr)}]</span>
                        <span class="cond-take">{jumpArrow(line.addr, retAddr)}</span>
                    {:else if condInfo}
                        {@const isJumpOrCall = line.instr.cmd.startsWith("J") || line.instr.cmd.startsWith("C")}
                        {@const isRet = line.instr.cmd.startsWith("R")}
                        <span class={condTaken ? "flag-set" : "flag-unset"}>{condInfo.name}={regsView[condInfo.flag]}</span>
                        {#if condTaken && isJumpOrCall}
                            <span class="cond-take">{jumpArrow(line.addr, parseInt(line.instr.arg1!, 16))}</span>
                        {:else if condTaken && isRet}
                            {@const retAddr = returnAddress()}
                            <span class="memval">[{hex16(retAddr)}]</span>
                            <span class="cond-take">{jumpArrow(line.addr, retAddr)}</span>
                        {:else if condTaken}
                            <span class="cond-take">✓</span>
                        {:else}
                            <span class="cond-skip">✗</span>
                        {/if}
                    {:else if line.instr.cmd === "LDA" || line.instr.cmd === "STA"}
                        {@const target = parseInt(line.instr.arg1!, 16) & 0xffff}
                        <span class="memval">[{hex8(memory.read_raw(target))}]</span>
                    {:else if line.instr.cmd === "LHLD" || line.instr.cmd === "SHLD" || line.instr.cmd === "LXI"}
                        {@const addrHex = line.instr.cmd === "LXI" ? line.instr.arg2 : line.instr.arg1}
                        {@const target = parseInt(addrHex!, 16) & 0xffff}
                        {@const lo = memory.read_raw(target)}
                        {@const hi = memory.read_raw(wrap(target + 1))}
                        <span class="memval">[{hex16((hi << 8) | lo)}]</span>
                    {:else if line.instr.arg1 === "M" || line.instr.arg2 === "M"}
                        {@const hl = regsView.hl}
                        <span class="memval">HL={hex16(hl)}=[{hex8(memory.read_raw(hl))}]</span>
                    {:else if hasImm8(line.instr.cmd) && line.bytes[1] >= 32 && line.bytes[1] <= 126}
                        <span class="memval">'{String.fromCharCode(line.bytes[1])}'</span>
                    {/if}
                    <span class="cycles">{cycles}t</span>
                </span>
            </div>
        {/each}
    </div>
    <hr />
    <div class="registers">
        {@render reg8("A", regsView.a, changes.a)}
        <span class="reg-binary">[{regsView.a.toString(2).padStart(8, "0")}]</span>
        <span class="flags">
            <span class="reg-label" class:changed={changes.f}>F</span>:{@render flag("S", regsView.sf, () => toggleFlag("sf"))}{@render flag("Z", regsView.zf, () => toggleFlag("zf"))}<span class="flag-unused">0</span>{@render flag("H", regsView.hf, () => toggleFlag("hf"))}<span class="flag-unused">0</span>{@render flag("P", regsView.pf, () => toggleFlag("pf"))}<span class="flag-unused">1</span>{@render flag("C", regsView.cf, () => toggleFlag("cf"))}
            <span class="reg-binary">[{hex8(regsView.fByte)}]</span>
            <span class="psw"><span class="reg-label" class:changed={changes.psw}>PSW</span>:{hex16(regsView.psw)}</span>
            <span class="iff">{@render flag("I", regsView.iff, () => toggleFlag("iff"))}</span>
        </span>
        <br />
        {@render reg16("BC", regsView.bc, false, true, false, changes.bc)}
        {@render reg16("DE", regsView.de, false, true, false, changes.de)}
        {@render reg16("HL", regsView.hl, false, true, true, changes.hl)}
        <br />
        <span class="stack">
            {#each stackView.items as it, i}
                <span class="stack-pair" class:sp-marker={it.isSP}>
                    {#if i === 0}<!-- svelte-ignore a11y_click_events_have_key_events --><!-- svelte-ignore a11y_no_static_element_interactions --><span class="reg-name" class:changed={changes.sp} onclick={() => startRegEdit("SP", regsView.sp, 4)}>SP</span>:{/if}{#if i === 0 && editingReg === "SP"}<input
                            class="reg-edit reg-edit-16"
                            type="text"
                            maxlength="4"
                            bind:value={editingRegValue}
                            use:autofocus
                            onblur={() => commitRegEdit("SP")}
                            onkeydown={(e) => onRegInputKey(e, "SP")}
                        />{:else}<!-- svelte-ignore a11y_click_events_have_key_events --><!-- svelte-ignore a11y_no_static_element_interactions --><span class="reg-link" onclick={() => gotoData(it.addr)}>{hex16(it.addr)}</span>{/if}:<!-- svelte-ignore a11y_click_events_have_key_events --><!-- svelte-ignore a11y_no_static_element_interactions --><span class="reg-link" onclick={() => gotoCode(it.word)}>{hex8(it.lo)}{hex8(it.hi)}</span>
                </span>
            {/each}
        </span>
    </div>
    <hr />
    <div class="toolbar">
        <button type="button" onclick={() => dataShift(-1)}>«</button>
        <button type="button" onclick={() => dataShift(-1, true)}>‹</button>
        <input
            type="text"
            bind:value={dataAddr}
            style="width: calc(4ch + 4px)"
            onkeydown={(e) => { if (e.key === "Enter") revision++; }}
        />
        <button type="button" onclick={() => revision++} data-text="Перейти по адресу">▶</button>
        <button type="button" onclick={() => dataShift(1, true)}>›</button>
        <button type="button" onclick={() => dataShift(1)}>»</button>
    </div>
    <hr />
    <div class="data pane" bind:this={dataPane}>
        {#each dataView as line (line.addr)}
            {@const isFlash = dataFlashAddr !== null && dataFlashAddr >= line.addr && dataFlashAddr < line.addr + DATA_WIDTH}
            <div class="data-line" class:flash={isFlash} data-flash-key={isFlash ? dataFlashKey : 0}>
                <span class="addr">{hex16(line.addr)}</span>:
                {#each line.bytes as b, j}
                    {@const cellKey = `data-${line.addr + j}`}
                    {#if editingCell === cellKey}
                        <input
                            class="hex-edit"
                            type="text"
                            maxlength="2"
                            data-key={cellKey}
                            bind:value={editingValue}
                            use:autofocus
                            onblur={(e) => {
                                const k = (e.currentTarget as HTMLInputElement).dataset.key;
                                if (editingCell === k) commitEdit(line.addr + j);
                            }}
                            onkeydown={(e) => onHexInputKey(e, line.addr + j)}
                        />
                    {:else}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <span
                            class="hex-cell"
                            class:flash-ok={editFlash?.key === cellKey && editFlash.ok}
                            class:flash-bad={editFlash?.key === cellKey && !editFlash.ok}
                            onclick={() => startEdit("data", line.addr + j, b)}
                        >{hex8(b)}</span>
                    {/if}
                {/each}
                <span class="chars">&nbsp;{line.chars}</span>
            </div>
        {/each}
    </div>
</div>

{#if menu}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="context-menu" style="left: {menu.x}px; top: {menu.y}px" onclick={(e) => e.stopPropagation()}>
        <button type="button" onclick={() => { toggleBpAt(menu!.addr); closeMenu(); }}>
            {execBpAt(menu.addr) ? "Удалить точку останова" : "Поставить точку останова"} (F9)
        </button>
        <button type="button" onclick={() => { onrunToCursor?.(menu!.addr); closeMenu(); }}>Выполнить до сюда (Ctrl+F10)</button>
        <button type="button" onclick={() => { cpu.pc = menu!.addr; revision++; closeMenu(); }}>Установить PC</button>
    </div>
{/if}

{#snippet reg8(name: string, value: number, changed = false)}
    <span class="reg-pair"><span class="reg-label" class:changed>{name}</span>:{#if editingReg === name}
        <input
            class="reg-edit reg-edit-8"
            type="text"
            maxlength="2"
            bind:value={editingRegValue}
            use:autofocus
            onblur={() => commitRegEdit(name)}
            onkeydown={(e) => onRegInputKey(e, name)}
        />
    {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="reg-value reg-value-8" onclick={() => startRegEdit(name, value, 2)}>{hex8(value)}</span>
    {/if}</span>
{/snippet}

{#snippet reg16(name: string, value: number, highlight = false, showPeek = false, showPeek16 = false, changed = false)}
    <span class="reg-pair">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span
            class="reg-name"
            class:changed
            onclick={() => {
                if (name === "PC") gotoCodeCentered(value);
                else gotoDataCentered(value);
            }}
        >{name}</span>:{#if editingReg === name}
        <input
            class="reg-edit reg-edit-16"
            type="text"
            maxlength="4"
            bind:value={editingRegValue}
            use:autofocus
            onblur={() => commitRegEdit(name)}
            onkeydown={(e) => onRegInputKey(e, name)}
        />
    {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="reg-value reg-value-16" class:highlight onclick={() => startRegEdit(name, value, 4)}>{hex16(value)}</span>
    {/if}{#if showPeek} <span class="reg-peek">[{hex8(memory.read_raw(value & 0xffff))}]</span>{/if}{#if showPeek16}<span class="reg-peek">[{hex16((memory.read_raw(wrap((value & 0xffff) + 1)) << 8) | memory.read_raw(value & 0xffff))}]</span>{/if}</span>
{/snippet}

{#snippet flag(ch: string, bit: number, toggle: () => void)}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span class="flag-bit" class:flag-set={bit} class:flag-unset={!bit} onclick={toggle}>{bit ? ch : ch.toLowerCase()}</span>
{/snippet}

<style>
    .disasm {
        width: fit-content;
        height: 100%;
        overflow: hidden;
        background-color: #000000;
        color: #ffffff;
        font-family: monospace;
        font-size: x-small;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }
    .pane {
        flex: 1 1 0;
        min-height: 0;
        overflow: hidden;
    }
    .registers {
        padding: 2px 4px;
        color: #ccc;
        white-space: nowrap;
    }
    .reg-pair {
        margin-right: 6px;
    }
    .reg-name {
        cursor: pointer;
    }
    .reg-name:hover {
        text-decoration: underline;
    }
    .reg-label.changed,
    .reg-name.changed {
        color: #f55;
    }
    .reg-value,
    .reg-edit {
        display: inline-block;
        box-sizing: border-box;
        padding: 0 1px;
        font-family: monospace;
        text-align: left;
        vertical-align: baseline;
        line-height: 1;
        border: 1px solid transparent;
    }
    .reg-value-8,
    .reg-edit-8 {
        width: calc(2ch + 4px);
    }
    .reg-value-16,
    .reg-edit-16 {
        width: calc(4ch + 4px);
    }
    .reg-value {
        color: lightblue;
        cursor: text;
    }
    .reg-value.highlight {
        color: #ffcc00;
    }
    .reg-value:hover {
        background-color: #222;
    }
    .reg-edit {
        background-color: #222;
        color: white;
        border-color: #4a9;
        outline: none;
    }
    .flags {
        margin-right: 8px;
    }
    .flag-bit {
        cursor: pointer;
        padding: 0 1px;
    }
    .flag-bit:hover {
        background-color: #222;
    }
    :global(.flag-set) {
        color: #ffcc00;
    }
    :global(.flag-unset) {
        color: #666;
    }
    :global(.flag-unused) {
        color: #888;
        padding: 0 1px;
    }
    .iff {
        margin-left: 6px;
    }
    .stack-pair {
        margin-right: 6px;
    }
    .reg-link {
        color: lightblue;
        cursor: pointer;
    }
    .reg-link:hover {
        text-decoration: underline;
    }
    .sp-marker .reg-link {
        color: #ffcc00;
    }
    .toolbar {
        padding: 2px 4px;
    }
    .toolbar button {
        font-family: monospace;
        font-size: 1.1em;
        width: 1.8em;
    }
    .toolbar input {
        box-sizing: border-box;
        padding: 2px;
        margin: 0;
        border: none;
        font-family: monospace;
    }
    hr {
        margin: 2px 0;
    }
    .code, .data {
        padding: 2px 4px;
    }
    .toolbar, .registers, hr {
        flex: 0 0 auto;
    }
    .code-line, .data-line {
        white-space: nowrap;
        cursor: default;
        padding: 0 2px;
    }
    @keyframes row-flash {
        from { background-color: #ffcc00; color: #000; }
        to { background-color: transparent; color: inherit; }
    }
    .data-line.flash,
    .code-line.flash {
        animation: row-flash 1.4s ease-out forwards;
    }
    .code-line.pc {
        background-color: #333;
    }
    .code-line.cursor {
        outline: 1px dashed #4a9;
        outline-offset: -1px;
    }
    .code-line.pc.cursor {
        background-color: #444;
    }
    .addr {
        cursor: pointer;
        padding: 0 1px;
    }
    .addr.bp {
        background-color: #c33;
        color: white;
        border-radius: 6px;
    }
    .addr:hover {
        outline: 1px solid #666;
    }
    .hex-cell,
    .hex-edit {
        display: inline-block;
        box-sizing: border-box;
        width: calc(2ch + 4px);
        padding: 0 1px;
        font-family: monospace;
        text-align: left;
        vertical-align: baseline;
        line-height: 1;
        border: 1px solid transparent;
    }
    .hex-cell {
        cursor: text;
    }
    .hex-cell:hover {
        background-color: #222;
    }
    .hex-cell.empty {
        cursor: default;
    }
    .hex-cell.flash-ok {
        background-color: #2a5;
    }
    .hex-cell.flash-bad {
        background-color: #a23;
    }
    .hex-edit {
        background-color: #222;
        color: white;
        border-color: #4a9;
        outline: none;
    }
    .chars {
        color: #aaa;
        white-space: pre;
    }
    .cmd {
        color: white;
        margin-left: 6px;
        display: inline-block;
        min-width: 5ch;
    }
    .cmd.bad {
        color: red;
    }
    .arg-code {
        color: lightgreen;
        cursor: pointer;
    }
    .arg-data {
        color: lightblue;
        cursor: pointer;
    }
    .arg-code:hover, .arg-data:hover {
        text-decoration: underline;
    }
    .args {
        display: inline-block;
        min-width: 9ch;
    }
    .hint {
        margin-left: 6px;
    }
    .hint::before {
        content: "; ";
        color: #777;
    }
    .cond-take {
        color: #6c6;
    }
    .cond-skip {
        color: #555;
    }
    .memval {
        color: #88c0d0;
    }
    .reg-peek {
        color: #88c0d0;
    }
    .reg-binary {
        color: #88c0d0;
        margin-right: 6px;
    }
    .psw {
        color: #ccc;
        margin-right: 6px;
    }
    .cycles {
        color: #888;
    }
    .pc-jump {
        margin-left: 6px;
        font-family: monospace;
        color: #ccc;
    }
    .context-menu {
        position: fixed;
        background-color: #222;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 4px;
        z-index: 5000;
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-family: monospace;
    }
    .context-menu button {
        all: unset;
        padding: 4px 8px;
        color: white;
        cursor: pointer;
        text-align: left;
        font-size: small;
    }
    .context-menu button:hover {
        background-color: #444;
    }
</style>
