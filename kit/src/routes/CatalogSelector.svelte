<script lang="ts">
    import { resolve } from "$app/paths";
    import { tape_catalog } from "$lib/tape_catalog";
    import { catalog } from "$lib/catalog_data";
    import { onMount } from "svelte";

    let {
        onrun,
        onload,
        onclose,
    }: {
        onrun: (name: string) => void;
        onload: (name: string) => void;
        onclose: () => void;
    } = $props();

    const files = tape_catalog();
    const byName = new Map(catalog.map((e) => [e.name, e]));

    let selectedIndex = $state(0);
    let filter = $state("");
    let filterInput = $state<HTMLInputElement>();

    onMount(() => filterInput?.focus());

    export function focus() {
        filterInput?.focus();
    }

    const filtered = $derived.by(() => {
        if (!filter) return files;
        const q = filter.toLowerCase();
        return files.filter((name) => {
            if (name.toLowerCase().includes(q)) return true;
            const e = byName.get(name);
            if (!e) return false;
            return (
                e.title.toLowerCase().includes(q) ||
                e.description.toLowerCase().includes(q)
            );
        });
    });

    const selectedName = $derived(filtered[selectedIndex]);
    const selectedEntry = $derived(selectedName ? byName.get(selectedName) : undefined);

    const hex4 = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");

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
                    onrun(filtered[selectedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                onclose();
                break;
        }
    }

    let list = $state<HTMLDivElement>();

    $effect(() => {
        filter;
        selectedIndex = 0;
    });

    $effect(() => {
        const el = list?.children[selectedIndex] as HTMLElement | undefined;
        el?.scrollIntoView({ block: "nearest" });
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="catalog" onkeydown={handleKeydown}>
    <!-- svelte-ignore a11y_autofocus -->
    <input
        class="filter"
        type="text"
        placeholder="Фильтр..."
        bind:value={filter}
        bind:this={filterInput}
    />
    <div class="body">
        <div class="list" bind:this={list} role="listbox">
            {#each filtered as name, i}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                    class="item"
                    class:selected={i === selectedIndex}
                    onmouseenter={() => (selectedIndex = i)}
                    onclick={() => onrun(name)}
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
                    <button type="button" class="run-button" onclick={() => onrun(selectedName)}>Запустить</button>
                    <button type="button" class="load-button" onclick={() => onload(selectedName)}>Загрузить</button>
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
    .filter {
        background: #444;
        color: white;
        border: 1px solid #666;
        padding: 6px 10px;
        font-size: 1em;
        outline: none;
        margin-bottom: 8px;
        border-radius: 4px;
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
    .load-button {
        padding: 4px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        color: white;
        font-family: inherit;
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
</style>
