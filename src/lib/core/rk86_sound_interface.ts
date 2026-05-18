export interface SoundAdapter {
    // 1-битный спикер: level = 0 или 1. cpu_ticks — текущее число
    // тактов CPU от старта, по которым адаптер сам строит audio-time.
    out(level: number, cpu_ticks: number): void;
    done?(): void;
}
