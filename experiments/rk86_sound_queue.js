class Sound {
  constructor() {
    this.volume = 0.03;

    this.player = null;
    this.queue = [];
  }

  set_stop_timer(duration) {
    return setTimeout(() => {
      const [previous_tone, _] = this.queue.shift();
      if (this.queue.length == 0) {
        this.player.stop();
      } else {
        const [tone, duration] = this.queue[0];
        if (previous_tone !== tone) {
          this.player.stop();
          this.player.play(tone, this.volume, "square");
        }
        this.set_stop_timer(duration);
      }
    }, duration);
  }

  play(tone, duration) {
    if (!this.player) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.player = new SoundPlayer(new AudioContext());
    }

    this.queue.push([tone, duration]);
    if (this.queue.length == 1) {
      this.player.play(tone, this.volume, "square");
      this.set_stop_timer(duration);
    }
  }
}
