import process from "node:process";

import { executor } from "./test_executor.ts";

async function main(enable_exerciser: boolean, verbose = false): Promise<void> {
    if (verbose) console.log("Intel 8080/JS test\n");

    const tests = ["TEST.COM", "CPUTEST.COM", "8080PRE.COM"];

    if (enable_exerciser) tests.push("8080EX1.COM");

    for (const test of tests) {
        if (verbose) {
            console.log("|".repeat(30));
            console.log("> RUNNING", test);
        } else {
            console.log(">", test);
        }
        const { success, output, duration } = await executor(test, verbose);
        if (!success && !verbose) {
            console.log("|".repeat(30));
            output.forEach((line: string) => console.log(line));
        }
        console.log("> COMPLETED | " + duration + " | " + test + " " + (success ? "success" : "FAILED"));

        if (!success) process.exit(1);
    }
}

const ex1 = process.argv.includes("--ex1");
const verbose = process.argv.includes("--verbose");

const started = performance.now();

await main(ex1, verbose);

console.log("duration", ((performance.now() - started) / 1000.0).toFixed(3) + "s");
