    org 0
    
    lxi h, monitor_msg \ call 0f818h
    mvi a, 0 \ sta mode \ call table

    call print_crlf \ call print_crlf

    lxi h, 76d0h + 78*(3 + 17) + 7 + 5
    shld vmem_addr

    lxi h, vram_msg \ call 0f818h
    mvi a, 1 \ sta mode \ call table

    jmp $

table:
    lxi h, header_msg \ call 0f818h
    
    mvi b, '0'
caption_loop:
    mvi a, '9' \ cmp b \ mov c, b \ mvi a, 0 \ jp decimal_digit
    mvi a, 7 
decimal_digit:
    add b \ mov c, a \ call 0f809h
    mvi c, ' '  \ call 0f809h
    inr b \ mov a, b \ ani 0fh
    jnz caption_loop

    call print_crlf

    lxi h, header_msg + 1 \ call 0f818h
    lxi b, 16 * 256 + '-'
dash_loop:
    call 0f809h \ call 0f809h \ dcr b \ jnz dash_loop
    call print_crlf
    
    mvi b, 0

line_loop:
    mov a, b \ ani 0fh \ ora a \ jnz skip_prefix

    mov a, b \ ani 0f0h \ call 0f815h
    lxi h, colon_msg \  call 0f818h

skip_prefix:
    lda mode \ ora a \ jz monitor_char

vmem_char:
    lhld vmem_addr
    mov m, b \ inx h
    mvi m, ' ' \ inx h
    shld vmem_addr
    jmp check_eol

monitor_char:
    mvi c, '.'
    mov a, b
    lxi h, skip_invisible
    push h
    cpi 07h \ rz
    cpi 08h \ rz
    cpi 0ah \ rz
    cpi 0dh \ rz
    cpi 0ch \ rz
    cpi 18h \ rz
    cpi 19h \ rz
    cpi 1ah \ rz
    cpi 1bh \ rz
    cpi 1fh \ rz
    pop h
    mov c, b
skip_invisible:
    call 0f809h

    mvi c, ' ' \ call 0f809h

check_eol:
    mov a, b \ ani 0fh \ cpi 0fh \ jnz next_value

    lhld vmem_addr \ lxi d, 78 - 16*2 \ dad d \ shld vmem_addr

    mov a, b \ cpi 7fh \ jz next_value
    call print_crlf

next_value:
    inr b
    jp line_loop

    ret

print_crlf .proc h
    lxi h, msg_crlf \ call 0f818h
    .endp

msg_crlf db 0dh, 0ah, 0

mode      db 0
vmem_addr dw 76d0h + 78*(3 + 17) + 7 + 5

header_msg db '    ', 0
colon_msg  db ': ', 0

monitor_msg  db 1fh ;, 1Bh, 59h, 20h+2, 20h+37,
             db 'tablica simwolow ~erez monitor', 13, 10, 13, 10, 0
             db 0

vram_msg  db 'tablica simwolow ~erez |krannu` oblastx', 13, 10, 13, 10, 0
