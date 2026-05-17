; when .proc lists registers, .return compiles to
;     JMP __proc_N_exit
; and .endp emits the shared label + POPs + RET at the bottom.

    org 0100h

start:
    lxi h, nonzero
    call is_zero
    call 0f815h                ; print A as hex
    jmp 0f86ch

; preserves B and HL; sets A = 1 if *HL == 0 else A = 0
is_zero .proc b, h
    mvi b, 0                    ; scratch that must be preserved
    mov a, m
    cpi 0
    .if Z
        mvi a, 1
        .return                 ; -> JMP __proc_0_exit
    .endif
    mvi a, 0
.endp                           ; __proc_0_exit: POP H, POP B, RET

nonzero: db 42
