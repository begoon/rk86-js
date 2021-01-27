class Sound {
  constructor() {
    this.volume = 0.05;

    this.player = null;
    this.stop_timer = null;
    this.previous_tone = null;
  }

  set_stop_timer(duration) {
    return setTimeout(() => {
      this.player.stop();
      this.previous_tone = null;
    }, duration * 1000);
  }

  play(tone, duration) {
    if (!this.player) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.player = new SoundPlayer(new AudioContext());
    }

    clearTimeout(this.stop_timer);
    if (this.previous_tone !== tone) {
      if (this.previous_tone) this.player.stop();
      this.player.play(tone, this.volume, "square");
    }
    this.previous_tone = tone;
    this.stop_timer = this.set_stop_timer(duration);
  }
}
