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

function Tape(runner) {
  this.previous_bit_ticks = 0;
  this.bit_started = false;
  this.bit_count = 0;
  this.current_byte = 0;
  this.written_bytes = [];
  this.output_block_count = 0;

  this.save = (bytes) => {
    const binary = new Uint8Array(bytes);
    const blob = new Blob([binary], { type: "image/gif" });
    const filename = "rk86-tape-%d.bin".format(this.output_block_count);
    saveAs(blob, filename);
    this.output_block_count += 1;
  };

  this.log = (bytes) => {
    for (let i = 0; i < bytes.length; i += 16) {
      const line = bytes.slice(i, i + 16);
      console.log(line.map((byte) => "%02X".format(byte)).join(" "));
    }
  };

  this.flush = () => {
    const sync_byte_index = this.written_bytes.findIndex(
      (current_byte) => current_byte === 0xe6
    );
    if (sync_byte_index === -1) {
      console.log("Sync byte E6 is not found");
      this.log(bytes);
    } else {
      console.log(`${sync_byte_index} bytes before sync byte`);
      const bytes = this.written_bytes.slice(sync_byte_index);
      this.log(bytes);
      this.save(bytes);
    }
    this.written_bytes = [];
  };

  this.write_bit = (bit) => {
    const runner_ticks = runner.total_ticks;
    const time = runner_ticks - this.previous_bit_ticks;
    if (time > 10000) {
      // If there is no writes in ~5ms, reset the buffer, current current_byte
      // and bit counter.
      console.log("Reset tape buffer");
      this.bit_started = false;
      this.current_byte = 0;
      this.bit_count = 0;
      this.written_bytes = [];
    }
    if (!this.bit_started) {
      this.bit_started = true;
    } else {
      this.bit_started = false;
      this.current_byte |= (bit ? 0x80 : 0x00) >> this.bit_count;
      if (this.bit_count < 7) {
        this.bit_count += 1;
      } else {
        this.written_bytes.push(this.current_byte);
        if (this.output_timer) {
          clearTimeout(this.output_timer);
        }
        this.output_timer = setTimeout(this.flush, 1000);
        this.current_byte = 0;
        this.bit_count = 0;
      }
    }
    this.previous_bit_ticks = runner_ticks;
  };
}
