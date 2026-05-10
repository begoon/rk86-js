# Changelog

## 2026-05-10

### i8275: исправлена раскладка битов в field-attribute байте

Описание раскладки в `info/rk86_i8275_color_spec.md` ссылалось на
ошибочный порядок бит (`U` в bit 0, `H` в bit 3) — в реальности
Intel 8275 datasheet (и реализации в Emu80 / MAME / 86rk.ru)
кладут биты иначе:

```
bit 7  6  5  4  3  2  1  0
    1  0  U  R  GG GG B  H
                │  │  │  └── H    = Highlight (HLGT)
                └──┴──┴───── G0/G1, B (Blink)
```

С прежней формулой `color_index = (raw >> 1) & 0x07` извлекались
биты 1-3 (B, G0, G1) — что давало неверный цвет: dizzy75 показывал
красный как белый, жёлтый как синий, и т.д. Теперь:

```ts
color_index = ((raw & 0x01) << 2)        // H → bit 2 of index
            | ((raw & 0x0c) >> 2)        // G1,G0 → bits 1,0
```

Палитра (`COLORS[color_index]`) не менялась — изменился только
способ извлечения индекса из байта. После фикса все colorized
программы (dizzy75, squash, boulder, rise, piton) рисуют цвета,
совпадающие с Emu80 RCM_COLOR1 / 86rk.ru.

### i8275: однопозиционный сдвиг цветовых границ (Emu80 RCM_COLOR1)

Emu80 в RCM_COLOR1 включает `m_hgltOffset` и `m_gpaOffset` —
ячейка N рендерится с защёлкнутыми атрибутами ячейки N+1. Из-за
этого новый цвет визуально появляется на одну клетку **раньше**
field-attribute байта. Без этого сдвига цветовые регионы
выглядели «сдвинутыми вправо» относительно эталонного Emu80.

Реализовано look-ahead в renderer'е: для каждой ячейки смотрим
следующий байт; если он field-attribute — берём из него
displayColor, иначе используем текущий защёлкнутый цвет.
Последняя ячейка строки сохраняет свой защёлкнутый цвет
(совпадает с Emu80: `if (chr == nChars - 1) ...`).

### Терминальный рендер: фильтрация FA-байт

`TerminalRenderer.update()` пропускал байты field-attribute
(`$80-$BF`) и character-attribute (`$C0-$EF`) через `rk86char()`,
из-за чего они выводились как «инверс-видео» из mirror-маппинга
`charMap[0x80+i] = charMap[i]`. На colored программах это
выглядело как мусорные глифы между обычными символами.

Теперь терминальный рендер выполняет ту же i8275-классификацию
байтов, что и `dumpScreen()`: FA / char-attr / special control
рисуются как пробел. Терминал остаётся монохромным — цвет от
field-attribute байтов отбрасывается.

### tree2025.rk — известное расхождение с 86rk.ru

`tree2025.rk` ожидает **transparent** field-attribute mode —
в нём данные строки хранятся как `[FA][char][FA][char]…`, а
chip в transparent mode пропускает FA-клетку (next char занимает
её место через FIFO). 86rk.ru в `radio-86rk-nova` config'е
использует `monitor-32.rom` с `byte 4 = 0x82` (transparent),
поэтому елка там симметрична.

Наш `mon32.bin` пишет в SCN4 байт `0x93` (transparent) — но
рендерер реализует только visible mode, так что fa-байты
занимают клетки и дерево «расширено вправо». Полноценная
эмуляция transparent mode требует моделирования внутреннего
FIFO i8275 и DMA-burst заполнения — это нетривиально и в
текущей итерации намеренно отложено: остальные colored
программы (dizzy75, squash, boulder, rise, piton) визуально
корректны в visible mode, и приоритет на их сохранении.

## 2026-05-09

### i8275: цветовая палитра — переход на Emu80 RCM_COLOR1 (де-факто стандарт)

Обнаружилось, что наш цветовой mapping (Tolkalin per spec — `GPA0→R,
GPA1→G, HLGT→B`) не совпадает с тем, что выводит **Emu80 в режиме
RCM_COLOR1** (де-факто референс для colorized RK86-программ). Emu80
использует **3-way ротацию**: `GPA0→Green, GPA1→Blue, HLGT→Red`.
Большинство цветных RK-программ (dizzy75, etc.) тестировались
именно под Emu80, и наш Tolkalin-маппинг показывал «не те» цвета.

Найдено в исходнике Emu80 (`src/Rk86.cpp:Rk86Renderer::getCurFgColor`):

```cpp
case RCM_COLOR1:
    res = (gpa1 ? 0x0000FF : 0)   // GPA1 → Blue
        | (gpa0 ? 0x00FF00 : 0)   // GPA0 → Green
        | (hglt ? 0xFF0000 : 0);  // HLGT → Red
```

