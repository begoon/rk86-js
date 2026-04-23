start         equ  0F800h
getc          equ  0F803h
inpb          equ  0F806h
putc          equ  0F809h
outb          equ  0F80Ch
kbhit         equ  0F812h
hexb          equ  0F815h
puts          equ  0F818h
scan_kbd      equ  0F81Bh
getxy         equ  0F81Eh
curc          equ  0F821h
inpblock      equ  0F824h
outblock      equ  0F827h
chksum        equ  0F82Ah
video         equ  0F82Dh
getlim        equ  0F830h
setlim        equ  0F833h
prompt_loop   equ  0F86Ch
cursor_addr   equ  7600h
mik_putc_hook equ  763Ah
video_memory  equ  76D0h
row_down      equ  004Eh
row_up        equ  0FFB2h
mik_kbd       equ  0C7FFh
mik_intf1     equ  0CFFFh
mik_timer0    equ  0D800h
mik_timer1    equ  0D801h
mik_timer2    equ  0D802h
mik_beep      equ  0D902h
mik_timer_ctl equ  0DB08h

            org  0000h
            section aliaz1

entry:                                      ; offset 0000
            nop
            nop
            call init_mikrosha
            lxi  d, splash_data
            lxi  h, video_memory + 5*78 + 8 ; 785E
            call copy_splash
            call getc
            lxi  h, msg_v32
            call puts
            lxi  h, tune_intro
            call play_tune
            jmp  L00A9
msg_v32:                                    ; offset 0020
            db   1Fh, 1Bh, 'Y+<V-32 Kbajt', 00h ; "<cls><esc>Y+<V-32 KБАЙТ"
msg_vremya:                                 ; offset 0030
            db   1Bh, 'Y @wremq ', 00h      ; "<esc>Y @ВРЕМЯ "
time_byte:                                  ; offset 003B
            db   09h
msg_popytki:                                ; offset 003C
            db   0Ch, 'wa{i popytki:', 00h  ; "<home>ВАШИ ПОПЫТКИ:"
attempts_left:                              ; offset 004B
            db   05h
msg_keys:                                   ; offset 004C
            db   0Ch, 0Ah, 'kl`~i: L - ', 00h ; "<home><lf>КЛЮЧИ: L - "
msg_keys_j:                                 ; offset 005A
            db   ' J - ', 00h               ; " J - "
keys_l:                                     ; offset 0060
            db   00h
keys_j:                                     ; offset 0061
            db   00h
msg_almazy:                                 ; offset 0062
            db   1Bh, 'Y!@AlmAzy :', 00h    ; "<esc>Y!@AЛМAЗЫ :"
diamonds_hi:                                ; offset 006F
            db   00h
diamonds_lo:                                ; offset 0070
            db   00h
msg_game_over:                              ; offset 0071
            db   1Bh, 'Y#<   GAME OVER ', 1Bh, 'Y$;  navmite <wk>  ', 00h ; "<esc>Y#<   GAME OVER <esc>Y$;  НАЖМИТЕ <ВК>  "
player_pos:                                 ; offset 0097
            dw   78AFh                      ; 78AF = video_memory + 6*78 + 11
last_key:                                   ; offset 0099
            db   08h
saved_addr:                                 ; offset 009A
            dw   7D62h                      ; 7D62 = video_memory + 21*78 + 44
saved_state:                                ; offset 009C
            db   00h
tick_sub:                                   ; offset 009D
            db   03h
delay_outer:                                ; offset 009E
            db   10h
level_ptr:                                  ; offset 009F
            dw   149Fh
step_mod7:                                  ; offset 00A1
            db   00h
bonus_used:                                 ; offset 00A2
            db   00h
hop_state:                                  ; offset 00A3
            db   00h
saved_sp:                                   ; offset 00A4
            dw   75F7h
tick_slow:                                  ; offset 00A6
            db   07h
tile_under:                                 ; offset 00A7
            db   00h
saved_bc_count:                             ; offset 00A8
            db   02h
L00A9:
            call reset_game
            call draw_level
            call scan_kbd
L00B2:
            cpi  1Bh                        ; '<esc>'
            cz   handle_esc
            call L046E
            jmp  L051F
L00BD:
            nop
L00BE:
            lxi  h, msg_popytki
            call puts
            lda  attempts_left
            cpi  00h
            jz   L042F
            adi  30h                        ; '0'
            mov  c, a
            call putc
            lxi  h, msg_vremya
            call puts
            lda  time_byte
            call hexb
            lxi  h, msg_keys
            call puts
            lda  keys_l
            adi  30h                        ; '0'
            mov  c, a
            call putc
            lxi  h, msg_keys_j
            call puts
            lda  keys_j
            adi  30h                        ; '0'
            mov  c, a
            call putc
            lxi  h, msg_almazy
            call puts
            lda  diamonds_hi
            call hexb
            lda  diamonds_lo
            call hexb
            lda  bonus_used
            cpi  0FFh
            jnz  L011C
            call bird_step
            jmp  L0122
L011C:
            call L014A
            call L03AD
L0122:
            call L025C
            lda  tick_slow
            cpi  0Fh                        ; '<dn>'
            cz   L02ED
            lhld player_pos
            mvi  m, 09h                     ; '<tab>'
            inx  h
            mov  a, m
            cpi  1Dh                        ; '<right>'
            jnz  L013E
            mvi  a, 1Bh                     ; '<esc>'
            jmp  L00B2
L013E:
            call L0349
            call delay_bc
            call L0412
            jmp  L04E2
L014A:
            call scan_kbd
            lxi  d, entry
            lhld player_pos
            cpi  03h
            jz   start
            cpi  20h                        ; ' '
            jnz  L0163
            mvi  a, 0FFh
            sta  bonus_used
            ret
L0163:
            cpi  0FFh
            jz   L016B
            sta  last_key
L016B:
            nop
            nop
            nop
            cpi  08h
            cz   L01BE
            cpi  18h
            cz   L01C2
            cpi  19h
            cz   L01C6
            cpi  1Ah
            cz   L01D3
            lda  tile_under
            mov  m, a
            dad  d
            mov  a, m
            cpi  3Dh                        ; '='
            rz
            cpi  11h                        ; '<left>'
            jnz  L01A0
            lda  keys_l
            cpi  00h
            rz
            dcr  a
            sta  keys_l
            lxi  b, 1530h
            call mikrosha_beep
L01A0:
            cpi  23h                        ; '#'
            jnz  L01B5
            lda  keys_j
            cpi  00h
            rz
            dcr  a
            sta  keys_j
            lxi  b, 4030h
            call mikrosha_beep
L01B5:
            sta  tile_under
            shld player_pos
            mvi  m, 09h                     ; '<tab>'
            ret
L01BE:
            lxi  d, 0FFFFh
            ret
L01C2:
            lxi  d, 0001h
            ret
L01C6:
            lxi  d, row_up
            jmp  L01D6
