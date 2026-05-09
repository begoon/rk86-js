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

function Screen(font_image, ui, memory) {
  this.ui = ui;
  this.memory = memory;
  this.memory.screen = this;

  const update_rate = 25;
  const cursor_rate = 500;

  const char_width = 6;
  const char_height = 8;
  const char_height_gap = 2;

  const cursor_width = char_width;
  const cursor_height = 1;
  const cursor_offset_white = 27;

  this.scale_x = 2;
  this.scale_y = 2;

  this.width = 78;
  this.height = 30;

  this.cursor_state = true;
  this.cursor_x = 0;
  this.cursor_y = 0;

  this.video_memory_base = 0;
  this.video_memory_size = 0;

  this.cache = [];

  this.font = new Image();
  this.font.src = "rk86_font.bmp";

  // RGB mapping for i8275 field-attribute pins on RK86 color mod,
  // matching Emu80's RCM_COLOR1 (de-facto reference for RK86 colorized
  // programs). Wiring: GPA0 → Green, GPA1 → Blue, HLGT → Red. With
  // color_index = (byte >> 1) & 0x07 the palette layout is:
  //   0 light gray (no-attr fallback)  4 red (H)
  //   1 green (G0)                     5 yellow (H+G0)
  //   2 blue (G1)                      6 magenta (H+G1)
  //   3 cyan (G0+G1)                   7 white (H+G0+G1)
  var COLORS = [
    "#c0c0c0", "#00ff00", "#0000ff", "#00ffff",
    "#ff0000", "#ffff00", "#ff00ff", "#ffffff",
  ];
  var DEFAULT_COLOR = 0;
  this.fontByColor = [];
  this.font.onload = function () {
    for (var c = 0; c < 8; c++) {
      var off = document.createElement("canvas");
      off.width = self.font.width;
      off.height = self.font.height;
      var offCtx = off.getContext("2d");
      offCtx.drawImage(self.font, 0, 0);
      // Font is a 1-bit BMP (white glyph on black, no alpha). Use
      // "multiply" to tint white pixels to the desired color while
      // leaving black pixels black: white×color = color, black×color = black.
      offCtx.globalCompositeOperation = "multiply";
      offCtx.fillStyle = COLORS[c];
      offCtx.fillRect(0, 0, off.width, off.height);
      self.fontByColor[c] = off;
    }
    self.init_cache(self.width * self.height);
  };
  var self = this;

  this.light_pen_x = 0;
  this.light_pen_y = 0;
  this.light_pen_active = 0;

  this.export = () => {
    const h16 = n => '0x' + toHex16(n);
    return {
      scale_x: this.scale_x,
      scale_y: this.scale_y,
      width: this.width,
      height: this.height,
      cursor_state: this.cursor_state ? 1 : 0,
      cursor_x: this.cursor_x,
      cursor_y: this.cursor_y,
      video_memory_base: h16(this.video_memory_base),
      video_memory_size: h16(this.video_memory_size),
      light_pen_x: this.light_pen_x,
      light_pen_y: this.light_pen_y,
      light_pen_active: this.light_pen_active,
    }
  }

  this.import = snapshot => {
    const h = fromHex;
    this.scale_x = h(snapshot.scale_x);
    this.scale_y = h(snapshot.scale_y);
    this.width = h(snapshot.width);
    this.height = h(snapshot.height);
    this.cursor_state = h(snapshot.cursor_state);
    this.cursor_x = h(snapshot.cursor_x);
    this.cursor_y = h(snapshot.cursor_y);
    this.video_memory_base = h(snapshot.video_memory_base);
    this.video_memory_size = h(snapshot.video_memory_size);
    this.light_pen_x = h(snapshot.light_pen_x);
    this.light_pen_y = h(snapshot.light_pen_y);
    this.light_pen_active = h(snapshot.light_pen_active);
  }

  this.apply_import = () => {
    this.set_geometry(this.width, this.height);
    this.set_video_memory(this.video_memory_base);
  }

  this.init_cache = function (sz) {
    for (var i = 0; i < sz; ++i) this.cache[i] = true;
  }

  this.draw_char = function (x, y, ch, color) {
    color = color === undefined ? DEFAULT_COLOR : color;
    var dstX = x * char_width * this.scale_x;
    var dstY = y * (char_height + char_height_gap) * this.scale_y;
    var dstW = char_width * this.scale_x;
    var dstH = char_height * this.scale_y;
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(dstX, dstY, dstW, dstH);
    var fontSrc = this.fontByColor[color] || this.font;
    this.ctx.drawImage(fontSrc,
      2, char_height * ch, char_width, char_height,
      dstX, dstY, dstW, dstH);
  }

  this.draw_cursor = function (x, y, visible) {
    this.ctx.drawImage(this.font,
      2, cursor_offset_white + (visible ? 0 : 1), char_width, 1,
      x * char_width * this.scale_x,
      (y * (char_height + char_height_gap) + char_height) * this.scale_y,
      char_width * this.scale_x, 1 * this.scale_y
    )
  }

  this.flip_cursor = function () {
    this.draw_cursor(this.cursor_x, this.cursor_y, this.cursor_state);
    this.cursor_state = !this.cursor_state;
    flip_cursor_self = this;
    window.setTimeout(function () { flip_cursor_self.flip_cursor(); }, 500);
  }

  this.init = function () {
    this.ctx = this.ui.canvas.getContext("2d");
  }

  this.disable_smoothing = function () {
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
  }

  this.set_geometry = function (width, height) {
    this.width = width;
    this.height = height;
    this.video_memory_size = width * height;

    console.log("Set screen geometry: %d x %d".format(width, height));

    var canvas_width = this.width * char_width * this.scale_x;
    var canvas_height = this.height * (char_height + char_height_gap) * this.scale_y;
    this.ui.resize_canvas(canvas_width, canvas_height);

    this.disable_smoothing();
    this.ctx.fillRect(0, 0, canvas_width, canvas_height);
  }

  this.set_video_memory = function (base) {
    this.video_memory_base = base;
    this.init_cache(this.video_memory_size);
    console.log("Set video memory: %04X".format(
      this.video_memory_base, this.video_memory_size
    ));
  }

  this.set_cursor = function (x, y) {
    this.draw_cursor(this.cursor_x, this.cursor_y, false);
    this.cursor_x = x;
    this.cursor_y = y;
  }

  this.draw_screen = function () {
    var i = this.video_memory_base;
    var frameStopped = false;
    // i8275 visible field-attribute mode (per spec, common RK86 mode):
    //   $00-$7F normal char, $80-$BF field attr (blank cell + color),
    //   $C0-$EF char attr (blank), $F0-$FF special (end of row/screen).
    for (var y = 0; y < this.height; ++y) {
      var rowStopped = frameStopped;
      var color = DEFAULT_COLOR;
      for (var x = 0; x < this.width; ++x) {
        var cache_i = i - this.video_memory_base;
        var raw = this.memory.read(i);
        var ch;
        if (rowStopped) {
          ch = 0;
        } else if (raw >= 0xf0) {
          ch = 0;
          rowStopped = true;
          if (raw >= 0xf8) frameStopped = true;
        } else if (raw >= 0xc0) {
          ch = 0;
        } else if (raw >= 0x80) {
          color = (raw >> 1) & 0x07;
          ch = 0;
        } else {
          ch = raw;
        }
        var cacheKey = ch | (color << 8);
        if (this.cache[cache_i] != cacheKey) {
          this.draw_char(x, y, ch, color);
          this.cache[cache_i] = cacheKey;
        }
        i += 1;
      }
    }
    self = this;
    window.setTimeout(function () { self.draw_screen(); }, this.update_rate);
  }

  this.init();

  screen_self = this;
  window.setTimeout(function () { screen_self.flip_cursor(); }, cursor_rate);
  window.setTimeout(function () { screen_self.draw_screen(); }, this.update_rate);

  this.ui.canvas.onmousemove = (event) => {
    const x = Math.floor((event.x + 1 - this.ui.canvas.offsetLeft) / (char_width * this.scale_x));
    const y = Math.floor((event.y + 1 - this.ui.canvas.offsetTop) / ((char_height + char_height_gap) * this.scale_y));
    this.light_pen_x = x;
    this.light_pen_y = y;
  };

  this.ui.canvas.onmouseup = (event) => {
    this.light_pen_active = 0;
  };

  this.ui.canvas.onmousedown = (event) => {
    this.light_pen_active = 1;
  };
}
