// Хранилище профилей оборудования в localStorage.
//
// `rk86:profiles` — {version, profiles: MachineProfile[]} только для
// пользовательских профилей; RK86_CLASSIC встроен и не сохраняется.
// `rk86:profile:active` — имя активного профиля; отсутствие или
// неизвестное имя означает RK86_CLASSIC.
import {
    CLASSIC_PROFILE_NAME,
    RK86_CLASSIC,
    normalizeProfile,
    validateProfile,
    type MachineProfile,
} from "../core/rk86_profile.js";

export const PROFILES_KEY = "rk86:profiles";
export const ACTIVE_PROFILE_KEY = "rk86:profile:active";
const STORAGE_VERSION = 1;

function storage(): Storage | null {
    try {
        return typeof localStorage === "undefined" ? null : localStorage;
    } catch {
        return null;
    }
}

export function loadCustomProfiles(): MachineProfile[] {
    const store = storage();
    if (!store) return [];
    try {
        const raw = store.getItem(PROFILES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as { version?: number; profiles?: unknown[] };
        if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.profiles)) return [];
        const result: MachineProfile[] = [];
        for (const item of parsed.profiles) {
            const profile = normalizeProfile(item);
            if (!profile) continue;
            if (profile.name === CLASSIC_PROFILE_NAME) continue;
            if (validateProfile(profile).length) continue;
            if (result.some((p) => p.name === profile.name)) continue;
            result.push(profile);
        }
        return result;
    } catch {
        return [];
    }
}

export function saveCustomProfiles(profiles: MachineProfile[]): void {
    const store = storage();
    if (!store) return;
    try {
        const custom = profiles.filter((p) => p.name !== CLASSIC_PROFILE_NAME);
        store.setItem(PROFILES_KEY, JSON.stringify({ version: STORAGE_VERSION, profiles: custom }));
    } catch (e) {
        console.warn("не удалось сохранить профили оборудования", e);
    }
}

// Все профили: классический первым, затем пользовательские.
export function loadAllProfiles(): MachineProfile[] {
    return [RK86_CLASSIC, ...loadCustomProfiles()];
}

export function loadActiveProfileName(): string {
    const store = storage();
    if (!store) return CLASSIC_PROFILE_NAME;
    try {
        return store.getItem(ACTIVE_PROFILE_KEY) || CLASSIC_PROFILE_NAME;
    } catch {
        return CLASSIC_PROFILE_NAME;
    }
}

export function saveActiveProfileName(name: string): void {
    const store = storage();
    if (!store) return;
    try {
        if (name === CLASSIC_PROFILE_NAME) store.removeItem(ACTIVE_PROFILE_KEY);
        else store.setItem(ACTIVE_PROFILE_KEY, name);
    } catch (e) {
        console.warn("не удалось сохранить активный профиль", e);
    }
}

// Активный профиль; при неизвестном имени — RK86_CLASSIC.
export function loadActiveProfile(): MachineProfile {
    const name = loadActiveProfileName();
    return loadAllProfiles().find((p) => p.name === name) ?? RK86_CLASSIC;
}
