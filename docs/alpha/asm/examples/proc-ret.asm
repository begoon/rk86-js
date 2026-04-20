; with no register list, .proc has no pushes and no pops to emit,
; so .return compiles to a bare RET (1 byte).

    org 0100h

start:
    lxi h, zero
    call is_zero               ; A = 1 if *HL == 0 else 0
    call 0f815h                ; print A as hex
    jmp 0f86ch

; returns A = 1 when byte at HL is zero, else A = 0
is_zero .proc
    mov a, m
    cpi 0
    .if Z
        mvi a, 1
        .return                 ; -> RET (C9)
    .endif
    mvi a, 0
.endp

zero: db 0