Реализация в эмуляторе обновлена под Emu80-mapping. С `color_index =
(byte >> 1) & 0x07` палитра теперь:

| color_index | Бит-сигнал | Цвет        |
|-------------|------------|-------------|
| 0           | (none)     | light gray (fallback) |
| 1           | G0 only    | green       |
| 2           | G1 only    | blue        |
| 3           | G0+G1      | cyan        |
| 4           | H only     | red         |
| 5           | H+G0       | yellow      |
| 6           | H+G1       | magenta     |
| 7           | H+G0+G1    | white       |

Default color (когда attr ещё не установлен в строке) — index 0
(light gray), как у Emu80 (для cell без attr поля все биты 0,
формула даёт 0, fallback к 0xC0C0C0).

`info/RK86.md` обновлён с новой таблицей пинов/палитры и пометкой
о Tolkalin-разводке (всё ещё описана в `info/rk86_i8275_color_spec.md`
как оригинальная схема).

### i8275: возврат к visible field-attribute mode (фиксированное позиционирование)

Я откатил предыдущий переход на transparent mode — он ломал
программы вроде `boulder.rkr`, в которых вертикальные линии
строятся из символов на фиксированных колонках, и атрибуты не
должны сдвигать содержимое строки. В transparent mode атрибут-байт
не занимает клетки, и chars сдвигались влево на N (где N = число
attrs до них в строке) — отсюда «curved» вертикальные линии.

Реальное железо в transparent mode заполняет «дыру» от атрибута
байтом из FIFO (16-байтовый внутренний буфер i8275, пополняемый
дополнительными DMA-burst'ами). Без моделирования FIFO наш naive
transparent даёт сдвиг.

Spec из `info/rk86_i8275_color_spec.md` явно рекомендует:

> if you only care about RK86 you can usually ignore this mode —
> most colorized RK programs use visible mode

Так что vis mode — наш default. Поведение:

- `$00-$7F` → глиф в текущем цвете
- `$80-$BF` → ячейка пустая, цвет защёлкнут на оставшуюся строку
- `$C0-$EF` → ячейка пустая
- `$F0-$FF` → end of row / end of frame

`tree2025.rk` в visible mode визуально «расширен вправо» вместо
симметрии — это технически корректное поведение по спеке (атрибуты
занимают клетки), но эстетически неприятное. Если когда-нибудь
понадобится точная transparent-mode эмуляция, нужен FIFO.

### i8275: переход на transparent field-attribute mode (правильное позиционирование)

Эмулятор использовал **visible mode** (F=0 в спеке) — атрибут-байт
занимал одну экранную клетку, отображаясь как пробел. Это казалось
безопасным дефолтом, но было неверно для РК86: цветные программы
(tree2025.rk, rise.rkr и др.) ожидают **transparent mode** (F=1) —
атрибут-байт не занимает клетки, только защелкивает цвет, а
следующая клетка выводит следующий символ.

Симптом на tree2025.rk: симметричное X-mas дерево вместо ровной
ёлки выходило сильно «расширенным вправо», потому что каждая пара
`(attr,char)` в видеопамяти рисовалась как `(blank, char)` —
эффективно удваивая ширину каждой строки и сдвигая её вправо.

Теперь оба canvas-рендерера (`kit` и `classic`) и терминальный
`dumpScreen` обрабатывают field-attribute байты `$80-$BF` как
**прозрачные** — они изменяют цвет для оставшейся части строки,
но **не продвигают позицию вывода**. Следующий символ занимает
клетку, на которую «должен был» сесть атрибут.

Структура цикла (псевдокод):

```js
let dstX = 0;
for (let srcX = 0; srcX < width; srcX++) {
    const raw = read(addr + srcX);
    if (raw >= 0xf0) break;                  // end of row/screen
    if (raw >= 0xc0) { drawBlank(dstX++); continue; }  // char attr
    if (raw >= 0x80) { color = (raw>>1)&7; continue; } // field attr — NO cell
    drawChar(dstX++, raw, color);             // normal char
}
// pad remaining cells with blank in current color
while (dstX < width) drawBlank(dstX++);
```

Поведенческое следствие: программы, рассчитанные на стандартный
RK86-монитор (SCN4 с включённым transparent mode), теперь
рисуют корректно центрированный контент. Программы, ожидавшие
visible mode, могут отображаться чуть смещённо — но таких на
РК86 в дикой природе мало (наследие монитора по умолчанию —
transparent).

Это также окончательно объясняет «random characters outside
64×25 working area» в rise.rkr и boulder.rkr из ранних
наблюдений: это были field-attribute байты, занимавшие клетки в
visible mode и видимые как мусор за пределами игрового поля.
Теперь они невидимы (cell не consumed), и игровое содержимое
рисуется по правильным позициям.

### i8275 byte classification + RGB color rendering (Tolkalin scheme)

VG75 (i8275) классифицирует каждый байт из видеопамяти по старшим
битам — это и есть основа цветного режима РК86 по Толкалинской
схеме (Радиолюбитель 04/1992):

| Диапазон    | Тип                                                   |
|-------------|-------------------------------------------------------|
| `$00-$7F`   | Normal character — обычный 7-битный код символа       |
| `$80-$BF`   | Field attribute — латчит цвет/highlight/blink, ячейка пустая |
| `$C0-$EF`   | Character attribute — line graphics (РК86 не использует) |
| `$F0-$FF`   | Special control — End of Row / End of Frame           |

Раньше эмулятор интерпретировал старший бит (0x80) как «инверсия»
по convention'у стандартного charROM РК86 (256 глифов, верхняя
половина — инвертированные версии нижней). Это работало для B/W
программ, но **ломало все цветные программы**: байты вроде `0x84`,
`0x88`, `0x8D` — поля атрибутов в Толкалинской схеме — рисовались
как инвертированные глифы вместо «пустая клетка + смена цвета».
Игроки видели «случайные символы» вне основной 64×25 области игры,
особенно в `rise.rkr` и `boulder.rkr`.

