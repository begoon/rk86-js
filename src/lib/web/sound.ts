import { SoundPlayer } from "./SoundPlayer.js";

export class Sound {
    volume = 0.05;
    stop_timer: ReturnType<typeof setTimeout> | NodeJS.Timeout | null = null;
    previous_tone: number | null = null;
    player: SoundPlayer;

    constructor() {
        const ctx = new AudioContext();
        ctx.resume();
        this.player = new SoundPlayer(ctx);
    }

    set_stop_timer(duration: number) {
        return setTimeout(() => {
            this.player.stop();
            this.previous_tone = null;
        }, duration * 1000);
    }

    play(tone: number, duration: number) {
        clearTimeout(this.stop_timer as NodeJS.Timeout);
        if (this.previous_tone !== tone) {
            if (this.previous_tone) this.player.stop();
            this.player.play(tone, this.volume, "square");
        }
        this.previous_tone = tone;
        this.stop_timer = this.set_stop_timer(duration);
    }
}
