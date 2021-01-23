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

  const FREQ = 2100000;
  const TICK_PER_MS = FREQ / 100;

  this.cpu.jump(0xf800);

  this.execute = function() {
    if (!this.paused) {
      var ticks = 0;
      while (ticks < TICK_PER_MS) {
        if (this.tracer) { 
          this.tracer(this)
          if (this.paused) break;
        }
        ticks += this.cpu.instruction();
        if (this.visualizer) {
          this.visualizer.hit(this.cpu.memory.read_raw(this.cpu.pc));
        }
      }
    }
    runner_self = this;
    window.setTimeout(function() { runner_self.execute(); }, 10);
  }

  this.pause = function() {
    this.paused = true;
  }

  this.resume = function() {
    this.paused = false;
  }
}
