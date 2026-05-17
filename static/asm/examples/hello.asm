; edit the source - bytes and addresses appear on the left.
; any error is shown at the bottom and highlights its line.

    org 0100h

start:
    lxi h, msg
    call print
    jmp 0f86ch

print:
    mov a, m
    cpi 0
    rz
    mov c, a
    call 0f809h
    inx h
    jmp print

msg:
    db "hello, world", 0
