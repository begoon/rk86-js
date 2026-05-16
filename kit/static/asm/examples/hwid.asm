vram        equ 76D0h

vram_corner equ vram + 3*78 + 8
vram_color  equ vram_corner + 6 * 78

            org 0
            section colortest

            lxi sp, 75FFh

            lxi h, 0c001h \ mvi m, 0 \ dcx h                   ; [c001] = 0
            mvi m, 4Dh \ mvi m, 1Dh \ mvi m, 99h \ mvi m, 0D3h ; [c000] = 4D, 1D, 99, D3
            inx h \ mvi m, 27h                                 ; [c001] = 27          

            mov a, m
crt_wait:   mov a, m \ ani 20h \ jz $-3

            lxi h, 0e008h \ mvi m, 080h                        ; [e008] = 80
            mvi l, 4 \ mvi m, 0D0h \ mvi m, 76h                ; [e004] = D0, 76
            inr l \ mvi m, 23h \ mvi m, 49h                    ; [e005] = 23, 49
            mvi l, 8 \ mvi m, 0A4h                             ; [e008] = A4

            lxi h, about \ call 0f818h

refresh:
            lxi h, status_position \ call 0f818h

            stc \ stc \ stc \ stc    ; C=0 if emulator, A=<emulator_id>
            jnc emulator

            lxi h, emulator_not_found_msg \ call 0f818h
            lxi d, bw_data \ jmp print_colors

emulator:
            push b \ push psw

            lxi h, emulator_msg \ call 0f818h

            pop psw

            push psw \ call 0f815h \ pop psw  ; print emulator ID from A
            mvi c, ' ' \ call 0f809h

            pop b

            cpi 1                    ; rk86? -> B=color (0, 1, 2, 3), C=turbo
            jz rk86_emulator

            lxi h, unknown_emulator_msg \ call 0f818h

            jmp refresh

; --------------------------------------------------------------------
rk86_emulator:
            push b

            lxi h, rk86_emulator_msg \ call 0f818h

            pop b \ push b

            mov a, c \ cpi 0 \ mvi c, ' ' \ jz @not_turbo
            mvi c, 'X'
@not_turbo: 
            call 0f809h

            lxi h, rk86_emulator_msg_end \ call 0f818h

            mvi c, ' ' \ call 0f809h

            call rk86_spinner

            pop b
            mov a, b

            cpi 0
            jnz @not_bw

            lxi d, bw_data \ jmp print_colors
@not_bw:
            cpi 1 \ jnz @not_tolkalin
            lxi d, tolkalin_data \ jmp print_colors

@not_tolkalin:
            cpi 2 \ jnz @not_akimenko
            lxi d, akimenko_data \ jmp print_colors

@not_akimenko:
            cpi 3 \ jnz @not_apogey
            lxi d, apogey_data \ jmp print_colors
            
@not_apogey:
            jmp refresh

; ----------------------------------------
print_colors:
            lxi h, vram_color
            call draw
            jmp refresh
     
; ----------------------------------------
draw        .proc b, psw
            lxi b, 78
draw_line:
            push h
draw_char:
            ldax d \ inx d
            ora a \ jz draw_eol
            mov m, a \ inx h \ jmp draw_char
draw_eol:
            pop h
            dad b \ ldax d \ ora a \ jnz draw_line ; *[de += 78] == 0?
            endp
; ----------------------------------------

about:      db 1fh
            db "opredelenie |mulqtora - wersiq 1.0 - demin a. 2026", 13, 10, 13, 10
            db "trigger: 4 instrukcii STC -> CF=0 pod |mulqtorom, A=ID |mulqtora", 0

; ----------------------------------------

rk86_spinner proc h, d, b psw
            lhld @cnt \ inx h \ shld @cnt
            mov a, h \ call 0f815h
            mov a, l \ call 0f815h
            endp

@cnt        dw 0


; ----------------------------------------

status_position:        db 1bh, 59h, 20h+4, 20h, 0

