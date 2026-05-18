// 1-битный спикер РК86: вместо синтеза частоты по полупериоду EI/DI
// напрямую драйвим линию динамика — DC-источник через GainNode, по
// каждому изменению IFF переключаем gain между 0 и `on_gain`. Время
// каждого фронта планируется в координатах AudioContext по CPU-тикам,
// поэтому форма волны точно повторяет паттерн EI/DI (бипы, чирпы,
// PWM-музыка — всё естественно).

const CPU_FREQ = 1780000;
const ON_GAIN = 0.1;

export class Sound {
    audioCtx: AudioContext;
    gain: GainNode;
    source: AudioBufferSourceNode;
    audio_time = 0;
    last_ticks = 0;
    initialized = false;

    constructor() {
        this.audioCtx = new AudioContext();
        this.audioCtx.resume();
        const buffer = this.audioCtx.createBuffer(1, 1, 48000);
        buffer.getChannelData(0)[0] = 1.0;
        this.gain = new GainNode(this.audioCtx, { gain: 0 });
        this.gain.connect(this.audioCtx.destination);
        this.source = new AudioBufferSourceNode(this.audioCtx, { loop: true, buffer });
        this.source.connect(this.gain);
        this.source.start();
    }

    private when(cpu_ticks: number): number {
        if (!this.initialized) {
            this.audio_time = this.audioCtx.currentTime;
            this.last_ticks = cpu_ticks;
            this.initialized = true;
        }
        this.audio_time += (cpu_ticks - this.last_ticks) / CPU_FREQ;
        this.last_ticks = cpu_ticks;
        // ресинк, если ушли назад или сильно вперёд (пауза, переключение вкладки)
        const drift = this.audio_time - this.audioCtx.currentTime;
        if (drift < 0 || drift > 0.1) this.audio_time -= drift;
        return this.audio_time;
    }

    out(level: number, cpu_ticks: number): void {
        this.gain.gain.setValueAtTime(level ? ON_GAIN : 0, this.when(cpu_ticks));
    }

    done(): void {
        try {
            this.source.stop();
        } catch {}
        this.source.disconnect();
        this.gain.disconnect();
        this.audioCtx.close();
    }
}
