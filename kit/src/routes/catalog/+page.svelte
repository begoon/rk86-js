<script lang="ts">
    import { resolve } from "$app/paths";
    import { catalog } from "$lib/catalog_data";

    let filter = $state("игра");

    const filtered = $derived(
        filter.length < 2
            ? catalog
            : catalog.filter(
                  (e) =>
                      e.name.toLowerCase().includes(filter.toLowerCase()) ||
                      e.title.toLowerCase().includes(filter.toLowerCase()) ||
                      e.description.toLowerCase().includes(filter.toLowerCase()),
              ),
    );

    const quickFilters = ["игра", "бейсик", "тетрис", "xonix", "ассемблер", "микрон", "тест"];

    let zoomImages = $state<string[]>([]);
    let zoomIndex = $state(0);

    function openZoom(entry: (typeof catalog)[0], index: number) {
        zoomImages = entry.screenshots.map((s) => `${resolve('/catalog')}/${entry.name}/${s}`);
        zoomIndex = index;
    }

    function closeZoom() {
        zoomImages = [];
    }

    function zoomNav(dir: number) {
        if (zoomImages.length === 0) return;
        zoomIndex = (zoomIndex + dir + zoomImages.length) % zoomImages.length;
    }

    let overlayEl = $state<HTMLDivElement>();
    $effect(() => { if (zoomImages.length > 0) overlayEl?.focus(); });
</script>

<main>
    <h1>Каталог программ для Радио-86РК</h1>
    <div class="search-bar">
        <!-- svelte-ignore a11y_autofocus -->
        <input type="text" placeholder="Поиск..." bind:value={filter} autofocus />
        <span class="quick-filters">
            {#each quickFilters as qf}
                <button type="button" class="filter-btn" class:active={filter === qf} onclick={() => (filter = filter === qf ? "" : qf)}
                    >{qf}</button
                >
            {/each}
        </span>
    </div>
    <p class="dimmed">
        Найдено: {filtered.length} из {catalog.length}
    </p>

    {#each filtered as entry}
        <div class="card">
            <div class="card-info">
                <h2>{@html entry.title}</h2>
                {#if entry.description}
                    <p class="description">{@html entry.description}</p>
                {/if}
                <hr />
                <table class="meta">
                    <tbody>
                        <tr><td>Файл:</td><td>{entry.name}</td></tr>
                    </tbody>
                </table>
                <div class="actions">
                    <a class="run-btn" href="{resolve('/')}?run={entry.name}">Запустить</a>
                    <a class="load-btn" href="{resolve('/')}?load={entry.name}">Загрузить</a>
                </div>
            </div>
            <div class="card-screens">
                {#if entry.screenshots.length > 0}
                    {#each entry.screenshots as screenshot, si}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <img
                            class="screen"
                            src="{resolve('/catalog')}/{entry.name}/{screenshot}"
                            alt="{entry.name} скриншот"
                            loading="lazy"
                            onclick={() => openZoom(entry, si)}
                        />
                    {/each}
                {:else}
                    <span class="dimmed">Нет скриншотов</span>
                {/if}
            </div>
        </div>
    {/each}
</main>

{#if zoomImages.length > 0}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="overlay"
        bind:this={overlayEl}
        onclick={closeZoom}
        onkeydown={(e) => {
            if (e.key === "Escape") closeZoom();
            else if (e.key === "ArrowLeft") zoomNav(-1);
            else if (e.key === "ArrowRight") zoomNav(1);
        }}
        tabindex="-1"
        role="dialog"
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <img src={zoomImages[zoomIndex]} alt="Увеличенный скриншот" onclick={(e) => { e.stopPropagation(); zoomNav(1); }} />
        {#if zoomImages.length > 1}
            <div class="zoom-counter">{zoomIndex + 1} / {zoomImages.length}</div>
        {/if}
    </div>
{/if}

<style>
    :global(body) {
        background-color: white;
        color: #333;
    }
    main {
        max-width: 1000px;
        margin: 0 auto;
        padding: 1em;
        font-family: sans-serif;
        color: #333;
    }
    h1 {
        margin-bottom: 0.5em;
    }
    .search-bar {
        display: flex;
        align-items: center;
        gap: 1em;
        flex-wrap: wrap;
    }
    .search-bar input {
        padding: 6px 12px;
        font-size: 1em;
        border: 1px solid #ccc;
        border-radius: 4px;
        width: 20em;
    }
    .quick-filters {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }
    .filter-btn {
        background: #eee;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 0.85em;
    }
    .filter-btn.active {
        background: #333;
        color: white;
    }
    .dimmed {
        color: #999;
        font-size: 0.85em;
    }
    .card {
        display: flex;
        gap: 1em;
        background: #eee;
        border-radius: 12px;
        padding: 1em;
        margin-bottom: 1em;
    }
    .card:hover {
        background: #ddd;
    }
    .card-info {
        flex: 1;
        min-width: 0;
    }
    .card-info h2 {
        margin: 0 0 0.3em 0;
        font-size: 1.1em;
    }
    .description {
        margin: 0.3em 0;
        font-size: 0.9em;
        color: #555;
    }
    hr {
        border: none;
        border-top: 1px solid #ccc;
        margin: 0.5em 0;
    }
    .meta {
        font-size: 0.85em;
    }
    .meta td:first-child {
        color: #888;
        padding-right: 0.5em;
    }
    .actions {
        margin-top: 0.5em;
        display: flex;
        gap: 8px;
    }
    .run-btn,
    .load-btn {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 4px;
        text-decoration: none;
        font-size: 0.85em;
    }
    .run-btn {
        background: #4a9;
        color: white;
    }
    .load-btn {
        background: #68b;
        color: white;
    }
    .card-screens {
        display: grid;
        grid-template-columns: repeat(2, auto);
        gap: 4px;
        justify-content: start;
        align-items: start;
    }
    .screen {
        height: 150px;
        width: auto;
        border-radius: 4px;
        cursor: pointer;
    }
    .screen:hover {
        outline: 2px solid #333;
    }
    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        cursor: pointer;
    }
    .overlay img {
        max-width: 90vw;
        max-height: 90vh;
        cursor: pointer;
    }
    .zoom-counter {
        position: absolute;
        bottom: 1em;
        color: white;
        opacity: 0.6;
        font-size: 0.9em;
    }
</style>
