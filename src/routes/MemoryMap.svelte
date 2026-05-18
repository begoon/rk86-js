<script lang="ts">
    import type { Memory } from "$lib/core/rk86_memory";

    let {
        memory,
        ongotodata,
        ongotocode,
    }: {
        memory: Memory;
        ongotodata?: (addr: number) => void;
        ongotocode?: (addr: number) => void;
    } = $props();

    let canvas: HTMLCanvasElement | null = $state(null);
    let hoverAddr: number | null = $state(null);

    const hex = (v: number, w: number) => v.toString(16).toUpperCase().padStart(w, "0");

    const MONITOR_ROM_BASE = 0xf800;
    const MONITOR_ROM_END = 0x10000;

    function regionOf(addr: number): string | null {
        const vbase = memory.video_memory_base;
        const vsize = memory.video_memory_size;
        if (vsize > 0 && addr >= vbase && addr < vbase + vsize) return "видеопамять";
        if (addr >= MONITOR_ROM_BASE && addr < MONITOR_ROM_END) return "ROM монитора";
        return null;
    }

    export function refresh() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = ctx.createImageData(256, 256);
        const data = img.data;
        const vbase = memory.video_memory_base;
        const vsize = memory.video_memory_size;
        const vend = vbase + vsize;
        for (let addr = 0; addr < 0x10000; addr++) {
            const v = memory.read_raw(addr) & 0xff;
            const hi = v >> 4;
            const lo = v & 0x0f;
            const i = addr * 4;
            if (vsize > 0 && addr >= vbase && addr < vend) {
                // Видеопамять — зелёный оттенок, яркость по значению байта.
                data[i] = lo * 4;
                data[i + 1] = 80 + (v >> 1);
                data[i + 2] = hi * 4;
            } else {
                data[i] = hi * 17;
                data[i + 1] = lo * 17;
                data[i + 2] = v;
            }
            data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    $effect(() => {
        if (canvas) refresh();
    });

    function eventAddr(e: MouseEvent): number | null {
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * 256);
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * 256);
        if (x < 0 || x > 255 || y < 0 || y > 255) return null;
        return ((y & 0xff) << 8) | (x & 0xff);
    }

    function onClick(e: MouseEvent) {
        const addr = eventAddr(e);
        if (addr !== null) ongotodata?.(addr);
    }

    function onContextMenu(e: MouseEvent) {
        e.preventDefault();
        const addr = eventAddr(e);
        if (addr !== null) ongotocode?.(addr);
    }

    function onMove(e: MouseEvent) {
        hoverAddr = eventAddr(e);
    }

    function onLeave() {
        hoverAddr = null;
    }
</script>

<div class="mem-map-wrap">
    <div class="label">
        <button type="button" class="refresh" onclick={refresh} title="Обновить карту памяти">Карта памяти</button>
        {#if hoverAddr !== null}
            {@const region = regionOf(hoverAddr)}
            {#if region}
                <span class="region">— {region}</span>
            {/if}
        {/if}
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <canvas
        bind:this={canvas}
        class="mem-map"
        width="256"
        height="256"
        title="Карта памяти (256×256, пиксель = байт) — левый клик: данные, правый клик: код"
        onclick={onClick}
        oncontextmenu={onContextMenu}
        onmousemove={onMove}
        onmouseleave={onLeave}
    ></canvas>
    <div class="readout">
        {#if hoverAddr !== null}
            {@const base = (hoverAddr - 5 + 0x10000) & 0xffff}
            <span>{hex(base, 4)}:</span>
            {#each Array(11) as _, i}
                <span class:hl={i === 5}>{hex(memory.read_raw((base + i) & 0xffff) & 0xff, 2)}</span>
            {/each}
        {:else}
            &nbsp;
        {/if}
    </div>
</div>

<style>
    .mem-map-wrap {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
    }
    .label {
        font-family: monospace;
        font-size: small;
        color: #888;
    }
    .label .refresh {
        all: unset;
        cursor: pointer;
        color: inherit;
    }
    .label .refresh:hover {
        color: #ddd;
    }
    canvas.mem-map {
        width: 256px;
        height: 256px;
        image-rendering: pixelated;
        border: 1px solid #444;
        background-color: #000;
        cursor: crosshair;
    }
    .readout {
        font-family: monospace;
        font-size: small;
        color: #ddd;
        height: 1.2em;
        display: flex;
        gap: 4px;
    }
    .readout .hl {
        color: #ffcc00;
        font-weight: bold;
    }
    .label .region {
        color: #66dd88;
    }
</style>
