import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Compares two multi-line JSON strings line-by-line and throws with a readable
// diff if they differ. The snapshot JSON is pretty-printed with one value per
// line, so line indices map directly to the field that changed.
function assertSnapshotsEqual(actual: string, expected: string, label = "line") {
    if (actual === expected) return;
    const a = actual.split("\n");
    const e = expected.split("\n");
    const diffs: string[] = [];
    const maxLen = Math.max(a.length, e.length);
    for (let i = 0; i < maxLen; i++) {
        if (a[i] !== e[i]) {
            diffs.push(`${label}:${i + 1}`);
            diffs.push(`  expected: ${e[i] ?? "<eof>"}`);
            diffs.push(`  actual:   ${a[i] ?? "<eof>"}`);
            if (diffs.length > 60) {
                diffs.push("... (diff truncated)");
                break;
            }
        }
    }
    throw new Error(`snapshot mismatch:\n${diffs.join("\n")}`);
}

const TERMINAL = "src/lib/terminal/rk86_terminal.ts";

function runTerminal(args: string[], timeoutMs: number): Promise<{ code: number | null; elapsedMs: number }> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const child = spawn("bun", [TERMINAL, ...args], { stdio: ["ignore", "ignore", "pipe"] });
        let stderr = "";
        child.stderr.on("data", (d) => (stderr += d.toString()));
        const killer = setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error(`timeout after ${timeoutMs}ms, stderr: ${stderr}`));
        }, timeoutMs);
        child.on("exit", (code) => {
            clearTimeout(killer);
            resolve({ code, elapsedMs: Date.now() - start });
        });
        child.on("error", reject);
    });
}

function withTmpDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const dir = mkdtempSync(join(tmpdir(), "rk86-e2e-"));
    return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

test("headless + timeout exits after N seconds and dumps screen", async () => {
    await withTmpDir(async (dir) => {
        const screen = join(dir, "screen.txt");
        const { code, elapsedMs } = await runTerminal(["--headless", "--timeout", "2", "--screen", screen], 15000);
        expect(code).toBe(0);
        expect(elapsedMs).toBeGreaterThanOrEqual(1800);
        expect(elapsedMs).toBeLessThan(5000);
        const text = readFileSync(screen, "utf-8");
        const lines = text.split("\r\n");
        expect(lines).toHaveLength(31); // 30 rows + trailing empty after final \r\n
        for (let i = 0; i < 30; i++) expect(lines[i]).toHaveLength(78);
        expect(text).toContain("РАДИО-86РК");
    });
});

test("memory dump writes exact byte range", async () => {
    await withTmpDir(async (dir) => {
        const mem = join(dir, "mem.bin");
        const { code } = await runTerminal(
            ["--headless", "--timeout", "2", "--memory", mem, "--memory-from", "0xF800", "--memory-to", "0xF803"],
            15000,
        );
        expect(code).toBe(0);
        const bytes = readFileSync(mem);
        expect(bytes).toHaveLength(4); // F800..F803 inclusive
        // first byte of monitor ROM is JMP (c3)
        expect(bytes[0]).toBe(0xc3);
    });
});

test("--input injects monitor D command and produces hex dump on screen", async () => {
    await withTmpDir(async (dir) => {
        const screen = join(dir, "screen.txt");
        const { code } = await runTerminal(
            ["--headless", "--timeout", "4", "--input", "KeyD,Digit0,Comma,KeyF,KeyF,Enter", "--screen", screen],
            15000,
        );
        expect(code).toBe(0);
        const text = readFileSync(screen, "utf-8");
        expect(text).toContain("-->D0,FF");
        expect(text).toMatch(/0000 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00/);
        expect(text).toMatch(/00F0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00/);
    });
});

test("--input + --exit-halt: write HLT at 0000 and run via monitor M/G commands", async () => {
    await withTmpDir(async (dir) => {
        const screen = join(dir, "screen.txt");
        const mem = join(dir, "mem.bin");
        const { code, elapsedMs } = await runTerminal(
            [
                "--headless",
                "--turbo",
                "--exit-halt",
                "--input",
                "KeyM,Enter,Digit7,Digit6,Enter,Period,KeyG,Digit0,Enter",
                "--timeout",
                "12",
                "--screen",
                screen,
                "--memory",
                mem,
                "--memory-from",
                "0x0000",
                "--memory-to",
                "0x0000",
            ],
            20000,
        );
        expect(code).toBe(0);
        // should exit on HLT well before --timeout 12 seconds
        expect(elapsedMs).toBeLessThan(8000);
        const bytes = readFileSync(mem);
        expect(bytes[0]).toBe(0x76); // HLT was actually written
        const text = readFileSync(screen, "utf-8");
        expect(text).toContain("-->M");
        expect(text).toContain("-->G0");
    });
});

