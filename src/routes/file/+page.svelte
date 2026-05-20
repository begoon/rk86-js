<script lang="ts">
    import { base } from "$app/paths";
    import { rk86_check_sum } from "$lib/core/rk86_check_sum.js";
    import { emit_rk86_binary, replace_ext, RK86_EXTENSIONS } from "$lib/core/rk86_file_emit.js";

    type Role =
        | "prolog" | "header" | "data" | "gap" | "trailer" | "trailer-bad" | "cksum" | "cksum-bad" | "tail"
        | "bmark" | "bname" | "bnameend" | "bleader" | "bsync2" | "bmark2" | "bprog" | "bend";

    type Classification = {
        ok: boolean;
        format: "binary" | "basic" | "unknown";
        error: string | null;
        roles: Role[];
        start?: number;
        end?: number;
        size?: number;
        name?: string;
        lines?: number;
        programLen?: number;
        checksum?: number;
        actualChecksum?: number;
        bodyStart?: number;
        bodyEnd?: number;
    };

    let fileName = $state<string | null>(null);
    let bytes = $state<Uint8Array | null>(null);
    let dragOver = $state(false);
    let downloadExt = $state<string>("rk");
    let hoverIdx = $state<number | null>(null);

    const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
    const hex4 = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");

    function classify(b: Uint8Array): Classification {
        const roles: Role[] = new Array(b.length).fill("tail");

        // Optional leading E6 prolog (PKI/GAM-style; also matches emulator tape captures).
        let off = 0;
        if (b.length > 0 && b[0] === 0xe6) {
            roles[0] = "prolog";
            off = 1;
        }

        if (b.length - off >= 4 && b[off] === 0xd3 && b[off + 1] === 0xd3 && b[off + 2] === 0xd3 && b[off + 3] === 0xd3) {
            return classifyBasic(b, off, roles);
        }
        return classifyBinary(b, off, roles);
    }

    function classifyBinary(b: Uint8Array, off: number, roles: Role[]): Classification {
        if (b.length - off < 4 + 3) {
            return { ok: false, format: "binary", error: "поток слишком короткий", roles };
        }
        const start = (b[off] << 8) | b[off + 1];
        const end = (b[off + 2] << 8) | b[off + 3];
        const size = end - start + 1;
        if (size <= 0) {
            return {
                ok: false, format: "binary",
                error: `недопустимый размер ${size}`,
                roles, start, end, size,
            };
        }
        const bodyStart = off + 4;
        const bodyEnd = bodyStart + size;
        if (bodyEnd + 3 > b.length) {
            return {
                ok: false, format: "binary",
                error: `размер ${size} не помещается в поток ${b.length} байт`,
                roles, start, end, size,
            };
        }

        // Two trailer variants exist in the wild:
        //   • no gap: E6 cks_hi cks_lo (3 bytes)  — typical .gam / .pki
        //   • gap+:  00 00 E6 cks_hi cks_lo (5 bytes) — typical .rk / .rkr
        let hasGap = false;
        let trailerOff = bodyEnd;
        if (b[bodyEnd] === 0xe6) {
            hasGap = false;
        } else if (bodyEnd + 5 <= b.length && b[bodyEnd] === 0x00 && b[bodyEnd + 1] === 0x00 && b[bodyEnd + 2] === 0xe6) {
            hasGap = true;
            trailerOff = bodyEnd + 2;
        } else if (b.length - bodyEnd >= 5) {
            hasGap = true;
            trailerOff = bodyEnd + 2;
        }

        for (let k = 0; k < 4; k++) roles[off + k] = "header";
        for (let k = 0; k < size; k++) roles[bodyStart + k] = "data";
        if (hasGap) {
            roles[bodyEnd] = "gap";
            roles[bodyEnd + 1] = "gap";
        }

        const trailerE6 = b[trailerOff];
        const cksum = ((b[trailerOff + 1] ?? 0) << 8) | (b[trailerOff + 2] ?? 0);
        const body = Array.from(b.slice(bodyStart, bodyEnd));
        const actualChecksum = rk86_check_sum(body);
        const trailerOk = trailerE6 === 0xe6;
        const cksumOk = trailerOk && actualChecksum === cksum;

        if (trailerOff < b.length) roles[trailerOff] = trailerOk ? "trailer" : "trailer-bad";
        const cksumRole: Role = cksumOk ? "cksum" : "cksum-bad";
        if (trailerOff + 1 < b.length) roles[trailerOff + 1] = cksumRole;
        if (trailerOff + 2 < b.length) roles[trailerOff + 2] = cksumRole;

        let error: string | null = null;
        if (!trailerOk) error = `маркер ${hex2(trailerE6)} != E6`;
        else if (!cksumOk) error = `контр. сумма ${hex4(actualChecksum)} != ${hex4(cksum)}`;

        return {
            ok: !error, format: "binary", error, roles,
            start, end, size,
            checksum: cksum, actualChecksum,
            bodyStart, bodyEnd,
        };
    }

    function classifyBasic(b: Uint8Array, off: number, roles: Role[]): Classification {
        for (let k = 0; k < 4; k++) roles[off + k] = "bmark";
        let i = off + 4;

        const nameStart = i;
        while (i < b.length && b[i] !== 0x00) {
            roles[i] = "bname";
            i++;
        }
        const name = String.fromCharCode(...b.slice(nameStart, i));

        while (i < b.length && b[i] !== 0xe6) {
            roles[i] = b[i] === 0x55 ? "bleader" : "bnameend";
            i++;
        }
        if (i >= b.length) {
            return { ok: false, format: "basic", error: "второй E6 не найден", roles, name };
        }
        roles[i] = "bsync2";
        i++;

        if (i + 2 >= b.length || b[i] !== 0xd3 || b[i + 1] !== 0xd3 || b[i + 2] !== 0xd3) {
            return { ok: false, format: "basic", error: "ожидаются D3 D3 D3 после 2-го E6", roles, name };
        }
        for (let k = 0; k < 3; k++) roles[i + k] = "bmark2";
        i += 3;

        const programStart = i;
        let lines = 0;
        while (i + 1 < b.length) {
            const link = b[i] | (b[i + 1] << 8);
            if (link === 0) {
                roles[i] = "bend";
                roles[i + 1] = "bend";
                return {
                    ok: true, format: "basic", error: null, roles,
                    name, lines, programLen: i - programStart,
                };
            }
            const lineStart = i;
            i += 4;
            while (i < b.length && b[i] !== 0x00) i++;
            if (i >= b.length) {
                return { ok: false, format: "basic", error: "незавершённая строка BASIC", roles, name, lines };
            }
            i++;
            for (let k = lineStart; k < i; k++) roles[k] = "bprog";
            lines++;
        }
        return {
            ok: false, format: "basic",
            error: "маркер конца программы (00 00) не найден",
            roles, name, lines, programLen: i - programStart,
        };
    }

    const cls = $derived<Classification | null>(bytes ? classify(bytes) : null);

    async function loadFromFile(file: File) {
        const buf = await file.arrayBuffer();
        bytes = new Uint8Array(buf);
        fileName = file.name;
        const ext = (file.name.split(".").pop() || "rk").toLowerCase();
        downloadExt = (RK86_EXTENSIONS as readonly string[]).includes(ext) ? ext : "rk";
    }

    function onPickFile(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const f = input.files?.[0];
        if (f) loadFromFile(f);
        input.value = "";
    }

    function onDrop(e: DragEvent) {
        e.preventDefault();
        dragOver = false;
        const f = e.dataTransfer?.files?.[0];
        if (f) loadFromFile(f);
    }

    function rkGlyph(b: number): string {
        const c = b === 9 || b === 11 ? b + 0x80 : b;
        return String.fromCodePoint(c + 0x100);
    }

    function triggerDownload(blob: Blob, name: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function doDownload() {
        if (!bytes || !cls || !fileName) return;
        const outName = replace_ext(fileName, downloadExt);
        if (cls.format === "binary" && cls.ok && cls.start !== undefined && cls.end !== undefined && cls.bodyStart !== undefined && cls.bodyEnd !== undefined) {
            const body = Array.from(bytes.slice(cls.bodyStart, cls.bodyEnd));
            const out = emit_rk86_binary(downloadExt, cls.start, cls.end, body);
            triggerDownload(new Blob([out.buffer as ArrayBuffer], { type: "application/octet-stream" }), outName);
            return;
        }
        triggerDownload(new Blob([bytes.buffer as ArrayBuffer], { type: "application/octet-stream" }), outName);
    }

    const ROLE_LABELS: Record<Role, string> = {
        prolog: "пролог E6",
        header: "заголовок (начало/конец)",
        data: "данные",
        gap: "промежуток 00 00",
        trailer: "маркер E6",
        "trailer-bad": "маркер E6 (неверный)",
        cksum: "контр. сумма",
        "cksum-bad": "контр. сумма (не совпала)",
        tail: "хвост",
        bmark: "маркер 4×D3",
        bname: "имя",
        bnameend: "после имени",
        bleader: "лидер 0x55",
        bsync2: "2-й E6",
        bmark2: "маркер 3×D3",
        bprog: "строка BASIC",
        bend: "конец 00 00",
    };

    const ROW_WIDTH = 16;
    type Cell = { byte: number; role: Role; gi: number } | null;
    const rows = $derived.by(() => {
        if (!bytes || !cls) return [] as { addr: number; cells: Cell[] }[];
        const out: { addr: number; cells: Cell[] }[] = [];
        for (let i = 0; i < bytes.length; i += ROW_WIDTH) {
            const cells: Cell[] = new Array(ROW_WIDTH);
            for (let j = 0; j < ROW_WIDTH; j++) {
                const gi = i + j;
                cells[j] = gi < bytes.length
                    ? { byte: bytes[gi], role: cls.roles[gi] as Role, gi }
                    : null;
            }
            out.push({ addr: i, cells });
        }
        return out;
    });
</script>

<svelte:head>
    <title>Анализатор РК-файла — rk86.ru</title>
    {@html `<style>@font-face { font-family: "Radio-86RKPixel"; src: url("${base}/rk86font.ttf") format("truetype"); }</style>`}
</svelte:head>

<svelte:window
    ondragover={(e) => { e.preventDefault(); dragOver = true; }}
    ondragleave={() => (dragOver = false)}
    ondrop={onDrop}
/>

<div class="page" class:drag={dragOver}>
    <header>
        <div class="row1">
            <h1>Анализатор РК-файла</h1>
            <label class="btn">
                <input type="file" accept=".rk,.rkr,.gam,.pki,.rki,.bin" onchange={onPickFile} />
                Открыть файл…
            </label>
            {#if bytes && cls}
                <span class="download">
                    <button type="button" class="btn dl" onclick={doDownload}>Скачать</button>
                    <select class="fmt" bind:value={downloadExt}>
                        {#each RK86_EXTENSIONS as ext}
                            <option value={ext}>.{ext}</option>
                        {/each}
                    </select>
                </span>
            {/if}
        </div>
        <div class="row2">
            {#if fileName}
                <span class="fname">{fileName}</span>
            {/if}
            {#if bytes}
                <span class="meta">{bytes.length} байт</span>
            {/if}
            {#if cls}
            {#if cls.format === "binary" && cls.start !== undefined}
                <span class="status" class:ok={cls.ok} class:err={!cls.ok}>
                    бинарный · {hex4(cls.start)}–{hex4(cls.end!)} ({hex4(cls.size!)})
                    {#if cls.actualChecksum !== undefined && cls.checksum !== undefined}
                        · CRC {hex4(cls.checksum)}
                        {#if cls.actualChecksum === cls.checksum}
                            <span class="crc-ok">✓</span>
                        {:else}
                            <span class="crc-bad">✗ ожидалось {hex4(cls.actualChecksum)}</span>
                        {/if}
                    {/if}
                    · Смещение: <span class="offset">{hoverIdx !== null ? hex4(hoverIdx) : "—"}</span>
                    {#if !cls.ok && cls.error}
                        · <span class="crc-bad">{cls.error}</span>
                    {/if}
                </span>
            {:else if cls.format === "basic"}
                <span class="status" class:ok={cls.ok} class:err={!cls.ok}>
                    BASIC «{cls.name ?? ""}»
                    {#if cls.programLen !== undefined}
                        · {cls.programLen} байт ({cls.lines} строк)
                    {/if}
                    {#if !cls.ok && cls.error}
                        · <span class="crc-bad">{cls.error}</span>
                    {/if}
                </span>
            {:else}
                <span class="status err">{cls.format} — {cls.error}</span>
            {/if}
        {/if}
        </div>
        {#if bytes && cls}
            <div class="legend">
                {#each (cls.format === "basic"
                    ? (["prolog","bmark","bname","bleader","bsync2","bmark2","bprog","bend","tail"] as Role[])
                    : (["prolog","header","data","gap","trailer","cksum","tail"] as Role[])) as role}
                    <span><i class="sw role-{role}"></i>{ROLE_LABELS[role]}</span>
                {/each}
                {#if cls.format === "binary" && !cls.ok && cls.actualChecksum !== undefined && cls.actualChecksum !== cls.checksum}
                    <span><i class="sw role-cksum-bad"></i>{ROLE_LABELS["cksum-bad"]}</span>
                {/if}
            </div>
        {/if}
    </header>

    {#if !bytes}
        <div class="drop">перетащите .rk/.rkr/.gam/.pki/.rki/.bin сюда или нажмите «Открыть файл…»</div>
    {:else if cls}
        <div class="hexdump">
            {#each rows as row}
                <div class="row">
                    <span class="addr">{hex4(row.addr)}</span>
                    <span class="hex">
                        {#each row.cells as c}
                            {#if c}
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <span
                                    class="byte role-{c.role}"
                                    class:hover={hoverIdx === c.gi}
                                    title="{hex4(c.gi)}: {hex2(c.byte)} · {ROLE_LABELS[c.role]}"
                                    onmouseenter={() => (hoverIdx = c.gi)}
                                    onmouseleave={() => (hoverIdx = null)}
                                >{hex2(c.byte)}</span>
                            {:else}
                                <span class="byte empty">&nbsp;&nbsp;</span>
                            {/if}
                        {/each}
                    </span>
                    <span class="chars">
                        {#each row.cells as c}
                            {#if c}
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <span
                                    class="ch role-{c.role}"
                                    class:hover={hoverIdx === c.gi}
                                    onmouseenter={() => (hoverIdx = c.gi)}
                                    onmouseleave={() => (hoverIdx = null)}
                                >{rkGlyph(c.byte)}</span>
                            {:else}
                                <span class="ch empty">&nbsp;</span>
                            {/if}
                        {/each}
                    </span>
                    <span class="chars chars-ascii">
                        {#each row.cells as c}
                            {#if c}
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <span
                                    class="ch role-{c.role}"
                                    class:hover={hoverIdx === c.gi}
                                    onmouseenter={() => (hoverIdx = c.gi)}
                                    onmouseleave={() => (hoverIdx = null)}
                                >{c.byte < 32 || c.byte > 126 ? "." : String.fromCharCode(c.byte)}</span>
                            {:else}
                                <span class="ch empty">&nbsp;</span>
                            {/if}
                        {/each}
                    </span>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .page {
        min-height: 100vh;
        background: #1a1d22;
        color: #e0e3e8;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        padding: 0 16px;
        box-sizing: border-box;
    }
    .page.drag { background: #1f2a35; }

    header {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
        position: sticky;
        top: 0;
        z-index: 10;
        background: #1a1d22;
        padding: 12px 0 8px;
        border-bottom: 1px solid #2a2f37;
    }
    header .row1, header .row2 {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
    }
    header .row2 {
        font-size: 0.95em;
        color: #b0b6c0;
    }
    h1 {
        font-size: 1.1em;
        font-weight: 600;
        margin: 0 8px 0 0;
    }
    .btn {
        display: inline-block;
        background: #2c333d;
        color: #e0e3e8;
        border: 1px solid #3a424d;
        border-radius: 6px;
        padding: 5px 10px;
        cursor: pointer;
        font: inherit;
    }
    .btn:hover { background: #353e4a; }
    .btn input[type="file"] {
        display: none;
    }
    .btn.dl { background: #4a6dbe; border-color: #4a6dbe; }
    .btn.dl:hover { background: #5b7fcf; }
    .fmt {
        background: #2c333d;
        color: #e0e3e8;
        border: 1px solid #3a424d;
        border-radius: 6px;
        padding: 5px 6px;
        font: inherit;
    }
    .download { display: inline-flex; gap: 4px; align-items: center; }

    .fname {
        font-weight: 600;
        color: #b0d8ff;
    }
    .meta {
        color: #8a93a0;
    }
    .status { color: #b0b6c0; }
    .status.ok { color: #6cc080; }
    .status.err { color: #e08070; }
    .crc-ok  { color: #6cc080; font-weight: 700; }
    .crc-bad { color: #ff8a7a; font-weight: 700; }
    .offset { color: #b0d8ff; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

    .drop {
        border: 2px dashed #3a424d;
        border-radius: 8px;
        padding: 60px 20px;
        text-align: center;
        color: #8a93a0;
    }

    .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 0.85em;
        color: #b0b6c0;
    }
    .legend i.sw {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 2px;
        margin-right: 4px;
        vertical-align: middle;
    }

    .hexdump {
        font-size: 18px;
        line-height: 1.4;
        background: #0e1116;
        border: 1px solid #2a2f37;
        border-radius: 6px;
        padding: 8px 12px;
        overflow-x: auto;
    }
    .row {
        white-space: nowrap;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        display: flex;
        align-items: flex-start;
        gap: 12px;
    }
    .row > .addr,
    .row > .hex,
    .row > .chars:not(.chars-ascii) {
        border-right: 1px solid #2a2f37;
        padding-right: 12px;
    }
    .addr {
        color: #6a7280;
    }
    .hex .byte {
        display: inline-block;
        padding: 0 0.2ch;
        text-align: center;
    }
    .hex .byte.empty {
        color: transparent;
        background: transparent !important;
    }
    .chars {
        font-family: "Radio-86RKPixel", monospace;
        font-size: 18px;
        line-height: 1;
        color: #ffffff;
        margin-top: 4px;
    }
    .chars.chars-ascii {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 18px;
        margin-top: 0;
    }
    .chars.chars-ascii .ch {
        width: 1ch;
        margin-right: 0;
    }
    .chars .ch {
        display: inline-block;
        width: calc(1ch + 4px);
        overflow: hidden;
    }
    .chars .ch.empty {
        background: transparent !important;
    }
    .byte.hover, .ch.hover {
        outline: 1px solid #ffffff;
        background: rgba(255, 255, 255, 0.08);
    }

    .role-prolog   { color: #ffb060; background-color: rgba(201, 122, 42, 0.32); font-weight: 700; }
    .role-header   { color: #9ab8ff; background-color: rgba(74, 109, 190, 0.35); }
    .role-data     { color: #d0d3d8; background-color: rgba(255, 255, 255, 0.04); }
    .role-gap      { color: #b0b0b0; background-color: rgba(160, 160, 160, 0.28); }
    .role-trailer  { color: #ffb060; background-color: rgba(201, 122, 42, 0.40); font-weight: 700; }
    .role-cksum    { color: #ffd84a; background-color: rgba(181, 139, 0, 0.38); font-weight: 700; }
    .role-trailer-bad { color: #ffffff; background-color: rgba(220, 60, 60, 0.55); font-weight: 700; }
    .role-cksum-bad   { color: #ffffff; background-color: rgba(220, 60, 60, 0.55); font-weight: 700; }
    .role-tail     { color: #6e7488; }

    .role-bmark    { color: #ff8ac0; background-color: rgba(184, 54, 122, 0.36); font-weight: 700; }
    .role-bname    { color: #9be8e8; background-color: rgba(44, 143, 143, 0.32); }
    .role-bnameend { color: #6e6e6e; background-color: rgba(140, 140, 140, 0.15); }
    .role-bleader  { color: #b8c4cd; background-color: rgba(108, 132, 147, 0.28); }
    .role-bsync2   { color: #ffb060; background-color: rgba(201, 122, 42, 0.40); font-weight: 700; }
    .role-bmark2   { color: #ff8ac0; background-color: rgba(184, 54, 122, 0.36); font-weight: 700; }
    .role-bprog    { color: #8ed8a0; background-color: rgba(46, 122, 79, 0.20); }
    .role-bend     { color: #ffd84a; background-color: rgba(181, 139, 0, 0.38); font-weight: 700; }

    .legend .role-prolog,   .legend i.role-prolog   { background-color: #c97a2a; }
    .legend i.role-header   { background-color: #4a6dbe; }
    .legend i.role-data     { background-color: #2f7a4f; }
    .legend i.role-gap      { background-color: #6e6e6e; }
    .legend i.role-trailer  { background-color: #c97a2a; }
    .legend i.role-cksum    { background-color: #b58b00; }
    .legend i.role-tail     { background-color: #8089a0; }
    .legend i.role-bmark    { background-color: #b8367a; }
    .legend i.role-bname    { background-color: #2c8f8f; }
    .legend i.role-bleader  { background-color: #6c8493; }
    .legend i.role-bsync2   { background-color: #c97a2a; }
    .legend i.role-bmark2   { background-color: #b8367a; }
    .legend i.role-bprog    { background-color: #2f7a4f; }
    .legend i.role-bend     { background-color: #b58b00; }
</style>
