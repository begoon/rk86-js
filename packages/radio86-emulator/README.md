# radio86-emulator

Эмулятор Радио-86РК (Intel 8080) в виде web component `<radio86-emulator>`.

Монитор-ROM встроен в бандл — компонент стартует без сетевых запросов.

## Установка

```bash
npm install radio86-emulator
```

## Использование

```html
<script type="module">
    import "radio86-emulator";
</script>

<radio86-emulator></radio86-emulator>
```

С автозагрузкой программы (файл хостится у вас):

```html
<radio86-emulator files-path="/files/" file="CHESS.GAM"></radio86-emulator>
```

## Атрибуты

- `monitor` — имя монитор-ROM. По умолчанию `mon32.bin`. Встроены
  `mon32.bin` и `mon32-color.bin`. Любое другое имя загружается через
  `fetch(\`${files-path}${monitor}\`)`.
- `file` — программа для автозагрузки (`.rk`, `.gam`, `.bin`, snapshot
  `.json`, `#!rk86` hex-dump). Загружается через `fetch`.
- `files-path` — база для `fetch` файлов программ. По умолчанию `files/`.
- `scale` — `auto` для масштабирования браузером. По умолчанию 1:1 с
  `image-rendering: pixelated`.
- `focusable` — слушать клавиатуру только когда элемент в фокусе
  (`tabindex=0`). Без атрибута — клавиатура слушается на `document`.

## Событие `ready`

```js
const emu = document.querySelector("radio86-emulator");
emu.addEventListener("ready", (e) => {
    const { machine } = e.detail;
    // machine.reset(), machine.restart(), machine.pause(true|false)
});
```

## Лицензия

MIT
