; .if <flag> skips the body when flag is false.
; flags: Z NZ C NC PO PE P M
; aliases: == (Z), <> (NZ)

    org 0100h

start:
    mvi a, 15                  ; try 3 / 12 / 42 and re-assemble
    call classify              ; B = class (1/2/3)
    mov a, b
    call 0f815h                ; print class in hex
    jmp 0f86ch

; classify A as <10 / 10..19 / >=20  (unsigned)
classify:
    cpi 10
    .if C
        mvi b, 1                ; A < 10
    .else
        cpi 20
        .if C
            mvi b, 2            ; 10 <= A < 20
        .else
            mvi b, 3            ; A >= 20
        .endif
    .endif
    ret
