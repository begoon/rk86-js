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

function rk86_snapshot(ui, screen) {
  const h16 = (n) => '0x' + toHex16(n);
  const cpu = ui.runner.cpu;
  const memory = cpu.memory;
  const keyboard = memory.keyboard;
  const snapshot = {
    id: 'rk86',
    created: new Date().toISOString(),
    format: '1',
    emulator: 'rk86.ru',
    version: version,
    start: h16(0x0000),
    end: h16(0xFFFF),
    boot: {
      'keyboard': []
    },
    cpu: cpu.export(),
    keyboard: keyboard.export(),
    screen: screen.export(),
    memory: memory.export(),
  }
  return JSON.stringify(snapshot, null, 2);
}

function rk86_snapshot_restore(snapshot, ui, screen, keys_injector) {
  try {
    const json = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
    if (json.id != 'rk86') return false;
    const cpu = ui.runner.cpu;
    const memory = cpu.memory;
    const keyboard = memory.keyboard;

    cpu.import(json.cpu);
    keyboard.import(json.keyboard);
    screen.import(json.screen);
    memory.import(json.memory);

    screen.apply_import();
    screen.init_cache();

    if (keys_injector && json.boot?.keyboard) {
      keys_injector(json.boot?.keyboard);
    }
    return true;
  } catch (e) {
    return false;
  }
}