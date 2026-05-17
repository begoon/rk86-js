<script lang="ts">
    import { onMount } from "svelte";

    let { onclose }: { onclose: () => void } = $props();

    // Cyrillic → RK-86 (KOI-7 N1). RK has a single-case Cyrillic font:
    // lowercase Latin (0x60..0x7F) renders as uppercase Cyrillic on screen,
    // so any-case Cyrillic input maps to lowercase-Latin / punctuation.
    const MAP: Record<string, string> = {
        А: "a", Б: "b", В: "w", Г: "g", Д: "d", Е: "e", Ё: "e", Ж: "v",
        З: "z", И: "i", Й: "j", К: "k", Л: "l", М: "m", Н: "n", О: "o",
        П: "p", Р: "r", С: "s", Т: "t", У: "u", Ф: "f", Х: "h", Ц: "c",
        Ч: "~", Ш: "{", Щ: "}", Ъ: "\x7F", Ы: "y", Ь: "x", Э: "|", Ю: "`", Я: "q",
    };

    function rkEncode(s: string): string {
        return [...s.toUpperCase()].map((c) => MAP[c] ?? c).join("");
    }

    let input = $state("ТАБЛИЦА СИМВОЛОВ ЧЕРЕЗ МОНИТОР");
    let copied = $state(false);
    let inputElement = $state<HTMLTextAreaElement>();

    const output = $derived(rkEncode(input));

    onMount(() => {
        inputElement?.focus();
        inputElement?.select();
    });

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(output);
            copied = true;
            setTimeout(() => (copied = false), 1200);
        } catch {
            // ignore — older browsers / insecure contexts
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        e.stopPropagation();
        if (e.key === "Escape") {
            e.preventDefault();
            onclose();
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="converter" onkeydown={handleKeydown}>
    <div class="header">
        <span class="title">Кириллица → РК (KOI-7 N1)</span>
        <span class="hint">Esc — закрыть</span>
    </div>

    <label class="field">
        <span class="label">Кириллица</span>
        <textarea
            bind:this={inputElement}
            bind:value={input}
            rows="3"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
        ></textarea>
    </label>

    <label class="field">
        <span class="label">РК</span>
        <textarea
            value={output}
            rows="3"
            readonly
            spellcheck="false"
        ></textarea>
    </label>

    <div class="actions">
        <button type="button" class="primary" onclick={copyToClipboard}>
            {copied ? "Скопировано" : "Копировать"}
        </button>
        <button type="button" onclick={onclose}>Закрыть</button>
    </div>
</div>

<style>
    .converter {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 60vw;
        max-width: 640px;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
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
    .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .label {
        font-size: 0.85em;
        color: #aaa;
    }
    textarea {
        font-family: monospace;
        font-size: 1em;
        padding: 8px;
        background: #1a1a1a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        resize: vertical;
        outline: none;
    }
    textarea:focus {
        border-color: #888;
    }
    textarea[readonly] {
        color: #ffcc00;
    }
    .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    }
    button {
        font-family: inherit;
        font-size: 0.95em;
        padding: 6px 14px;
        background: #2a2a2a;
        color: white;
        border: 1px solid #444;
        border-radius: 4px;
        cursor: pointer;
    }
    button:hover {
        background: #3a3a3a;
        border-color: #888;
    }
    button.primary {
        background: #36a;
        border-color: #58c;
    }
    button.primary:hover {
        background: #47b;
    }
</style>
