<script lang="ts">
    import { i8080_opcode } from "$lib/core/i8080_disasm";

    import type { I8080 } from "$lib/core/i8080";

    let {
        memory,
        cpu,
        pc,
        initialDataAddr = "0000",
        ondatachange,
    }: {
        memory: import("$lib/rk86_memory").Memory;
        cpu: I8080;
        pc: () => number;
        initialDataAddr?: string;
        ondatachange?: (addr: string) => void;
    } = $props();

    const hex = (v: number) => v.toString(16).toUpperCase();
    const hex8 = (v: number) => hex(v).padStart(2, "0");
    const hex16 = (v: number) => hex(v).padStart(4, "0");
    const DATA_WIDTH = 8;

    function wrap(addr: number): number {
        return (addr + memory.length()) % memory.length();
    }

    function disasm(addr: number) {
        return i8080_opcode(memory.read(addr), memory.read(addr + 1), memory.read(addr + 2));
    }

    let codeAddr = $state("0000");
    let codeLines = $state(22);

    // svelte-ignore state_referenced_locally
    let dataAddr = $state(initialDataAddr);
    let dataLines = $state(12);

    let codeHtml = $state("");
    let dataHtml = $state("");

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

    function renderCode(center = false) {
        const targetAddr = parseInt("0x" + codeAddr);
        let addr = center ? walkBack(targetAddr, Math.floor(codeLines / 2)) : targetAddr;
        const lines = [];
        const currentPC = pc();
        for (let i = 0; i < codeLines; i++) {
            const instr = disasm(addr);
            const addrStr = hex16(addr);
            const isPC = addr === currentPC;
            let line = (isPC ? `<span class="flag-set">${addrStr}</span>` : addrStr) + `:&nbsp;`;
            let chars = "";
            for (let j = 0; j < instr.length; ++j) {
                const ch = memory.read(addr + j);
                line += hex8(ch);
                chars += String.fromCharCode(ch < 32 || ch > 127 ? 0x2e : ch);
            }
            chars += "&nbsp;".repeat(3 - instr.length);
            chars = chars.replace(" ", "&nbsp;");
            line += "&nbsp;".repeat((3 - instr.length) * 2) + " " + chars + " ";
            const color = instr.bad ? "red" : "white";
            line += `<span style='color: ${color};'>${instr.cmd}</span>`;
            line += "&nbsp;".repeat(5 - instr.cmd.length);

            const fmtArg = (action: string | undefined, a: string): string => {
                if (!action) return `<span>${a}</span>`;
                return `<span class="disasm_${action}_offset" data-addr="${a}">${a}</span>`;
            };
            if (instr.arg1) {
                const action = instr.code ? "code" : instr.data1 ? "data" : undefined;
                line += " " + fmtArg(action, instr.arg1);
            }
            if (instr.arg2) {
                const action = instr.data2 ? "data" : undefined;
                line += ", " + fmtArg(action, instr.arg2);
            }
            lines.push(isPC ? `<span class="pc-line">${line}</span>` : line);
            addr = wrap(addr + instr.length);
        }
        codeHtml = lines.join("<br />");
    }

    function renderData() {
        ondatachange?.(dataAddr);
        let addr = parseInt("0x" + dataAddr);
        const lines = [];
        for (let i = 0; i < dataLines; i++) {
            let line = hex16(addr) + ": ";
            for (let j = 0; j < DATA_WIDTH; ++j) line += hex8(memory.read(addr + j)) + " ";
            for (let j = 0; j < DATA_WIDTH; ++j) {
                const ch = memory.read(addr + j);
                line += String.fromCharCode(ch < 32 || ch > 127 ? 0x2e : ch);
            }
            addr = wrap(addr + DATA_WIDTH);
            lines.push(line);
        }
        dataHtml = lines.join("<br />");
    }

    export function refresh() {
        renderCode();
        renderRegs();
        renderData();
    }

    let regsHtml = $state("");

    function renderRegs() {
        const r = cpu.regs;
        const bc = (r[0] << 8) | r[1];
        const de = (r[2] << 8) | r[3];
        const hl = (r[4] << 8) | r[5];
        const a = r[7];
        const f = cpu.store_flags();
        const flagDef = "SZ_H_P_C"; // _ = unused/hardcoded bit
        const flags = flagDef
            .split("")
            .map((ch, i) => {
                const bit = (f >> (7 - i)) & 1;
                if (ch === "_") return `<span class="flag-unused">${bit}</span>`;
                return bit ? `<span class="flag-set">${ch}</span>` : `<span class="flag-unset">-</span>`;
            })
            .join("");

        const pair = (name: string, val: number) =>
            `${name}:<span class="reg-link" data-regaddr="${hex16(val)}">${hex16(val)}</span>`;

        const sp = cpu.sp;
        const stackStart = wrap(sp - 10);
        let stackHtml = `SP(<span class="reg-link" data-regaddr="${hex16(stackStart)}">${hex16(stackStart)}</span>): `;
        for (let j = 0; j < 14; j += 2) {
            const lo = memory.read(wrap(stackStart + j));
            const hi = memory.read(wrap(stackStart + j + 1));
            const word = (hi << 8) | lo;
            const addr = wrap(stackStart + j);
            const isSP = addr === sp;
            const cls = isSP ? "reg-link flag-set" : "reg-link";
            stackHtml += `<span class="${cls}" data-regaddr="${hex16(word)}">${hex8(lo)}&nbsp;${hex8(hi)}</span> `;
        }

        regsHtml =
            [
                `A:${hex8(a)}`,
                `F:${flags}`,
                pair("BC", bc),
                pair("DE", de),
                pair("HL", hl),
                `SP:<span class="reg-link flag-set" data-regaddr="${hex16(cpu.sp)}">${hex16(cpu.sp)}</span>`,
                pair("PC", cpu.pc),
            ].join(" ") + `<br/><span class="registers-stack">${stackHtml}</span>`;
    }

    function handleRegClick(e: MouseEvent) {
        const el = (e.target as HTMLElement).closest("[data-regaddr]") as HTMLElement | null;
        if (!el) return;
        const addr = el.dataset.regaddr!;
        if (el.closest(".registers-stack")) {
            codeAddr = addr;
            renderCode(true);
        } else {
            dataAddr = addr;
            renderData();
        }
    }

    export function goCodePC() {
        codeAddr = hex16(pc());
        renderCode(true);
        renderRegs();
        renderData();
    }

    function codeShift(direction: number, one = false) {
        let addr = parseInt("0x" + codeAddr);
        let n = direction * (one ? 1 : codeLines);
        if (n < 0) {
            while (n++ < 0) {
                let i;
                for (i = 3; i > 0; --i) {
                    const d = disasm(wrap(addr - i));
                    if (d.length === i) break;
                }
                addr = wrap(addr - (i > 0 ? i : 1));
            }
        } else {
            while (n-- > 0) {
                addr = wrap(addr + disasm(addr).length);
            }
        }
        codeAddr = hex16(addr);
        renderCode();
    }

    function dataShift(direction: number, one = false) {
        const offset = one ? 1 : DATA_WIDTH;
        const from = parseInt("0x" + dataAddr);
        dataAddr = hex16(wrap(from + offset * direction));
        renderData();
    }

    function handleCodeClick(e: MouseEvent) {
        const el = (e.target as HTMLElement).closest("[data-addr]") as HTMLElement | null;
        if (!el) return;
        const addr = el.dataset.addr!;
        if (el.classList.contains("disasm_code_offset")) {
            codeAddr = addr;
            renderCode(true);
        } else if (el.classList.contains("disasm_data_offset")) {
            dataAddr = addr;
            renderData();
        }
    }

    import { onMount } from "svelte";
    onMount(() => {
        goCodePC();
        renderData();
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="disasm" onkeydown={(e) => e.stopPropagation()} onkeyup={(e) => e.stopPropagation()}>
    <div class="toolbar">
        <button type="button" onclick={() => codeShift(-1)}>«</button>
        <button type="button" onclick={() => codeShift(-1, true)}>‹</button>
        <input
            type="text"
            bind:value={codeAddr}
            style="width: calc(4ch + 4px)"
            onchange={() => renderCode()}
            onkeydown={(e) => {
                if (e.key === "Enter") renderCode();
            }}
        />
        /
        <input
            type="number"
            bind:value={codeLines}
            style="width: calc(5ch + 4px)"
            onchange={() => renderCode()}
            onkeydown={(e) => {
                if (e.key === "Enter") renderCode();
            }}
        />
        <button type="button" onclick={() => renderCode()} data-text="Перейти по адресу">▶</button>
        <button type="button" onclick={() => codeShift(1, true)}>›</button>
        <button type="button" onclick={() => codeShift(1)}>»</button>
        <button
            type="button"
            onclick={goCodePC}
            style="margin-left: 4px; text-decoration: underline"
            data-text="Перейти на PC">PC</button
        >
    </div>
    <hr />
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <code onclick={handleCodeClick}>{@html codeHtml}</code>
    <hr />
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="registers" onclick={handleRegClick}>{@html regsHtml}</div>
    <hr />
    <div class="toolbar">
        <button type="button" onclick={() => dataShift(-1)}>«</button>
        <button type="button" onclick={() => dataShift(-1, true)}>‹</button>
        <input
            type="text"
            bind:value={dataAddr}
            style="width: calc(4ch + 4px)"
            onchange={() => renderData()}
            onkeydown={(e) => {
                if (e.key === "Enter") renderData();
            }}
        />
        /
        <input
            type="number"
            bind:value={dataLines}
            style="width: calc(5ch + 4px)"
            onchange={() => renderData()}
            onkeydown={(e) => {
                if (e.key === "Enter") renderData();
            }}
        />
        <button type="button" onclick={() => renderData()} data-text="Перейти по адресу">▶</button>
        <button type="button" onclick={() => dataShift(1, true)}>›</button>
        <button type="button" onclick={() => dataShift(1)}>»</button>
    </div>
    <hr />
    <code>{@html dataHtml}</code>
</div>

<style>
    .disasm {
        width: fit-content;
        height: 100%;
        overflow: auto;
        background-color: #000000;
        color: #ffffff;
        font-family: monospace;
        font-size: x-small;
    }
    .registers {
        padding: 2px 4px;
        color: #ccc;
        white-space: nowrap;
    }
    :global(.reg-link) {
        color: lightblue;
        cursor: pointer;
    }
    :global(.reg-link:hover) {
        text-decoration: underline;
    }
    :global(.flag-set) {
        color: #ffcc00;
    }
    :global(.flag-unset) {
        color: #666;
    }
    :global(.flag-unused) {
        color: #444;
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
    code {
        display: block;
        padding: 2px 4px;
        white-space: nowrap;
        cursor: default;
    }
    :global(.pc-line) {
        background-color: #333;
        display: inline-block;
        width: 100%;
    }
    :global(.disasm_code_offset) {
        color: lightgreen;
        cursor: pointer;
    }
    :global(.disasm_data_offset) {
        color: lightblue;
        cursor: pointer;
    }
</style>
