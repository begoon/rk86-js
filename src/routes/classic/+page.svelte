<svelte:head>
    <meta http-equiv="refresh" content="0; url=../" />
    <title>Redirect to rk86.ru</title>
</svelte:head>

<script lang="ts">
    import { onMount } from "svelte";
    import { resolve } from "$app/paths";

    onMount(() => {
        window.location.replace(resolve("/"));
    });
</script>

<p>
    Классическая версия снята с поддержки. Перенаправление на
    <a href={resolve("/")}>основной эмулятор</a>…
</p>
