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

function Memory(keyboard) {
  this.keyboard = keyboard;

  this.init = function () {
    this.buf = [];
    for (var i = 0; i < 0x10000; ++i) this.buf[i] = 0;
  };

  this.zero_ram = function () {
    for (var i = 0; i < 0x8000; ++i) this.buf[i] = 0;
  };

  this.snapshot = function (from, sz) {
    return this.buf.slice(from, from + sz);
  };

  // 800x ports in Radio-86RK schematics
  // 8000:
  // A0-A7 - output, keyboard scanlines
  // 8001:
  // B0-B7 - input, keyboard input
  // 8002:
  // С0 - tape, out
  // С1 - not used
  // С2 - not used
  // С3 - RUS / LAT, out
  // С4 - tape, in
  // С5 - keyboard, in
  // С6 - keyboard, in
  // С7 - keyboard, in
  // 8003:
  // D7-D0 - control register, out

  // Typical values which RK Monitor sends to 8003.

  // 8A      - 1000 1010, when Monitor intializes
  // D0      - 0: C0-C3, output
  // D1      - 1: B0-B7, input
  // D2      - 0: B0-B7, mode 0 (latched)
  // D3      - 1: C4-C7, input
  // D4      - 0: A0-A7, output
  // D5-D6   - 00: A0-A7, mode 00, (values: 00, 01, 1x)
  // D7      - 1, set mode

  // 06      - 0000 0110, when Monitor sets RUS/LAT (C3) to 0
  // D0      - 0: bit value
  // D1-3    - 011: bit index (values 0-7), here is 3 (C3)
  // D4-6    - not used
  // D7      - 0, bit set in port C

  // 07      - 0000 0111, when Monitor sets RUS/LAT (C3) to 1
  // D0      - 1: bit value
  // D1-3    - 011: bit index (values 0-7), here is 3 (C3)
  // D4-6    - not used
  // D7      - 0, bit set in port C

  this.vg75_c001_00_cmd = 0;

  this.screen_size_x_buf = 0;
  this.screen_size_y_buf = 0;

  this.ik57_e008_80_cmd = 0;

  this.vg75_c001_80_cmd = 0;

  this.cursor_x_buf = 0;
  this.cursor_y_buf = 0;

  this.vg75_c001_60_cmd = 0;

  this.tape_8002_as_output = 0;

  this.video_memory_base_buf = 0;
  this.video_memory_size_buf = 0;

  this.video_memory_base = 0;
  this.video_memory_size = 0;

  this.video_screen_size_x = 0;
  this.video_screen_size_y = 0;

  this.video_screen_cursor_x = 0;
  this.video_screen_cursor_y = 0;

  this.last_access_address = 0; // values: 0000-FFFF
  this.last_access_operation = undefined; // values: read, write

  this.invalidate_access_variables = function () {
    this.last_access_address = 0;
    this.last_access_operation = undefined;
  };

  this.init();
  this.invalidate_access_variables();

  this.length = function () {
    return 0x10000;
  };

  this.read_raw = function (addr) {
    return this.buf[addr & 0xffff] & 0xff;
  };

  this.read = function (addr) {
    addr &= 0xffff;

    this.last_access_address = addr;
    this.last_access_operation = "read";

    if (addr == 0x8002) return this.keyboard.modifiers;

    if (addr == 0x8001) {
      var keyboard_state = this.keyboard.state;
      var ch = 0xff;
      var kbd_scanline = ~this.buf[0x8000];
      for (var i = 0; i < 8; i++)
        if ((1 << i) & kbd_scanline) ch &= keyboard_state[i];
      return ch;
    }

    if (addr == 0xc001) {
      return 0x20 | (this.screen.light_pen_active ? 0x10 : 0x00);
    }

    if (addr == 0xc000) {
      if (this.vg75_c001_60_cmd == 1) {
        this.vg75_c001_60_cmd = 2;
        return this.screen.light_pen_x;
      }
      if (this.vg75_c001_60_cmd == 2) {
        this.vg75_c001_60_cmd = 0;
        return this.screen.light_pen_y;
      }
      return 0x00;
    }

    return this.buf[addr];
  };

  this.last_written_byte = -1;
  this.last_written_byte_8003 = -1;

  this.write_raw = function (addr, byte) {
    this.buf[addr & 0xffff] = byte & 0xff;
  };

  this.write = function (addr, byte) {
    addr &= 0xffff;
    byte &= 0xff;

    this.last_access_address = addr;
    this.last_access_operation = "write";

    if (addr >= 0xf800) return;

    this.buf[addr] = byte;

    var peripheral_reg = addr & 0xefff;

    // RUS/LAT indicator
    if (peripheral_reg == 0x8003) {
      if (byte == this.last_written_byte_8003) return;
      this.last_written_byte_8003 = byte;
        // console.log('VV55: write(8003, %02X) mode set %08b'.format(
        //   byte, mode
        // ));
      } else {
        // console.log('VV55: write(8003, %02X): bit set/reset, bit=%d, value=%d'.format(
        //   byte, bit, value
        // ));
        // RUS/LAT can be updated here if bit == 3.
    if (peripheral_reg == 0xc001 && byte == 0x27) {
      // console.log('VG75: write(C001, 27) start display [001SSSBB]=%08b'.format(byte));
      return;
    }

    if (peripheral_reg == 0xc001 && byte == 0xE0) {
      // console.log('VG75: write(C001, E0) preset counter');
      return;
    }

    // The cursor control sequence.
    if (peripheral_reg == 0xc001 && byte == 0x80) {
      // console.log('VG75: write(C001, 80) set cursor');
      this.vg75_c001_80_cmd = 1;
      return;
    }

    if (peripheral_reg == 0xc000 && this.vg75_c001_80_cmd == 1) {
      // console.log('VG75: write(C001, %02X) cursor x'.format(byte));
      this.vg75_c001_80_cmd += 1;
      this.cursor_x_buf = byte + 1;
      return;
    }

    if (peripheral_reg == 0xc000 && this.vg75_c001_80_cmd == 2) {
      // console.log('VG75: write(C001, %02X) cursor y'.format(byte));
      this.cursor_y_buf = byte + 1;
      screen.set_cursor(this.cursor_x_buf - 1, this.cursor_y_buf - 1);
      this.video_screen_cursor_x = this.cursor_x_buf;
      this.video_screen_cursor_y = this.cursor_y_buf;
      this.vg75_c001_80_cmd = 0;
      return;
    }

    // The light pen position sequence.
    if (peripheral_reg == 0xc001 && byte == 0x60) {
      if (this.screen.light_pen_active) this.vg75_c001_60_cmd = 1;
      return;
    }

    if (peripheral_reg == 0xc000 && this.vg75_c001_80_cmd == 1) {
      this.vg75_c001_80_cmd += 1;
      this.cursor_x_buf = byte + 1;
      return;
    }

    // The screen format command sequence.
    if (peripheral_reg == 0xc001 && byte == 0) {
      // console.log('VG75: write(C001, 00) reset'.format(byte));
      this.vg75_c001_00_cmd = 1;
      return;
    }

    if (peripheral_reg == 0xc000 && this.vg75_c001_00_cmd == 1) {
      // console.log('VG75: write(C001, %02X) [SHHHHHHH]=%08b'.format(byte, byte));
      this.screen_size_x_buf = (byte & 0x7f) + 1;
      this.vg75_c001_00_cmd += 1;
      return;
    }

    if (peripheral_reg == 0xc000 && this.vg75_c001_00_cmd == 2) {
      // console.log('VG75: write(C001, %02X) [VVRRRRRR]=%08b'.format(byte, byte));
      this.screen_size_y_buf = (byte & 0x3f) + 1;
      this.vg75_c001_00_cmd += 1;
      return;
    }

    if (peripheral_reg == 0xc000 && this.vg75_c001_00_cmd == 3) {
      // console.log('VG75: write(C001, %02X) [UUUULLLL]=%08b'.format(byte, byte));
      this.vg75_c001_00_cmd += 1;
      return;
    }

    if (peripheral_reg == 0xc000 && this.vg75_c001_00_cmd == 4) {
      // console.log('VG75: write(C001, %02X) [MZCCZZZZ]=%08b'.format(byte, byte));
      this.vg75_c001_00_cmd = 0;
      // console.log('VG75: screen size loaded: x=%d, y=%d'.format(
      //   this.screen_size_x_buf,
      //   this.screen_size_y_buf
      // ));
      if (this.screen_size_x_buf && this.screen_size_y_buf) {
        // Save ("apply") the screen dimentions.
        this.video_screen_size_x = this.screen_size_x_buf;
        this.video_screen_size_y = this.screen_size_y_buf;
        // Re-configure video.
        screen.set_geometry(this.video_screen_size_x, this.video_screen_size_y);
      }
      return;
    }

    // The screen area parameters command sequence.
    if (peripheral_reg == 0xe008 && byte == 0x80) {
      // console.log('IK57: write(E008, 80) disable/reset DMA %08b'.format(byte));
      this.ik57_e008_80_cmd = 1;
      this.tape_8002_as_output = 1;
      return;
    }

    if (peripheral_reg == 0xe004 && this.ik57_e008_80_cmd == 1) {
      // console.log('IK57: write(E004, %02X) video memory start low'.format(byte));
      this.video_memory_base_buf = byte;
      this.ik57_e008_80_cmd += 1;
      return;
    }

    if (peripheral_reg == 0xe004 && this.ik57_e008_80_cmd == 2) {
      // console.log('IK57: write(E004, %02X) video memory start high'.format(byte));
      this.video_memory_base_buf |= byte << 8;
      this.ik57_e008_80_cmd += 1;
      return;
    }

    if (peripheral_reg == 0xe005 && this.ik57_e008_80_cmd == 3) {
      // console.log('IK57: write(E004, %02X) video memory size low'.format(byte));
      this.video_memory_size_buf = byte;
      this.ik57_e008_80_cmd += 1;
      return;
    }

    if (peripheral_reg == 0xe005 && this.ik57_e008_80_cmd == 4) {
      // console.log('IK57: write(E004, %02X) video memory size high'.format(byte));
      this.video_memory_size_buf =
        ((this.video_memory_size_buf | (byte << 8)) & 0x3fff) + 1;
      this.ik57_e008_80_cmd = 0;
      // console.log('IK57: video memory configuration loaded, %04X-%04X'.format(
      //   this.video_memory_base_buf, this.video_memory_size_buf
      // ));
      // Save ("apply") the video area parameters.
      this.video_memory_base = this.video_memory_base_buf;
      this.video_memory_size = this.video_memory_size_buf;
      screen.set_video_memory(this.video_memory_base, this.video_memory_size);
      return;
    }

    // Settings for video memory boundaries and the screen format
    // only take an effect after the DMA command 0xA4 (start the channel).
    if (peripheral_reg == 0xe008 && byte == 0xa4) {
      // console.log('IK57: write(E008, A4) enable DMA %08b'.format(byte));
      this.tape_8002_as_output = 0;
      return;
    }

    if (addr == 0x8002) {
      if (this.tape_8002_as_output) {
        this.tape_write_bit && this.tape_write_bit(byte & 0x01);
      }
      return;
    }
  };

  this.load_file = function (file) {
    for (var i = file.start; i <= file.end; ++i) {
      this.write_raw(i, file.image[i - file.start]);
    }
  };
}
