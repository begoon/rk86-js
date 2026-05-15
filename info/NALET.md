# NALET.RK — почему «залипает» огонь и не работают стрелки

## Симптомы

В нашем эмуляторе (kit и classic):

- Стрелки не двигают игрока.
- При первом же кадре после старта игры срабатывает «огонь»,
  и удерживается «залипшим» бесконечно — игра ведёт огонь сама.

В эмуляторе [86rk.ru](https://86rk.ru)
([radio-86rk/86rk.ru](https://github.com/radio-86rk/86rk.ru)) та
же программа `NALET.RK` играется нормально.

Каталожная пометка `kit/static/catalog/NALET.RK/info.md` сейчас
говорит «возможно, от другого клона РК» — это неверно. Игра использует
обычную аппаратуру Радио-86РК, просто читает клавиатуру не через карту
памяти, а через команды `IN`/`OUT` процессора.

## Что делает программа

Загружается с `0x0000`, инициализирует ППА `i8255` и таймер `i8253`,
после чего читает клавиатуру через порты ввода-вывода. Разбор бинарника
(`kit/static/files/NALET.RK`, заголовок `start=0x0000 end=0x2400`):

### Старт

```text
0004: AF              XRA A
0005: 32 F3 0D        STA  0DF3
0008: 3E 8B           MVI  A, 8B        ; bit-set/reset on PPI#1
000A: D3 83           OUT  83           ; → port 0x8383, попадает в i8255 control
000C: 01 00 00        LXI  B, 0000
000F: CD E4 03        CALL 03E4         ; инициализация полей
0012: CD BC 08        CALL 08BC         ; настройка экрана/DMA
0015: CD 03 F8        CALL F803         ; монитор: очистка экрана
0018: CD DC 08        CALL 08DC
001B: CD E4 03        CALL 03E4
001E: 3E 26           MVI  A, 26
0020: D3 A3           OUT  A3           ; → i8253 control (0xA003) — таймер 0
0022: 3E 66           MVI  A, 66
0024: D3 A3           OUT  A3           ; таймер 1
0026: 3E 90           MVI  A, 90
0028: D3 A3           OUT  A3           ; таймер 2
002A: 3E 0C           MVI  A, 0C
002C: D3 A1           OUT  A1           ; загрузка счётчика 1
```

`OUT 0x83` с `A=0x8B`: бит 7 равен 1, и это не «set mode», а
интерпретируется ППА в этом контексте как control-word; в любом случае
для NALET существенно лишь то, что порт A ППА остаётся выходом, B —
входом (стандартная сканировка клавиатуры).

`OUT 0xA0..0xA3` — это вторая микросхема в адресном пространстве:
таймер-счётчик `КР580ВИ53` (i8253) на `0xA000-0xA003`. NALET
использует его для звуковых эффектов.

### Чтение клавиатуры (стрелки), память 0x02B4

```text
02B4: 01 00 00        LXI  B, 0x0000
02B7: 3E FD           MVI  A, FD        ; 11111101 — выбираем строку 1
02B9: D3 80           OUT  80           ; → PPA port A
02BB: DB 81           IN   81           ; ← PPA port B
02BD: FE BF           CPI  BF           ; ArrowRight (бит 6) одиночный?
02BF: C2 C5 02        JNZ  02C5
02C2: 01 01 00        LXI  B, 0x0001    ; вправо: dx=+1
02C5: FE EF           CPI  EF           ; ArrowLeft (бит 4) одиночный?
02C7: C2 CD 02        JNZ  02CD
02CA: 01 FF FF        LXI  B, 0xFFFF    ; влево: dx=-1
02CD: CD E4 02        CALL 02E4
02D0: C9              RET
```

### Чтение «огня» (Space), память 0x035B

```text
035B: 3E 7F           MVI  A, 7F        ; 01111111 — выбираем строку 7
035D: D3 80           OUT  80           ; → PPA port A
035F: DB 81           IN   81           ; ← PPA port B
0361: F6 7F           ORI  7F           ; оставляем только бит 7
0363: FE FF           CPI  FF           ; Space не нажат?
0365: C8              RZ                ; да — выход
0366: 2A E2 03        LHLD 03E2         ; нет — обработка выстрела
...
```

## Почему ломается у нас

В CPU при выполнении `IN`/`OUT` обращение идёт в объект `io`:

`kit/src/lib/core/i8080.ts:1013-1026`

```ts
case 0xd3: this.io.output(this.next_pc_byte(), this.a()); break;
case 0xdb: this.set_a(this.io.input(this.next_pc_byte()));  break;
```

Этот `io` — заглушка из `kit/test/test_machine.ts:15-25`:

```ts
this.input  = (port: number): number => 0;
this.output = (port: number, w8: number): void => {};
```

И именно эта заглушка подключается в продакшн-сборках:
`kit/src/lib/web/boot.ts:363`,
`kit/src/lib/terminal/rk86_terminal.ts:739`,
`kit/src/lib/component/radio86-emulator.ts:115`. У классики симметричная
ситуация: `classic/src/main.js:22-28`.

Что это даёт NALET:

- `OUT 80, 0xFD` — игнорируется, `buf[0x8000]` остаётся таким, каким был.
- `IN 81` — всегда возвращает `0x00`.

Стрелки: `IN 81` → `A=0`. Ни `CPI BF`, ни `CPI EF` не совпадают, поэтому
ни «вправо», ни «влево» не детектируется. **Стрелки молчат.**

Огонь: `IN 81` → `A=0`; `ORI 7F` → `0x7F`; `CPI FF` → не равно — `RZ`
не срабатывает, и каждый кадр игра считает, что Space нажат.
**Огонь «залипает».**

Большинство других программ для РК-86 читают клавиатуру через карту
памяти (`LDA 8001` / `STA 8000`), и эти обращения у нас правильно
обрабатываются в `kit/src/lib/core/rk86_memory.ts:181-189`:

```ts
if (ppi_reg === 0x8001) {
    const keyboard_state = this.machine.keyboard.state;
    let ch = 0xff;
    const kbd_scanline = ~this.buf[0x8000];
    for (let i = 0; i < 8; i++) if ((1 << i) & kbd_scanline) ch &= keyboard_state[i];
    return ch;
}
```

NALET отличается тем, что использует именно `IN`/`OUT`. У нас этот
путь оборван.

## Как делает 86rk.ru

В референсном эмуляторе порт-ввод-вывод явно пробрасывается на шину
памяти. `86rk/emulator/js/app.js:1496-1518`:

```js
get class_io () {
    return class extends august_io {
        constructor (comp, mem) {
            super (0x100, { rw: [{ addr: 0x00, size: 0x100, area: new class {
                get length () { return 0x100 }
                get (a)    { return mem.get (a | a.shl8) }
                set (a, v) { return mem.set (a | a.shl8, v) }
            }}]})
        }
    }
}
```

То есть `IN port` идёт в `memory.read(port | (port << 8))`, `OUT port` —
в `memory.write(port | (port << 8), v)`. Это совпадает с реальным
поведением 8080: процессор кладёт номер порта на **обе** половины
адресной шины во время IN/OUT, и `IN 81` даёт ровно тот же бус-цикл,
что и `LDA 8181`. Декодер chip-select на K555ИД7 (A13..A15) дальше
сам направляет обращение к нужной микросхеме.

## Что нужно изменить

1. **kit** — в трёх местах, где создаётся машина, заменить заглушечный
   `io` на проброс через `machine.memory`:

   - `kit/src/lib/web/boot.ts:363`
   - `kit/src/lib/terminal/rk86_terminal.ts:739`
   - `kit/src/lib/component/radio86-emulator.ts:115`

   ```ts
   io.input  = (port) => machine.memory.read(port | (port << 8));
   io.output = (port, w8) => machine.memory.write(port | (port << 8), w8);
   ```

   Назначать после `new Memory(machine)` — там `machine.memory` уже
   существует.

   `kit/test/test_machine.ts` **не трогать**: тот же `IO` используется
   в i8080-диагностиках (`kit/test/test_executor.ts`), где никакого
   PPA нет и заглушка-ноп — это правильно.

2. **classic** — аналогично, `classic/src/main.js:22-39`:

   ```js
   io.input  = function (port)     { return memory.read(port | (port << 8)); };
   io.output = function (port, w8) { memory.write(port | (port << 8), w8); };
   ```

3. **Каталог** — после фикса обновить
   `kit/static/catalog/NALET.RK/info.md` и
   `classic/src/catalog/NALET.RK/info.md`: убрать «возможно, от другого
   клона РК», заменить кратко на «использует команды `IN`/`OUT` вместо
   обращения через карту памяти; работает после фикса проброса
   порт-ввод-вывода».

4. **Юнит-тест** на проброс портов: построить минимальную машину,
   назначить продакшн-`io`, и проверить, что `io.input(0x81)`
   возвращает то же, что `memory.read(0x8181)`, а `io.output(0x80, v)`
   совпадает с записью в `0x8080`. Это не зависит от бинарника NALET.

## Вне области текущей задачи

`OUT A0/A1/A2/A3` в NALET — это таймер i8253 на `0xA000-0xA003`. У нас
i8253 не эмулируется вообще; после фикса проброса записи будут
аккуратно падать в `buf[0xA0A0]` и т. п. без эффекта. Игра играется,
но звуковые эффекты (выстрелы, разрывы) молчат до тех пор, пока не
будет добавлена эмуляция i8253 — это отдельная задача.