L01CC:
            lxi  d, entry
            lhld player_pos
            ret
L01D3:
            lxi  d, row_down
L01D6:
            dad  d
            lda  tile_under
            cpi  48h                        ; 'H'
            jz   L01EB
L01DF:
            mov  a, m
            cpi  48h                        ; 'H'
            jnz  L01CC
L01E5:
            lhld player_pos
            mvi  m, 48h                     ; 'H'
            ret
L01EB:
            lda  last_key
            cpi  1Ah
            jz   L01DF
            mov  a, m
            cpi  00h
            jnz  L01DF
            jmp  L01E5
bird_step:                                  ; offset 01FC
            lhld player_pos
            lda  tile_under
            cpi  48h                        ; 'H'
            jz   L0237
            mvi  m, 00h
            lda  hop_state
            inr  a
            cpi  04h
            jz   L0237
            sta  hop_state
            add  a
            mov  e, a
            mvi  d, 00h
            lxi  h, bird_hop_deltas
            dad  d
            mov  c, m
            inx  h
            mov  b, m
            lhld player_pos
            dad  b
            lxi  d, entry
            call L024A
            dad  d
            mov  a, m
            cpi  00h
            jnz  L0237
            shld player_pos
            mvi  m, 09h                     ; '<tab>'
            ret
L0237:
            xra  a
            sta  hop_state
            sta  bonus_used
            ret
bird_hop_deltas:                            ; offset 023F
            dw   row_up
            dw   row_up
            dw   row_up
            dw   row_down
            db   00h, 00h, 00h
L024A:
            lda  last_key
            cpi  08h
            jnz  L0255
            lxi  d, 0FFFFh
L0255:
            cpi  18h
            rnz
            lxi  d, 0001h
            ret
L025C:
            lhld player_pos
            lda  tile_under
            cpi  00h
            rz
            cpi  4Ch                        ; 'L'
            jnz  L027D
            lda  keys_l
            cpi  03h
            rz
            inr  a
            sta  keys_l
            lxi  h, tune_a
            call play_tune
            jmp  L02C9
L027D:
            cpi  4Ah                        ; 'J'
            jnz  L0295
            lda  keys_j
            cpi  03h
            rz
            inr  a
            sta  keys_j
            lxi  h, tune_d
            call play_tune
            jmp  L02C9
L0295:
            cpi  2Ah                        ; '*'
            jnz  L02A6
            call L02CF
            lxi  h, tune_a
            call play_tune
            jmp  L02C9
L02A6:
            cpi  3Fh                        ; '?'
            jnz  L02B2
            xra  a
            sta  time_byte
            jmp  L02C9
L02B2:
            cpi  30h                        ; '0'
            rnz
            lda  attempts_left
            dcr  a
            sta  attempts_left
            mvi  m, 00h
            lxi  h, video_memory + 6*78 + 10 ; 78AE
            shld player_pos
            xra  a
            sta  tile_under
            ret
L02C9:
            mvi  a, 00h
            sta  tile_under
            ret
L02CF:
            lda  tick_slow
            inr  a
            sta  tick_slow
            lda  diamonds_lo
            inr  a
            daa
            sta  diamonds_lo
            cpi  00h
            jz   L02E4
            ret
L02E4:
            lda  diamonds_hi
            inr  a
            daa
            sta  diamonds_hi
            ret
L02ED:
            lda  attempts_left
            inr  a
            cpi  09h                        ; '<tab>'
            jz   L02F9
            sta  attempts_left
L02F9:
            xra  a
            sta  tick_slow
            ret
play_tune:                                  ; offset 02FE
            mov  a, m
            cpi  0FFh
            rz
            mov  b, a
            inx  h
            mov  c, m
            call mikrosha_beep
            inx  h
            call delay_bc
            jmp  play_tune
tune_a:                                     ; offset 030F
            db   30h
            db   10h, 30h, 10h, 30h, 10h, 40h, 10h, 30h, 10h, 0FFh
tune_b:                                     ; offset 031A
            db   90h
            db   20h, 80h, 30h, 70h, 20h, 90h, 40h, 0FFh
tune_intro:                                 ; offset 0323
            db   40h
            db   33h, 3Ah, 39h, 30h, 30h, 60h, 10h, 35h, 50h, 3Ah, 4Dh, 0FFh, 0FFh
tune_d:                                     ; offset 0331
            db   90h
            db   10h, 0A0h, 0Ah, 95h, 10h, 0A0h, 10h, 0A0h, 20h, 0FFh
delay_bc:                                   ; offset 033C
            lda  delay_outer
            mov  b, a
L0340:
            dcr  c
            jnz  L0340
            dcr  b
            jnz  L0340
            ret
L0349:
            lhld saved_addr
            mvi  m, 00h
            inx  h
            mvi  m, 00h
            dcx  h
            lda  saved_state
            cpi  00h
            jz   L0378
L035A:
            lxi  d, row_up
            dad  d
            mov  a, m
            cpi  09h                        ; '<tab>'
            cz   L0391
            cpi  00h
            jnz  L0378
            mvi  m, 05h                     ; '<gfx>'
            inx  h
            mvi  m, 12h
            dcx  h
            mvi  a, 08h
L0371:
            sta  saved_state
            shld saved_addr
            ret
L0378:
            lxi  d, row_down
            dad  d
            mov  a, m
            cpi  09h                        ; '<tab>'
            cz   L0391
            cpi  00h
            jnz  L035A
            mvi  m, 05h                     ; '<gfx>'
            inx  h
            mvi  m, 12h
            dcx  h
            xra  a
            jmp  L0371
L0391:
            mvi  a, 95h
            sta  time_byte
            lxi  b, 5020h
            call mikrosha_beep
            ora  a
            jnz  L03A6
            lxi  d, row_up
            jmp  L03A9
L03A6:
            lxi  d, row_down
L03A9:
            dad  d
            mov  a, m
            cpi  09h                        ; '<tab>'
L03AD:
            lhld player_pos
            lda  tile_under
            cpi  48h                        ; 'H'
            rz
            lxi  b, row_down
            dad  b
            mvi  d, 00h
            mov  a, m
            cpi  00h
            rnz
            lhld player_pos
            lda  tile_under
            mov  m, a
L03C7:
            lxi  b, row_down
            dad  b
            inr  d
            mov  a, m
            cpi  00h
            jnz  L03DF
            mvi  m, 09h                     ; '<tab>'
            lxi  b, 7010h
            call mikrosha_beep
            mvi  m, 00h
            jmp  L03C7
L03DF:
            lxi  b, row_up
            dad  b
            mvi  m, 09h                     ; '<tab>'
            mov  a, d
            cpi  05h                        ; '<gfx>'
            jm   L040C
            mvi  m, 00h
L03ED:
            lhld player_pos
            mvi  m, 00h
            mvi  c, 07h                     ; '<bel>'
            call putc
            lxi  h, video_memory + 6*78 + 10 ; 78AE
            shld player_pos
            xra  a
            sta  time_byte
            sta  tile_under
            lda  attempts_left
            dcr  a
            sta  attempts_left
            ret
