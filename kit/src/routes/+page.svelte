<script lang="ts">
    import { type Machine } from "$lib/core/rk86_machine";

    let shortcutsDialog = $state<HTMLDialogElement>();
    let hintText = $state("");

    import { asset, resolve } from "$app/paths";
    import { version } from "$lib/rk86_version";
    import { main as boot, type HostCallbacks } from "$lib/web/boot";
    import Debugger from "$lib/core/rk86_debugger";
    import CatalogSelector from "./CatalogSelector.svelte";
    import Disassembler from "./Disassembler.svelte";
    import Keyboard from "./Keyboard.svelte";
    import Terminal from "./Terminal.svelte";
    import { ui } from "./state.svelte";
    import Visualizer from "./Visualizer.svelte";

    let keyboardVisible = $state(false);
    let catalogDialog = $state<HTMLDialogElement>();
    let catalogSelector = $state<CatalogSelector>();

    function openCatalog() {
        catalogDialog?.showModal();
        setTimeout(() => catalogSelector?.focus(), 0);
    }
    let uploadInput = $state<HTMLInputElement>();

    let canvas = $state<HTMLCanvasElement>();

    let machine = $state<Machine>();
    let emulatorKeyDown: ((code: string) => void) | undefined;
    let emulatorKeyUp: ((code: string) => void) | undefined;

    $effect(() => {
        if (!canvas) return;
        const host: HostCallbacks = {
            canvas,
            onkeydown: (h) => (emulatorKeyDown = h),
            onkeyup: (h) => (emulatorKeyUp = h),
        };
        boot(host).then((m) => {
            if (!m) {
                console.error("ошибка при инициализации эмулятора");
                return;
            }
            m.ui.on_visualizer_hit = (opcode: number) => {
                ui.visualizerOpcode = opcode;
            };
            m.ui.on_pause_changed = (value: boolean) => {
                paused = value;
            };
            m.ui.terminal = {
                put: (str: string) => terminal?.put(str),
                get history() {
                    if (!terminal) return [];
                    return terminal.currentHistory();
                },
            };
            m.ui.refreshDebugger = () => {
                disassemblerRef?.goCodePC();
            };
            machine = m;
            dbg = new Debugger(machine);
        });
    });

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            canvas?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    function togglePaused() {
        paused = !paused;
        machine?.pause(paused);
    }

    function openAssembler() {
        window.open(asset("/asm/"), "_blank", "noopener");
    }

    function toggleVisualizer() {
        visualizerVisible = !visualizerVisible;
        if (machine) machine.ui.visualizer_visible = visualizerVisible;
    }

    function toggleDebugger() {
        if (debuggerVisible && canvas && canvasPlaceholder) {
            canvasPlaceholder.appendChild(canvas);
        }
        debuggerVisible = !debuggerVisible;
        if (debuggerVisible) setTimeout(() => terminal?.focus(), 0);
    }

    const shortcuts: Record<string, () => void> = {
        f: toggleFullscreen,
        c: () => machine?.reset(),
        r: () => machine?.restart(),
        p: togglePaused,
        s: toggleSound,
        a: openAssembler,
        v: toggleVisualizer,
        d: toggleDebugger,
        b: () => (keyboardVisible = !keyboardVisible),
        l: () => openCatalog(),
        o: () => window.open(resolve("/catalog"), "_blank"),
        u: () => uploadInput?.click(),
        g: () => machine?.runLoadedFile(),
        w: () => machine?.ui.emulator_snapshot(),
    };

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (shortcutsDialog?.open) {
                shortcutsDialog.close();
            } else {
                shortcutsDialog?.showModal();
            }
            return;
        }
        if (shortcutsDialog?.open) {
            const action = shortcuts[e.key];
            if (action) {
                e.preventDefault();
                shortcutsDialog.close();
                action();
            }
            return;
        }
        if (catalogDialog?.open) return;
        if (debuggerVisible && !canvasFocused) return;
        emulatorKeyDown?.(e.code);
    }

    function onKeyUp(e: KeyboardEvent) {
        if (catalogDialog?.open) return;
        if (debuggerVisible && !canvasFocused) return;
        emulatorKeyUp?.(e.code);
    }

    let paused = $state(false);
    let fullscreen = $state(false);

    let visualizerVisible = $state(false);
    let debuggerVisible = $state(false);
    let disassemblerRef = $state<Disassembler>();
    let canvasFocused = $state(false);
    let lastDataAddr = $state("0000");
    let debuggerCanvasSlot = $state<HTMLDivElement>();
    let canvasPlaceholder = $state<HTMLDivElement>();

    $effect(() => {
        if (canvas && debuggerVisible && debuggerCanvasSlot) {
            debuggerCanvasSlot.appendChild(canvas);
        }
    });

    let terminal = $state<Terminal>();

    let dbg: Debugger;

    let soundEnabled = $state(false);
    let soundImageVisible = $state(false);
    let soundImageTimeout: ReturnType<typeof setTimeout>;

    function toggleSound() {
        soundEnabled = !soundEnabled;
        machine?.runner.init_sound(soundEnabled);
        soundImageVisible = true;
        clearTimeout(soundImageTimeout);
        soundImageTimeout = setTimeout(() => (soundImageVisible = false), 2000);
    }

    let mainElement = $state<HTMLElement>();
    $effect(() => {
        if (mainElement) {
            mainElement.querySelectorAll("button.icon, a.icon").forEach((el) => {
                (el as HTMLElement).tabIndex = -1;
            });
        }
    });
