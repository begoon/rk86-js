; <name> .proc [PSW, B, D, H]  -- auto-saves and restores listed pairs.
; .endp emits the pops + RET.   .return = same, for early exit.

    org 0100h

start:
    lxi h, buf
    call strlen                ; B = length
    mov a, b
    call 0f815h                ; print as hex
    jmp 0f86ch

; preserves PSW and HL; returns length in B
strlen .proc psw, h
    mvi b, 0
@loop:
    mov a, m
    cpi 0
    .if Z
        .return                 ; pops H then PSW, then RET
    .endif
    inr b
    inx h
    jmp @loop
.endp

buf:
    db "HELLO, WORLD", 0
