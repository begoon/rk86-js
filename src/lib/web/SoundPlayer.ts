export class SoundPlayer {
    audioCtx: AudioContext;
    gainNode: GainNode;
    oscillator: OscillatorNode | null = null;

    constructor(audioContext: AudioContext) {
        this.audioCtx = audioContext;
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.connect(this.audioCtx.destination);
    }

    play(freq: number, volume: number, wave: OscillatorType) {
        this.oscillator = this.audioCtx.createOscillator();
        this.oscillator.connect(this.gainNode);
        this.oscillator.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        if (wave) {
            this.oscillator.type = wave;
        }
        this.gainNode.gain.value = volume;
        this.oscillator.start();
    }

    stop(when?: number) {
        const offset = when || 0.05;
        if (this.oscillator) this.oscillator.stop(this.audioCtx.currentTime + offset);
    }
}
