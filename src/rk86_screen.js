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

  this.draw_char = function (x, y, ch) {
    this.ctx.drawImage(this.font,
      2, char_height * ch, char_width, char_height,
      x * char_width * this.scale_x, y * (char_height + char_height_gap) * this.scale_y,
      char_width * this.scale_x, char_height * this.scale_y
    );
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
    for (var y = 0; y < this.height; ++y) {
      for (var x = 0; x < this.width; ++x) {
        var cache_i = i - this.video_memory_base;
        var ch = this.memory.read(i);
        if (this.cache[cache_i] != ch) {
          this.draw_char(x, y, ch);
          this.cache[cache_i] = ch;
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