L040C:
            shld player_pos
            mvi  m, 09h                     ; '<tab>'
            ret
L0412:
            lda  tick_sub
            dcr  a
            sta  tick_sub
            cpi  00h
            rnz
            mvi  a, 08h
            sta  tick_sub
            lda  time_byte
            inr  a
            daa
            sta  time_byte
            cpi  99h
            jz   L03ED
            ret
L042F:
            lxi  h, msg_game_over
            call puts
            lxi  h, tune_b
            call play_tune
L043B:
            call getc
            cpi  0Dh                        ; '<cr>'
            jz   L00A9
            jmp  L043B
reset_game:                                 ; offset 0446
            xra  a
            sta  keys_l
            sta  keys_j
            sta  diamonds_hi
            sta  diamonds_lo
            sta  time_byte
            sta  step_mod7
            mvi  a, 05h                     ; '<gfx>'
            sta  tick_sub
            sta  attempts_left
            lxi  h, level_1
            shld level_ptr
            lxi  h, video_memory + 6*78 + 10 ; 78AE
            shld player_pos
            ret
L046E:
            lxi  h, video_memory + 3*78 + 8 ; 77C2
L0471:
            mov  a, m
            cpi  05h                        ; '<gfx>'
            jz   L047F
            inx  h
            mov  a, h
            cpi  80h
            rz
            jmp  L0471
L047F:
            shld saved_addr
            ret
draw_level:                                 ; offset 0483
            lhld level_ptr
            xchg
            lxi  h, video_memory + 5*78 + 8 ; 785E
copy_splash:                                ; offset 048A
            ldax d
            mov  m, a
            inx  d
            inx  h
            mov  a, h
            cpi  80h
            jz   L0497
            jmp  copy_splash
L0497:
            xchg
            shld level_ptr
            ret
handle_esc:                                 ; offset 049C
            call wipe_block
            lda  step_mod7
            inr  a
            sta  step_mod7
            cpi  07h                        ; '<bel>'
            jnz  L04B5
            lxi  h, level_1
            xra  a
            sta  step_mod7
            shld level_ptr
L04B5:
            call draw_level
            xra  a
            sta  time_byte
            lxi  h, video_memory + 6*78 + 10 ; 78AE
            shld player_pos
            lda  attempts_left
            inr  a
            cpi  09h                        ; '<tab>'
            jz   L04CE
            sta  attempts_left
L04CE:
            lda  delay_outer
            dcr  a
            rnz
            sta  delay_outer
            ret
wipe_block:                                 ; offset 04D7
            mvi  b, 15h
L04D9:
            call mikrosha_beep
            dcr  c
            dcr  b
            jnz  L04D9
            ret
L04E2:
            lhld saved_sp
            sphl
            lda  saved_bc_count
            mov  c, a
L04EA:
            pop  h
            pop  d
            mvi  m, 00h
            mov  a, d
            cpi  00h
            jz   L050F
L04F4:
            mvi  d, 0Bh                     ; '<up>'
            inx  h
            mov  a, m
            cpi  00h
            jnz  L050F
            mvi  m, 30h                     ; '0'
            push d
            push h
L0501:
            inx  sp
            inx  sp
            inx  sp
            inx  sp
            dcr  c
            jnz  L04EA
            lxi  sp, 7500h
            jmp  L00BE
L050F:
            mvi  d, 00h
            dcx  h
            mov  a, m
            cpi  00h
            jnz  L04F4
            mvi  m, 30h                     ; '0'
            push d
            push h
            jmp  L0501
L051F:
            lxi  h, video_memory + 6*78 + 8 ; 78AC
            mvi  c, 00h
L0524:
            mov  a, m
            cpi  30h                        ; '0'
            jnz  L052B
            inr  c
L052B:
            inx  h
            mov  a, h
            cpi  80h
            jnz  L0524
            mov  a, c
            sta  saved_bc_count
            lxi  sp, 75FFh
            lxi  h, video_memory + 6*78 + 8 ; 78AC
            lxi  d, entry
L053F:
            mov  a, m
            cpi  30h                        ; '0'
            jnz  L0547
            push d
            push h
L0547:
            inx  h
            mov  a, h
            cpi  80h
            jnz  L053F
            lxi  h, entry
            dad  sp
            shld saved_sp
            lxi  sp, 7500h
            jmp  L00BD
splash_data:                                ; offset 055B
            db   00h
            db   20h, 20h, 20h, 20h, 20h, 20h, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
L0594:
            db   '       ', 00h             ; "       "
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 20h, 20h
            db   20h, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh
            db   7Fh, 7Fh, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 14h, 20h, 14h, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 7Fh
            db   7Fh, 14h, 14h, 14h, 14h, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
L05E5:
            db   '    ', 00h                ; "    "
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 20h, 20h
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 20h
            db   7Fh, 7Fh, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 20h, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 20h, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
L0635:
            db   '  ', 00h                  ; "  "
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 7Fh, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 7Fh, 7Fh
            db   20h, 7Fh, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 7Fh, 20h, 7Fh, 7Fh, 7Fh, 20h
            db   7Fh, 7Fh, 7Fh, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 03h, 03h, 03h, 7Fh, 7Fh, 7Fh, 20h, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 20h, 20h, 7Fh, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 14h, 14h, 14h, 20h, 7Fh
            db   20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 7Fh, 20h, 14h, 14h, 14h, 20h, 7Fh, 7Fh
            db   20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 7Fh, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
L06D1:
            db   '  ', 00h                  ; "  "
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 20h, 20h
            db   20h, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh, 7Fh, 7Fh
            db   20h, 7Fh, 20h, 03h, 03h, 03h, 7Fh, 03h, 20h, 03h, 7Fh, 20h, 7Fh, 7Fh, 7Fh, 20h
            db   7Fh, 20h, 03h, 03h, 03h, 03h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 20h, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
L071D:
            db   '    ', 00h                ; "    "
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 20h, 20h
            db   20h, 20h, 20h, 20h, 20h, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
            db   7Fh, 7Fh, 7Fh, 7Fh, 7Fh, 7Fh
L0768:
            db   '       ', 00h             ; "       "
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
help_intro:                                 ; offset 07CF
            db   'osnownoe,~to nuvno znatx na~ina`}emu:', 00h ; "ОСНОВНОЕ,ЧТО НУЖНО ЗНАТЬ НАЧИНАЮЩЕМУ:"
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h
help_diamond:                               ; offset 086A
            db   '* -dorogoj almaz', 00h    ; "* -ДОРОГОЙ АЛМАЗ"
L087B:
            db   '(200 karat!)', 00h        ; "(200 КАРАТ!)"
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
help_question:                              ; offset 08B8
            db   '? -|to daet dopolnitelxnoe wremq', 00h ; "? -ЭТО ДАЕТ ДОПОЛНИТЕЛЬНОЕ ВРЕМЯ"
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
help_key_l:                                 ; offset 0903
            db   00h
            db   00h
