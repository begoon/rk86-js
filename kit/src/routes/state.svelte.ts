// Reactive bridge between imperative engine code and Svelte components.
// Engine writes here via callbacks, Svelte reads reactively.

import { DEFAULT_COLOR_MODE, type ColorMode } from "$lib/core/rk86_colors";
import type { Breakpoint } from "$lib/core/rk86_debugger";
import type { RK86File } from "$lib/core/rk86_file_parser";

export const debuggerState = $state({
    breakpoints: [] as Breakpoint[],
    visible: false,
});

export const ui = $state({
    selectedFile: undefined as RK86File | undefined,
    tapeActivityActive: false,
    tapeWrittenBytes: 0,
    tapeHighlight: false,
    rusLat: false,
    videoMemoryBase: 0,
    screenWidth: 0,
    screenHeight: 0,
    ips: 0,
    tps: 0,
    selectedFileName: "",
    visualizerOpcode: -1,
    modifierSS: false,
    modifierUS: false,
    selectedFileStart: 0,
    selectedFileEnd: 0,
    selectedFileSize: 0,
    selectedFileEntry: 0,
    colorMode: DEFAULT_COLOR_MODE as ColorMode,
});
