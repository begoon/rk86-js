<script lang="ts">
    import type { Memory } from "$lib/core/rk86_memory";
    import type { Screen } from "$lib/core/rk86_screen";

    let {
        memory,
        screen,
        hoverX,
        hoverY,
        ongotodata,
    }: {
        memory: Memory;
        screen: Screen;
        hoverX?: number | null;
        hoverY?: number | null;
        ongotodata?: (addr: number) => void;
    } = $props();

    let tick = $state(0);

    export function refresh() {
        tick++;
    }

    const hex = (v: number, w: number) => v.toString(16).toUpperCase().padStart(w, "0");

    const info = $derived.by(() => {
        tick;
        const x = (memory.video_screen_cursor_x - 1) & 0xff;
        const y = (memory.video_screen_cursor_y - 1) & 0xff;
        const width = memory.video_screen_size_x || 0;
        const addr = (memory.video_memory_base + y * width + x) & 0xffff;
        const value = memory.read_raw(addr) & 0xff;
        return { x, y, addr, value };
    });

    const hover = $derived.by(() => {
        tick;
        if (hoverX == null || hoverY == null) return null;
        const width = memory.video_screen_size_x || 0;
        const addr = (memory.video_memory_base + hoverY * width + hoverX) & 0xffff;
        const value = memory.read_raw(addr) & 0xff;
        return { x: hoverX, y: hoverY, addr, value };
    });

    const lightPen = $derived.by(() => {
        tick;
        if (hoverX == null || hoverY == null) return null;
        return { x: screen.light_pen_x & 0xff, y: screen.light_pen_y & 0xff };
    });
</script>

<div class="cursor-info">
    <span class="label">Курсор:</span>
    <span>X={hex(info.x, 2)} Y={hex(info.y, 2)} <button
            type="button"
            class="addr-link"
            title="Показать в окне данных"
            onclick={() => ongotodata?.(info.addr)}
        >{hex(info.addr, 4)}</button>:{hex(info.value, 2)}</span>
    {#if hover}
        <span class="label">Позиция:</span>
        <span>X={hex(hover.x, 2)} Y={hex(hover.y, 2)} <button
                type="button"
                class="addr-link"
                title="Показать в окне данных"
                onclick={() => ongotodata?.(hover.addr)}
            >{hex(hover.addr, 4)}</button>:{hex(hover.value, 2)}</span>
    {/if}
    {#if lightPen}
        <span class="label">Световое перо:</span>
        <span>X={hex(lightPen.x, 2)} Y={hex(lightPen.y, 2)}</span>
    {/if}
</div>

<style>
    .cursor-info {
        display: flex;
        gap: 12px;
        padding: 4px 8px;
        font-family: monospace;
        font-size: small;
        color: #ddd;
        align-items: center;
    }
    .label {
        color: #888;
    }
    .addr-link {
        font: inherit;
        color: #4af;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        text-decoration: underline;
    }
    .addr-link:hover {
        color: #8cf;
    }
</style>
