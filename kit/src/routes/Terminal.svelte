<script lang="ts">
    let { onrun }: { onrun: (cmd: string) => void } = $props();

    let output = $state<HTMLDivElement>();
    let input = $state<HTMLInputElement>();

    let history: string[] = [];
    let historyIndex = 0;

    function handleKeydown(e: KeyboardEvent) {
        e.stopPropagation();
        if (!input) return;
        switch (e.key) {
            case "Escape":
                e.preventDefault();
                input.value = "";
                break;
            case "Enter": {
                e.preventDefault();
                const cmd = input.value.trim();
                if (!cmd) return;
                input.value = "";
                put(cmd);
                onrun(cmd);
                if (historyIndex === 0 && history[0] === cmd) return;
                history.unshift(cmd);
                if (history.length > 100) history.pop();
                historyIndex = 0;
                break;
            }
            case "ArrowUp":
                e.preventDefault();
                browseHistory(1);
                break;
            case "ArrowDown":
                e.preventDefault();
                browseHistory(-1);
                break;
        }
    }

    function browseHistory(direction: number) {
        if (!input) return;
        if (input.value.trim()) historyIndex += direction;
        historyIndex = (historyIndex + history.length) % history.length;
        input.value = history[historyIndex] ?? "";
    }

    export function put(str: string) {
        if (!output) return;
        const html = str.replaceAll(" ", "&nbsp;");
        output.innerHTML += `<div>${html}</div>`;
        setTimeout(() => {
            if (output) output.scrollTop = output.scrollHeight;
        }, 0);
    }

    export function focus() {
        input?.focus();
    }

    export function currentHistory(): string[] {
        return history;
    }

    $effect(() => {
        input?.focus();
    });
</script>

<div class="terminal">
    <div class="terminal-body">
        <div class="output" bind:this={output}></div>
        <!-- svelte-ignore a11y_autofocus -->
        <input
            type="text"
            class="input"
            bind:this={input}
            onkeydown={handleKeydown}
            onkeypress={(e) => e.stopPropagation()}
            onkeyup={(e) => e.stopPropagation()}
            autofocus
        />
    </div>
</div>

<style>
    .terminal {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    .terminal-body {
        background-color: black;
        padding: 4px;
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }
    .output {
        height: 30em;
        flex: 1;
        color: lightgreen;
        font-family: monospace;
        font-size: small;
        overflow-y: auto;
        margin-bottom: 0.5em;
        white-space: pre;
    }
    .input {
        width: 100%;
        box-sizing: border-box;
        background: black;
        color: lightgreen;
        border: 1px solid green;
        font-family: monospace;
        font-size: small;
        padding: 2px 4px;
        outline: none;
    }
</style>
