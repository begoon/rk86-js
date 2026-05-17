<script lang="ts">
    import { onMount } from "svelte";
    import { saveAs } from "$lib/web/saver";

    export type FreezeEntry = {
        id: string;
        createdAt: number;
        fileName: string;
        thumbnail: string;
        snapshot: string;
    };

    let {
        freezes,
        onselect,
        ondelete,
        onclose,
    }: {
        freezes: FreezeEntry[];
        onselect: (id: string) => void;
        ondelete: (id: string) => void;
        onclose: () => void;
    } = $props();

    let selectedIndex = $state(0);
    let listElement = $state<HTMLDivElement>();

    onMount(() => listElement?.focus());

    export function focus() {
        listElement?.focus();
    }

    function handleKeydown(e: KeyboardEvent) {
        e.stopPropagation();
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, freezes.length - 1);
                break;
            case "ArrowUp":
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                break;
            case "Home":
                e.preventDefault();
                selectedIndex = 0;
                break;
            case "End":
                e.preventDefault();
                selectedIndex = freezes.length - 1;
                break;
            case "Enter":
                e.preventDefault();
                if (freezes[selectedIndex]) onselect(freezes[selectedIndex].id);
                break;
            case "d":
            case "D":
                e.preventDefault();
                if (freezes[selectedIndex]) {
                    const removedAt = selectedIndex;
                    ondelete(freezes[selectedIndex].id);
                    if (removedAt >= freezes.length - 1) {
                        selectedIndex = Math.max(0, freezes.length - 2);
                    }
                }
                break;
            case "s":
            case "S":
                e.preventDefault();
                if (freezes[selectedIndex]) downloadFreeze(freezes[selectedIndex]);
                break;
            case "Escape":
                e.preventDefault();
                onclose();
                break;
        }
    }

    $effect(() => {
        // clamp when list shrinks
        if (selectedIndex > freezes.length - 1) {
            selectedIndex = Math.max(0, freezes.length - 1);
        }
    });

    $effect(() => {
        const el = listElement?.children[selectedIndex] as HTMLElement | undefined;
        el?.scrollIntoView({ block: "nearest" });
    });

    function formatTime(ts: number): string {
        const d = new Date(ts);
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    function formatRelative(ts: number): string {
        const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
        if (seconds < 60) return `${seconds} сек назад`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} мин назад`;
        const hours = Math.floor(minutes / 60);
        return `${hours} ч ${minutes % 60} мин назад`;
    }

    function timestampForFilename(ts: number): string {
        const d = new Date(ts);
        const pad = (n: number) => n.toString().padStart(2, "0");
        return (
            `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
            `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
        );
    }

    function downloadFreeze(freeze: FreezeEntry) {
        const base = freeze.fileName ? freeze.fileName : "rk86-snapshot";
        const filename = `${base}-${timestampForFilename(freeze.createdAt)}.json`;
        const blob = new Blob([freeze.snapshot], { type: "application/json" });
        saveAs(blob, filename);
    }
</script>

<div class="freeze-selector">
    <div class="header">
        <span class="title">Восстановить состояние</span>
        <span class="hint">↑↓ выбор · Enter применить · S скачать · D удалить · Esc отмена</span>
    </div>
    {#if freezes.length === 0}
        <div class="empty">Нет сохранённых состояний</div>
    {:else}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="list"
            bind:this={listElement}
            onkeydown={handleKeydown}
            tabindex="0"
            role="listbox"
        >
            {#each freezes as freeze, i (freeze.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                    class="item"
                    class:selected={i === selectedIndex}
                    onmouseenter={() => (selectedIndex = i)}
                    onclick={() => onselect(freeze.id)}
                    role="option"
                    aria-selected={i === selectedIndex}
                    tabindex="-1"
                >
                    <img class="thumb" src={freeze.thumbnail} alt="скриншот состояния" />
                    <div class="meta">
                        <div class="time">{formatTime(freeze.createdAt)}</div>
                        <div class="relative">{formatRelative(freeze.createdAt)}</div>
                        <div class="file" class:empty={!freeze.fileName}>
                            {freeze.fileName || "(нет файла)"}
                        </div>
                    </div>
                    <div class="actions">
                        <button
                            type="button"
                            class="action download"
                            title="Скачать снимок"
                            tabindex="-1"
                            onclick={(e) => {
                                e.stopPropagation();
                                downloadFreeze(freeze);
                            }}>↓</button
                        >
                        <button
                            type="button"
                            class="action delete"
                            title="Удалить"
                            tabindex="-1"
                            onclick={(e) => {
                                e.stopPropagation();
                                ondelete(freeze.id);
                            }}>✕</button
                        >
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .freeze-selector {
        display: flex;
        flex-direction: column;
        width: 60vw;
        max-width: 720px;
        height: 70vh;
        overflow: hidden;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 0 4px 8px;
        gap: 12px;
    }
    .title {
        font-weight: bold;
        font-size: 1.1em;
    }
    .hint {
        color: #999;
        font-size: 0.8em;
        font-family: monospace;
    }
    .empty {
        color: #888;
        text-align: center;
        padding: 32px 0;
    }
    .list {
        flex: 1;
        overflow-y: auto;
        outline: none;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 12px;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 4px;
        border: 1px solid transparent;
    }
    .item.selected {
        background-color: #3a3a3a;
        border-color: #888;
    }
    .thumb {
        width: 156px;
        height: 100px;
        object-fit: contain;
        background: #000;
        image-rendering: pixelated;
        border: 1px solid #444;
    }
    .meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-family: monospace;
        min-width: 0;
    }
    .time {
        font-size: 1.1em;
        color: white;
    }
    .relative {
        font-size: 0.85em;
        color: #aaa;
    }
    .file {
        font-size: 0.85em;
        color: #ffcc00;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .file.empty {
        color: #777;
        font-style: italic;
    }
    .actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .action {
        all: unset;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #888;
        font-family: monospace;
        cursor: pointer;
        border-radius: 4px;
    }
    .action.download:hover {
        color: white;
        background-color: #36a;
    }
    .action.delete:hover {
        color: white;
        background-color: #a33;
    }
</style>
