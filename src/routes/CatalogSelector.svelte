<script lang="ts">
    import { resolve, base } from "$app/paths";
    import { tape_catalog } from "$lib/tape_catalog";
    import { catalog } from "$lib/catalog_data";
    import { parse_rk86_binary, file_ext } from "$lib/core/rk86_file_parser.js";
    import { emit_rk86_binary, replace_ext, RK86_EXTENSIONS } from "$lib/core/rk86_file_emit.js";
    import { onMount } from "svelte";

    let {
        onrun,
        onload,
        ondebug,
        onclose,
    }: {
        onrun: (name: string) => void;
        onload: (name: string) => void;
        ondebug: (name: string, entry: number) => void;
        onclose: () => void;
    } = $props();

    const files = tape_catalog();
    const byName = new Map(catalog.map((e) => [e.name, e]));

    const RECENT_KEY = "rk86:catalog:recent-files";
    const RECENT_FIRST_KEY = "rk86:catalog:recent-first";
    const RECENT_CAP = 30;

    function loadRecents(): string[] {
        try {
            const raw = localStorage.getItem(RECENT_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
        } catch {
            return [];
        }
    }

    function loadRecentFirst(): boolean {
        const v = localStorage.getItem(RECENT_FIRST_KEY);
        return v === null ? true : v === "1";
    }

    let recents = $state<string[]>([]);
    let recentFirst = $state(true);

    function pushRecent(name: string) {
        const next = [name, ...recents.filter((n) => n !== name)].slice(0, RECENT_CAP);
        recents = next;
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {}
    }

    $effect(() => {
        try {
            localStorage.setItem(RECENT_FIRST_KEY, recentFirst ? "1" : "0");
        } catch {}
    });

    let selectedIndex = $state(0);
    let filter = $state("");
    let filterInput = $state<HTMLInputElement>();

    onMount(() => {
        recents = loadRecents();
        recentFirst = loadRecentFirst();
        filterInput?.focus();
    });

    export function focus() {
        filterInput?.focus();
    }

    const ordered = $derived.by(() => {
        if (!recentFirst) return files;
        const fileSet = new Set(files);
        const recentInFiles = recents.filter((n) => fileSet.has(n));
        const recentSet = new Set(recentInFiles);
        const rest = files.filter((n) => !recentSet.has(n));
        return [...recentInFiles, ...rest];
    });

    const recentCount = $derived(
        recentFirst ? ordered.findIndex((n) => !recents.includes(n)) : -1,
    );

    const filtered = $derived.by(() => {
        if (!filter) return ordered;
        const q = filter.toLowerCase();
        return ordered.filter((name) => {
            if (name.toLowerCase().includes(q)) return true;
            const e = byName.get(name);
            if (!e) return false;
            return (
                e.title.toLowerCase().includes(q) ||
                e.description.toLowerCase().includes(q)
            );
        });
    });

    const recentSetForFiltered = $derived(new Set(recentFirst ? recents : []));

    const selectedName = $derived(filtered[selectedIndex]);
    const selectedEntry = $derived(selectedName ? byName.get(selectedName) : undefined);

    const selectedExt = $derived(selectedName ? file_ext(selectedName).toLowerCase() : "");

    let downloadExt = $state("");
    $effect(() => {
        downloadExt = selectedExt;
    });

    const hex4 = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");

    async function downloadAs(name: string, targetExt: string) {
        const sourceExt = file_ext(name).toLowerCase();
        const outName = replace_ext(name, targetExt);
        if (targetExt === sourceExt) {
            triggerDownload(`${base}/files/${name}`, outName);
            return;
        }
        const response = await fetch(`${base}/files/${name}`);
        const buf = await response.arrayBuffer();
        const file = parse_rk86_binary(name, Array.from(new Uint8Array(buf)));
        const bytes = emit_rk86_binary(targetExt, file.start, file.end, file.image);
        const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/octet-stream" }));
        triggerDownload(url, outName);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function triggerDownload(href: string, name: string) {
        const a = document.createElement("a");
        a.href = href;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function handleKeydown(e: KeyboardEvent) {
        e.stopPropagation();
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
                break;
            case "ArrowUp":
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                break;
            case "Enter":
                e.preventDefault();
                if (filtered[selectedIndex]) {
                    runFile(filtered[selectedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                onclose();
                break;
        }
    }

    function runFile(name: string) {
        pushRecent(name);
        onrun(name);
    }

    function loadFile(name: string) {
        pushRecent(name);
        onload(name);
    }

    function debugFile(name: string, entry: number) {
        pushRecent(name);
        ondebug(name, entry);
    }

    let list = $state<HTMLDivElement>();

    $effect(() => {
        filter;
        selectedIndex = 0;
    });

    $effect(() => {
        const el = list?.querySelector(
            `[data-index="${selectedIndex}"]`,
        ) as HTMLElement | null;
        el?.scrollIntoView({ block: "nearest" });
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="catalog" onkeydown={handleKeydown}>
    <div class="toolbar">
        <!-- svelte-ignore a11y_autofocus -->
        <input
            class="filter"
            type="text"
            placeholder="Фильтр..."
            bind:value={filter}
            bind:this={filterInput}
        />
        <label class="recent-toggle" title="Показывать недавно загруженные первыми">
            <input type="checkbox" bind:checked={recentFirst} />
            Недавние первыми
        </label>
    </div>
    <div class="body">
        <div class="list" bind:this={list} role="listbox">
            {#each filtered as name, i}
                {#if !filter && recentFirst && recentCount > 0 && i === recentCount}
                    <div class="divider" aria-hidden="true"></div>
                {/if}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                    class="item"
                    class:selected={i === selectedIndex}
                    class:recent={recentSetForFiltered.has(name)}
                    data-index={i}
                    onmouseenter={() => (selectedIndex = i)}
                    onclick={() => runFile(name)}
                    role="option"
                    aria-selected={i === selectedIndex}
                    tabindex="-1"
                >
                    {name}
                </div>
            {/each}
        </div>
        <div class="info">
            {#if selectedName}
                <div class="actions">
                    <button type="button" class="run-button" onclick={() => runFile(selectedName)}>Запустить</button>
                    <button type="button" class="load-button" onclick={() => loadFile(selectedName)}>Загрузить</button>
                    {#if selectedEntry}
                        <button type="button" class="debug-button" onclick={() => debugFile(selectedName, selectedEntry.entry)}>Отладка</button>
                    {/if}
                    <button type="button" class="download-button" onclick={() => downloadAs(selectedName, downloadExt)}>Скачать</button>
                    <select class="format-select" bind:value={downloadExt} title="Формат файла">
                        {#each RK86_EXTENSIONS as ext}
                            <option value={ext}>.{ext}</option>
                        {/each}
                    </select>
                </div>
            {/if}
            {#if selectedEntry}
                <h2>{@html selectedEntry.title}</h2>
                {#if selectedEntry.description}
                    <p class="description">{@html selectedEntry.description}</p>
                {/if}
                <table class="meta">
                    <tbody>
                        <tr><td>Файл:</td><td>{selectedEntry.name}</td></tr>
                        <tr><td>Адреса и длина:</td><td>{hex4(selectedEntry.start)}—{hex4(selectedEntry.end)}, {hex4(selectedEntry.size)}</td></tr>
                        <tr><td>Стартовый адрес:</td><td>{hex4(selectedEntry.entry)}</td></tr>
                        <tr><td>Контрольная сумма:</td><td>{hex4(selectedEntry.checkSum)}</td></tr>
                        <tr><td>Маркер E6:</td><td>{selectedEntry.leadingE6 ? "есть" : "нет"}</td></tr>
                    </tbody>
                </table>
                {#if selectedEntry.screenshots.length > 0}
                    <div class="screens">
                        {#each selectedEntry.screenshots as screenshot}
                            <img
                                class="screen"
                                src="{resolve('/catalog')}/{selectedEntry.name}/{screenshot}"
                                alt="{selectedEntry.name} скриншот"
                                loading="lazy"
                            />
                        {/each}
                    </div>
                {/if}
            {:else if selectedName}
                <h2>{selectedName}</h2>
                <p class="dimmed">Нет информации</p>
            {/if}
        </div>
    </div>
</div>

<style>
    .catalog {
        display: flex;
        flex-direction: column;
        width: 80vw;
        height: 70vh;
        overflow: hidden;
    }
    .toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
    }
    .filter {
        flex: 1;
        background: #444;
        color: white;
        border: 1px solid #666;
        padding: 6px 10px;
        font-size: 1em;
        outline: none;
        border-radius: 4px;
    }
    .recent-toggle {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #ccc;
        font-size: 0.9em;
        cursor: pointer;
        white-space: nowrap;
    }
    .recent-toggle input {
        margin: 0;
        cursor: pointer;
    }
    .divider {
        border-top: 1px solid #555;
        margin: 4px 0;
    }
    .item.recent {
        color: #cfc;
    }
    .filter::placeholder {
        color: #999;
    }
    .body {
        display: flex;
        flex: 1;
        gap: 12px;
        min-height: 0;
    }
    .list {
        flex: 0 0 14em;
        overflow-y: auto;
        align-content: start;
    }
    .item {
        padding: 4px 8px;
        cursor: pointer;
        white-space: nowrap;
        line-height: 1.4;
    }
    .item.selected {
        background-color: #555;
        outline: 1px solid #888;
    }
    .info {
        flex: 1;
        overflow-y: auto;
        padding-left: 12px;
        border-left: 1px solid #444;
        min-width: 0;
    }
    .info h2 {
        margin: 0 0 0.3em 0;
        font-size: 1.1em;
    }
    .description {
        margin: 0.3em 0;
        font-size: 0.9em;
        color: #ccc;
    }
    .meta {
        font-size: 0.85em;
        margin: 0.5em 0;
        border-collapse: collapse;
    }
    .meta td {
        padding: 1px 0;
    }
    .meta td:first-child {
        color: #888;
        padding-right: 0.5em;
    }
    .screens {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 0.5em;
    }
    .screen {
        height: 200px;
        width: auto;
        border-radius: 4px;
    }
    .dimmed {
        color: #888;
    }
    .actions {
        display: flex;
        gap: 8px;
        margin-bottom: 0.5em;
    }
    .run-button,
    .load-button,
    .download-button,
    .debug-button {
        padding: 4px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        color: white;
        font-family: inherit;
        text-decoration: none;
        display: inline-block;
        line-height: normal;
    }
    .run-button {
        background: #4a9;
    }
    .run-button:hover {
        background: #5ba;
    }
    .load-button {
        background: #68b;
    }
    .load-button:hover {
        background: #79c;
    }
    .download-button {
        background: #888;
    }
    .download-button:hover {
        background: #999;
    }
    .format-select {
        background: #444;
        color: white;
        border: 1px solid #666;
        border-radius: 4px;
        padding: 3px 6px;
        font-size: 0.9em;
        font-family: inherit;
        cursor: pointer;
        margin-left: -4px;
    }
    .debug-button {
        background: #b85;
    }
    .debug-button:hover {
        background: #c96;
    }
</style>
