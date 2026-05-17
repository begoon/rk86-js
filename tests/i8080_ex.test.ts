import { describe, expect, test } from "bun:test";

import { executor } from "../test/test_executor.ts";

describe.each([
    {
        name: "TEST.COM",
        timeout: 2,
        expected: [
            "> LOAD TEST.COM 1793",
            "OUTPUT: MICROCOSM ASSOCIATES 8080/8085 CPU DIAGNOSTIC VERSION 1.0  (C) 1980",
            "OUTPUT: ",
            "OUTPUT: CPU IS OPERATIONAL",
            "Jump to 0000 from 14f",
        ],
    },
    {
        name: "CPUTEST.COM",
        timeout: 120,
        expected: [
            "> LOAD CPUTEST.COM 19200",
            "OUTPUT: <00><00><00><00><00><00>",
            "OUTPUT: DIAGNOSTICS II V1.2 - CPU TEST",
            "OUTPUT: COPYRIGHT (C) 1981 - SUPERSOFT ASSOCIATES",
            "OUTPUT: ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "OUTPUT: CPU IS 8080/8085",
            "OUTPUT: BEGIN TIMING TEST",
            "OUTPUT: <07><07>END TIMING TEST",
            "OUTPUT: CPU TESTS OK",
            "OUTPUT: ",
            "Jump to 0000 from 3b25",
        ],
    },
    {
        name: "8080PRE.COM",
        timeout: 2,
        expected: ["> LOAD 8080PRE.COM 1024", "OUTPUT: 8080 Preliminary tests complete", "Jump to 0000 from 32f"],
    },
])(`file`, async ({ name, timeout, expected }) => {
    test(`${name} | ${timeout}s`, async () => {
        const { success, output } = await executor(name, false, timeout);
        expect(output).toEqual([...expected]);
        expect(success).toBeTrue();
    });
});
