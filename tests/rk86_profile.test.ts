import { expect, test } from "bun:test";

import {
    CLASSIC_PROFILE_NAME,
    RK86_CLASSIC,
    normalizeProfile,
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

test("validation: peripheral base must be 8 KB aligned and outside RAM", () => {
    const misaligned = validateProfile({ ...custom, crtc_base: 0xc100 });
    expect(misaligned.some((e) => e.includes("кратна 2000"))).toBe(true);
    const inRam = validateProfile({ ...custom, keyboard_ppi_base: 0x8000 });
    expect(inRam.some((e) => e.includes("пересекается с ОЗУ"))).toBe(true);
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
    });
    expect(fromStrings).toEqual(custom);
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
});

test("profilesEqual compares name and every address", () => {
    expect(profilesEqual(custom, { ...custom })).toBe(true);
    expect(profilesEqual(custom, { ...custom, dma_base: 0xe000 })).toBe(true);
    expect(profilesEqual(custom, { ...custom, name: "X" })).toBe(false);
    expect(profilesEqual(custom, { ...custom, ram_end: 0x7fff })).toBe(false);
});
