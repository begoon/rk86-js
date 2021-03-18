// Font for Radio-86RK emulator in JavaScript
//
// Copyright (C) 2012 Alexander Demin <alexander@demin.ws>
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2, or (at your option)
// any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.

const hex8_keys = [
  // cpu
  'iff',
  // memory
  'vg75_c001_00_cmd',
  'video_screen_size_x_buf',
  'video_screen_size_y_buf',
  'ik57_e008_80_cmd',
  'vg75_c001_80_cmd',
  'cursor_x_buf',
  'cursor_y_buf',
  'vg75_c001_60_cmd',
  'tape_8002_as_output',
  'video_screen_size_x',
  'video_screen_size_y',
  'video_screen_cursor_x',
  'video_screen_cursor_y',
  // keyboard
  'modifiers',
  // screen
  'scale_x',
  'scale_y',
  'width',
  'height',
  'cursor_state',
  'cursor_x',
  'cursor_y',
  'light_pen_x',
  'light_pen_y',
  'light_pen_active',
];

const hex16_keys = [
  'start',
  'end',
  // cpu
  'af', 'bc', 'de', 'hl', 'sp', 'pc',
  // memory
  'video_memory_base_buf',
  'video_memory_size_buf',
  'video_memory_base',
  'video_memory_size',
  'last_access_address',
  // screen
  'video_memory_base',
  'video_memory_size',
];

const decimal_keys = [
  'key', 'duration',
];

function snapshot_json_replacer(key, value) {
  if (hex8_keys.indexOf(key) != -1) {
    return '%02X'.format(+value);
  }
  if (hex16_keys.indexOf(key) != -1) {
    return '%04X'.format(value);
  }
  if (decimal_keys.indexOf(key) != -1) {
    return '%d'.format(value);
  }
  if (typeof value == 'number') {
    return (value < 256 ? '%02X' : '%04X').format(value);
  }
  return value;
}

function rk86_snapshot() {
  const cpu = ui.runner.cpu;
  const memory = cpu.memory;
  const keyboard = memory.keyboard;
  const snapshot = {
    id: 'rk86',
    created: new Date().toISOString(),
    format: '1',
    emulator: 'rk86.ru',
    version: version,
    start: 0x0000,
    end: 0xFFFF,
    entry: cpu.pc,
    boot: {
      'keyboard': [
        { key: 68, duration: 100, action: 'press' }, // d
        { key: 188, duration: 100, action: 'press' }, // ,
        { key: 70, duration: 100, action: 'press' }, // f
        { key: 70, duration: 100, action: 'press' }, // f
        { key: 70, duration: 100, action: 'press' }, // f
        { key: 13, duration: 100, action: 'press' }, // enter
        { key: 0, duration: 300, action: 'pause' }, // wait 300ms
        { key: 17, duration: 100, action: 'down' }, // ctrl (CC)
        { key: 67, duration: 100, action: 'down' }, // c
        { key: 67, duration: 100, action: 'up' }, // c
        { key: 17, duration: 100, action: 'up' }, // ctrl (CC)
      ]
    },
    cpu: cpu.export(),
    keyboard: keyboard.export(),
    screen: screen.export(),
    memory: memory.export(),
  }
  return JSON.stringify(snapshot, snapshot_json_replacer, 2);
}