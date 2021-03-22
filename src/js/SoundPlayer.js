function SoundPlayer(audioContext) {
  this.audioCtx = audioContext;
  this.gainNode = this.audioCtx.createGain();
  this.gainNode.connect(this.audioCtx.destination);
  this.oscillator = null;
}

SoundPlayer.prototype.play = function (freq, volume, wave) {
  this.oscillator = this.audioCtx.createOscillator();
  this.oscillator.connect(this.gainNode);
  this.oscillator.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
  if (wave) {
    this.oscillator.type = wave;
  }
  this.gainNode.gain.value = volume;
  this.oscillator.start();
  return this;
};

SoundPlayer.prototype.stop = function (when) {
  if (!when) when = 0.05;
  this.oscillator.stop(this.audioCtx.currentTime + when);
  return this;
};