unknown_emulator_msg:   db "neizwestnyj |mulqtor", 0
emulator_msg:           db "|mulqtor: ", 0

rk86_emulator_msg:      db "RK86.RU turbo [", 0
rk86_emulator_msg_end:  db "]", 0

emulator_not_found_msg: db "net |mulqtora                               ", 0

clear_data:
            db 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0
            db 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0, 0f0h, 0
            db 0

bw_data:
            db "~erno-beloe", 0f0h, 0
            db "-----------", 0f0h, 0
            db "80 oby~yj       ", 80h, "#### ", 80h, 0
            db "90 inwersiq     ", 90h, "####", 80h, 80h, 0
            db "82 miganie      ", 82h, "#### ", 80h, 0
            db "B2 mig/inw/pod~ ", 0B2h, "####", 80h, 80h, 0
            db "A0 pod~erkiwanie", 0A0h, "####", 80h, 80h, 0
            db 0f0h, 0
            db 0f0h, 0
            db 0f0h, 0
            db 0f0h, 0
            db 0f0h, 0
            db 0f0h, 0
            db 0

tolkalin_data:
            db "tolkalin", 0f0h, 0
            db "--------", 0f0h, 0
            db "80 seryj        ", 80h, "#### ", 80h, 0
            db "81 krasnyj      ", 81h, "#### ", 80h, 0
            db "84 zelenyj      ", 84h, "#### ", 80h, 0
            db "85 veltyj       ", 85h, "#### ", 80h, 0
            db "88 sinij        ", 88h, "#### ", 80h, 0
            db "89 fioletowyj   ", 89h, "#### ", 80h, 0
            db "8C goluboj      ", 8Ch, "#### ", 80h, 0
            db "8D belyj        ", 8Dh, "#### ", 80h, 0
            db "82 miganie      ", 82h, "#### ", 80h, 0
            db "B2 mig/inw/pod~ ", 0B2h, "####", 80h, 80h, 0
            db "A0 pod~erkiwanie", 0A0h, "####", 80h, 80h, 0
            db 0

akimenko_data:
            db "akimenko", 0f0h, 0
            db "--------", 0f0h, 0
            db "80 belyj        ", 80h, "#### ", 80h, 0
            db "81 veltyj       ", 81h, "#### ", 80h, 0
            db "84 goluboj      ", 84h, "#### ", 80h, 0
            db "85 zelenyj      ", 85h, "#### ", 80h, 0
            db "88 fioletowyj   ", 88h, "#### ", 80h, 0
            db "89 krasnyj      ", 89h, "#### ", 80h, 0
            db "8C sinij        ", 8Ch, "#### ", 80h, 0
            db "8D ~ernyj       ", 8Dh, "#### ", 80h, 0
            db "82 miganie      ", 82h, "#### ", 80h, 0
            db "B2 mig/inw/pod~ ", 0B2h, "####", 80h, 80h, 0
            db "A0 pod~erkiwanie", 0A0h, "####", 80h, 80h, 0
            db 0

apogey_data:
            db "apogej", 0f0h, 0
            db "------", 0f0h, 0
            db "80 belyj        ", 80h, "#### ", 80h, 0
            db "81 goluboj      ", 81h, "#### ", 80h, 0
            db "84 veltyj       ", 84h, "#### ", 80h, 0
            db "85 zelenyj      ", 85h, "#### ", 80h, 0
            db "88 fioletowyj   ", 88h, "#### ", 80h, 0
            db "89 sinij        ", 89h, "#### ", 80h, 0
            db "8C krasnyj      ", 8Ch, "#### ", 80h, 0
            db "8D ~ernyj       ", 8Dh, "#### ", 80h, 0
            db "82 miganie      ", 82h, "#### ", 80h, 0
            db "B2 mig/inw/pod~ ", 0B2h, "####", 80h, 80h, 0
            db "A0 pod~erkiwanie", 0A0h, "####", 80h, 80h, 0
            db 0
