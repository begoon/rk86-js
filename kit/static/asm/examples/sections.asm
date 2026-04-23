; each `org` starts a new section.
; `section "name"` names the current section (must follow org).

    org 0100h
    section "code"
start:
    lxi h, greeting
    call 0f818h        ; puts
    jmp 0f86ch

    org 0200h
    section "msg"
greeting:
    db "HELLO FROM ANOTHER SECTION", 0