L0905:
            db   ' L -|to kl`~,im movno otkrytx dwerx ', 11h, 00h ; " L -ЭТО КЛЮЧ,ИМ МОЖНО ОТКРЫТЬ ДВЕРЬ <left>"
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
help_key_j:                                 ; offset 0954
            db   'J -a |tim kl`~om movno otkrytx dwerx #', 00h ; "J -А ЭТИМ КЛЮЧОМ МОЖНО ОТКРЫТЬ ДВЕРЬ #"
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 0Fh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 0Eh
help_exit:                                  ; offset 09F0
            db   ' ', 1Dh, '-|to wyhod iz komnaty', 00h ; " <right>-ЭТО ВЫХОД ИЗ КОМНАТЫ"
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 0Bh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
msg_press_any:                              ; offset 0A93
            db   00h
L0A94:
            db   'navmite l`bu` klawi{u ! ', 00h ; "НАЖМИТЕ ЛЮБУЮ КЛАВИШУ ! "
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h
sig_author:                                 ; offset 0C12
            db   'a.bytko.', 00h            ; "А.БЫТКО."
            db   00h, 00h, 00h
sig_date_place:                             ; offset 0C1E
            db   '22.4.89 g. riga t.282-6-5-6', 00h ; "22.4.89 Г. РИГА Т.282-6-5-6"
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Ah, 00h, 3Ah, 00h, 3Ah, 00h, 3Ah, 00h
            db   3Ah, 00h, 3Ah
level_1:                                    ; offset 0CFD
            db   03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 2Fh, 3Dh, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 2Fh, 3Dh, 00h, 00h, 00h, 30h, 00h
            db   00h, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 48h, 3Dh
            db   3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 2Fh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 06h, 3Dh, 00h, 00h, 48h, 48h, 48h, 48h, 48h, 48h
            db   48h, 48h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 06h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 48h
            db   00h, 00h, 2Ah, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 06h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 2Ah
            db   2Ah, 2Ah, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   06h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 06h, 3Dh
            db   00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 06h, 3Dh, 00h, 00h
            db   48h, 00h, 00h, 2Dh, 2Dh, 2Dh, 00h, 00h, 3Dh, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 7Eh, 74h, 6Fh, 62h, 20h, 77h, 6Fh, 6Ah
            db   74h, 69h, 20h, 77h, 20h, 64h, 6Fh, 6Dh, 2Ch, 00h, 00h, 00h, 00h, 70h, 74h, 69h
            db   7Eh, 6Bh, 61h, 2Dh, 00h, 00h, 00h, 00h, 00h, 00h, 06h, 3Dh, 00h, 00h, 48h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 77h, 6Fh, 7Ah, 78h, 6Dh, 69h, 20h, 6Bh, 6Ch, 60h
            db   7Eh, 69h, 20h, 0Fh, 00h, 00h, 00h, 00h, 00h, 75h, 62h, 69h, 6Ah, 63h, 61h, 20h
            db   77h, 72h, 65h, 6Dh, 65h, 6Eh, 69h, 00h, 06h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h
            db   00h, 2Dh, 2Dh, 2Dh, 2Dh, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 4Ch, 4Ah, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 0Fh, 0Fh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 06h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 05h, 12h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 06h, 3Dh, 00h, 00h, 48h, 00h, 00h, 2Dh, 2Dh, 2Dh, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 06h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 7Eh, 65h, 72h, 65h
            db   70h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   06h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 3Dh, 48h, 77h, 79h, 68h, 6Fh, 64h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 06h, 3Dh
            db   00h, 00h, 48h, 00h, 00h, 00h, 00h, 3Dh, 48h, 00h, 00h, 0Fh, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Fh, 00h, 00h, 00h, 00h, 11h, 23h, 00h, 00h
            db   48h, 00h, 00h, 00h, 00h, 3Dh, 48h, 00h, 0Eh, 00h, 1Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 0Bh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h
level_2:                                    ; offset 149F
            db   03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 2Dh, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 30h, 00h, 00h, 30h, 00h, 00h
            db   30h, 00h, 00h, 48h, 00h, 00h, 00h, 4Ah, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 48h
            db   00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 3Fh, 00h, 00h, 00h
            db   00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 3Dh, 00h, 4Ch, 00h, 48h, 00h, 00h, 3Dh
            db   00h, 00h, 48h, 00h, 48h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 48h, 00h, 00h
            db   00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 2Ah, 00h, 00h, 48h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 3Dh, 3Dh
            db   3Dh, 48h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 2Dh, 00h, 00h
            db   48h, 00h, 48h, 00h, 4Ch, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h
            db   48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   00h, 00h, 00h, 00h, 3Dh, 00h, 3Fh, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 3Dh, 00h, 3Fh, 3Fh, 00h, 48h, 00h, 00h, 00h, 00h, 23h, 00h
            db   00h, 00h, 00h, 00h, 00h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 00h, 4Ch, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 2Ah, 00h, 3Dh, 00h, 00h
            db   00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 2Ah
            db   00h, 00h, 00h, 11h, 00h, 00h, 00h, 00h, 00h, 4Ah, 4Ah, 4Ah, 00h, 00h, 00h, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h
            db   48h, 00h, 00h, 4Ah, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 05h, 12h, 00h, 00h, 00h, 00h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h
            db   00h, 00h, 00h, 48h, 00h, 00h, 00h, 2Ah, 2Ah, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 3Fh, 3Fh
            db   00h, 48h, 00h, 00h, 2Ah, 2Ah, 00h, 00h, 00h, 30h, 00h, 00h, 2Ah, 2Ah, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 4Ah, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 3Dh, 2Ah, 2Ah
            db   48h, 2Ah, 3Dh, 48h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 2Ah, 00h, 00h, 48h, 00h
            db   00h, 2Ah, 00h, 00h, 00h, 00h, 00h, 4Ch, 4Ch, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 48h, 3Dh
            db   3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 2Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 48h, 00h, 00h
            db   20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 2Ah, 48h, 2Ah, 2Ah, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h
            db   00h, 3Dh, 48h, 00h, 00h, 00h, 4Ch, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 20h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h
            db   48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 20h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 48h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 3Dh, 00h, 3Fh, 3Fh, 00h, 48h, 00h, 00h, 11h, 00h, 00h, 00h, 00h, 30h
            db   00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h
            db   4Ch, 00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 00h, 4Ch, 00h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h
            db   00h, 00h, 00h, 48h, 00h, 00h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h
            db   00h, 48h, 00h, 00h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 77h, 79h
            db   68h, 6Fh, 64h, 00h, 0Fh, 0Fh, 0Fh, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 5Eh, 5Eh, 00h, 48h
            db   00h, 00h, 23h, 00h, 23h, 00h, 23h, 00h, 23h, 00h, 23h, 00h, 00h, 00h, 30h, 00h
            db   00h, 00h, 00h, 00h, 11h, 00h, 11h, 00h, 11h, 00h, 11h, 00h, 11h, 00h, 00h, 00h
            db   00h, 2Ah, 00h, 2Ah, 00h, 2Ah, 00h, 2Ah, 00h, 2Ah, 00h, 00h, 00h, 00h, 00h, 0Eh
            db   20h, 1Dh, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 32h, 2Dh, 61h, 71h, 20h, 6Bh, 6Fh, 6Dh, 6Eh, 61h
            db   74h, 61h, 2Eh, 2Eh, 2Eh, 64h, 6Fh, 77h, 6Fh, 6Ch, 78h, 6Eh, 6Fh, 2Dh, 74h, 61h
            db   6Bh, 69h, 20h, 74h, 72h, 75h, 64h, 6Eh, 61h, 71h, 2Eh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 20h, 20h, 20h, 20h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 47h, 52h, 41h, 50h, 48h, 59h, 43h, 20h, 42h, 59h, 20h, 53h
            db   54h, 45h, 50h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h
