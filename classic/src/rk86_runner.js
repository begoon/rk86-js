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

function Runner(cpu) {
  this.cpu = cpu;
  this.paused = false;
  this.tracer = null;
  this.visualizer = null;

  this.last_instructions = [];

  this.previous_batch_time = 0;

  this.total_ticks = 0;

  this.last_iff_raise_ticks = 0;
  this.last_iff = 0;
  this.sound = false;

  const FREQ = 1780000;
  const TICK_PER_MS = FREQ / 100;

  var interrupt_this = this;
  this.interrupt = function (iff) {
    if (!interrupt_this.sound) return;
    if (interrupt_this.last_iff == iff) return;
    if (interrupt_this.last_iff == 0 && iff == 1) {
      interrupt_this.last_iff_raise_ticks = interrupt_this.total_ticks;
    }
    if (interrupt_this.last_iff == 1 && iff == 0) {
      var tone_ticks = interrupt_this.total_ticks - interrupt_this.last_iff_raise_ticks;
      var tone = FREQ / (tone_ticks * 2);
      var duration = 1 / tone;
      interrupt_this.sound.play(tone, duration);
    }
    interrupt_this.last_iff = iff;
  }

  var init_sound_this = this;
  this.init_sound = function (enabled) {
    init_sound_this.sound = enabled ? new Sound() : false;
  }

  this.cpu.io.interrupt = this.interrupt;
  this.cpu.jump(0xf800);

  this.execute = function () {
    clearTimeout(this.execute_timer);
    if (!this.paused) {
      var batch_ticks = 0;
      var batch_instructions = 0;
      while (batch_ticks < TICK_PER_MS) {
        if (this.tracer) {
          this.tracer('before')
          if (this.paused) break;
        }
        this.last_instructions.push(cpu.pc);
        if (this.last_instructions.length > 5) {
          this.last_instructions.shift();
        }
        this.cpu.memory.invalidate_access_variables();
        var instruction_ticks = this.cpu.instruction();
        batch_ticks += instruction_ticks;
        this.total_ticks += instruction_ticks;

        if (this.tracer) {
          this.tracer('after')
          if (this.paused) break;
        }
        if (this.visualizer) {
          this.visualizer.hit(this.cpu.memory.read_raw(this.cpu.pc));
        }
        batch_instructions += 1;
      }
      var now = +new Date();
      var elapsed = now - this.previous_batch_time;
      this.previous_batch_time = now;

      this.instructions_per_millisecond = batch_instructions / elapsed;
      this.ticks_per_millisecond = batch_ticks / elapsed;
    }
    runner_self = this;
    this.execute_timer = window.setTimeout(function () { runner_self.execute(); }, 10);
  }

  this.pause = function () {
    this.paused = true;
  }

  this.resume = function () {
    this.paused = false;
  }
}
