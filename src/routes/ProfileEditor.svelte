<script lang="ts">
    import { onMount } from "svelte";
    import {
        PERIPHERAL_WINDOWS,
        PERIPHERAL_WINDOW_LABEL,
        PROFILE_ADDRESS_FIELDS,
        PROFILE_FIELD_LABELS,
        RK86_CLASSIC,
        isClassicProfile,
        peripheralWindowLabel,
        validateProfile,
        type MachineProfile,
        type ProfileAddressField,
    } from "$lib/core/rk86_profile";

    let {
        profiles,
        activeName,
        onchange,
        onapply,
        onclose,
    }: {
        profiles: MachineProfile[];
        activeName: string;
        // Список профилей изменился (сохранён/удалён пользовательский).
        onchange: (profiles: MachineProfile[]) => void;
        // Сделать профиль активным (перезапуск эмулятора).
        onapply: (profile: MachineProfile) => void;
        onclose: () => void;
    } = $props();

    type Draft = { name: string; peripheral_window: number } & Record<ProfileAddressField, string>;

    const hex4 = (v: number) => v.toString(16).toUpperCase().padStart(4, "0");

    function toDraft(profile: MachineProfile): Draft {
        const draft = { name: profile.name, peripheral_window: profile.peripheral_window } as Draft;
        for (const field of PROFILE_ADDRESS_FIELDS) draft[field] = hex4(profile[field]);
        return draft;
    }

    function fromDraft(draft: Draft): MachineProfile {
        const profile = { name: draft.name.trim(), peripheral_window: draft.peripheral_window } as MachineProfile;
        for (const field of PROFILE_ADDRESS_FIELDS) {
            const text = draft[field].trim();
            profile[field] = /^[0-9a-f]{1,4}$/i.test(text) ? parseInt(text, 16) : NaN;
        }
        return profile;
    }

    // selectedIndex === -1 — новый, ещё не сохранённый профиль.
    let selectedIndex = $state(0);
    let draft = $state<Draft>(toDraft(RK86_CLASSIC));
    let listElement = $state<HTMLDivElement>();
    let nameInput = $state<HTMLInputElement>();

    onMount(() => {
        const active = profiles.findIndex((p) => p.name === activeName);
        select(active >= 0 ? active : 0);
        listElement?.focus();
    });

    export function focus() {
        listElement?.focus();
    }

    const selected = $derived(selectedIndex >= 0 ? profiles[selectedIndex] : undefined);
    const readOnly = $derived(selected !== undefined && isClassicProfile(selected));
    const isNew = $derived(selectedIndex < 0);
    const candidate = $derived(fromDraft(draft));
    const errors = $derived.by(() => {
        const list = validateProfile(candidate);
        const clash = profiles.some((p, i) => i !== selectedIndex && p.name === candidate.name);
        if (clash) list.push(`профиль «${candidate.name}» уже существует`);
        return list;
    });
    const dirty = $derived.by(() => {
        if (!selected) return true;
        const original = toDraft(selected);
        return (
            draft.name !== original.name ||
            draft.peripheral_window !== original.peripheral_window ||
            PROFILE_ADDRESS_FIELDS.some((f) => draft[f].toUpperCase() !== original[f])
        );
    });
    const canSave = $derived(!readOnly && dirty && errors.length === 0);
    const canDelete = $derived(selected !== undefined && !readOnly && selected.name !== activeName);
    const canApply = $derived(selected !== undefined && !dirty && selected.name !== activeName);

    function select(index: number) {
        selectedIndex = index;
        draft = toDraft(profiles[index]);
    }

    function startNew() {
        const base = selected ?? RK86_CLASSIC;
        let name = `${base.name}-2`;
        for (let n = 2; profiles.some((p) => p.name === name); n++) name = `${base.name}-${n}`;
        selectedIndex = -1;
        draft = { ...toDraft(base), name };
        setTimeout(() => nameInput?.select(), 0);
    }

    function save() {
        if (!canSave) return;
        const next = profiles.slice();
        if (isNew) next.push(candidate);
        else next[selectedIndex] = candidate;
        onchange(next);
        selectedIndex = next.findIndex((p) => p.name === candidate.name);
        draft = toDraft(candidate);
    }

    function remove() {
        if (!canDelete || !selected) return;
        const next = profiles.filter((_, i) => i !== selectedIndex);
        onchange(next);
        select(Math.min(selectedIndex, next.length - 1));
    }

    function apply() {
        if (!canApply || !selected) return;
        onapply(selected);
    }

    function revert() {
        if (isNew) select(0);
        else select(selectedIndex);
    }

    function onListKeydown(e: KeyboardEvent) {
        e.stopPropagation();
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                select(Math.min(Math.max(selectedIndex, 0) + 1, profiles.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                select(Math.max(selectedIndex - 1, 0));
                break;
            case "Enter":
                e.preventDefault();
                apply();
                break;
            case "Escape":
                e.preventDefault();
                onclose();
                break;
        }
    }

    function onFormKeydown(e: KeyboardEvent) {
        e.stopPropagation();
        if (e.key === "Escape") {
            e.preventDefault();
            onclose();
        } else if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault();
            save();
        }
    }

    function normalizeField(field: ProfileAddressField) {
        const text = draft[field].trim();
        if (/^[0-9a-f]{1,4}$/i.test(text)) draft[field] = hex4(parseInt(text, 16));
    }
