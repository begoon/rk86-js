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

class Sound {
  constructor() {
    this.volume = 0.05;

    this.stop_timer = null;
    this.previous_tone = null;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.player = new SoundPlayer(new AudioContext());
  }

  set_stop_timer(duration) {
    return setTimeout(() => {
      this.player.stop();
      this.previous_tone = null;
    }, duration * 1000);
  }

  play(tone, duration) {
    clearTimeout(this.stop_timer);
    if (this.previous_tone !== tone) {
      if (this.previous_tone) this.player.stop();
      this.player.play(tone, this.volume, "square");
    }
    this.previous_tone = tone;
    this.stop_timer = this.set_stop_timer(duration);
  }
}