level_3:                                    ; offset 1C41
            db   03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 11h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 20h, 00h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 3Fh, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 4Ch, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   3Fh, 3Fh, 3Fh, 3Fh, 3Fh, 00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 48h
            db   3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 3Fh, 00h, 00h, 00h, 00h, 00h, 00h, 05h, 12h, 00h
            db   20h, 00h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 48h, 00h, 00h
            db   00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 23h, 00h
            db   11h, 00h, 00h, 2Ah, 00h, 00h, 30h, 00h, 00h, 2Ah, 00h, 00h, 00h, 00h, 00h, 48h
            db   00h, 23h, 00h, 00h, 00h, 00h, 11h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 11h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Fh, 3Fh, 48h, 00h, 00h, 00h, 00h
            db   00h, 00h, 4Ch, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 2Ah, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 00h, 4Ah, 00h, 00h, 00h, 00h, 00h
            db   00h, 30h, 00h, 00h, 00h, 00h, 20h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 3Fh, 00h
            db   3Dh, 00h, 00h, 30h, 00h, 00h, 48h, 00h, 2Ah, 00h, 3Dh, 00h, 3Fh, 00h, 48h, 00h
            db   00h, 00h, 2Ah, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 00h, 4Ch, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 48h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 30h, 00h, 00h, 00h, 00h, 20h, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 48h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 30h, 00h, 00h, 00h, 00h, 20h, 48h, 00h, 00h, 2Ah, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 48h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 4Ah, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h
            db   48h, 2Ah, 2Ah, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 48h, 00h, 2Ah, 2Ah, 00h, 3Dh, 00h, 00h, 30h, 00h, 00h
            db   48h, 00h, 4Ch, 00h, 3Dh, 00h, 00h, 00h, 48h, 00h, 30h, 00h, 2Ah, 00h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 2Ah, 3Fh, 2Ah, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 48h, 00h, 3Dh, 4Ah, 00h, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 48h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 48h, 00h, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 48h, 00h, 00h, 00h, 00h, 00h
            db   11h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 4Ch
            db   00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 4Ch, 3Dh, 2Ah, 2Ah, 48h, 00h, 00h, 00h
            db   00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h
            db   48h, 00h, 3Dh, 2Ah, 2Ah, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 00h
            db   00h, 20h, 20h, 00h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 00h, 00h, 30h, 00h, 00h
            db   00h, 00h, 00h, 2Ah, 00h, 00h, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 00h, 48h, 00h, 00h, 48h, 48h, 48h, 48h, 48h, 48h, 48h
            db   48h, 48h, 48h, 48h, 48h, 48h, 48h, 00h, 00h, 3Dh, 48h, 00h, 00h, 00h, 00h, 20h
            db   00h, 20h, 48h, 00h, 00h, 20h, 00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 3Dh, 00h, 48h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 48h, 00h, 00h, 3Dh, 48h, 00h, 00h, 00h, 00h, 23h, 00h, 00h
            db   48h, 00h, 00h, 11h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 48h, 00h, 00h, 48h, 00h, 30h, 00h, 30h, 00h, 30h, 00h, 30h, 00h, 30h
            db   00h, 20h, 48h, 4Ch, 4Ah, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h
            db   48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 48h, 20h
            db   20h, 20h, 20h, 20h, 20h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 20h, 00h, 00h, 00h, 77h
            db   79h, 68h, 6Fh, 64h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 48h, 00h, 00h, 11h
            db   00h, 3Fh, 00h, 23h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 48h, 20h, 30h, 00h, 00h, 00h, 00h, 4Ah, 00h, 2Ah, 00h
            db   00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 23h, 00h, 00h, 00h, 00h, 00h, 0Eh
            db   20h, 1Dh, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 33h, 2Dh, 71h, 20h, 6Bh, 6Fh, 6Dh, 6Eh, 61h, 74h, 61h, 2Eh, 2Eh, 2Eh
            db   73h, 6Ch, 6Fh, 76h, 6Eh, 61h, 71h, 2Eh, 20h, 20h, 20h, 47h, 52h, 41h, 50h, 48h
            db   59h, 43h, 20h, 42h, 59h, 20h, 53h, 54h, 45h, 50h, 2Eh, 2Eh, 2Eh, 20h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Ah, 00h, 3Ah, 00h, 3Ah, 00h, 3Ah, 00h, 3Ah, 00h
            db   0E4h