</script>

<div class="profile-editor">
    <div class="header">
        <span class="title">Профили оборудования</span>
        <span class="hint">↑↓ выбор · Enter применить · Esc закрыть</span>
    </div>
    <div class="body">
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="list" bind:this={listElement} tabindex="0" onkeydown={onListKeydown} role="listbox" aria-label="Профили">
            {#each profiles as profile, index (profile.name)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                    class="item"
                    class:selected={index === selectedIndex}
                    role="option"
                    tabindex="-1"
                    aria-selected={index === selectedIndex}
                    onclick={() => select(index)}
                    ondblclick={() => {
                        select(index);
                        apply();
                    }}
                >
                    <span class="name">{profile.name}</span>
                    <span class="badges">
                        {#if isClassicProfile(profile)}<span class="badge lock" title="Встроенный профиль">🔒</span>{/if}
                        {#if profile.name === activeName}<span class="badge active" title="Активный профиль">●</span>{/if}
                    </span>
                </div>
            {/each}
            {#if isNew}
                <div class="item selected" role="option" tabindex="-1" aria-selected="true">
                    <span class="name new">{draft.name || "новый профиль"}</span>
                    <span class="badges"><span class="badge">новый</span></span>
                </div>
            {/if}
            <button type="button" class="new" onclick={startNew}>+ Новый профиль</button>
        </div>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="form" onkeydown={onFormKeydown}>
            <div class="row">
                <label for="profile-name">Имя</label>
                <input
                    id="profile-name"
                    type="text"
                    class="name"
                    maxlength="32"
                    bind:this={nameInput}
                    bind:value={draft.name}
                    disabled={readOnly}
                    spellcheck="false"
                />
            </div>
            {#each PROFILE_ADDRESS_FIELDS as field}
                <div class="row">
                    <label for="profile-{field}">{PROFILE_FIELD_LABELS[field]}</label>
                    <input
                        id="profile-{field}"
                        type="text"
                        class="hex"
                        maxlength="4"
                        bind:value={draft[field]}
                        onblur={() => normalizeField(field)}
                        disabled={readOnly}
                        spellcheck="false"
                    />
                </div>
            {/each}
            <div class="row">
                <label for="profile-peripheral-window">{PERIPHERAL_WINDOW_LABEL}</label>
                <select id="profile-peripheral-window" bind:value={draft.peripheral_window} disabled={readOnly}>
                    {#each PERIPHERAL_WINDOWS as window}
                        <option value={window}>{peripheralWindowLabel(window)}</option>
                    {/each}
                </select>
            </div>
            <div class="note">
                ОЗУ: 0000–{draft.ram_end.toUpperCase()}, ПЗУ: {draft.rom_start.toUpperCase()}–FFFF. Базы периферии кратны размеру
                окна ({hex4(draft.peripheral_window)}); в классическом РК86 окно 8 КБ — дешифратор К555ИД7 по A13..A15.
            </div>
            {#if readOnly}
                <div class="note">Встроенный профиль нельзя изменить или удалить. Нажмите «Новый профиль», чтобы создать копию.</div>
            {:else if errors.length}
                <ul class="errors">
                    {#each errors as error}
                        <li>{error}</li>
                    {/each}
                </ul>
            {/if}
            <div class="actions">
                <button type="button" class="danger" onclick={remove} disabled={!canDelete}>Удалить</button>
                <span class="spacer"></span>
                {#if dirty && !readOnly}
                    <button type="button" onclick={revert}>Отменить</button>
                {/if}
                <button type="button" onclick={save} disabled={!canSave}>Сохранить</button>
                <button type="button" class="primary" onclick={apply} disabled={!canApply} title="Активировать профиль и перезапустить эмулятор">
                    Применить
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .profile-editor {
        display: flex;
        flex-direction: column;
        width: 64vw;
        max-width: 820px;
        min-height: 360px;
        font-family: monospace;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 0 4px 12px;
        gap: 12px;
    }
    .title {
        font-weight: bold;
        font-size: 1.1em;
    }
    .hint {
        color: #999;
        font-size: 0.8em;
    }
    .body {
        display: grid;
        grid-template-columns: 240px 1fr;
        gap: 16px;
        min-height: 0;
    }
    .list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        outline: none;
        border-right: 1px solid #333;
        padding-right: 12px;
    }
    .list:focus .item.selected {
        border-color: #ffcc00;
    }
    .item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 4px;
        border: 1px solid transparent;
    }
    .item.selected {
        background-color: #3a3a3a;
        border-color: #888;
    }
    .item .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .item .name.new {
        color: #ffcc00;
        font-style: italic;
    }
    .badges {
        display: flex;
        gap: 6px;
        font-size: 0.8em;
        color: #999;
    }
    .badge.active {
        color: #66dd88;
    }
    .list .new {
        all: unset;
        margin-top: 8px;
        padding: 6px 8px;
        color: #b0d8ff;
        cursor: pointer;
        border-radius: 4px;
    }
    .list .new:hover {
        background-color: #2c333d;
    }
    .form {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .row {
        display: grid;
        grid-template-columns: 1fr 8ch;
        align-items: center;
        gap: 10px;
    }
    .row label {
        color: #b0b6c0;
    }
    .row input {
        background: #2c333d;
        color: white;
        border: 1px solid #3a424d;
        border-radius: 4px;
        padding: 4px 6px;
        font-family: monospace;
    }
    .row input.hex {
        text-transform: uppercase;
        text-align: right;
    }
    .row select {
        grid-column: 2;
        justify-self: end;
        background: #2c333d;
        color: white;
        border: 1px solid #3a424d;
        border-radius: 4px;
        padding: 4px 6px;
        font-family: monospace;
    }
    .row:has(select) {
        grid-template-columns: 1fr auto;
    }
    .row select:disabled {
        color: #999;
        background: #262b32;
    }
    .row input.name {
        grid-column: 2;
        width: 24ch;
        justify-self: end;
    }
    .row:has(input.name) {
        grid-template-columns: 1fr auto;
    }
    .row input:disabled {
        color: #999;
        background: #262b32;
    }
    .note {
        color: #888;
        font-size: 0.8em;
        line-height: 1.4;
    }
    .errors {
        margin: 0;
        padding-left: 1.2em;
        color: #ff8080;
        font-size: 0.85em;
    }
    .actions {
        display: flex;
        gap: 8px;
        margin-top: auto;
        padding-top: 12px;
    }
    .actions .spacer {
        flex: 1;
    }
    .actions button {
        background: #444;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 14px;
        cursor: pointer;
        font: inherit;
    }
    .actions button:hover:not(:disabled) {
        background: #555;
    }
    .actions button.primary {
        background: #4a6dbe;
    }
    .actions button.primary:hover:not(:disabled) {
        background: #5b7fcf;
    }
    .actions button.danger:hover:not(:disabled) {
        background: #a33;
    }
    .actions button:disabled {
        background: #333;
        color: #777;
        cursor: not-allowed;
    }
</style>
