<script lang="ts">
    import type Debugger from "$lib/core/rk86_debugger";
    import type { Breakpoint, BreakpointType } from "$lib/core/rk86_debugger";
    import { debuggerState } from "./state.svelte";

    let {
        dbg,
        paused,
        ongo,
        onpause,
        onstep,
        onstepover,
        onstepout,
    }: {
        dbg: Debugger;
        paused: boolean;
        ongo: () => void;
        onpause: () => void;
        onstep: () => void;
        onstepover: () => void;
        onstepout: () => void;
    } = $props();

    const hex = (v: number, w: number) => v.toString(16).toUpperCase().padStart(w, "0");

    function parseHex(value: string, mask: number): number | null {
        const trimmed = value.trim().replace(/^0x/i, "");
        if (trimmed.length === 0) return null;
        const n = parseInt(trimmed, 16);
        if (isNaN(n)) return null;
        return n & mask;
    }

    function addressMask(type: BreakpointType): number {
        return type === "opcode" ? 0xff : 0xffff;
    }

    function addressWidth(type: BreakpointType): number {
        return type === "opcode" ? 2 : 4;
    }

    function addNew() {
        dbg.add({ type: "exec", address: dbg.machine.cpu.pc });
    }

    function setType(bp: Breakpoint, type: BreakpointType) {
        dbg.update(bp.id, { type });
    }

    function commitAddress(bp: Breakpoint, raw: string) {
        const v = parseHex(raw, addressMask(bp.type));
        if (v === null) return;
        dbg.update(bp.id, { address: v });
    }

    function commitLength(bp: Breakpoint, raw: string) {
        const n = parseInt(raw, 10);
        if (isNaN(n) || n < 1) return;
        dbg.update(bp.id, { length: n });
    }

    function commitCount(bp: Breakpoint, raw: string) {
        const n = parseInt(raw, 10);
        if (isNaN(n) || n < 0) return;
        dbg.update(bp.id, { count: n });
    }

    function toggleActive(bp: Breakpoint) {
        dbg.update(bp.id, { active: !bp.active });
    }

    function toggleTemp(bp: Breakpoint) {
        dbg.update(bp.id, { temp: !bp.temp });
    }

    function remove(bp: Breakpoint) {
        dbg.remove(bp.id);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bp-editor" onkeydown={(e) => e.stopPropagation()} onkeyup={(e) => e.stopPropagation()}>
    <div class="toolbar">
        {#if paused}
            <button type="button" class="run go-pause" data-text="Продолжить (F5)" onclick={ongo}>▶ Пуск</button>
        {:else}
            <button type="button" class="go-pause" data-text="Остановить (F5)" onclick={onpause}>⏸ Пауза</button>
        {/if}
        <button type="button" disabled={!paused} data-text="Шаг (F11)" onclick={onstep}>⤼ Шаг</button>
        <button type="button" disabled={!paused} data-text="Шаг через (F10)" onclick={onstepover}>⤽ Через</button>
        <button type="button" disabled={!paused} data-text="Выход из подпрограммы (Shift+F11)" onclick={onstepout}>⤴ Выход</button>
        <span class="spacer"></span>
        <button type="button" onclick={addNew}>+ Точка останова</button>
    </div>

    <div class="header">
        <span class="col-active">Вкл</span>
        <span class="col-type">Тип</span>
        <span class="col-addr">Адрес/Опкод</span>
        <span class="col-len">Длина</span>
        <span class="col-count">Счёт</span>
        <span class="col-hits">Попад.</span>
        <span class="col-temp">Врем.</span>
        <span class="col-del"></span>
    </div>

    <div class="rows">
        {#each debuggerState.breakpoints as bp (bp.id)}
            <div class="row" class:inactive={!bp.active}>
                <span class="col-active">
                    <input type="checkbox" checked={bp.active} onchange={() => toggleActive(bp)} />
                </span>
                <span class="col-type">
                    <select value={bp.type} onchange={(e) => setType(bp, (e.currentTarget as HTMLSelectElement).value as BreakpointType)}>
                        <option value="exec">exec</option>
                        <option value="read">read</option>
                        <option value="write">write</option>
                        <option value="opcode">opcode</option>
                    </select>
                </span>
                <span class="col-addr">
                    <input
                        type="text"
                        value={hex(bp.address, addressWidth(bp.type))}
                        size={addressWidth(bp.type) + 1}
                        onchange={(e) => commitAddress(bp, (e.currentTarget as HTMLInputElement).value)}
                    />
                </span>
                <span class="col-len">
                    {#if bp.type === "read" || bp.type === "write"}
                        <input
                            type="number"
                            value={bp.length}
                            min="1"
                            max="65536"
                            onchange={(e) => commitLength(bp, (e.currentTarget as HTMLInputElement).value)}
                        />
                    {:else}
                        <span class="dim">—</span>
                    {/if}
                </span>
                <span class="col-count">
                    <input
                        type="number"
                        value={bp.count}
                        min="0"
                        onchange={(e) => commitCount(bp, (e.currentTarget as HTMLInputElement).value)}
                    />
                </span>
                <span class="col-hits">{bp.hits}</span>
                <span class="col-temp">
                    <input type="checkbox" checked={bp.temp} onchange={() => toggleTemp(bp)} />
                </span>
                <span class="col-del">
                    <button type="button" class="del" onclick={() => remove(bp)} data-text="Удалить">×</button>
                </span>
            </div>
        {/each}
        {#if debuggerState.breakpoints.length === 0}
            <div class="empty">Нет точек останова. Нажмите «+ Точка останова» или F9 в окне кода.</div>
        {/if}
    </div>
</div>

<style>
    .bp-editor {
        height: 100%;
        display: flex;
        flex-direction: column;
        background-color: #000;
        color: #ddd;
        font-family: monospace;
        font-size: small;
    }
    .toolbar {
        display: flex;
        gap: 4px;
        padding: 4px;
        border-bottom: 1px solid #333;
        align-items: center;
    }
    .toolbar button {
        font-family: monospace;
        font-size: 1em;
        padding: 2px 6px;
        cursor: pointer;
        border: 1px solid #555;
    }
    .toolbar button.run {
        background-color: #2a5;
        color: white;
        border-color: #4d8;
    }
    .toolbar button.go-pause {
        min-width: 7em;
    }
    .toolbar button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
    .spacer {
        flex: 1;
    }
    .header,
    .row {
        display: grid;
        /* active | type | addr/opcode | len | count | hits | temp | del */
        grid-template-columns: 32px 80px 55px 50px 50px 60px 50px 28px;
        gap: 4px;
        align-items: center;
        padding: 2px 4px;
    }
    .header {
        color: #888;
        border-bottom: 1px solid #222;
        font-size: 0.85em;
    }
    .row.inactive {
        opacity: 0.5;
    }
    .rows {
        overflow: auto;
        flex: 1;
    }
    .row input[type="text"],
    .row input[type="number"] {
        font-family: monospace;
        background-color: #111;
        color: #fff;
        border: 1px solid #333;
        padding: 1px 2px;
        width: 100%;
        box-sizing: border-box;
    }
    .row select {
        font-family: monospace;
        background-color: #111;
        color: #fff;
        border: 1px solid #333;
        padding: 1px 2px;
        width: 100%;
        box-sizing: border-box;
    }
    .dim {
        color: #555;
    }
    .col-active,
    .col-temp,
    .col-del,
    .col-hits {
        text-align: center;
    }
    button.del {
        background: transparent;
        color: #c66;
        border: 1px solid #533;
        cursor: pointer;
        padding: 0 4px;
    }
    button.del:hover {
        background-color: #533;
        color: white;
    }
    .empty {
        padding: 12px;
        color: #666;
        text-align: center;
    }
</style>