Теперь оба рендерера (canvas в `kit` и `classic`, плюс терминал
`dumpScreen`) классифицируют байты строго по i8275:

- `$00-$7F` → отрисовать символ из шрифта в **текущем цвете** строки
- `$80-$BF` → защелкнуть новый цвет (`color = (byte >> 1) & 0x07`)
  для оставшейся части строки, **сама ячейка отображается как
  пустая** (с уже новым цветом)
- `$C0-$EF` → пустая ячейка (графика char attribute не реализована,
  РК86 их не генерирует)
- `$F0-$FF` → end of row / end of frame (как раньше)

Цвет сбрасывается в **белый (default = 7)** в начале каждой строки —
точно как chip делает по `vrtc_start` в MAME.

Mapping атрибутных бит на цвета (Tolkalin):

```text
field-attr byte: 1 0 0 B H GG GG U
                       │ └──┴── GPA0/GPA1
                       └────── HLGT

GPA0 (бит 1) → Red
GPA1 (бит 2) → Green
HLGT (бит 3) → Blue
color_index = (byte >> 1) & 7   // 8-цветная RGB-палитра
```

Палитра:

```text
0 black    1 red      2 green     3 yellow
4 blue     5 magenta  6 cyan      7 white
```

Реализация цвета в canvas-рендерах: на `font.onload` строится 8
**предтонированных копий шрифта** через `globalCompositeOperation =
"multiply"` — для 1-битного BMP (white-on-black) это даёт корректный
тинт (white × color = color, black × color = black). `drawChar`
выбирает нужную тонированную копию шрифта по индексу цвета. Кэш
ячеек теперь учитывает и цвет (`cacheKey = ch | (color << 8)`),
поэтому смена цвета корректно триггерит redraw.

Терминальный `dumpScreen` остаётся монохромным — атрибуты и
char-attribute ячейки отображаются как пустые, цвет игнорируется
(в текстовом дампе всё равно нет смысла его показывать).

Полная спецификация формата байтов — в
`info/rk86_i8275_color_spec.md`.

**Поведенческое следствие**: программы РК86, которые использовали
байты `0x80+` как «инверсные глифы» (некоторые B/W-программы),
теперь видят их как «пустые ячейки + смена цвета» — это
hardware-correct поведение, но визуально может отличаться от
прежнего. На практике большинство таких программ либо вообще не
писали `0x80+` в видеопамять, либо использовали их в местах,
которые на TV всё равно обрезались overscan'ом — поэтому
визуальная регрессия маловероятна. Цветные же программы (rise,
boulder, etc.) теперь корректно рендерятся в цвете.

### Зеркалирование периферии: per-peripheral маски + F-range mirrors для VT57

