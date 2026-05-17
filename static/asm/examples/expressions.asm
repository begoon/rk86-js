; C-precedence expressions with LOW/HIGH, |, &, ^, ~, <<, >>, %.

BASE    equ 0F800h
WIDTH   equ 40
HEIGHT  equ 25
SIZE    equ WIDTH * HEIGHT
MASK    equ (1 << 7) - 1

    org 0100h

start:
    mvi a, LOW(BASE + 5)       ; a = 05h
    mvi b, HIGH(BASE + 5)      ; b = F8h
    lxi h, BASE | 00FFh        ; hl = F8FFh
    lxi d, SIZE                ; de = 1000 = 3E8h
    mvi c, MASK & 0F0h         ; c  = 70h
    ani (1 << 3) - 1           ; a &= 7
    sui SIZE % 256             ; a -= 232 (wraps)
    call 0f815h                ; print A as hex
    jmp 0f86ch
