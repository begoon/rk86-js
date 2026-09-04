// Профиль оборудования: раскладка памяти и адреса периферии.
//
// ОЗУ занимает 0000..ram_end, ПЗУ — rom_start..FFFF. Периферия
// декодируется дешифратором К555ИД7 по A13..A15, поэтому каждая
// микросхема получает окно 8 КБ, а её база должна быть выровнена
// на 0x2000. Внутри окна регистр выбирается младшими битами адреса
// (ППИ: A0..A1, ВГ75: A0, ВТ57: A0..A3), остальные биты зеркалируются.
export type MachineProfile = {
    name: string;
    ram_end: number;
    rom_start: number;
    boot_address: number;
    keyboard_ppi_base: number;
    crtc_base: number;
    dma_base: number;
};

export const CLASSIC_PROFILE_NAME = "RK86_CLASSIC";

export const PERIPHERAL_WINDOW = 0x2000;

// Классический РК86 в модели «статическая память + полное 8-КБ ПЗУ»:
// монитор в F800-FFFF, E000-F7FF — дополнительное ПЗУ (см. rk86_memory.ts).
export const RK86_CLASSIC: MachineProfile = Object.freeze({
    name: CLASSIC_PROFILE_NAME,
    ram_end: 0x7fff,
    rom_start: 0xe000,
    boot_address: 0xf800,
    keyboard_ppi_base: 0x8000,
    crtc_base: 0xc000,
    dma_base: 0xe000,
});

export const PROFILE_ADDRESS_FIELDS = [
    "ram_end",
    "rom_start",
    "boot_address",
    "keyboard_ppi_base",
    "crtc_base",
    "dma_base",
] as const;

export type ProfileAddressField = (typeof PROFILE_ADDRESS_FIELDS)[number];

export const PROFILE_FIELD_LABELS: Record<ProfileAddressField, string> = {
    ram_end: "ОЗУ до",
    rom_start: "ПЗУ от",
    boot_address: "Адрес запуска",
    keyboard_ppi_base: "ППИ клавиатуры (ВВ55)",
    crtc_base: "Контроллер экрана (ВГ75)",
    dma_base: "Контроллер ПДП (ВТ57)",
};

// Представление для снапшота: адреса — hex-строки вида "0xF800",
// как и остальные адреса в JSON снапшота. Обратное — normalizeProfile().
export function exportProfile(profile: MachineProfile): Record<string, string> {
    const h16 = (n: number) => "0x" + n.toString(16).toUpperCase().padStart(4, "0");
    const result: Record<string, string> = { name: profile.name };
    for (const field of PROFILE_ADDRESS_FIELDS) result[field] = h16(profile[field]);
    return result;
}

export function isClassicProfile(profile: MachineProfile): boolean {
    return profile.name === CLASSIC_PROFILE_NAME;
}

export function cloneProfile(profile: MachineProfile): MachineProfile {
    return { ...profile };
}

export function profilesEqual(a: MachineProfile, b: MachineProfile): boolean {
    return a.name === b.name && PROFILE_ADDRESS_FIELDS.every((field) => a[field] === b[field]);
}

const is16bit = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 0xffff;

// Возвращает список ошибок (на русском); пустой список — профиль корректен.
export function validateProfile(profile: MachineProfile): string[] {
    const errors: string[] = [];
    const name = typeof profile.name === "string" ? profile.name.trim() : "";
    if (!name) errors.push("имя профиля не может быть пустым");
    else if (name.length > 32) errors.push("имя профиля длиннее 32 символов");

    for (const field of PROFILE_ADDRESS_FIELDS) {
        if (!is16bit(profile[field])) errors.push(`${PROFILE_FIELD_LABELS[field]}: адрес должен быть в диапазоне 0000-FFFF`);
    }
    if (errors.length) return errors;

    if (profile.ram_end >= profile.rom_start) errors.push("ОЗУ должно заканчиваться раньше начала ПЗУ");
    if (profile.boot_address < profile.rom_start) errors.push("адрес запуска должен лежать в ПЗУ");

    const bases: ProfileAddressField[] = ["keyboard_ppi_base", "crtc_base", "dma_base"];
    for (const field of bases) {
        const base = profile[field];
        const label = PROFILE_FIELD_LABELS[field];
        if (base % PERIPHERAL_WINDOW !== 0) errors.push(`${label}: база должна быть кратна 2000`);
        if (base <= profile.ram_end) errors.push(`${label}: окно периферии пересекается с ОЗУ`);
    }
    for (let i = 0; i < bases.length; i++) {
        for (let j = i + 1; j < bases.length; j++) {
            if (profile[bases[i]] === profile[bases[j]]) {
                errors.push(`${PROFILE_FIELD_LABELS[bases[i]]} и ${PROFILE_FIELD_LABELS[bases[j]]}: одинаковая база`);
            }
        }
    }
    return errors;
}

// Приводит произвольный JSON к MachineProfile или возвращает null,
// если это не похоже на профиль (адреса могут быть числами или hex-строками).
export function normalizeProfile(raw: unknown): MachineProfile | null {
    if (!raw || typeof raw !== "object") return null;
    const source = raw as Record<string, unknown>;
    if (typeof source.name !== "string") return null;
    const profile: Record<string, unknown> = { name: source.name.trim() };
    for (const field of PROFILE_ADDRESS_FIELDS) {
        const value = source[field];
        let number: number;
        if (typeof value === "number") number = value;
        else if (typeof value === "string" && /^(0x)?[0-9a-f]{1,4}$/i.test(value.trim())) {
            number = parseInt(value.trim().replace(/^0x/i, ""), 16);
        } else if (field === "boot_address" && value === undefined) {
            // Профили, сохранённые до появления boot_address.
            number = RK86_CLASSIC.boot_address;
        } else return null;
        if (!is16bit(number)) return null;
        profile[field] = number;
    }
    return profile as unknown as MachineProfile;
}
