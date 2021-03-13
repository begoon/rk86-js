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

function Visualizer() {

  this.adjust_window = function() {
    var callback = function() {
      var div = document.getElementById("opcodes");
      InnerWindowResizer(div.clientWidth + 32, div.clientHeight + 32);
    }
    if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1)
      window.setTimeout(function() { callback(); }, 200);
    else
      callback();
  }

  this.init = function() {
    var table = document.getElementById('opcodes');
    var cells = table.getElementsByTagName('td');
    this.index = [];
    for (var i = 0; i < cells.length; i++){
      var text = cells[i].innerHTML;
      if (!text.match(/<b>[^<]*<\/b>/g) && text.length > 0)
        this.index[this.index.length] = cells[i];
    }
    this.last_hit = -1;
    this.last_hit_background = "";

    this.window = window;
    window.opener.ui.runner.visualizer = this;
    this.adjust_window();
  }

  this.hit = function(opcode) {
    if (this.last_hit != -1)
      this.index[this.last_hit].style.background = this.last_hit_background;
    this.last_hit = opcode;
    this.last_hit_background = this.index[this.last_hit].style.background;
    this.index[this.last_hit].style.background = "red";
  }

  this.init();
}

var visualizer;

function main() {
  visualizer = new Visualizer();
}
