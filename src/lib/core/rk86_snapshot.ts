import { hex16 } from "./hex.js";
import type { SequenceAction } from "./rk86_keyboard_injector.js";
import { type Machine } from "./rk86_machine.js";
import { RK86_CLASSIC, exportProfile, normalizeProfile, profilesEqual, validateProfile } from "./rk86_profile.js";

export function rk86_snapshot(machine: Machine, version: string): string {
    const { screen, cpu, keyboard, memory } = machine;

    const h16 = (n: number) => "0x" + hex16(n);

    const snapshot = {
        id: "rk86",
        created: new Date().toISOString(),
        format: "2",
        emulator: "rk86.ru",
        version: version,
        start: h16(0x0000),
        end: h16(0xffff),
        profile: exportProfile(memory.profile),
        boot: { keyboard: [] },
        cpu: cpu.export(),
        keyboard: keyboard.export(),
        screen: screen.export(),
        memory: memory.export(),
    };
    return JSON.stringify(snapshot, null, 4);
}

export function rk86_snapshot_restore(
    snapshot: string | Record<string, any>,
    machine?: Machine | undefined,
    keys_injector?: (commands: SequenceAction[]) => void,
): boolean {
    try {
        const json = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
        if (json.id != "rk86") return false;
        if (!machine) return false;

        const { screen, cpu, memory, keyboard } = machine;

        // Формат "2" несёт профиль оборудования; снапшоты формата "1" сняты
        // на классическом РК86. Профиль применяется до импорта памяти, чтобы
        // адреса периферии соответствовали образу памяти. Некорректный
        // профиль игнорируется (текущая раскладка сохраняется).
        let profile = RK86_CLASSIC;
        if (json.profile !== undefined) {
            const parsed = normalizeProfile(json.profile);
            const errors = parsed ? validateProfile(parsed) : ["не удалось разобрать профиль"];
            if (parsed && errors.length === 0) profile = parsed;
            else {
                machine.log?.(`профиль в снапшоте проигнорирован: ${errors.join("; ")}`);
                profile = memory.profile;
            }
        }
        if (!profilesEqual(profile, memory.profile)) memory.set_profile(profile);

        cpu.import(json.cpu);
        keyboard.import(json.keyboard);
        screen.import(json.screen);
        memory.import(json.memory);

        screen.apply_import();

        if (keys_injector && json.boot?.keyboard) keys_injector(json.boot?.keyboard);
        return true;
    } catch (e) {
        console.error("failed restoring snapshot", e);
        return false;
    }
}