function assertSnapshotMatchesGolden(actualPath: string, goldenPath: string) {
    // Re-serialize both sides with JSON.stringify so formatting differences
    // (e.g. a JSON formatter inlining short arrays in the committed golden)
    // can't misalign the line-by-line diff. The diff's line numbers then
    // refer to the canonical form shared by both files.
    const actualObj = JSON.parse(readFileSync(actualPath, "utf-8"));
    const goldenObj = JSON.parse(readFileSync(goldenPath, "utf-8"));
    actualObj.created = goldenObj.created; // drop non-deterministic timestamp
    actualObj.version = goldenObj.version; // version bumps are not a snapshot regression
    const actual = JSON.stringify(actualObj, null, 4);
    const golden = JSON.stringify(goldenObj, null, 4);
    assertSnapshotsEqual(actual, golden, goldenPath);
}

function assertScreenMatchesGolden(actualPath: string, goldenPath: string) {
    assertSnapshotsEqual(readFileSync(actualPath, "utf-8"), readFileSync(goldenPath, "utf-8"), goldenPath);
}

function cmd(keys: string) {
    return keys.split(" ");
}

test("snapshot matches golden after D-dump and G FFFE exit", async () => {
    await withTmpDir(async (dir) => {
        const screen = join(dir, "screen-command-d.txt");
        const snapshot = join(dir, "snapshot-command-d.json");
        const { code } = await runTerminal(
            [
                "--headless",
                "--turbo",
                "--timeout",
                "5",
                "--input",
                [
                    cmd("KeyD KeyF Digit8 Digit0 Digit0 Comma KeyF Digit8 KeyF KeyF Enter"),
                    "*1000",
                    cmd("KeyG KeyF KeyF KeyF KeyE Enter"),
                ]
                    .flat()
                    .join(","),
                "--exit-address",
                "0xfffe",
                "--screen",
                screen,
                "--snapshot",
                snapshot,
            ],
            20000,
        );
        expect(code).toBe(0);
        assertScreenMatchesGolden(screen, "tests/data/screen-command-d.txt");
        assertSnapshotMatchesGolden(snapshot, "tests/data/snapshot-command-d.json");
    });
}, 30000);

test("snapshot matches golden after M-command program entry and halt", async () => {
    await withTmpDir(async (dir) => {
        const screen = join(dir, "screen-command-m.txt");
        const snapshot = join(dir, "snapshot-command-m.json");
        const { code } = await runTerminal(
            [
                "--headless",
                "--turbo",
                "--timeout",
                "30",
                "--input",
                [
                    cmd("KeyM Enter"),
                    // lxi h, 0007h ; 21 07 00
                    cmd("Digit2 Digit1 Enter"), // 0000: 21 - lxi
                    cmd("Digit0 Digit7 Enter"), // 0001: 07 - addr low
                    cmd("Digit0 Digit0 Enter"), // 0002: 00 - addr high
                    // call 0f818h ; CD 18 F8
                    cmd("KeyC KeyD Enter"), // 0003: CD - call
                    cmd("Digit1 Digit8 Enter"), // 0004: 18 - addr low
                    cmd("KeyF Digit8 Enter"), // 0005: F8 - addr high
                    // hlt ; 76
                    cmd("Digit7 Digit6 Enter"), // 0006: 76 - HLT
                    // db: 24h, 0 ; 36h '$', 00h
                    cmd("Digit2 Digit4 Enter"), // 0007: '2', '4' -> '$'
                    cmd("Digit0 Digit0 Enter"), // 0008: 00
                    cmd("Period"), // .
                    cmd("KeyG Enter"), // G
                ]
                    .flat()
                    .join(","),
                "--exit-halt",
                "--screen",
                screen,
                "--snapshot",
                snapshot,
            ],
            60000,
        );
        expect(code).toBe(0);
        assertScreenMatchesGolden(screen, "tests/data/screen-command-m.txt");
        assertSnapshotMatchesGolden(snapshot, "tests/data/snapshot-command-m.json");
    });
}, 60000);
