<script lang="ts">
    let {
        onclose,
        onkeydown,
        onkeyup,
    }: {
        onclose: () => void;
        onkeydown?: (code: string) => void;
        onkeyup?: (code: string) => void;
    } = $props();

    const PRESS_DURATION = 100;

    const labelToCode: Record<string, string> = {
        ";": "Semicolon",
        "+": "Semicolon",
        ...Object.fromEntries("0123456789".split("").map((d) => [d, `Digit${d}`])),
        "-": "Minus",
        "=": "Minus",
        TAB: "Tab",
        BS: "Backspace",
        ENT: "Enter",
        CTRL: "ControlLeft",
        "⇧": "ShiftLeft",
        "`": "Backquote",
        "[": "BracketLeft",
        "]": "BracketRight",
        "\\": "Backslash",
        ",": "Comma",
        ".": "Period",
        "/": "Slash",
        "'": "Quote",
        "*": "Semicolon",
        "←": "ArrowLeft",
        "→": "ArrowRight",
        "↑": "ArrowUp",
        "↓": "ArrowDown",
        ...Object.fromEntries("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => [c, `Key${c}`])),
        ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [`F${n}`, `F${n}`])),
    };

    function press(code: string) {
        onkeydown?.(code);
        setTimeout(() => onkeyup?.(code), PRESS_DURATION);
    }

    function simulateKey(label: string, shifted: boolean) {
        const code = labelToCode[label];
        if (!code) return;
        if (shifted) {
            onkeydown?.("ShiftLeft");
            setTimeout(() => {
                press(code);
                setTimeout(() => onkeyup?.("ShiftLeft"), PRESS_DURATION);
            }, 50);
        } else {
            press(code);
        }
    }

    let panel = $state<HTMLDivElement>();
    let dragging = $state(false);
    let dragOffset = { x: 0, y: 0 };

    function onMouseDown(e: MouseEvent) {
        if ((e.target as HTMLElement).closest(".close-btn")) return;
        dragging = true;
        const rect = panel!.getBoundingClientRect();
        dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        e.preventDefault();
    }
    function onMouseMove(e: MouseEvent) {
        if (!dragging || !panel) return;
        panel.style.left = `${e.clientX - dragOffset.x}px`;
        panel.style.top = `${e.clientY - dragOffset.y}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
    }
    function onMouseUp() {
        dragging = false;
    }

    const keyboardLayout = [
        [
            [";", "+", ";"],
            ["1", "!", "1"],
            ["2", '"', "2"],
            ["3", "#", "3"],
            ["4", "$", "4"],
            ["5", "%", "5"],
            ["6", "&", "6"],
            ["7", "'", "7"],
            ["8", "(", "8"],
            ["9", ")", "9"],
            ["0", "", "0"],
            ["-", "=", "-"],
            ["TAB", "", "TAB"],
            ["ЗБ", "", "BS"],
        ],
        [
            ["Й", "J", "J"],
            ["Ц", "C", "C"],
            ["У", "U", "U"],
            ["К", "K", "K"],
            ["Е", "E", "E"],
            ["Н", "N", "N"],
            ["Г", "G", "G"],
            ["Ш", "[", "["],
            ["Щ", "]", "]"],
            ["З", "Z", "Z"],
            ["Х", "H", "H"],
            ["*", ":", "F6"],
            ["BK", "", "ENT"],
        ],
        [
            ["СС", "", "CTRL"],
            ["Ф", "F", "F"],
            ["Ы", "Y", "Y"],
            ["В", "W", "W"],
            ["А", "A", "A"],
            ["П", "P", "P"],
            ["Р", "R", "R"],
            ["О", "O", "O"],
            ["Л", "L", "L"],
            ["Д", "D", "D"],
            ["Ж", "V", "V"],
            ["Э", "\\", "\\"],
            [">", ".", "."],
            ["ПС", "", "`"],
        ],
        [
            ["УС", "", "⇧"],
            ["Я", "Q", "Q"],
            ["Ч", "^", "'"],
            ["С", "S", "S"],
            ["М", "M", "M"],
            ["И", "I", "I"],
            ["Т", "T", "T"],
            ["Ь", "X", "X"],
            ["Б", "B", "B"],
            ["Ю", "@", "F7"],
            ["<", ",", ","],
            ["?", "/", "/"],
            ["РУС", "ЛАТ", "F10"],
        ],
    ];

    const padLayout = [
        ["↖︎", "", "F8"],
        ["Ф1", "", "F1"],
        ["СТР", "", "F9"],
        ["←", "", "←"],
        ["↑", "", "↑"],
        ["→", "", "→"],
        ["Ф2", "", "F2"],
        ["Ф3", "", "F3"],
        ["Ф4", "", "F4"],
        ["↓", "", "↓"],
        ["AP2", "", "F5"],
    ];
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="keyboard-panel" bind:this={panel} onmousedown={onMouseDown}>
    <div class="titlebar">
        <span>Клавиатура (кликайте нужные клавиши)</span>
        <button class="close-btn" type="button" onclick={onclose}>&times;</button>
    </div>
    <div class="keyboard">
        <div class="keyboard-main">
            {#each keyboardLayout as row, i}
                <div class="keyboard-row" style={i % 2 === 1 ? "margin-left: 2em" : ""}>
                    {#each row as labels}
                        <div class="key">
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <div class="clickable" onclick={() => simulateKey(labels[2], false)}>
                                {labels[0] || "\u00A0"}
                            </div>
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <div class="clickable" onclick={() => simulateKey(labels[2], i === 0)}>
                                {labels[1] || "\u00A0"}
                            </div>
                            <div class={/^F\d/.test(labels[2]) ? "fkey" : ""}>{labels[2] || "\u00A0"}</div>
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
        <div class="keyboard-pad">
            {#each padLayout as labels, i}
                <div class="key" style={i === 9 ? "width: 6em; grid-column: span 2" : ""}>
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div class="clickable" onclick={() => simulateKey(labels[2], false)}>{labels[0] || "\u00A0"}</div>
                    <div>{labels[1] || "\u00A0"}</div>
                    <div class={/^F\d/.test(labels[2]) ? "fkey" : ""}>{labels[2] || "\u00A0"}</div>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .keyboard-panel {
        position: fixed;
        right: 10px;
        bottom: 40px;
        z-index: 900;
        background-color: #222;
        padding: 0;
        border: 1px solid #444;
        border-radius: 8px;
        overflow: hidden;
        cursor: move;
    }
    .titlebar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #333;
        color: white;
        padding: 2px 8px;
        font-size: 9pt;
        font-family: monospace;
    }
    .close-btn {
        all: unset;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        padding: 0 2px;
    }
    .close-btn:hover {
        color: red;
    }
    .keyboard {
        display: flex;
        gap: 1em;
        user-select: none;
    }
    .keyboard-row {
        display: flex;
        margin-left: 1em;
    }
    .key {
        display: grid;
        grid-row: repeat(3, 1fr);
        background-color: #333;
        color: #fff;
        border: 1px solid #555;
        width: fit-content;
        min-width: 2em;
        text-align: center;
        padding-left: 4px;
        padding-right: 4px;
    }
    .key div:last-child {
        padding-top: 1em;
        color: lightblue;
    }
    .fkey {
        color: lightgreen !important;
    }
    .clickable {
        cursor: pointer;
    }
    .clickable:active {
        background-color: #555;
    }
    .keyboard-pad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
    }
    .keyboard-pad .key {
        width: 3em;
        margin: 0;
        padding: 0;
    }
</style>
