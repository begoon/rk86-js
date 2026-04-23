# RK-86 Snapshot Format

Snapshots capture the complete emulator state as JSON.

## Top-Level Structure

```json
{
  "id": "rk86",
  "created": "2021-03-19T20:41:05.131Z",
  "format": "1",
  "emulator": "rk86.ru",
  "version": "1.8.1",
  "start": "0x0000",
  "end": "0xFFFF",
  "boot": { ... },
  "cpu": { ... },
  "keyboard": { ... },
  "screen": { ... },
  "memory": { ... }
}
```

| Field    | Description                                   |
|----------|-----------------------------------------------|
| id       | Always "rk86"                                 |
| created  | ISO timestamp                                 |
| format   | Format version (currently "1")                |
| emulator | Source emulator identifier                     |
| version  | Emulator version that created the snapshot    |
| start    | Memory range start (always "0x0000")          |
| end      | Memory range end (always "0xFFFF")            |

## CPU

All Intel 8080 registers and flags.

```json
"cpu": {
  "a": "0x00",
  "sf": 0,
  "zf": 1,
  "hf": 0,
  "pf": 1,
  "cf": 0,
  "bc": "0x003E",
  "de": "0x7633",
  "hl": "0x7FE4",
  "sp": "0x76C7",
  "pc": "0xFE26",
  "iff": 0
}
```

| Field | Description                        |
|-------|------------------------------------|
| a     | Accumulator (hex string)           |
| sf    | Sign flag (0 or 1)                 |
| zf    | Zero flag (0 or 1)                 |
| hf    | Half-carry flag (0 or 1)           |
| pf    | Parity flag (0 or 1)               |
| cf    | Carry flag (0 or 1)                |
| bc    | BC register pair (hex string)      |
| de    | DE register pair (hex string)      |
| hl    | HL register pair (hex string)      |
| sp    | Stack pointer (hex string)         |
| pc    | Program counter (hex string)       |
| iff   | Interrupt enable flag (0 or 1)     |

## Keyboard

8-row keyboard matrix state and modifier keys.

```json
"keyboard": {
  "state": ["0xFF", "0xFF", "0xFF", "0xFF", "0xFF", "0xFF", "0xFF", "0xFF"],
  "modifiers": "0xFF"
}
```

| Field     | Description                                            |
|-----------|--------------------------------------------------------|
| state     | Array of 8 hex bytes, one per row (0=pressed, 1=up)    |
| modifiers | Modifier bitmask: bit5=SHIFT, bit6=CTRL, bit7=F10/RL     |

## Screen

Video display configuration and cursor state.

```json
"screen": {
  "scale_x": 1,
  "scale_y": 1,
  "width": 78,
  "height": 30,
  "cursor_state": 0,
  "cursor_x": 10,
  "cursor_y": 4,
  "video_memory_base": "0x76D0",
  "video_memory_size": "0x0924",
  "light_pen_x": 73,
  "light_pen_y": 30,
  "light_pen_active": 0
}
```

## Memory

Video controller registers, peripheral state, and full 64KB RAM dump.

```json
"memory": {
  "vg75_c001_00_cmd": 0,
  "video_screen_size_x_buf": 78,
  "video_screen_size_y_buf": 30,
  "vg75_c001_80_cmd": 0,
  "cursor_x_buf": 11,
  "cursor_y_buf": 5,
  "vg75_c001_60_cmd": 0,
  "ik57_e008_80_cmd": 0,
  "tape_8002_as_output": 0,
  "video_memory_base_buf": "0x76D0",
  "video_memory_size_buf": "0x0924",
  "video_memory_base": "0x76D0",
  "video_memory_size": "0x0924",
  "video_screen_size_x": 78,
  "video_screen_size_y": 30,
  "video_screen_cursor_x": 11,
  "video_screen_cursor_y": 5,
  "last_access_address": "0x7FF3",
  "last_access_operation": "read",
  "memory": {
    ":0000": "31 FF 75 C3 00 16 00 00 7E E3 BE 23 E3 C2 9B 00",
    ":0010": "23 7E FE 3A D0 C3 8B 04 C5 E5 F5 4F C3 67 03 00",
    ...
  }
}
```

### RAM format

The `memory.memory` object stores 64KB as hex strings:

- Keys: address labels in `:XXXX` hex format
- Values: 16 bytes per line, space-separated hex

## Boot (keyboard injection)

Commands to inject after restoring the snapshot. Used to automate program loading.

```json
"boot": {
  "keyboard": [
    {
      "keys": ...,
      "duration": 100,
      "action": "press"
    }
  ]
}
```

| Field    | Description                                   |
|----------|-----------------------------------------------|
| keys     | Key sequence (see formats below)              |
| duration | Milliseconds between key events               |
| action   | "press", "down", "up", or "pause"             |

### Keys field formats

The `keys` field supports three formats:

**1. Array of key names** (preferred)

```json
"keys": ["KeyG", "Enter", "KeyN", "Space", "Digit1", "Digit0"]
```

Uses DOM KeyboardEvent code names: `KeyA`-`KeyZ`, `Digit0`-`Digit9`,
`Space`, `Enter`, `ShiftLeft`, `ControlLeft`, etc.

**2. Space-separated string of key names**

```json
"keys": "KeyG Enter KeyN Space Digit1 Digit0"
```

Automatically split and normalized to an array.

**3. Array of ASCII codes**

```json
"keys": [71, 13, 78, 32, 49, 48]
```

Numeric ASCII values, mapped back to key names via a lookup table.
71='G', 13=Enter, 78='N', 32=Space, 49='1', 48='0'.