level_4:                                    ; offset 23E3
            db   03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 5Ch, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 14h, 14h, 14h, 14h, 14h, 14h, 14h, 14h, 10h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 00h, 4Ch, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 2Ah, 2Ah
            db   3Dh, 03h, 5Ch, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 14h, 14h, 11h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 06h, 14h, 10h, 00h, 00h, 00h, 00h, 30h, 00h
            db   00h, 00h, 00h, 4Ch, 00h, 00h, 30h, 00h, 00h, 20h, 20h, 20h, 20h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 48h
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 48h, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 03h
            db   03h, 03h, 5Ch, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 06h, 00h, 00h, 00h, 00h
            db   00h, 30h, 00h, 00h, 00h, 00h, 06h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 14h
            db   14h, 14h, 14h, 14h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 2Ah, 00h, 48h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 3Dh, 03h, 03h, 03h
            db   03h, 03h, 5Ch, 00h, 00h, 00h, 00h, 00h, 00h, 06h, 2Ah, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 2Ah, 00h, 00h, 00h, 00h, 00h, 00h, 14h, 14h, 14h, 14h, 14h
            db   14h, 14h, 14h, 14h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 3Dh, 03h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 02h, 03h, 03h, 03h, 48h, 3Dh, 3Dh, 3Dh, 02h
            db   03h, 03h, 03h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 4Fh, 4Fh, 4Fh, 20h, 6Eh, 6Ch, 6Fh, 20h
            db   4Fh, 4Fh, 4Fh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 30h, 2Ah, 48h, 00h, 00h, 00h, 30h, 00h, 00h
            db   00h, 00h, 00h, 00h, 48h, 00h, 4Ah, 4Ah, 3Dh, 03h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 06h, 48h, 00h, 00h, 00h, 06h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 06h, 48h, 2Ah, 2Ah, 00h, 06h, 20h, 20h, 00h, 00h
            db   00h, 00h, 00h, 00h, 2Fh, 00h, 00h, 00h, 00h, 21h, 00h, 00h, 00h, 00h, 5Ch, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 00h, 4Ch, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 2Ah, 2Ah, 00h
            db   48h, 00h, 2Ah, 00h, 3Dh, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 06h, 48h, 3Dh, 3Dh, 48h, 06h, 20h, 20h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh
            db   3Dh, 3Dh, 3Dh, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h
            db   00h, 00h, 06h, 00h, 00h, 00h, 48h, 06h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 2Ah, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 48h, 00h, 2Ah, 2Ah
            db   00h, 11h, 00h, 30h, 00h, 00h, 4Ah, 3Dh, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h
            db   06h, 00h, 2Ah, 2Ah, 48h, 06h, 20h, 00h, 20h, 00h, 00h, 00h, 00h, 30h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 4Ch, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 48h, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 3Dh, 00h, 05h, 12h, 00h, 06h, 48h
            db   3Dh, 3Dh, 48h, 06h, 00h, 00h, 00h, 48h, 06h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 11h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 48h, 00h, 00h, 00h, 00h, 00h, 2Ah, 00h, 00h, 23h, 00h, 00h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 06h, 48h, 00h, 00h
            db   00h, 06h, 00h, 00h, 00h, 48h, 06h, 00h, 70h, 6Fh, 73h, 61h, 64h, 6Fh, 7Eh, 6Eh
            db   61h, 71h, 00h, 70h, 6Ch, 6Fh, 7Dh, 2Eh, 11h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 4Ch, 06h, 48h, 2Ah, 2Ah, 00h, 06h
            db   00h, 00h, 00h, 48h, 06h, 14h, 14h, 14h, 14h, 14h, 14h, 14h, 14h, 14h, 14h, 14h
            db   14h, 14h, 14h, 14h, 14h, 14h, 11h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 48h, 00h, 00h, 30h, 00h, 00h, 00h, 00h
            db   48h, 00h, 11h, 4Ch, 4Ah, 4Ah, 4Ah, 4Ah, 3Dh, 03h, 00h, 48h, 00h, 20h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 06h, 48h, 3Dh, 3Dh, 48h, 06h, 00h, 00h
            db   00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 03h, 00h, 48h, 00h, 20h, 00h, 00h, 00h, 00h
            db   00h, 00h, 48h, 00h, 00h, 00h, 06h, 00h, 00h, 00h, 48h, 06h, 00h, 00h, 00h, 48h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 3Fh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 03h, 00h, 48h, 00h, 20h, 20h, 00h, 00h, 00h, 00h, 00h
            db   48h, 00h, 00h, 00h, 06h, 00h, 2Ah, 2Ah, 48h, 06h, 00h, 00h, 00h, 48h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 30h
            db   00h, 00h, 3Dh, 03h, 00h, 48h, 00h, 20h, 20h, 00h, 00h, 00h, 00h, 00h, 48h, 00h
            db   00h, 00h, 06h, 48h, 3Dh, 3Dh, 48h, 06h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h
            db   00h, 00h, 2Ah, 00h, 00h, 00h, 30h, 00h, 00h, 14h, 14h, 14h, 14h, 14h, 10h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h
            db   00h, 00h, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 00h, 00h, 2Ah, 00h, 00h
            db   00h, 00h, 00h, 48h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h
            db   06h, 48h, 00h, 00h, 00h, 06h, 00h, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 00h, 00h, 2Ah
            db   2Ah, 2Ah, 00h, 00h, 00h, 00h, 00h, 06h, 06h, 06h, 06h, 06h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 06h, 48h
            db   00h, 00h, 00h, 06h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 00h, 00h, 00h, 00h, 06h, 00h, 0Fh, 00h, 06h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 48h, 00h, 00h, 2Ah, 2Ah, 2Ah
            db   00h, 30h, 00h, 00h, 00h, 00h, 00h, 00h, 23h, 23h, 23h, 23h, 23h, 23h, 00h, 00h
            db   11h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 11h, 48h, 00h, 3Fh
            db   00h, 00h, 11h, 2Ah, 2Ah, 48h, 00h, 30h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah
            db   00h, 00h, 00h, 11h, 0Eh, 00h, 1Dh, 06h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 0Bh, 03h, 03h, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 77h, 79h, 68h, 6Fh, 64h, 20h, 69h, 7Ah, 20h, 64h, 6Fh, 6Dh, 61h, 2Eh, 2Eh
            db   2Eh, 73h, 20h, 7Ch, 6Ch, 65h, 6Dh, 65h, 6Eh, 74h, 61h, 6Dh, 69h, 20h, 66h, 61h
            db   6Eh, 74h, 61h, 73h, 74h, 69h, 6Bh, 69h, 2Eh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 47h, 52h, 41h, 72h, 48h, 59h, 43h, 20h, 42h, 59h, 20h, 53h, 54h
            db   45h, 50h, 2Eh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Ah, 00h, 3Ah, 00h, 3Ah, 00h, 3Ah, 00h, 3Ah, 00h
            db   0E4h
level_5:                                    ; offset 2B85
            db   03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 00h, 00h, 00h, 00h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h
            db   00h, 00h, 20h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 20h, 00h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 4Ch, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 20h, 20h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h
            db   3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h
            db   00h, 00h, 3Dh, 3Dh, 3Dh, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   2Ah, 2Ah, 2Ah, 3Dh, 00h, 00h, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 3Dh, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   3Dh, 3Dh, 48h, 3Dh, 3Dh, 00h, 00h, 00h, 0Fh, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   48h, 00h, 11h, 00h, 00h, 00h, 00h, 1Dh, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh
            db   3Dh, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 3Dh, 00h, 3Dh, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   00h, 00h, 00h, 77h, 68h, 6Fh, 64h, 00h, 00h, 77h, 00h, 00h, 00h, 00h, 6Bh, 6Fh
            db   70h, 69h, 00h, 63h, 61h, 72h, 71h, 20h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 3Dh, 20h, 20h
            db   20h, 20h, 20h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 73h, 6Fh, 6Ch, 6Fh
            db   6Dh, 6Fh, 6Eh, 61h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Fh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 00h, 3Dh, 00h, 3Dh, 3Dh, 00h
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 3Dh, 00h, 00h, 05h, 12h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 3Dh, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh
            db   3Dh, 3Dh, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Fh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 20h
            db   00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 00h, 2Ah, 00h
            db   00h, 00h, 00h, 00h, 2Ah, 3Dh, 3Dh, 3Dh, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 20h, 20h, 20h, 20h, 00h
            db   00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 00h
            db   00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 2Ah, 2Ah, 2Ah, 00h, 00h
            db   00h, 2Ah, 2Ah, 2Ah, 00h, 3Dh, 3Dh, 00h, 48h, 00h, 30h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 3Dh
            db   00h, 00h, 00h, 00h, 3Dh, 3Dh, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 2Ah, 2Ah
            db   2Ah, 2Ah, 2Ah, 00h, 3Dh, 3Dh, 48h, 00h, 30h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h
            db   00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h
            db   00h, 3Dh, 3Dh, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 2Ah, 00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h
            db   00h, 00h, 3Dh, 3Dh, 48h, 48h, 48h, 48h, 48h, 48h, 48h, 48h, 48h, 3Dh, 3Dh, 3Dh
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 2Ah, 00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 30h, 00h, 00h, 00h
            db   00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 7Ah, 64h, 65h, 73h, 78h, 20h, 77h, 73h, 65h
            db   20h, 2Dh, 20h, 6Fh, 62h, 6Dh, 61h, 6Eh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h