</script>

<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} />
<svelte:document on:fullscreenchange={() => (fullscreen = Boolean(document.fullscreenElement))} />

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<main
    bind:this={mainElement}
    onmouseover={(e) => {
        const button = (e.target as HTMLElement).closest("[data-text]") as HTMLElement | null;
        hintText = button?.dataset.text ?? "";
    }}
    onmouseout={(e) => {
        const button = (e.target as HTMLElement).closest("[data-text]") as HTMLElement | null;
        if (button) hintText = "";
    }}
>
    <div id="header" class={fullscreen ? "hidden" : ""}>
        <button class="icon" data-text="Сигнал RESET" onclick={() => machine?.reset()}>
            <img class="icon" src="i/reset.svg" alt="Сигнал RESET" />
        </button>
        <button class="icon" data-text="Перезапустить эмулятор" onclick={() => machine?.restart()}>
            <img class="icon" src="i/power-off.svg" alt="Перезапустить эмулятор" />
        </button>
        <button class="icon" data-text="Приостановить процессор" onclick={togglePaused}>
            {#if paused}
                <img class="icon" src="i/paused.svg" alt="Процессор приостановлен" />
            {:else}
                <img class="icon" src="i/pause.svg" alt="Приостановить процессор" />
            {/if}
        </button>
        <button class="icon" data-text="Полноэкранный режим" onclick={toggleFullscreen}>
            <img class="icon" src="i/fullscreen.svg" alt="Полноэкранный режим" />
        </button>
        <button
            type="button"
            class="icon"
            class:active={keyboardVisible}
            data-text="Клавиатура"
            onclick={() => (keyboardVisible = !keyboardVisible)}
        >
            <img class="icon" src="i/keyboard.svg" alt="Клавиатура" />
        </button>
        <button type="button" class="icon" data-text="Помощь" onclick={() => window.open("help.html", "_blank")}>
            <img class="icon" src="i/help.svg" alt="Помощь" />
        </button>
        <a href={resolve("/catalog")} class="icon" data-text="Каталог программ">
            <img class="icon" src="i/open-catalog.svg" alt="Каталог программ" />
        </a>
        <!-- Кнопки справа -->
        <div style="margin-left: auto; display: flex; align-items: center; gap: 4px">
            <button class="icon" data-text="Запись на ленту">
                {#if ui.tapeActivityActive}
                    {#if ui.tapeHighlight}
                        <img class="icon" src="i/tape-data.svg" alt="Данные ленты" />
                    {:else}
                        <img class="icon" src="i/tape-preamble.svg" alt="Преамбула ленты" />
                    {/if}
                {/if}
            </button>
            <button
                type="button"
                class="icon"
                data-text="Выбрать файл из каталога"
                onclick={() => openCatalog()}
            >
                <img class="icon" src="i/catalog.svg" alt="Выбрать файл из каталога" />
            </button>
            <input
                bind:this={uploadInput}
                style="display: none"
                type="file"
                onchange={async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) await machine?.uploadFile(file);
                    if (uploadInput) uploadInput.value = "";
                }}
            />
            <button type="button" class="icon" data-text="Загрузить внешний файл" onclick={() => uploadInput?.click()}>
                <img class="icon" src="i/upload.svg" alt="Загрузить внешний файл" />
            </button>
            <button type="button" class="icon" data-text="Запустить программу" onclick={() => machine?.runLoadedFile()}>
                <img class="icon" src="i/run.svg" alt="Запустить программу" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Ассемблер"
                onclick={openAssembler}
            >
                <img class="icon" src="i/asm.svg" alt="Ассемблер" />
            </button>
            <button
                type="button"
                class="icon"
                class:active={debuggerVisible}
                data-text="Отладчик"
                onclick={toggleDebugger}
            >
                <img class="icon" src="i/debug.svg" alt="Отладчик" />
            </button>
            <button
                type="button"
                class="icon"
                class:active={visualizerVisible}
                data-text="Визуализация"
                onclick={toggleVisualizer}
            >
                <img class="icon" src="i/visualizer.svg" alt="Визуализация" />
            </button>
            <button type="button" class="icon" data-text="Снимок экрана" onclick={() => machine?.ui.screenshot()}>
                <img class="icon" src="i/screenshot.svg" alt="Снимок экрана" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Сохранить память в файл"
                onclick={() => machine?.ui.memory_snapshot()}
            >
                <img class="icon" src="i/memory.svg" alt="Сохранить память в файл" />
            </button>
            <button
                type="button"
                class="icon"
                data-text="Сохранить полное состояние"
                onclick={() => machine?.ui.emulator_snapshot()}
            >
                <img class="icon" src="i/snapshot.svg" alt="Сохранить полное состояние" />
            </button>
            <button type="button" class="icon" data-text="Включить/выключить звук" onclick={toggleSound}>
                {#if soundEnabled}
                    <img class="icon" src="i/sound.svg" alt="Включить звук" />
                {:else}
                    <img class="icon" src="i/sound-muted.svg" alt="Выключить звук" />
                {/if}
            </button>
            <span id="sound_image" class={soundImageVisible ? "visible" : ""}>{soundEnabled ? "🔉" : "🔇"}</span>
            <button>
                <span
                    style="font-family: monospace; background: white; color: black; padding: 2px 4px; border-radius: 2px"
                    >{ui.rusLat ? "РУС" : "ЛАТ"}</span
                >
            </button>
        </div>
    </div>
    <div id="hint" style="opacity: {hintText ? 1 : 0}">{hintText}</div>
    {#if debuggerVisible && machine}
        <div class="debugger-layout">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="debugger-canvas-wrap"
                class:canvas-focused={canvasFocused}
                onclick={() => (canvasFocused = true)}
                data-text={canvasFocused ? "" : "Кликнуть для ввода"}
                bind:this={debuggerCanvasSlot}
            ></div>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="debugger-disasm" onclick={() => (canvasFocused = false)}>
                <Disassembler bind:this={disassemblerRef} memory={machine.memory} cpu={machine.cpu} pc={() => machine!.cpu.pc} initialDataAddr={lastDataAddr} ondatachange={(addr) => lastDataAddr = addr} />
            </div>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="debugger-terminal" onclick={() => { canvasFocused = false; terminal?.focus(); }}>
                <Terminal bind:this={terminal} onrun={(cmd) => dbg?.run(cmd)} />
            </div>
        </div>
    {/if}
    <div bind:this={canvasPlaceholder} class="canvas-placeholder" style={debuggerVisible ? "display: none" : ""}>
        <canvas bind:this={canvas}></canvas>
    </div>
    {#if visualizerVisible}
        <Visualizer onclose={toggleVisualizer} />
    {/if}
    <div id="footer" style="display: flex; gap: 10px" class={fullscreen ? "hidden" : ""}>
        <div class="gauge">
            <span class="dimmed">ИНСТР</span>
            <span>{Math.floor(ui.ips * 1000).toLocaleString()}</span>
        </div>
        <div class="gauge">
            <span class="dimmed">ТАКТ</span>
            <span>{Math.floor(ui.tps * 1000).toLocaleString()}</span>
        </div>
        <div class="gauge">
            <span class="dimmed">ЭКРАН</span>
            <span>{ui.videoMemoryBase.toString(16).toUpperCase()}</span>
        </div>
        <div class="gauge">
            <span class="dimmed">РАЗМЕР</span>
            <span>{ui.screenWidth}</span>
            <span class="dimmed">x</span>
            <span>{ui.screenHeight}</span>
        </div>
        <div class="gauge">
            <span class={ui.modifierUS ? "modifier_active" : "dimmed"}>УС</span>
            <span class={ui.modifierSS ? "modifier_active" : "dimmed"}>СС</span>
        </div>
        <div class="gauge">
            <span class="dimmed">ЛЕНТА</span>
            <span class={ui.tapeHighlight ? "tape_active" : ""}>{ui.tapeWrittenBytes.toString(16).toUpperCase().padStart(4, "0")}</span>
        </div>
        <div class="gauge">
            <span class="dimmed">ВЕРСИЯ</span>
            <span>{version}</span>
        </div>
        {#if ui.selectedFileName}
            <div class="gauge">
                <span class="dimmed">ФАЙЛ</span>
                <span>{ui.selectedFileName}</span>
                {#if ui.selectedFileSize}
                    <span class="dimmed">
                        {ui.selectedFileStart.toString(16).toUpperCase().padStart(4, "0")}-{ui.selectedFileEnd
                            .toString(16)
                            .toUpperCase()
                            .padStart(4, "0")}
                    </span>
                    <span>{ui.selectedFileSize.toString(16).toUpperCase().padStart(4, "0")}</span>
                {/if}
                <span class="dimmed">G{ui.selectedFileEntry.toString(16).toUpperCase().padStart(4, "0")}</span>
            </div>
        {/if}
        <button type="button" id="shortcut-hint" onclick={() => shortcutsDialog?.showModal()}>cmd/ctrl-k</button>
    </div>
</main>

<dialog
    id="shortcuts"
    bind:this={shortcutsDialog}
    onclick={(e) => {
        if (e.target === e.currentTarget) shortcutsDialog?.close();
    }}
    onclose={() => (document.activeElement as HTMLElement)?.blur()}
>
    <div>
        <h1 style="font-weight: bold">CMD-k + ...</h1>
        <style>
            mark {
                background-color: #ffcc00;
                color: black;
                padding: 2px 4px;
                border-radius: 4px;
            }
        </style>
        <div id="shortcuts-panel" style="display: grid; grid-template-columns: repeat(2, 1fr)">
            <style>
                #shortcuts-panel div {
                    padding: 4px;
                    white-space: nowrap;
                    text-align: left;
                    display: grid;
                    grid-template-columns: 2em auto;
                    gap: 0 0.5em;
                }
                #shortcuts-panel mark {
                    background-color: #ffcc00;
                    color: black;
                    padding: 2px 4px;
                    border-radius: 4px;
                    text-align: center;
                    margin-right: 4px;
                    text-transform: uppercase;
                }
            </style>
            <!-- --- -->
            <div><mark>l</mark> выбрать файл</div>
            <div><mark>o</mark> открыть каталог</div>
            <div><mark>u</mark> загрузить внешний файл</div>
            <div><mark>g</mark> запустить программу</div>
            <div><mark>a</mark> ассемблер</div>
            <div><mark>d</mark> отладчик</div>
            <div><mark>v</mark> визуализация</div>
            <div><mark>p</mark> приостановить процессор</div>
            <div><mark>c</mark> сигнал RESET</div>
            <div><mark>r</mark> перезапустить эмулятор</div>
            <div><mark>s</mark> звук</div>
            <div><mark>f</mark> полноэкранный режим</div>
            <div><mark>w</mark> сохранить состояние эмулятора</div>
            <div><mark>b</mark> помощь по клавиатуре</div>
        </div>
    </div>
</dialog>

{#if keyboardVisible}
    <Keyboard
        onclose={() => (keyboardVisible = false)}
        onkeydown={(code) => emulatorKeyDown?.(code)}
        onkeyup={(code) => emulatorKeyUp?.(code)}
    />
{/if}

<dialog
    id="catalog-dialog"
    bind:this={catalogDialog}
    onclick={(e) => {
        if (e.target === e.currentTarget) catalogDialog?.close();
    }}
    onclose={() => (document.activeElement as HTMLElement)?.blur()}
>
    <CatalogSelector
        bind:this={catalogSelector}
        onselect={(name) => {
            catalogDialog?.close();
            machine?.loadCatalogFile(name);
        }}
        onclose={() => catalogDialog?.close()}
    />
</dialog>

<style>
    :global(body) {
        margin: 0;
        font-family: sans-serif;
    }
    #header,
    #footer {
        box-sizing: border-box;
        display: flex;
        width: 100%;
        padding: 8px;
        flex-shrink: 0; /* do not shrink header/footer */
        font-size: 0.75rem;
    }
    #header.hidden,
    #footer.hidden,
    .icon {
        width: 2em;
        height: 2em;
        vertical-align: middle;
    }
    button.icon {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px 2px;
        border: none;
        cursor: pointer;
    }
    button.active {
        padding: 2px;
        outline: 2px solid white;
        border-radius: 8px;
    }
    button {
        font-family: monospace;
    }
    #sound_image {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translateX(-50%) translateY(-50%);
        font-size: 10em;
        opacity: 0;
        transition: opacity 0.5s ease;
        pointer-events: none;
        z-index: 2000;
    }
    #sound_image.visible {
        opacity: 1;
    }
    .debugger-layout {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto 1fr;
        gap: 0;
        width: 100%;
        overflow: hidden;
    }
    .debugger-canvas-wrap {
        grid-row: 1;
        grid-column: 1;
        width: fit-content;
        height: fit-content;
        cursor: pointer;
        border: 2px solid transparent;
    }
    .canvas-placeholder {
        flex: 1;
        min-height: 0;
        min-width: 0;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .canvas-placeholder canvas {
        width: 100%;
        height: 100%;
        aspect-ratio: 78 / 50;
        object-fit: contain;
    }
    .debugger-canvas-wrap:hover,
    .canvas-focused {
        border-color: #4a9;
    }
    .debugger-disasm {
        grid-row: 1 / 3;
        grid-column: 2;
        overflow: auto;
        border-left: 1px solid #333;
    }
    .debugger-terminal {
        grid-row: 2;
        grid-column: 1;
        overflow: auto;
        border-top: 1px solid #333;
    }
    .dimmed {
        opacity: 0.6;
    }
    .modifier_active {
        color: #ffcc00;
    }
    .gauge {
        display: flex;
        width: fit-content;
        height: fit-content;
        gap: 4px;
        font-family: monospace;
    }
    #shortcuts {
        position: fixed;
        top: 50%;
        left: 50%;
        translate: -50% -50%;
        margin: 0;
        background-color: #333333;
        color: white;
        padding: 10px;
        font-size: 1.2em;
        text-align: center;
        border: none;
        outline: none;
        border-radius: 8px;
    }
    #shortcuts::backdrop,
    #catalog-dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.5);
    }
    #catalog-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        translate: -50% -50%;
        margin: 0;
        background-color: #222;
        color: white;
        padding: 16px;
        border: none;
        outline: none;
        border-radius: 8px;
    }
    #shortcut-hint {
        all: unset;
        margin-left: auto;
        opacity: 0.3;
        color: white;
        font-size: 1rem;
        cursor: pointer;
    }
    #shortcut-hint:hover {
        opacity: 0.7;
    }
    #hint {
        position: fixed;
        right: 0;
        bottom: 0;
        transition: opacity 0.3s ease;
        font-size: 3em;
        background-color: white;
        color: black;
        white-space: nowrap;
        padding: 8px 10px;
        border-radius: 4px;
        z-index: 1000;
        pointer-events: none;
    }
    main {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: center;
        overflow: hidden;
        background-color: #000000;
        color: #ffffff;
    }
    .tape_active {
        color: white;
        background-color: green;
    }
</style>
