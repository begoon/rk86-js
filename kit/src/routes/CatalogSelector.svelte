<script lang="ts">
    import { tape_catalog } from "$lib/tape_catalog";

    let { onselect, onclose }: { onselect: (name: string) => void; onclose: () => void } = $props();

    const files = tape_catalog();
    let selectedIndex = $state(0);
    let filter = $state("");
    let filterInput = $state<HTMLInputElement>();

    import { onMount } from "svelte";
    onMount(() => filterInput?.focus());

    export function focus() {
        filterInput?.focus();
    }

    const filtered = $derived(
        filter ? files.filter((f) => f.toLowerCase().includes(filter.toLowerCase())) : files,
    );

    function handleKeydown(e: KeyboardEvent) {
        e.stopPropagation();
        const cols = getComputedStyle(grid!).gridTemplateColumns.split(" ").length;
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + cols, filtered.length - 1);
                break;
            case "ArrowUp":
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - cols, 0);
                break;
            case "ArrowRight":
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
                break;
            case "ArrowLeft":
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                break;
            case "Enter":
                e.preventDefault();
                if (filtered[selectedIndex]) {
                    onselect(filtered[selectedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                onclose();
                break;
        }
    }

    let grid = $state<HTMLDivElement>();

    $effect(() => {
        // reset selection when filter changes
        filter;
        selectedIndex = 0;
    });

    $effect(() => {
        // scroll selected item into view
        const el = grid?.children[selectedIndex] as HTMLElement | undefined;
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
    <div class="grid" bind:this={grid} role="listbox">
        {#each filtered as name, i}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
                class="item"
                class:selected={i === selectedIndex}
                onmouseenter={() => (selectedIndex = i)}
                onclick={() => onselect(name)}
                role="option"
                aria-selected={i === selectedIndex}
                tabindex="-1"
            >
                {name}
            </div>
        {/each}
    </div>
</div>

<style>
    .catalog {
        display: flex;
        flex-direction: column;
        width: 70vw;
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
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, 12em);
        align-content: start;
        overflow-y: auto;
        flex: 1;
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
</style>