level_6:                                    ; offset 3327
            db   03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h, 00h
            db   00h, 00h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 2Ah, 2Ah, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 2Eh, 5Ch, 2Fh, 2Eh, 00h, 00h, 73h, 6Fh, 6Bh, 72h, 6Fh, 77h, 69h, 7Dh
            db   6Eh, 69h, 63h, 61h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   00h, 20h, 05h, 12h, 00h, 00h, 3Dh, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 3Dh, 2Eh
            db   00h, 4Fh, 4Fh, 2Eh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 2Ah
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 3Dh, 2Ah, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 3Dh, 00h, 5Fh, 27h
            db   5Fh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 3Dh, 2Eh, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   48h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 2Ah, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 2Ah, 2Ah, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 3Dh, 00h, 30h, 00h, 4Ch, 00h, 00h, 48h, 00h
            db   11h, 30h, 00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 3Dh, 00h, 30h, 00h, 00h, 00h, 00h, 00h
            db   00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 00h
            db   2Ah, 2Ah, 2Ah, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Fh, 00h, 00h, 00h, 00h, 00h, 00h
            db   2Ah, 3Dh, 3Dh, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 00h, 3Dh, 3Dh, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h
            db   00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 00h, 3Dh, 3Fh, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   00h, 3Dh, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 30h, 00h
            db   00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 30h, 00h, 30h, 00h, 30h
            db   00h, 30h, 00h, 00h, 00h, 30h, 00h, 00h, 30h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 00h
            db   00h, 48h, 48h, 48h, 48h, 48h, 00h, 00h, 30h, 00h, 4Ah, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 30h
            db   00h, 00h, 00h, 00h, 00h, 00h, 3Fh, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 30h, 00h
            db   00h, 00h, 30h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 00h, 00h, 48h
            db   3Dh, 00h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 00h, 00h, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 00h, 62h, 65h, 72h, 69h, 74h, 65h, 20h, 6Dh, 65h, 6Eh, 78h
            db   7Bh, 65h, 20h, 61h, 6Ch, 6Dh, 61h, 7Ah, 6Fh, 77h, 3Dh, 2Ah, 00h, 48h, 3Dh, 00h
            db   48h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 2Ah, 2Ah, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 4Ch, 48h, 48h, 48h, 48h, 48h, 48h, 48h, 48h, 48h, 48h, 3Dh, 00h, 48h, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 4Ah, 4Ah
            db   4Ah, 4Ah, 00h, 00h, 30h, 00h, 00h, 48h, 2Ah, 2Ah, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 00h, 23h, 00h, 00h, 48h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 48h, 00h, 3Dh, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h
            db   00h, 2Ah, 2Ah, 00h, 00h, 00h, 2Ah, 2Ah, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 48h
            db   3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 00h, 30h, 00h, 3Fh, 3Fh
            db   00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 48h, 00h, 23h, 00h, 00h, 4Ch, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 48h, 00h, 3Fh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 2Ah, 2Ah
            db   00h, 00h, 00h, 00h, 00h, 00h, 2Ah, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h
            db   00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 4Ch, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 48h, 2Ah, 2Ah, 2Ah, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 48h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 48h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 48h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 48h, 00h, 00h, 3Fh
            db   00h, 30h, 00h, 3Dh, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 48h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 11h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 00h, 00h
            db   00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 6Eh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 48h, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 00h, 00h, 0Fh, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 6Eh
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h
            db   30h, 00h, 00h, 00h, 00h, 00h, 00h, 20h, 00h, 00h, 00h, 00h, 00h, 00h, 23h, 11h
            db   11h, 23h, 0Eh, 00h, 1Dh, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 48h, 48h, 03h, 03h, 03h, 03h, 03h
            db   03h, 48h, 48h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 0Bh, 03h, 03h, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 6Bh, 6Fh, 70h
            db   69h, 20h, 63h, 61h, 72h, 71h, 20h, 73h, 6Fh, 6Ch, 6Fh, 6Dh, 6Fh, 6Eh, 61h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 03h, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 03h
            db   03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h
