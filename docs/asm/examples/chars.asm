    org 0
    
    mvi c, 1fh
    call 0f809h

    lxi h, header_msg
    call 0f818h
    
    mvi b, '0'
print_caption_loop:
    mvi a, '9'
    cmp b
    mov c, b
    jp print_caption_decimal
    mvi a, 7
    add b
    mov c, a
print_caption_decimal:
    call 0f809h
    mvi c, ' ' 
    call 0f809h
    inr b
    mov a, b
    ani 0fh
    jnz print_caption_loop
    call print_crlf

    lxi h, header_msg + 1
    call 0f818h
    lxi b, 16 * 256 + '-'
print_dash_loop:
    call 0f809h
    call 0f809h
    dcr b
    jnz print_dash_loop
    call print_crlf
    
    mvi b, 0
    mvi c, '.'
loop:
    mov a, b
    ani 0fh
    cpi 0
    jnz no_sol
    mov a, b
    ani 0f0h
    call 0f815h
    mvi c, ':'
    call 0f809h
    mvi c, ' '
    call 0f809h
no_sol:
    mvi c, '.'
    mov a, b
    cpi 07h
    jz skip_invisible
    cpi 08h
    jz skip_invisible
    cpi 18h
    jz skip_invisible
    cpi 19h
    jz skip_invisible
    cpi 1ah
    jz skip_invisible
    cpi 0ah
    jz skip_invisible
    cpi 0dh
    jz skip_invisible
    cpi 0ch
    jz skip_invisible
    cpi 1fh
    jz skip_invisible
    mov c, b
skip_invisible:
    call 0f809h
    mvi c, ' '
    call 0f809h    
    mov a, b
    ani 0fh
    cpi 0fh
    jnz no_eol
    mvi c, 0ah
    call 0f809h
    mvi c, 0dh
    call 0f809h
no_eol:
    inr b
    jp loop
    jmp 0f86ch

print_crlf:
    push h
    lxi h, msg_crlf
    call 0f818h
    pop h
    ret
msg_crlf db 0dh, 0ah, 0

header_msg db '    ', 0
