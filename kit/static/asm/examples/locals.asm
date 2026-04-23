; @name / .name are scoped to the most recent non-local label.
; same name can be reused under different parents.

    org 0100h

start:
    lxi h, word
    call strlen                ; B = length
    mov a, b
    call 0f815h                ; print length in hex
    jmp 0f86ch

; classic @-style locals
strlen:
    mvi b, 0
@loop:
    mov a, m
    cpi 0
    jz @done
    inr b
    inx h
    jmp @loop
@done:
    ret

; dotted locals — the leading colon is required when standalone
strcmp:
    .loop:
        ldax d
        cmp m
        jnz .diff
        ora a
        rz
        inx h
        inx d
        jmp .loop
    .diff:
        mvi a, 1
        ret

word:
    db "ABCDE", 0