level_7:                                    ; offset 3AC9
            db   03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   62h, 65h, 72h, 69h, 74h, 65h, 2Ch, 6Eh, 65h, 20h, 62h, 6Fh, 6Ah, 74h, 65h, 73h
            db   78h, 21h, 00h, 00h, 00h, 00h, 77h, 79h, 20h, 7Ah, 61h, 73h, 6Ch, 75h, 76h, 69h
            db   6Ch, 69h, 21h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 48h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Fh, 48h
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 0Fh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 2Ah, 3Fh, 00h, 00h, 00h, 48h
            db   48h, 00h, 00h, 2Ah, 2Ah, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 00h, 2Ah, 00h, 00h, 00h
            db   2Ah, 00h, 00h, 2Ah, 2Ah, 00h, 00h, 2Ah, 2Ah, 2Ah, 00h, 00h, 2Ah, 00h, 00h, 00h
            db   2Ah, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 05h, 12h, 00h, 3Dh, 3Dh, 48h, 3Dh, 3Dh
            db   3Dh, 00h, 00h, 0Eh, 2Eh, 1Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 2Ah, 2Ah, 00h, 00h, 00h, 48h, 48h, 20h
            db   2Ah, 20h, 20h, 2Ah, 20h, 20h, 2Ah, 20h, 2Ah, 20h, 2Ah, 2Ah, 20h, 2Ah, 2Ah, 00h
            db   2Ah, 20h, 20h, 2Ah, 00h, 20h, 20h, 20h, 2Ah, 20h, 2Ah, 20h, 20h, 20h, 2Ah, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 48h
            db   3Dh, 3Dh, 0Bh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 2Ah, 2Ah, 2Ah, 00h, 00h, 48h, 48h, 20h, 2Ah, 2Ah
            db   2Ah, 2Ah, 20h, 20h, 2Ah, 20h, 2Ah, 20h, 2Ah, 20h, 2Ah, 20h, 2Ah, 20h, 2Ah, 2Ah
            db   2Ah, 2Ah, 20h, 20h, 20h, 2Ah, 20h, 20h, 2Ah, 2Ah, 2Ah, 20h, 2Ah, 3Dh, 3Dh, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 48h, 48h, 20h, 2Ah, 20h, 20h, 2Ah
            db   00h, 2Ah, 00h, 00h, 2Ah, 00h, 2Ah, 00h, 00h, 00h, 2Ah, 00h, 2Ah, 00h, 00h, 2Ah
            db   00h, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 2Ah, 2Ah, 2Ah, 00h, 2Ah, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 48h, 00h, 2Ah, 2Ah, 2Ah
            db   2Ah, 2Ah, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 4Ch, 4Ch, 4Ch, 4Ch
            db   4Ah, 4Ah, 4Ah, 4Ah, 00h, 00h, 30h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 23h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   48h, 3Dh, 48h, 4Ch, 3Dh, 3Dh, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 48h, 48h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 48h, 48h, 3Dh, 3Dh, 3Dh, 3Dh
            db   48h, 48h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh
            db   48h, 3Dh, 3Dh, 3Dh, 00h, 30h, 48h, 00h, 11h, 11h, 23h, 00h, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 4Ah, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 20h
            db   20h, 20h, 20h, 00h, 00h, 00h, 20h, 20h, 20h, 20h, 00h, 00h, 00h, 00h, 20h, 20h
            db   20h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 48h, 00h
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 00h, 00h
            db   00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 2Dh, 11h, 2Dh, 2Dh, 48h, 3Dh, 48h, 00h, 3Dh, 3Dh
            db   00h, 00h, 3Fh, 3Fh, 3Fh, 00h, 00h, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 20h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 3Fh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 48h, 2Dh, 48h, 00h, 3Dh, 3Dh, 00h, 00h, 23h, 23h
            db   23h, 11h, 3Fh, 48h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 48h, 00h, 00h, 11h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 20h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h, 00h
            db   3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh
            db   00h, 00h, 30h, 00h, 4Ah, 00h, 30h, 00h, 48h, 00h, 00h, 00h, 23h, 23h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 20h, 20h, 00h, 00h, 00h, 30h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 20h, 00h, 00h, 00h, 00h, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 3Dh, 48h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 48h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 00h, 2Ah, 2Ah
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 3Fh, 3Dh, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 48h, 00h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 00h
            db   00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   00h, 2Ah, 2Ah, 48h, 00h, 3Dh, 3Dh, 00h, 00h, 00h, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 00h, 3Dh, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 3Dh, 00h, 00h, 00h, 00h, 4Ah, 00h
            db   30h, 00h, 48h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   30h, 00h, 00h, 00h, 00h, 00h, 4Ch, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh, 3Dh
            db   3Dh, 3Dh, 00h, 00h, 11h, 3Fh, 00h, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah
            db   2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 2Ah, 3Dh, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h, 03h
            db   03h, 03h, 03h, 03h, 03h, 03h, 03h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 20h, 20h, 7Ch, 74h, 6Fh, 20h, 70h, 6Fh, 73h, 6Ch, 65h
            db   64h, 6Eh, 71h, 71h, 20h, 6Bh, 6Fh, 6Dh, 6Eh, 61h, 74h, 61h, 2Ch, 7Ah, 61h, 20h
            db   6Eh, 65h, 6Ah, 20h, 69h, 64h, 65h, 74h, 20h, 70h, 65h, 72h, 77h, 61h, 71h, 2Eh
            db   2Eh, 2Eh, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h, 00h
            db   00h, 00h, 00h, 00h, 00h, 00h, 00h
init_mikrosha:                              ; offset 43B1
            lxi  h, mik_timer1
            mvi  m, 2Bh                     ; '+'
            mvi  m, 0E0h
            nop
            mvi  m, 2Bh                     ; '+'
            mov  a, m
            push d
            lxi  d, mik_intf1
L43C0:
            ldax d
            dcx  d
            mov  a, m
            ani  20h                        ; ' '
            jz   L43C0
            pop  d
L43C9:
            mov  a, m
            ani  20h                        ; ' '
            jz   L43C9
            mvi  m, 2Bh                     ; '+'
            lxi  h, mik_timer_ctl
            mvi  m, 80h
            mvi  l, 04h
            mvi  m, 0D5h
            mvi  m, 76h                     ; 'Ж'
            inr  l
            mvi  m, 23h                     ; '#'
            mvi  m, 49h                     ; 'I'
            mvi  l, 08h
            mvi  m, 0A4h
            call cursor_advance5
            lxi  h, mik_putc_hook
            mvi  m, 0C3h
            inx  h
            lxi  d, kbd_hook
            mov  m, e
            inx  h
            mov  m, d
            mvi  c, 1Fh                     ; '<cls>'
            call putc
            mvi  a, 10h
            sta  delay_outer
            ret
kbd_hook:                                   ; offset 43FF
            sta  hook_saved_a
            lda  hook_countdown
            ora  a
            jz   L4414
            dcr  a
            sta  hook_countdown
            jz   L4428
            lda  hook_saved_a
            ret
L4414:
            mov  a, c
            cpi  1Fh                        ; '<cls>'
            jz   L4428
            cpi  0Ch                        ; '<home>'
            jz   L4428
            cpi  1Bh                        ; '<esc>'
            jz   L4443
            lda  hook_saved_a
            ret
L4428:
            shld hook_saved_hl
            xchg
            shld hook_saved_de
            pop  h
            lxi  d, helper_hook_cont
            push d
            push h
            lda  hook_saved_a
            lhld hook_saved_de
            xchg
            lhld hook_saved_hl
            lda  hook_saved_a
            ret
L4443:
            mvi  a, 03h
            sta  hook_countdown
            lda  hook_saved_a
            ret
helper_hook_cont:                           ; offset 444C
            call cursor_advance5
            push psw
            mvi  a, 8Ch
            sta  video_memory + 5           ; 76D5
            pop  psw
            ret
hook_countdown:                             ; offset 4457
            db   00h
hook_saved_a:                               ; offset 4458
            db   00h
hook_saved_de:                              ; offset 4459
            dw   0000h
hook_saved_hl:                              ; offset 445B
            dw   0000h
cursor_advance5:                            ; offset 445D
            push h
            push d
            lhld cursor_addr
            lxi  d, 0005h
            dad  d
            shld cursor_addr
            pop  d
            pop  h
            ret
            db   00h, 00h, 00h, 00h
mikrosha_beep:                              ; offset 4470
            push h
            lxi  h, mik_beep
L4474:
            mov  a, b
L4475:
            mvi  m, 00h
            dcr  a
            jnz  L4475
            mov  a, b
L447C:
            mvi  m, 0FFh
            dcr  a
            jnz  L447C
            dcr  c
            jnz  L4474
            pop  h
            ret