Расширение предыдущего фикса (read-сторона учитывает A12 don't-care).
На реальном железе РК86 каждый периферийный чип получает с CPU
**только столько младших адресных бит, сколько у него есть
регистров**:

- PPI (ВВ55) — 4 регистра, 2 бита (A0..A1)
- VG75 — 2 регистра, 1 бит (A0)
- VT57 — 16 регистров, 4 бита (A0..A3)

Все остальные биты адреса в пределах chip-select зоны (8 КБ) —
**don't-care для чипа**, и регистры повторяются в виде зеркал.
Маска `addr & 0xEFFF` обнуляла только A12, что покрывало А12
don't-care, но **не остальные** don't-care биты внутри 8К-зоны.

Программа `rise.rkr` (RISE) активно использует эти зеркала:

- `D001` (cmd/status, mirror of `C001`) — работало после
  предыдущего фикса
- `D002` (data, mirror of `C000` — A0=0) — **не работало**, т. к.
  `D002 & 0xEFFF = C002 ≠ C000`
- `F808`, `F804`, `F805` (VT57 mirrors of `E008/E004/E005`,
  A12 set + старшие биты тоже выше) — **вообще не работало**: их
  блокировал `if (addr >= 0xf800) return` ради защиты ROM, и
  даже без этой защиты `F808 & 0xEFFF = E808 ≠ E008`

Теперь в обоих обработчиках (read + write) используются
**per-peripheral маски**:

```js
ppi_reg  = addr & 0xE003   // 8000-9FFF, A000-BFFF (PPI)
vg75_reg = addr & 0xE001   // C000-DFFF (VG75)
vt57_reg = addr & 0xE00F   // E000-FFFF (VT57, write-side; включая F-range)
```

Защита ROM от перезаписи теперь делается отдельно: `if (addr <
0xF800) buf[addr] = byte` обновляет RAM-буфер только для не-ROM
адресов, а periphery-handlers вызываются всегда. F-range writes к
VT57-зеркалам (например, `F808` ≡ `E008`) теперь корректно
проходят на DMA-контроллер, а ROM-чтения в `F800-FFFF` остаются
нетронутыми (читают из buf).

В `info/RK86.md` (раздел Memory map → "Дешифрация адресов и
зеркалирование периферии") расширена таблица per-peripheral масок,
добавлено объяснение F-range мirrors для VT57 и того, как
эмулятор их теперь моделирует.

Эмпирически: после фикса `rise.rkr` корректно инициализирует
видео — vmem на `0x66D0`, размер 78×35, DMA-байтов 0x0AAA.
Раньше видео оставалось в зоне монитора (`0x76D0`, 78×30) и
внешние записи в `F808`/`F804`/`F805` уходили в никуда — отсюда
визуальный «hang».

### Зеркалирование периферии: read-сторона теперь учитывает A12 don't-care

Дешифратор периферии РК86 (К555ИД7) использует только биты A13..A15
для chip-select, A12 для него don't-care. Внутри каждой 8К-зоны
(`8000-9FFF` PPI клавиатуры, `A000-BFFF` PPI ленты, `C000-DFFF`
VG75, `E000-EFFF` ВТ57) регистры чипа повторяются многократно как
зеркала. То есть `0xD001` физически читает тот же регистр, что и
`0xC001` (VG75 status), `0x9001` — то же, что `0x8001` (keyboard
scan), и т. д.

**Write-обработчик** в `Memory` это уже учитывал через маску
`addr & 0xEFFF` (обнуляет A12). **Read-обработчик** — нет: он
сравнивал адрес точно, и чтение из зеркала (`D001`, `9001` и пр.)
проваливалось на `buf[addr]`, возвращая 0.

Теперь оба обработчика используют одну и ту же маску
`peripheral_reg = addr & 0xEFFF` для диспетчеризации. Маска не
ломает чтение монитора в `F800-FFFF`: `F800 & 0xEFFF = 0xE800`, не
матчит ни один периферийный регистр, проваливается на `buf[addr]`
и возвращает корректный ROM-байт.

В `info/RK86.md` (раздел Memory map) добавлено развёрнутое
описание дешифрации адресов: таблица chip-select по A13..A15,
сводка адресных входов чипов, таблица зеркал, тонкость с разделом
ROM/ВТ57 (где второй уровень дешифрации разводит F800-FFFF и
E000-EFFF несмотря на общий A13..A15 = 111).

### Документация: внутреннее устройство DRAM К565РУ3 и RAS/CAS-маппинг

В разделе про DRAM-регенерацию (`info/RK86.md`, Tape) развёрнуто
объяснение того, **как чтение видеопамятью VG75 (всего 2340 байт)
успевает освежать все 32 КБ оперативной памяти РК86**. Добавлены
подразделы:

- **Внутреннее устройство К565РУ3**: 128 строк × 128 столбцов,
  sense-amps, RAS как акт регенерации, CAS как выбор столбца.
  Главный факт: один RAS-цикл со строкой N регенерирует ВСЕ 128
  ячеек этой строки одновременно, независимо от того, какой
  столбец прочитан.
- **Маппинг 14-битного адреса CPU на адрес строки DRAM**: 7-битный
  адресный вход чипа получается мультиплексированием — `CPU_A0..A6`
  в RAS-фазе, `CPU_A7..A13` в CAS-фазе. Битовая раскладка
  определяется разводкой платы; в РК86 в RAS идут младшие 7 бит.
  Следствие: **строка DRAM = `CPU_A0..A6 = N` независимо от
  старших бит**.
- **Общий RAS на оба банка**: в РК86 RAS подаётся одновременно на
  все 16 чипов обоих 16-КБ банков, банки различаются только
  коммутацией CAS и data-bus через дешифратор `A14`. Поэтому любой
  доступ к любому адресу регенерирует строку с тем же `A0..A6`
  сразу в обоих банках.

Расчёт частоты регенерации обновлён: VG75 читает 2340 байт = **18
полных циклов A0..A6 за кадр** × 50 кадров/с = **900 регенераций
каждой строки в секунду** при требуемом минимуме 500. Резюме
цепочки фактов сведено в нумерованный список из 6 пунктов для
быстрой справки.

### Документация: `POP PSW` как DRAM-регенератор в записи на ленту

В `info/RK86.md` добавлено подробное объяснение трюка с `POP PSW`
по адресу `0xFC7B` в мониторе РК86 — внутри routine'ы записи бита
на ленту. Это не работа со стеком, а **способ регенерации
динамической памяти К565РУ3 на время, когда DMA-видеоконтроллер
выключен** ради точности тайминга записи.

Раздел в Tape (`### DRAM-регенерация во время записи на ленту:
трюк с POP PSW`) разбирает:

- Почему DRAM в РК86 нужно регенерировать (К565РУ3, утечка
  заряда, окно ~2 мс, 128 строк адресуемых A0..A6).
- Как обычно регенерация делается «бесплатно» через DMA-чтение
  видеопамяти VG75 (2340 байт > 128, все строки проходятся).
- Почему DMA выключают на время записи на ленту (cycle-stealing
  ломает тайминги полупериодов).
- Почему `POP PSW` идеален как «memory walker»: 1 байт, 10 T,
  два чтения + автоинкремент SP = 2 строки/итерация без
  отдельной `INX`/`INR`.
- Тайминг 25 T/итерация на 1.78 МГц ≈ 14 мкс, 64 итерации = 128
  байт = все 128 строк за ~900 мкс (≪ 2 мс окно).
- Роль `SPHL` в `0xFC85` для восстановления настоящего стека.
- Сравнительная таблица альтернатив (`POP B/D/H`, `MOV A,M`,
  `LDA`, `LDAX`, `NOP`) и почему `POP PSW` выигрывает.
- Замечание про instruction-fetch (тоже регенерирует, но только
  фиксированные 5 строк кода — этого мало).

В Reversing cheat sheet добавлена запись для распознавания
паттерна `F1 05 C2 ?? ??` (POP PSW + DCR B + JNZ self) как
DRAM-refresh delay loop.

### VG75: специальные управляющие символы 0xF0..0xFF (End of Row / End of Frame)

В микросхеме `i8275` (К580ВГ75) старший hex-блок `0xF0..0xFF`
зарезервирован под **специальные управляющие коды (Special Control
Characters)**. Эти байты не рисуются как глифы — VG75 их
интерпретирует как команды управления выводом:

- `0xF0..0xF7` — End of Row: оборвать текущую строку. VG75 не рисует
  ни байт-команду, ни оставшиеся столбцы строки. Подварианты
  отличаются атрибутами и наличием Stop-DMA.
- `0xF8..0xFF` — End of Frame / End of Screen: оборвать текущую
  строку **и все последующие**. Применяется для динамической
  обрезки кадра.

В РК86 это широко используется для аккуратного обрезания строки
до меньшей ширины, чем запрограммированные 78 столбцов VG75.
Программа Squash от Дмитрия Иванова (2024), например, ставит `0xF1`
ровно на col 68 каждой строки splash-экрана — на реальном железе
это даёт чистую границу видимой области шириной 68 столбцов
(остальные 10 столбцов обрезаются самим VG75 ещё до выхода
сигнала на ТВ).

Наши renderer'ы — браузерный canvas (`kit/src/lib/web/renderer.ts`),
терминальный `dumpScreen` (`kit/src/lib/terminal/rk86_terminal.ts`)
и canvas `classic/` (`classic/src/rk86_screen.js`) — раньше читали
байты из видеопамяти напрямую и прогоняли их через декодер шрифтов.
Байт `0xF1` после strip-bit-7 (`& 0x7F`) превращался в код `0x71`,
а в charROM РК86 на этой позиции стоит «Я». Из-за этого в Squash
каждая строка splash-экрана получала вертикальную колонку из «Я»
на col 68 — то, что на реальном железе и в Emu80 не отображается.

Теперь при встрече байта `0xF0..0xFF` рендер:

1. Не рисует глиф для самого байта (выводится пустая клетка).
2. Помечает текущую строку как «оборванную» — все последующие
   столбцы этой строки тоже выводятся пустыми.
3. Если байт в диапазоне `0xF8..0xFF` (End of Frame), помечает
   также весь кадр как «оборванный» — все последующие строки
   выводятся пустыми.

В кэшируемом canvas-render'е флаг truncated применяется к самому
рисованию, а кэш `cache[i]` обновляется на значение `0` (пустая
клетка). При изменении байта в памяти кэш-mismatch корректно
триггерит перерисовку.

### IK57: повторное программирование канала через flip-flop первого/второго байта

В микросхеме `i8257` (КР580ВТ57, она же ИК57) каждый из адресных
регистров каналов 16-битный, но обращение к нему идёт через 8-битные
порты. Внутренний flip-flop (F/F) определяет, в какую половину
попадёт следующая запись — в младшую или старшую. F/F сбрасывается
командой master-clear (`E008 = 0x80`) и переключается при каждой
записи в адресный регистр канала.

Старая реализация распознавала только начальную последовательность
инициализации:
`E008,80 → E004,lo → E004,hi → E005,lo → E005,hi → E008,A4`.
Любая последующая прямая запись в `E004`/`E005` без повторного
master-clear считалась случайной и просто складывалась в RAM, не
оказывая влияния на DMA. Программы, которые после инициализации
перепрограммируют адрес видеопамяти на лету, не получали ожидаемого
эффекта: DMA продолжал читать кадр со старого адреса, и игровое
поле рисовалось в одну область памяти, а на экран отображалась
другая.

Конкретный пример из Squash, по адресу `0x0061`:
```
LXI  H, E004
MVI  M, BB    ; ожидание: low-byte → 0x07BB
MVI  M, 07    ; ожидание: high-byte
```
Это две последовательные записи в `E004`, рассчитанные на работу
flip-flop'а: первая ставит младший байт нового адреса канала,
вторая — старший. Без поддержки F/F эмулятор молча игнорировал
обе записи, и движок продолжал читать DMA со старого `0x134F`
(splash), хотя игра перенаправила его на свой буфер `0x07BB`.

Добавлено поле `ik57_ff` (общий F/F) с поведением:
- Сбрасывается в 0 при `E008 = 0x80` (master clear) — синхронно с
  тем, как существующая state-machine `ik57_e008_80_cmd`
  переходит в режим инициализации.
- Переключается при каждой прямой записи в `E004` или `E005`
  (когда `ik57_e008_80_cmd === 0`, то есть первичная инициализация
  уже завершена и порт открыт для текущего управления).
- На «втором» байте (F/F = 1) применяет 16-битное значение через
  `screen.set_video_memory(...)` для `E004` и через обновление
  `video_memory_size` для `E005`, после чего сбрасывает F/F
  обратно в 0.

`ik57_ff` добавлен в JSON-снапшот; импорт делает поле опциональным
(`?? 0` в `kit`, `!= null ? h(...) : 0` в `classic`), чтобы старые
снапшоты без него корректно загружались. Соответственно обновлены
golden-фикстуры в `kit/tests/data/*.json`,
`kit/tests/test_snapshot.json` и `classic/tests/snapshot.json`,
а также количество ожидаемых assertions в
`kit/tests/rk86_snapshot.test.ts` (4172 → 4173).

### VG75: корректный сигнал VRTC в регистре состояния `0xC001`

Чтение регистра состояния VG75 по адресу `0xC001` всегда возвращало
константу `0x20` — то есть бит 5 (VRTC, vertical retrace) был
постоянно поднят. Программы, использующие классическую идиому
ожидания вертикальной синхронизации (`LXI H,C001 / MOV A,M / ANI 20 /
JZ`), выходили из цикла ожидания мгновенно: кадровая синхронизация
полностью игнорировалась, и эмулируемая программа выполняла своё
тело кадра на максимальной скорости процессора, без покадровой
паузы.

Симптом, на котором это поймалось: игра Squash от Дмитрия Иванова
(2024). Полный цикл «splash → запуск игры → потеря 3 жизней → game
over → splash» проходил за ~35 мс CPU-времени — ниже порога
восприятия, экран не успевал ни обновиться, ни прокачать DMA, и
визуально это выглядело как «пробел не работает».

Теперь бит 5 (VRTC) переключается в зависимости от позиции внутри
эмулируемого кадра: ноль на первые ~90% кадра (активная развёртка),
единица на оставшиеся ~10% (обратный ход кадровой развёртки).
Эмулируемый кадр = `1 780 000 / 50 = 35 600` тиков, окно VRTC = 3 560
тиков (~10%). Отсчёт ведётся от `runner.total_ticks` —
детерминированно в рамках одного запуска и бит-в-бит совпадает между
turbo- и реал-тайм-режимами (что важно для goldens-тестов терминала).

В `classic/src/main.js` добавлено `memory.runner = runner;`, чтобы
обработчик чтения `C001` имел доступ к счётчику тиков (в `kit/`
`Memory` уже держит ссылку на `Machine` и через неё дотягивается до
runner'а).

После исправления игра Squash идёт со зримой кадровой частотой:
один полный цикл занимает ~2.5 с CPU-времени (3 жизни, ~830 мс на
каждую) вместо прежних ~35 мс.

## 2026-05-04

### Freeze / restore (in-memory snapshots)

- New toolbar buttons: **«Заморозить состояние»** (snowflake) and
  **«Восстановить состояние»** (clock-rewind). Freezes are kept in-memory
  for the page session — up to 20, FIFO eviction of the oldest. No
  persistence across reloads (use the existing «Сохранить полное состояние»
  button or per-row download for a file).
- Each freeze stores a full `rk86_snapshot(...)` JSON plus a thumbnail
  captured via `canvas.toDataURL("image/png")` at freeze time.
- Restore selector is a modal list (newest first) showing thumbnail,
  absolute time, relative time, and the filename loaded at freeze time
  (or "(нет файла)" if none). Per-row actions: download (↓) and
  delete (✕).
- Selector keys: `↑`/`↓` navigate, `Enter` applies the freeze,
  `S` downloads the selected freeze as
  `<filename>-YYYYMMDD-hhmmss.json` (or `rk86-snapshot-…` if no file
  was loaded), `D` deletes, `Esc` closes.
- Cmd/Ctrl+K shortcuts: `Z` = freeze, `X` = open restore selector.

## 2026-04-20

### Assembler

- Replaced the in-page `static/i8080asm.html` iframe assembler with asm8's
  standalone playground at `static/asm/`. The toolbar "Ассемблер" button now
  opens `{base}/asm/` in a new tab. Dropped the `window.parent.machine`
  cross-iframe contract and the `window.machine` / `UI.toggle_assembler`
  exposures that supported it.
- Bumped `asm8080` dep to `^1.0.21` (same package as `asm8`).
- Playground "run"/"download" produces `.rk` files (not `.bin`): 4-byte big-
  endian header (`start`, `end`) + compact payload covering `min(start)..
  max(end)` (gaps zero-filled) + 3-byte trailer (`0xE6`, `rk86_check_sum`
  big-endian). Programs assembled with `org 3000h` no longer carry 12 KB of
  leading zeros.
- Example `.asm` files live under `static/asm/examples/*.asm` and are
  fetched by the playground at load time (one file per `const`, all 11
  fetches kicked off in parallel, awaited per-example on use). Edit a file
  and reload — no rebuild of `playground.js` needed.
- New `?handoff=<uuid>` URL param on the emulator: data URLs in `?run=`
  overflow browser URL limits (~8 KB, Chrome returns 431) for larger
  programs. The playground writes the `.rk` as JSON `{ts, url}` to
  `localStorage["asm8-handoff:<uuid>"]`, opens the emulator with that id,
  and the emulator reads + deletes the key one-shot. Stale keys (>1 h) are
  swept at the next write.
- `?run=` / `?file=` / `?handoff=` autorun now routes through
  `machine.runLoadedFile()` (monitor G-injection), unified with the toolbar
  "Запустить программу" button. Fixes ALIAZ1-style keyboard-state bugs that
  `cpu.jump(entry)` caused.
- Vite dev middleware (in `vite.config.ts`) rewrites `/asm/` and `/asm` to
  `/asm/index.html`; in production the static adapter's output is served
  natively by the webserver and this is a no-op.

### Naming / style conventions (CLAUDE.md)

- `El` suffix → `Element`, `Btn` → `Button`, `res` → `result`; prefer
  `let`/`const` over `var`. Applied throughout `static/asm/playground.js`
  after the asm8 drop-in.

### Terminal emulator

- `--snapshot <файл>` — save the full JSON state snapshot on exit (same format
  as the web emulator, round-trips through `rk86_snapshot_restore`).
- `--input` now accepts `*N` pause tokens between keys, e.g.
  `"KeyD,Enter,*500,KeyG,Enter"` inserts a 500 ms pause.
- `--turbo` — run the emulator without the real-time throttle. E2e tests with
  clear exit conditions (HLT / exit-address) finish ~100× faster while
  producing bit-identical snapshots to non-turbo runs.
- `-G <адрес>` — start a loaded program via the monitor's `G` command
  (keyboard injection) instead of `cpu.jump`. Complement to `-g` (direct
  jump) when the program expects a fresh monitor prompt.

### Determinism

- `--input` key injection is now scheduled by **CPU ticks** rather than
  wall-clock `setTimeout`. Every key event fires at a fixed emulated tick
  regardless of host load, so `--snapshot` output is byte-stable across runs
  and CI environments.
- Cursor blink (`screen.cursor_state`) is CPU-tick-driven (was wall-clock
  `setTimeout`). At real-time speed it still blinks every ~0.5 s wall; under
  turbo / CPU starvation it stays in sync with emulated time.
- `armed` option removed from `runner.execute()` — it was guarding the
  terminate-address check during monitor boot, but stock mon32 never executes
  HLT and never reaches `0xFFFE` during its init path.

### Web UI

- "Запустить программу" (Run) button now injects `G<addr><Enter>` through the
  monitor instead of `cpu.jump(entry)`. Fixes keyboard-state inconsistencies
  in programs that rely on the monitor being at a clean prompt (e.g.
  ALIAZ1).

### Engine

- `Machine.log: (...args: unknown[]) => void` — injectable logger replacing
  hard-coded `console.log` in `Screen`, `Runner`, `Debugger`. Silences
  "установлен размер экрана…" spam in tests; web/terminal/component builders
  set it to `console.log`.
- `runner.execute()` gained `on_batch_complete?: () => void` (fires at the
  end of each `TICK_PER_MS`-tick batch, ~10 ms of emulated time) and
  `turbo?: boolean`. Both are used by the terminal to drive deterministic
  tick-scheduled input and fast e2e tests.

### Tests

- New golden tests in `tests/rk86_terminal_e2e.test.ts` for the D-dump /
  G-exit flow and the M-command / HLT flow — compare the full JSON snapshot
  **and** the screen dump against committed goldens in `tests/data/`.
- Diff helper reports mismatches as `path/to/golden.json:LINE` with
  `expected:`/`actual:` pairs (clickable in modern terminals / IDEs). Both
  sides are re-serialised via `JSON.parse → JSON.stringify(…, null, 4)` so
  formatter-inlined arrays in the committed golden can't misalign the diff.
- `tests/data/*.json` added to `.prettierignore` so committed goldens stay
  in the canonical form the diff's line numbers refer to.
- Full suite: 166 tests pass; e2e file ~8.5 s (was ~15 s).

## 2026-04-18

### Terminal emulator: headless mode + e2e testing

Added a headless mode to `src/lib/terminal/rk86_terminal.ts` so the emulator can
be driven and inspected by automated tests without a TTY.

New CLI flags:

- `--headless` — suppress all screen rendering and stdin setup (no ANSI output,
  no raw-mode keyboard)
- `--timeout <sec>` — exit after N seconds
- `--memory <file>` — on exit, dump a byte range of emulator memory to a
  binary file
- `--memory-from <addr>` — start of the dump range (default `0x0000`)
- `--memory-to <addr>` — end of the dump range, inclusive (default `0xFFFF`)
- `--screen <file>` — on exit, save the 78×30 screen as a text file (30 lines,
  `\r\n` terminators). Bytes `\0`, `\t`, `\n`, `\r` are replaced with `.` to
  avoid misdisplay; other `<0x20` bytes render as RK-86 pseudo-graphics
- `--input <seq>` — comma-separated list of WebKit key codes (e.g.
  `KeyD,Digit0,Comma,KeyF,KeyF,Enter`) injected one at a time after the
  emulator settles (same mechanism as snapshot keyboard injection)

All exit paths (`--exit-halt`, `--exit-address`, `--timeout`, `SIGINT`) funnel
through a single `doExit()` that flushes the screen/memory files before
`process.exit`.

### Tests

Added `tests/rk86_terminal_e2e.test.ts` — 4 e2e tests that spawn the terminal
binary in `--headless` mode and assert on the resulting `--screen` / `--memory`
files:

- timeout + screen dump format (31 lines × 78 cols, contains `РАДИО-86РК`)
- memory dump byte-exact range (monitor ROM at `F800` starts with `C3`)
- monitor `D 0,FF` command produces a hex grid on screen
- monitor `M` writes HLT at `0000`, `G 0` runs, `--exit-halt` fires within 8s

Full suite: 164 tests pass.

### Documentation

- `packages/rk86/README.md` — expanded invocation examples, full options list,
  new "Безголовый режим (headless) и автотесты" section with two worked
  examples (monitor `D` dump and `M`/`G` write-HLT-and-run)
- `CLAUDE.md` — terminal emulator line mentions headless-mode flags;
  `tests/rk86_terminal_e2e.test.ts` added to the test inventory
