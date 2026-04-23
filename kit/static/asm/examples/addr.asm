; `$` evaluates to the address of the current instruction/directive.

    org 0100h

start:
    mvi a, length              ; A = 8  (computed from $ below)
    call 0f815h                ; print length in hex
    mvi a, low_of_here         ; A = low byte of `here`'s address
    call 0f815h
    jmp 0f86ch

start_of_data:
    db 1, 2, 3, 4, 5, 6, 7, 8
length equ $ - start_of_data   ; $ here = end of db block

here:
low_of_here equ $ & 0FFh       ; $ captured at the address of `here`
