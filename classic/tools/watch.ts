#!/usr/bin/env bun
import { watch } from "node:fs";
import { spawnSync } from "node:child_process";

const targets = ["src", "tests", "tools", "Justfile"];

let timer: ReturnType<typeof setTimeout> | null = null;
let building = false;

function rebuild() {
    if (building) return;
    building = true;
    console.log("[watch] rebuild");
    spawnSync("just", ["build"], { stdio: "inherit" });
    building = false;
}

function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(rebuild, 300);
}

for (const t of targets) {
    try {
        watch(t, { recursive: true }, schedule);
    } catch {
        watch(t, schedule);
    }
}

rebuild();
console.log(`[watch] watching: ${targets.join(", ")}`);
