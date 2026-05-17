; tiny RK86 program: prints "OK" via ROM routines
; F818h - puts string at HL (zero-terminated)
; F86Ch - monitor entry

    .org 0
    .section ok

    lxi h, ok
    call 0f818h
    jmp 0f86ch

ok: db "OK", 0
