// Part of Radio-86RK in JavaScript based on I8080/JS
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

function Keyboard() {
  this.reset = function () {
    this.state = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
    this.modifiers = 0xff;
  };

  this.export = () => {
    const h8 = (n) => '0x' + toHex8(n);
    return {
      state: this.state.map(h8),
      modifiers: h8(this.modifiers),
    }
  }

  this.import = snapshot => {
    this.state = snapshot.state.map(fromHex);
    this.modifiers = fromHex(snapshot.modifiers);
  }

  const key_table = {
    36: [0, 0x01], //   \\  -> HOME
    35: [0, 0x02], //   CTP -> END
    116: [0, 0x04], //  AP2 -> F5
    112: [0, 0x08], //  Ф1 -> F1
    113: [0, 0x10], //  Ф2 -> F2
    114: [0, 0x20], //  Ф3 -> F3
    115: [0, 0x40], //  Ф4 -> F4

    9: [1, 0x01], //    TAB
    46: [1, 0x02], //   ПС -> DEL
    13: [1, 0x04], //   BK -> ENTER
    8: [1, 0x08], //    ЗБ -> BS, 8
    37: [1, 0x10], //   <-
    38: [1, 0x20], //   UP
    39: [1, 0x40], //   ->
    40: [1, 0x80], //   DOWN

    48: [2, 0x01], //   0
    49: [2, 0x02], //   1
    50: [2, 0x04], //   2
    51: [2, 0x08], //   3
    52: [2, 0x10], //   4
    53: [2, 0x20], //   5
    54: [2, 0x40], //   6
    55: [2, 0x80], //   7

    56: [3, 0x01], //   8
    57: [3, 0x02], //   9
    117: [3, 0x04], //  : -> F6
    186: [3, 0x08], //  ;
    188: [3, 0x10], //  ,
    189: [3, 0x20], //  -
    190: [3, 0x40], //  .
    191: [3, 0x80], //  /

    118: [4, 0x01], //  @ -> F7
    65: [4, 0x02], //   A
    66: [4, 0x04], //   B
    67: [4, 0x08], //   C
    68: [4, 0x10], //   D
    69: [4, 0x20], //   E
    70: [4, 0x40], //   F
    71: [4, 0x80], //   G

    72: [5, 0x01], //   H
    73: [5, 0x02], //   I
    74: [5, 0x04], //   J
    75: [5, 0x08], //   K
    76: [5, 0x10], //   L
    77: [5, 0x20], //   M
    78: [5, 0x40], //   N
    79: [5, 0x80], //   O

    80: [6, 0x01], //   P
    81: [6, 0x02], //   Q
    82: [6, 0x04], //   R
    83: [6, 0x08], //   S
    84: [6, 0x10], //   T
    85: [6, 0x20], //   U
    86: [6, 0x40], //   V
    87: [6, 0x80], //   W

    88: [7, 0x01], //   X
    89: [7, 0x02], //   Y
    90: [7, 0x04], //   Z
    219: [7, 0x08], //  [
    226: [7, 0x10], //  \ (back slash)
    221: [7, 0x20], //  ]
    192: [7, 0x40], //  ^ -> `
    32: [7, 0x80], //   SPC
  };

  const SS = 0x20;
  const US = 0x40;
  const RL = 0x80;

  this.keydown = code => {
    // console.log('keydown: %s'.format(code))
    // SHIFT
    if (code == 16) this.modifiers &= ~SS;
    // CTRL
    if (code == 17) this.modifiers &= ~US;
    // F10
    if (code == 121) this.modifiers &= ~RL;
    const key = key_table[code];
    if (key) this.state[key[0]] &= ~key[1];
  };

  this.keyup = function (code) {
    // console.log('keyup: %s'.format(code))
    // SHIFT
    if (code == 16) this.modifiers |= SS;
    // CTRL
    if (code == 17) this.modifiers |= US;
    // F10
    if (code == 121) this.modifiers |= RL;
    const key = key_table[code];
    if (key) this.state[key[0]] |= key[1];
  };

  this.meta_keys_buffer = null;

  this.onkeydown = code => {
    if (code == 91 || code == 93 || code == 224) {
      // left and right CMD (meta)
      this.meta_keys_buffer = [];
    } else {
      if (Array.isArray(this.meta_keys_buffer)) {
        this.meta_keys_buffer.push(code);
      }
    }
    this.keydown(code);
  };

  this.onkeyup = code => {
    if (code == 91 || code == 93 || code == 224) {
      if (this.meta_keys_buffer) {
        for (const code of this.meta_keys_buffer) {
          this.keyup(code);
        }
      }
      this.meta_keys_buffer = null;
    } else {
      this.keyup(code);
    }
  };

  document.onkeydown = event => {
    this.onkeydown(event.keyCode);
    return false;
  }

  document.onkeyup = event => {
    this.onkeyup(event.keyCode);
    return false;
  }

  this.reset();
}
