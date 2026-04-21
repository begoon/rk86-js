// Manifest of example programs shown in the playground's "Example" dropdown.
// Plain script — NOT bundled into playground.js; loaded at runtime by
// index.html so deployments can ship a different list without rebuilding.
// The actual source text for each entry lives in ./examples/<filename>
// and is fetched on demand.
window.asm8Examples = [
    { name: "aloha", filename: "hello.asm" },
    { name: "ok", filename: "ok.asm" },
    { name: "sections", filename: "sections.asm" },
    { name: "expressions", filename: "expressions.asm" },
    { name: "current address $", filename: "addr.asm" },
    { name: "local labels @ and .", filename: "locals.asm" },
    { name: "if / else", filename: "ifelse.asm" },
    { name: "proc: .return -> RET (no saves)", filename: "proc-ret.asm" },
    { name: "proc: .return -> JMP exit (with saves)", filename: "proc-jmp.asm" },
    { name: "dump editor", filename: "dumped.asm" },
    { name: "chars", filename: "chars.asm" },
    { name: "noise", filename: "noise.asm" },
    { name: "banner", filename: "banner.asm" },
    { name: "pong", filename: "pong.asm" },
    { name: "sokoban", filename: "sokoban.asm" },
    { name: "volcano", filename: "volcano.asm" },
    { name: "lestnica", filename: "lestnica.asm" },
    { name: "diverse", filename: "diverse.asm" },
];
