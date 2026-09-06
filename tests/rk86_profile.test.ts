import { expect, test } from "bun:test";

import {
    CLASSIC_PROFILE_NAME,
    PERIPHERAL_WINDOW,
    RK86_CLASSIC,
    exportProfile,
    normalizeProfile,
    peripheralWindowLabel,
    peripheralWindowMask,
    profilesEqual,
    validateProfile,
    type MachineProfile,
} from "../src/lib/core/rk86_profile.js";

const custom: MachineProfile = {
    name: "TEST",
    ram_end: 0x9fff,
    rom_start: 0xf000,
    boot_address: 0xf800,
    keyboard_ppi_base: 0xa000,
    crtc_base: 0xc000,
    dma_base: 0xe000,
    peripheral_window: 0x2000,
};

// 32 КБ ОЗУ, 16 КБ ПЗУ от C000, восемь окон по 2 КБ в 8000-BFFF.
const small: MachineProfile = {
    name: "SRAM2K",
    ram_end: 0x7fff,
    rom_start: 0xc000,
    boot_address: 0xc000,
    keyboard_ppi_base: 0x8000,
    crtc_base: 0x8800,
    dma_base: 0x9000,
    peripheral_window: 0x800,
};

test("classic profile is valid and named RK86_CLASSIC", () => {
    expect(RK86_CLASSIC.name).toBe(CLASSIC_PROFILE_NAME);
    expect(validateProfile(RK86_CLASSIC)).toEqual([]);
});

test("custom profile with shifted RAM/PPI is valid", () => {
    expect(validateProfile(custom)).toEqual([]);
});

test("validation: empty name", () => {
    expect(validateProfile({ ...custom, name: "  " })).toContain("имя профиля не может быть пустым");
});

test("validation: address out of 16-bit range stops further checks", () => {
    const errors = validateProfile({ ...custom, ram_end: 0x10000 });
    expect(errors.length).toBe(1);
    expect(errors[0]).toMatch(/0000-FFFF/);
});

test("validation: RAM must end before ROM", () => {
    expect(validateProfile({ ...custom, ram_end: 0xf000 })).toContain("ОЗУ должно заканчиваться раньше начала ПЗУ");
});

test("validation: boot address must be inside ROM", () => {
    expect(validateProfile({ ...custom, boot_address: 0x0000 })).toContain("адрес запуска должен лежать в ПЗУ");
});

test("profile with 2 KB peripheral windows is valid", () => {
    expect(validateProfile(small)).toEqual([]);
});

test("validation: peripheral base must be aligned to the window and outside RAM", () => {
    const misaligned = validateProfile({ ...custom, crtc_base: 0xc100 });
    expect(misaligned.some((e) => e.includes("кратна 2000"))).toBe(true);
    // C800 is fine for a 2 KB window but not for 4 KB.
    expect(validateProfile({ ...small, crtc_base: 0xc800 }).some((e) => e.includes("кратна"))).toBe(false);
    const misaligned4k = validateProfile({
        ...small,
        peripheral_window: 0x1000,
        crtc_base: 0x8800,
    });
    expect(misaligned4k.some((e) => e.includes("кратна 1000"))).toBe(true);
    const inRam = validateProfile({ ...custom, keyboard_ppi_base: 0x8000 });
    expect(inRam.some((e) => e.includes("пересекается с ОЗУ"))).toBe(true);
});

test("validation: peripheral window must be a supported size", () => {
    // Bases 8000/A000/C000 are aligned for every supported window size.
    const aligned = {
        ...small,
        rom_start: 0xe000,
        boot_address: 0xf800,
        keyboard_ppi_base: 0x8000,
        crtc_base: 0xa000,
        dma_base: 0xc000,
    };
    for (const window of [0x2000, 0x1000, 0x800, 0x400, 0x200, 0x100]) {
        expect(validateProfile({ ...aligned, peripheral_window: window })).toEqual([]);
    }
    for (const window of [0, 0x300, 0x80, 0x4000]) {
        const errors = validateProfile({ ...small, peripheral_window: window });
        expect(errors.length).toBe(1);
        expect(errors[0]).toMatch(/Окно периферии/);
    }
});

test("peripheralWindowMask and label", () => {
    expect(peripheralWindowMask(0x2000)).toBe(0xe000);
    expect(peripheralWindowMask(0x1000)).toBe(0xf000);
    expect(peripheralWindowMask(0x800)).toBe(0xf800);
    expect(peripheralWindowMask(0x100)).toBe(0xff00);
    expect(peripheralWindowLabel(0x2000)).toBe("8 КБ");
    expect(peripheralWindowLabel(0x400)).toBe("1 КБ");
    expect(peripheralWindowLabel(0x100)).toBe("256 байт");
});

test("exportProfile carries peripheral_window as a hex string", () => {
    expect(exportProfile(small).peripheral_window).toBe("0x0800");
    expect(exportProfile(RK86_CLASSIC).peripheral_window).toBe("0x2000");
});

test("validation: peripheral bases must differ", () => {
    const errors = validateProfile({ ...custom, dma_base: 0xc000 });
    expect(errors.some((e) => e.includes("одинаковая база"))).toBe(true);
});

test("normalizeProfile accepts numbers and hex strings", () => {
    const fromNumbers = normalizeProfile({ ...custom });
    expect(fromNumbers).toEqual(custom);
    const fromStrings = normalizeProfile({
        name: "TEST",
        ram_end: "9FFF",
        rom_start: "0xF000",
        boot_address: "f800",
        keyboard_ppi_base: "A000",
        crtc_base: "C000",
        dma_base: "E000",
        peripheral_window: "0x2000",
    });
    expect(fromStrings).toEqual(custom);
    expect(normalizeProfile({ ...small, peripheral_window: "800" })).toEqual(small);
});

test("normalizeProfile defaults peripheral_window to 8 KB for profiles saved before the field existed", () => {
    const { peripheral_window, ...legacy } = custom;
    expect(normalizeProfile(legacy)?.peripheral_window).toBe(PERIPHERAL_WINDOW);
    expect(normalizeProfile(legacy)).toEqual(custom);
});

test("normalizeProfile defaults boot_address for profiles saved before the field existed", () => {
    const { boot_address, ...legacy } = custom;
    expect(normalizeProfile(legacy)?.boot_address).toBe(RK86_CLASSIC.boot_address);
});

test("normalizeProfile rejects garbage", () => {
    expect(normalizeProfile(null)).toBeNull();
    expect(normalizeProfile("RK86")).toBeNull();
    expect(normalizeProfile({ name: 5 })).toBeNull();
    expect(normalizeProfile({ ...custom, crtc_base: "zzz" })).toBeNull();
    expect(normalizeProfile({ ...custom, crtc_base: 0x10000 })).toBeNull();
    expect(normalizeProfile({ ...custom, peripheral_window: "big" })).toBeNull();
    expect(normalizeProfile({ ...custom, peripheral_window: 0 })).toBeNull();
});

test("profilesEqual compares name and every address", () => {
    expect(profilesEqual(custom, { ...custom })).toBe(true);
    expect(profilesEqual(custom, { ...custom, dma_base: 0xe000 })).toBe(true);
    expect(profilesEqual(custom, { ...custom, name: "X" })).toBe(false);
    expect(profilesEqual(custom, { ...custom, ram_end: 0x7fff })).toBe(false);
    expect(profilesEqual(custom, { ...custom, peripheral_window: 0x800 })).toBe(false);
});
