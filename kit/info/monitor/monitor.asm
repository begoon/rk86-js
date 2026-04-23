vid_mem          equ 76d0h
stack            equ 76CFh

monitor_area     equ 7600h
monitor_area_end equ 765Fh

cursor_addr      equ 7600h
cursor_xy        equ 7602h
cursor_seq       equ 7604h
ruslat_flag      equ 7606h                  ; 0 - lat, ff - rus
stack_ptr        equ 761Ch
memlim           equ 7631h
kbd_buf          equ 7633h


                org 0F800h

; --------------------------------------------------------------

start:
                jmp     entry_start
; --------------------------------------------------------------

getc:
                jmp     entry_getc
; --------------------------------------------------------------

inpb:
                jmp     entry_inpb
; --------------------------------------------------------------

putc:
                jmp     entry_putc
; --------------------------------------------------------------

outb:
                jmp     entry_outb
; --------------------------------------------------------------

temp:
                jmp     entry_putc
; --------------------------------------------------------------

kbhit:
                jmp     entry_kbhit
; --------------------------------------------------------------

hexb:
                jmp     entry_hexb
; --------------------------------------------------------------

puts:
                jmp     entry_puts
; --------------------------------------------------------------

scan_kbd:
                jmp     entry_scan_kbd
; --------------------------------------------------------------

getxy:
                jmp     entry_getxy
; --------------------------------------------------------------

curc:
                jmp     entry_curc
; --------------------------------------------------------------

inpblock:
                jmp     entry_inpblock
; --------------------------------------------------------------

outblock:
                jmp     entry_outblock
; --------------------------------------------------------------

chksum:
                jmp     entry_chksum
; --------------------------------------------------------------

video:
                jmp     entry_video
; --------------------------------------------------------------

getlim:
                jmp     entry_getlim
; --------------------------------------------------------------

setlim:
                jmp     entry_setlim
; --------------------------------------------------------------

entry_start:                             ; CODE XREF: F800j
                mvi     a, 8Ah           ; VV55 A - out, B - in
                sta     8003h            ; C0-C4 - out, C5-C7 - in

                lxi     sp, stack

                call    entry_video     ; start video

                lxi     h, monitor_area
                lxi     d, monitor_area_end
                mvi     c, 0
                call    fill_hl_de_c    ; fill HL to DE by C

                lxi     h, stack
                shld    stack_ptr

                lxi     h, RadioPrompt
                call    entry_puts      ; put title

                call    entry_video

                lxi     h, monitor_area - 1
                shld    memlim

                lxi     h, 1D2Ah
                shld    762Fh
                mvi     a, 0C3h ; '�'   ; JMP instruction
                sta     7626h

prompt_loop:
                lxi     sp, stack       ; CODE XREF: F90Bj FAB3j FFC9j FFD0j

                lxi     h, Prompt
                call    entry_puts

                sta     8002h
                dcr     a
                sta     0A002h

                call    loc_0_F8EE
                lxi     h, prompt_loop
                push    h
                lxi     h, kbd_buf
                mov     a, m
                cpi     58h ; 'X'
                jz      print_regs
                cpi     55h ; 'U'
                jz      0F000h          ; !?
                push    psw
                call    loc_0_F92C
                lhld    762Bh
                mov     c, l
                mov     b, h
                lhld    7629h
                xchg
                lhld    7627h
                pop     psw
                cpi     44h ; 'D'
                jz      loc_0_F9C5
                cpi     43h ; 'C'
                jz      loc_0_F9D7
                cpi     46h ; 'F'
                jz      fill_hl_de_c
                cpi     53h ; 'S'
                jz      loc_0_F9F4
                cpi     54h ; 'T'
                jz      loc_0_F9FF
                cpi     4Dh ; 'M'
                jz      loc_0_FA26
                cpi     47h ; 'G'
                jz      loc_0_FA3F
                cpi     49h ; 'I'
                jz      loc_0_FA86
                cpi     4Fh ; 'O'
                jz      loc_0_FB2D
                cpi     4Ch ; 'L'
                jz      loc_0_FA08
                cpi     52h ; 'R'
                jz      loc_0_FA68
                jmp     0F000h          ; ?!
; --------------------------------------------------------------

back_kbd_buf:
                mvi     a, 33h ; '3'    ; CODE XREF: F8F8j F8FDj
                cmp     l
                jz      loc_0_F8F1
                push    h
                lxi     h, BackClr
                call    entry_puts
                pop     h
                dcx     h
                jmp     kbd_buf_loop
; --------------------------------------------------------------

loc_0_F8EE:
                lxi     h, kbd_buf        ; CODE XREF: F87Cp FA2Dp FFE7p

loc_0_F8F1:
                mvi     b, 0            ; CODE XREF: F8DFj

kbd_buf_loop:
                call    entry_getc      ; CODE XREF: F8EBj F917j

                cpi     8               ; backspace ?
                jz      back_kbd_buf
                cpi     7Fh             ; backspace ?
                jz      back_kbd_buf

                cnz     loc_0_FCB9
                mov     m, a
                cpi     0Dh
                jz      loc_0_F91A
                cpi     2Eh ; '.'
                jz      prompt_loop
                mvi     b, 0FFh
                mvi     a, 52h ; 'R'
                cmp     l
                jz      loc_0_FAAE
                inx     h
                jmp     kbd_buf_loop
; --------------------------------------------------------------

loc_0_F91A:
                mov     a, b            ; CODE XREF: F906j
                ral
                lxi     d, kbd_buf
                mvi     b, 0
                ret
; --------------------------------------------------------------

entry_puts:
                mov     a, m            ; CODE XREF: F818j F855p F872p F8E6p F929j F9B4p FFD6p
                ana     a
                rz
                call    loc_0_FCB9
                inx     h
                jmp     entry_puts
; --------------------------------------------------------------

loc_0_F92C:
                lxi     h, 7627h        ; CODE XREF: F892p
                lxi     d, 762Dh
                mvi     c, 0
                call    fill_hl_de_c
                lxi     d, 7634h
                call    loc_0_F95A
                shld    7627h
                shld    7629h
                rc
                mvi     a, 0FFh
                sta     762Dh
                call    loc_0_F95A
                shld    7629h
                rc
                call    loc_0_F95A
                shld    762Bh
                rc
                jmp     loc_0_FAAE
; --------------------------------------------------------------

loc_0_F95A:
                lxi     h, 0            ; CODE XREF: F93Ap F949p F950p FA35p FFEDp

loc_0_F95D:
                ldax    d               ; CODE XREF: F969j F98Bj
                inx     d
                cpi     0Dh
                jz      loc_0_F98E
                cpi     2Ch ; ','
                rz
                cpi     20h ; ' '
                jz      loc_0_F95D
                sui     30h ; '0'
                jm      loc_0_FAAE
                cpi     0Ah
                jm      loc_0_F982
                cpi     11h
                jm      loc_0_FAAE
                cpi     17h
                jp      loc_0_FAAE
                sui     7

loc_0_F982:
                mov     c, a            ; CODE XREF: F973j
                dad     h
                dad     h
                dad     h
                dad     h
                jc      loc_0_FAAE
                dad     b
                jmp     loc_0_F95D
; --------------------------------------------------------------

loc_0_F98E:
                stc                     ; CODE XREF: F961j
                ret
; --------------------------------------------------------------
; cmp hl, de
; if hl=de -> zf=1, else -> zf=0
; --------------------------------------------------------------
cmp_hl_de:
                mov     a, h            ; CODE XREF: F999p FA3Fp FAA6p FB1Dp FFC6p
                cmp     d
                rnz
                mov     a, l
                cmp     e
                ret
; --------------------------------------------------------------

loc_0_F996:
                call    loc_0_F9A4      ; CODE XREF: F9CBp F9E7p F9F9p FA1Ap

cmp_hl_de_loop:
                call    cmp_hl_de      ; CODE XREF: F9EEp FA02p FA75p FB10p FB27p FB8Ap
                                        ; hl=de ?
                jnz     loc_0_F9A2      ; if not, then hl=hl+1 and ret

loc_0_F99F:                             ; hl=de, great!
                inx     sp              ; CODE XREF: FB20j
                inx     sp              ; pop ret-addr and exit
                ret

loc_0_F9A2:
                inx     h               ; CODE XREF: F99Cj
                ret
; --------------------------------------------------------------
; Scan keyboard
; --------------------------------------------------------------
loc_0_F9A4:
                call    entry_scan_kbd      ; CODE XREF: F996p
                cpi     3
                rnz
                call    entry_video
                jmp     loc_0_FAAE
; --------------------------------------------------------------

loc_0_F9B0:
                push    h               ; CODE XREF: FB79p
                lxi     h, m_FF6C
                call    entry_puts
                pop     h
                ret
; --------------------------------------------------------------

loc_0_F9B9:
                mov     a, m            ; CODE XREF: F9C8p F9DFp FA29p

loc_0_F9BA:
                push    b               ; CODE XREF: F9E3p FB81p
                call    entry_hexb
                mvi     a, 20h ; ' '
                call    loc_0_FCB9
                pop     b
                ret
; --------------------------------------------------------------

loc_0_F9C5:
                call    loc_0_FB78      ; CODE XREF: F8A4j F9D1j

loc_0_F9C8:
                call    loc_0_F9B9      ; CODE XREF: F9D4j
                call    loc_0_F996
                mov     a, l
                ani     0Fh
                jz      loc_0_F9C5
                jmp     loc_0_F9C8
; --------------------------------------------------------------

loc_0_F9D7:
                ldax    b               ; CODE XREF: F8A9j F9EAj
                cmp     m
                jz      loc_0_F9E6
                call    loc_0_FB78
                call    loc_0_F9B9
                ldax    b
                call    loc_0_F9BA

loc_0_F9E6:
                inx     b               ; CODE XREF: F9D9j
                call    loc_0_F996
                jmp     loc_0_F9D7
; --------------------------------------------------------------

fill_hl_de_c:
                mov     m, c            ; CODE XREF: F849p F8AEj F934p F9F1j
                call    cmp_hl_de_loop
                jmp     fill_hl_de_c
; --------------------------------------------------------------

loc_0_F9F4:
                mov     a, c            ; CODE XREF: F8B3j F9FCj
                cmp     m
                cz      loc_0_FB78
                call    loc_0_F996
                jmp     loc_0_F9F4
; --------------------------------------------------------------

loc_0_F9FF:
                mov     a, m            ; CODE XREF: F8B8j FA05j
                stax    b
                inx     b
                call    cmp_hl_de_loop
                jmp     loc_0_F9FF
; --------------------------------------------------------------

loc_0_FA08:
                call    loc_0_FB78      ; CODE XREF: F8D1j FA20j

loc_0_FA0B:
                mov     a, m            ; CODE XREF: FA23j
                ora     a
                jm      loc_0_FA15
                cpi     20h ; ' '
                jnc     loc_0_FA17

loc_0_FA15:
                mvi     a, 2Eh ; '.'    ; CODE XREF: FA0Dj

loc_0_FA17:
                call    loc_0_FCB9      ; CODE XREF: FA12j
                call    loc_0_F996
                mov     a, l
                ani     0Fh
                jz      loc_0_FA08
                jmp     loc_0_FA0B
; --------------------------------------------------------------

loc_0_FA26:
                call    loc_0_FB78      ; CODE XREF: F8BDj FA3Cj
                call    loc_0_F9B9
                push    h
                call    loc_0_F8EE
                pop     h
                jnc     loc_0_FA3B
                push    h
                call    loc_0_F95A
                mov     a, l
                pop     h
                mov     m, a

loc_0_FA3B:
                inx     h               ; CODE XREF: FA31j
                jmp     loc_0_FA26
; --------------------------------------------------------------

loc_0_FA3F:
                call    cmp_hl_de      ; CODE XREF: F8C2j
                jz      loc_0_FA5A
                xchg
                shld    7623h
                mov     a, m
                sta     7625h
                mvi     m, 0F7h ; '�'
                mvi     a, 0C3h ; '�'
                sta     30h
                lxi     h, loc_0_FFA2
                shld    31h

loc_0_FA5A:
                lxi     sp, 7618h       ; CODE XREF: FA42j
                pop     b
                pop     d
                pop     h
                pop     psw
                sphl
                lhld    7616h
                jmp     7626h
; --------------------------------------------------------------

loc_0_FA68:
                mvi     a, 90h          ; CODE XREF: F8D6j
                sta     0A003h

loc_0_FA6D:
                shld    0A001h          ; CODE XREF: FA78p
                lda     0A000h
                stax    b
                inx     b
                call    cmp_hl_de_loop
                jmp     loc_0_FA6D

entry_getxy:
                lhld    cursor_xy           ; CODE XREF: F81Ej
                ret
; --------------------------------------------------------------

entry_curc:
                push    h               ; CODE XREF: F821j
                lhld    cursor_addr
                mov     a, m
                pop     h
                ret
; --------------------------------------------------------------

loc_0_FA86:
                lda     762Dh           ; CODE XREF: F8C7j
                ora     a
                jz      loc_0_FA91
                mov     a, e
                sta     762Fh

loc_0_FA91:
                call    entry_inpblock      ; CODE XREF: FA8Aj
                call    loc_0_FB78
                xchg
                call    loc_0_FB78
                xchg
                push    b
                call    entry_chksum
                mov     h, b
                mov     l, c
                call    loc_0_FB78
                pop     d
                call    cmp_hl_de
                rz
                xchg
                call    loc_0_FB78

loc_0_FAAE:
                mvi     a, 3Fh ; '?'    ; CODE XREF: F913j F957j F96Ej F978j F97Dj F987j F9ADj FC3Dj
                call    loc_0_FCB9
                jmp     prompt_loop

; --------------------------------------------------------------
; Input from tape : In : HL - offset
;                   Out: HL - start, DE - end, BC - chksum
; --------------------------------------------------------------
entry_inpblock:                         ; CODE XREF: F824j FA91p
                mvi     a, 0FFh
                call    loc_0_FAFF      ; input word to BC with
                                        ; sync-byte before 1-st byte
                                        ; it's addr from tape
                push    h
                dad     b               ; calc start addr:
                                        ; HL=tape addr + offset
                xchg                    ; DE=start addr
                call    loc_0_FAFD      ; input word to BC w/o sync-byte
                                        ; it's end from tape
                pop     h               ; hl=offset
                dad     b               ; calc end addr:
                                        ; HL=tape addr + offset
                xchg                    ; hl=start addr, de=and addr
                push    h
                call    loc_0_FB0A      ; input block from hl -> de
                mvi     a, 0FFh         ; input word to bc
                call    loc_0_FAFF      ; with sync-byte
                                        ; it's a chksum from tape
                pop     h               ; hl=addr

entry_video:                            ; -- start video
                push    h               ; CODE XREF: F82Dj F83Ep F858p F9AAp FB75j FC38p
                lxi     h, 0C001h
                mvi     m, 0
                dcx     h
                mvi     m, 4Dh
                mvi     m, 1Dh
                mvi     m, 99h
                mvi     m, 93h
                inx     h
                mvi     m, 27h
                mov     a, m

loc_0_FAE1:
                mov     a, m            ; CODE XREF: FAE4j
                ani     20h
                jz      loc_0_FAE1      ; wait for start video
                lxi     h, 0e008h
                mvi     m, 80h
                mvi     l, 4
                mvi     m, 0D0h
                mvi     m, 76h
                inr     l
                mvi     m, 23h
                mvi     m, 49h
                mvi     l, 8
                mvi     m, 0A4h
                pop     h
                ret

; --------------------------------------------------------------
; Input word to BC

loc_0_FAFD:                             ; -- w/o sync-byte

                mvi     a, 8            ; CODE XREF: FABEp

loc_0_FAFF:

                call    entry_inpb      ; CODE XREF: FAB8p FACAp
                mov     b, a
                mvi     a, 8

loc_0_FB05:
                call    entry_inpb      ; CODE XREF: FB8Dj
                mov     c, a
                ret

; --------------------------------------------------------------
; Input block while de!=hl
loc_0_FB0A:                             ; CODE XREF: FAC5p FB13j
                mvi     a, 8
                call    entry_inpb      ; input byte to a w/o sync-byte
                mov     m, a            ; to mem it
                call    cmp_hl_de_loop      ; check hl=de and
                                        ; if hl!=de -> hl=hl+1
                                        ; else -> ret to FAC0
                jmp     loc_0_FB0A      ; while hl!=de
; --------------------------------------------------------------
; Calc chksum
; --------------------------------------------------------------
entry_chksum:
                lxi     b, 0            ; CODE XREF: F82Aj FA9Dp FB36p

loc_0_FB19:
                mov     a, m            ; get byte
                add     c               ; lo part
                mov     c, a            ; store
                push    psw             ; save cf
                call    cmp_hl_de      ; hl=de
                jz      loc_0_F99F      ; yes, remove psw and exit
                pop     psw             ; restore cf
                mov     a, b            ; hi part
                adc     m
                mov     b, a            ; store
                call    cmp_hl_de_loop      ; while hl!=de -> hl++
                                        ; otherwise -> exit over stack
                jmp     loc_0_FB19      ; repeat until de!=hl
; --------------------------------------------------------------
; monitor 'O' command
;
loc_0_FB2D:
                mov     a, c            ; CODE XREF: F8CCj
                ora     a
                jz      loc_0_FB35
                sta     7630h

loc_0_FB35:
                push    h               ; CODE XREF: FB2Fj
                call    entry_chksum
                pop     h
                call    loc_0_FB78
                xchg
                call    loc_0_FB78
                xchg
                push    h
                mov     h, b
                mov     l, c
                call    loc_0_FB78
                pop     h

                                        ; -- out block
entry_outblock:                         ; CODE XREF: F827j
                push    b               ; save chksum
                lxi     b, 0

loc_0_FB4D:                             ; make 256 zeros
                call    entry_outb      ; out 0 byte
                dcr     b
                xthl                    ; delay 18t
                xthl                    ; delay 18t
                jnz     loc_0_FB4D
                mvi     c, 0E6h
                call    entry_outb      ; out sync-byte
                call    loc_0_FB90      ; out hl -- start addr
                xchg
                call    loc_0_FB90      ; out de -- end addr
                xchg
                call    loc_0_FB86      ; out block
                lxi     h, 0
                call    loc_0_FB90      ; out 0000
                mvi     c, 0E6h ;
                call    entry_outb      ; out sync-byte
                pop     h               ; restore chksum
                call    loc_0_FB90      ; out chksum
                jmp     entry_video     ; start video and exit
; --------------------------------------------------------------

loc_0_FB78:
                push    b               ; CODE XREF: F9C5p F9DCp F9F6p FA08p FA26p FA94p FA98p FAA2p FAABp FB3Ap FB3Ep FB45p
                                        ; FFBFp FFE4p
                call    loc_0_F9B0
                mov     a, h
                call    entry_hexb      ; out a in hex
                mov     a, l
                call    loc_0_F9BA
                pop     b
                ret
; --------------------------------------------------------------

loc_0_FB86:
                mov     c, m            ; get current byte
                call    entry_outb
                call    cmp_hl_de_loop  ; check hl=de and
                                        ; if hl!=de -> hl=hl+1
                                        ; else -> ret to FB66
                jmp     loc_0_FB86      ; out while hl!=de
; --------------------------------------------------------------
; Out hl to tape
loc_0_FB90:                             ; CODE XREF: FB5Bp FB5Fp FB69p FB72p
                mov     c, h
                call    entry_outb      ; out h
                mov     c, l
                jmp     entry_outb      ; out l and exit
; --------------------------------------------------------------
; Input byte
entry_inpb:
                push    h               ; CODE XREF: FAFFp FB05p FB0Cp
                push    b
                push    d
                mov     d, a            ; d = count, 'ff' for sync-byte

loc_0_FB9C:

                mvi     a, 80h ; '�'    ; CODE XREF: FC43j
                sta     0E008h          ; DMA ?!

                lxi     h, 0
                dad     sp              ; hl=sp
                lxi     sp, 0           ; sp=0
                shld    760Dh           ; save sp

                mvi     c, 0
                lda     8002h
                rrc
                rrc
                rrc
                rrc                     ; d0 -- get first state
                ani     1               ; mask other bits
                mov     e, a            ; e=d0

loc_0_FBB7:
                pop     psw             ; delay 11t
                mov     a, c            ; a = c (current byte)
                ani     7Fh             ; d7=0
                rlc                     ; clear d0 in c for next bit
                mov     c, a            ; c = a
                mvi     h, 0

loc_0_FBBF:
                dcr     h
                jz      loc_0_FC34      ; -- wait for change bit
                pop     psw             ; delay 11t
                lda     8002h
                rrc
                rrc
                rrc
                rrc                     ; d0 bit from tape
                ani     1               ; mask another bits
                cmp     e               ; d5 = prev d5 ?
                jz      loc_0_FBBF      ; wait while '='
                ora     c               ;
                mov     c, a            ; c0=bit, current bit
                dcr     d               ; count--
                lda     762Fh           ; a=input delay (2ah=42)
                jnz     loc_0_FBDC      ; if it's last bit ->
                sui     12h             ; dec delay

loc_0_FBDC:
                mov     b, a            ; b=input delay ( 5 )  -+ 1097
                                        ;                       |
loc_0_FBDD:                             ;                       |
                pop     psw             ; 11 +                  |
                dcr     b               ; 5  | 26*42=1092      -+
                jnz     loc_0_FBDD      ; 10 +
                inr     d               ; count++, restore
                lda     8002h
                rrc
                rrc
                rrc
                rrc                     ; d0=bit
                ani     1               ; mask other bits
                mov     e, a            ; e=d0
                mov     a, d            ; count=ff ?
                ora     a               ; we wait for sync-byte ?
                jp      loc_0_FC0B      ; if not -> goto to count--
                mov     a, c            ; a=current byte state
                cpi     0E6h ;          ; a=sync-byte ?
                jnz     loc_0_FBFF      ; if not -> goto
                xra     a
                sta     762Eh           ; [362E]=0
                jmp     loc_0_FC09
; --------------------------------------------------------------

loc_0_FBFF:
                cpi     19h             ; a=!sync-byte ?
                jnz     loc_0_FBB7      ; if not -> goto
                mvi     a, 0FFh
                sta     762Eh           ; [362e]=FF

loc_0_FC09:                             ; sync-byte or !sync-byte inputed
                mvi     d, 9            ; start to input info byte

loc_0_FC0B:
                dcr     d               ; get another 9 sync-bytes
                jnz     loc_0_FBB7

                lxi     h, 0E004h         ; -+ DMA and VG ?!
                mvi     m, 0D0h           ;  |
                mvi     m, 76h            ;  |
                inx     h                 ;  |
                mvi     m, 23h            ;  |
                mvi     m, 49h            ;  |
                mvi     a, 27h            ;  |
                sta     0C001h            ;  |
                mvi     a, 0E0h           ;  |
                sta     0C001h            ;  |
                mvi     l, 8              ;  |
                mvi     m, 0A4h           ;  |
                lhld    760Dh             ;  |
                sphl                      ; -+

                lda     762Eh              ;
                xra     c
                jmp     loc_0_FCA1         ; exit
; --------------------------------------------------------------

loc_0_FC34:                             ; time-out!
                lhld    760Dh
                sphl                    ; restore stack
                call    entry_video     ; start video
                mov     a, d
                ora     a               ; timeout in info-byte ?
                jp      loc_0_FAAE      ; yes -> warm restart monitor
                call    loc_0_F9A4      ; test for keypressing
                jmp     loc_0_FB9C      ; repeat input for sync-byte
                                        ; again
; --------------------------------------------------------------
; Out byte from c
;
entry_outb:
                push    h               ; CODE XREF: F80Cj FB4Dp FB58p FB6Ep FB87p FB91p FB95j
                push    b
                push    d
                push    psw
                mvi     a, 80h ; '�'
                sta     0E008h
                lxi     h, 0
                dad     sp
                lxi     sp, 0
                mvi     d, 8

loc_0_FC58:
                pop     psw             ; CODE XREF: FC82j
                mov     a, c
                rlc
                mov     c, a
                mvi     a, 1
                xra     c
                sta     8002h
                lda     7630h
                mov     b, a

loc_0_FC66:
                pop     psw             ; CODE XREF: FC68j
                dcr     b
                jnz     loc_0_FC66
                mvi     a, 0
                xra     c
                sta     8002h
                dcr     d
                lda     7630h
                jnz     loc_0_FC7A
                sui     0Eh

loc_0_FC7A:
                mov     b, a

loc_0_FC7B:
                pop     psw
                dcr     b
                jnz     loc_0_FC7B
                inr     d
                dcr     d
                jnz     loc_0_FC58
                sphl
                lxi     h, 0E004h
                mvi     m, 0D0h
                mvi     m, 76h
                inx     h
                mvi     m, 23h
                mvi     m, 49h
                mvi     a, 27h
                sta     0C001h
                mvi     a, 0E0h
                sta     0C001h
                mvi     l, 8
                mvi     m, 0A4h
                pop     psw

loc_0_FCA1:
                pop     d               ; CODE XREF: FC31j
                pop     b
                pop     h
                ret
; --------------------------------------------------------------

entry_hexb:
                push    psw             ; CODE XREF: F815j F9BBp FB7Dp
                rrc
                rrc
                rrc
                rrc
                call    hexb_tetr
                pop     psw

hexb_tetr:
                ani     0Fh             ; CODE XREF: FCAAp
                cpi     0Ah
                jm      hexb_make_sym
                adi     7

hexb_make_sym:
                adi     30h ; '0'       ; CODE XREF: FCB2j

loc_0_FCB9:
                mov     c, a            ; CODE XREF: F900p F925p F9C0p FA17p FAB0p

entry_putc:
                push    psw             ; CODE XREF: F809j F80Fj
                push    b
                push    d
                push    h
                call    entry_kbhit      ; kbhit ?
                lxi     h, loc_0_FD85
                push    h
                lhld    cursor_xy
                xchg                    ; de=cursor pos
                lhld    cursor_addr           ; hl=cursor addr
                lda     cursor_seq
                dcr     a
                jm      loc_0_FCEE
                jz      loc_0_FD65
                jpo     loc_0_FD73
                mov     a, c
                sui     20h ; ' '
                mov     c, a

loc_0_FCDD:
                dcr     c               ; CODE XREF: FCE6j
                jm      loc_0_FCE9      ;
                push    b
                call    loc_0_FDB9
                pop     b
                jmp     loc_0_FCDD
; --------------------------------------------------------------

loc_0_FCE9:
                xra     a               ; CODE XREF: FCDEj FD68j

loc_0_FCEA:
                sta     cursor_seq           ; CODE XREF: FD70j FD7Aj FDA0j
                ret
; --------------------------------------------------------------

loc_0_FCEE:
                mov     a, c
                ani     7Fh
                mov     c, a
                cpi     1Fh
                jz      loc_0_FDA3
                cpi     0Ch
                jz      loc_0_FDB2
                cpi     0Dh

locret_0_FCFE:
                jz      loc_0_FDF3      ; CODE XREF: FCD0j
                cpi     0Ah

locret_0_FD03:
                jz      loc_0_FD47      ; CODE XREF: FD7Ep
                cpi     8
                jz      loc_0_FDD6
                cpi     18h
                jz      loc_0_FDB9
                cpi     19h
                jz      loc_0_FDE2
                cpi     1Ah
                jz      loc_0_FDC5
                cpi     1Bh
                jz      loc_0_FD9E
                cpi     7
                jnz     loc_0_FD38
                lxi     b, 5F0h

loc_0_FD27:
                mov     a, b            ; CODE XREF: FD34j FE3Ap

loc_0_FD28:
                ei                      ; CODE XREF: FD2Aj
                dcr     a
                jnz     loc_0_FD28
                mov     a, b

loc_0_FD2E:
                di                      ; CODE XREF: FD30j
                dcr     a
                jnz     loc_0_FD2E
                dcr     c
                jnz     loc_0_FD27
                ret
; --------------------------------------------------------------

loc_0_FD38:
                mov     m, c            ; CODE XREF: FD21j
                call    loc_0_FDB9
                mov     a, d
                cpi     3
                rnz
                mov     a, e
                cpi     8
                rnz
                call    loc_0_FDE2

loc_0_FD47:
                mov     a, d            ; CODE XREF: FD03j
                cpi     1Bh
                jnz     loc_0_FDC5
                push    h
                push    d
                lxi     h, 77C2h
                lxi     d, 7810h
                lxi     b, 79Eh

loc_0_FD58:
                ldax    d               ; CODE XREF: FD5Fj
                mov     m, a
                inx     h
                inx     d
                dcx     b
                mov     a, c
                ora     b
                jnz     loc_0_FD58
                pop     d
                pop     h
                ret
; --------------------------------------------------------------

loc_0_FD65:
                mov     a, c            ; CODE XREF: FCD3j
                cpi     59h ; 'Y'
                jnz     loc_0_FCE9
                call    loc_0_FDB2
                mvi     a, 2
                jmp     loc_0_FCEA
; --------------------------------------------------------------

loc_0_FD73:
                mov     a, c            ; CODE XREF: FCD6j
                sui     20h ; ' '
                mov     c, a

loc_0_FD77:
                dcr     c               ; CODE XREF: FD82j
                mvi     a, 4
                jm      loc_0_FCEA
                push    b
                call    loc_0_FDC5
                pop     b
                jmp     loc_0_FD77
; --------------------------------------------------------------

loc_0_FD85:
                shld    cursor_addr
                xchg
                shld    cursor_xy
                mvi     a, 80h ; '�'
                sta     0C001h
                mov     a, l
                sta     0C000h
                mov     a, h

loc_0_FD96:
                sta     0C000h          ; CODE XREF: F806j
                pop     h
                pop     d
                pop     b
                pop     psw
                ret
; --------------------------------------------------------------

loc_0_FD9E:
                mvi     a, 1            ; CODE XREF: FD1Cj
                jmp     loc_0_FCEA
; --------------------------------------------------------------

loc_0_FDA3:
                lxi     h, 7FF4h        ; CODE XREF: FCF4j
                lxi     d, 925h

loc_0_FDA9:
                xra     a               ; CODE XREF: FDAFj
                mov     m, a
                dcx     h
                dcx     d
                mov     a, e
                ora     d
                jnz     loc_0_FDA9

loc_0_FDB2:
                lxi     d, 308h         ; CODE XREF: FCF9j FD6Bp
                lxi     h, 77C2h
                ret
; --------------------------------------------------------------

loc_0_FDB9:
                mov     a, e            ; CODE XREF: FCE2p FD0Dj FD39p
                inx     h
                inr     e
                cpi     47h ; 'G'
                rnz
                mvi     e, 8
                lxi     b, 0FFC0h
                dad     b

loc_0_FDC5:
                mov     a, d            ; CODE XREF: FD17j FD4Aj
                cpi     1Bh
                lxi     b, 4Eh ; 'N'
                jnz     loc_0_FDD3
                mvi     d, 2
                lxi     b, 0F8B0h

loc_0_FDD3:
                inr     d               ; CODE XREF: FDCBj
                dad     b
                ret
; --------------------------------------------------------------

loc_0_FDD6:
                mov     a, e            ; CODE XREF: FD08j
                dcx     h
                dcr     e
                cpi     8
                rnz
                mvi     e, 47h ; 'G'
                lxi     b, 40h ; '@'
                dad     b

loc_0_FDE2:
                mov     a, d            ; CODE XREF: FD12j FD44p
                cpi     3
                lxi     b, 0FFB2h
                jnz     loc_0_FDF0
                mvi     d, 1Ch
                lxi     b, 750h

loc_0_FDF0:
                dcr     d               ; CODE XREF: FDE8j
                dad     b
                ret
; --------------------------------------------------------------

loc_0_FDF3:
                mov     a, l            ; CODE XREF: FCFEj
                sub     e
                jnc     loc_0_FDF9
                dcr     h

loc_0_FDF9:
                mov     l, a            ; CODE XREF: FDF5j
                mvi     e, 8
                lxi     b, 8
                dad     b
                ret
; --------------------------------------------------------------

entry_kbhit:
                lda     8002h           ; CODE XREF: F812j FCBEp FE63p
                ani     80h
                jz      loc_0_FE0E      ; Repeat now ?
                lda     7605h           ; Get last key
                ora     a               ; Check for 0 now
                rnz

loc_0_FE0E:
                push    h               ; CODE XREF: FE06j
                lhld    7609h
                call    entry_scan_kbd      ; Scan -- FF - not
                                            ;         FE - rus/lat
                                            ;         xx - key
                cmp     l
                mov     l, a
                jz      loc_0_FE2A

loc_0_FE1A:
                mvi     a, 1            ; CODE XREF: FE60j
                sta     760Bh
                mvi     h, 15h

loc_0_FE21:
                xra     a               ; CODE XREF: FE2Bj

loc_0_FE22:
                shld    7609h           ; CODE XREF: FE2Fj FE4Ej
                pop     h
                sta     7605h
                ret
; --------------------------------------------------------------

loc_0_FE2A:
                dcr     h               ; CODE XREF: FE17j
                jnz     loc_0_FE21
                inr     a
                jz      loc_0_FE22
                inr     a
                jz      loc_0_FE51
                push    b
                lxi     b, 5003h
                call    loc_0_FD27
                pop     b
                lda     760Bh
                mvi     h, 0E0h
                dcr     a
                sta     760Bh
                jz      loc_0_FE4C
                mvi     h, 40h

loc_0_FE4C:
                mvi     a, 0FFh         ; CODE XREF: FE47j
                jmp     loc_0_FE22
; --------------------------------------------------------------

loc_0_FE51:
                lda     8002h           ; CODE XREF: FE33j FE56j
                ani     80h
                jz      loc_0_FE51
                lda     ruslat_flag
                cma
                sta     ruslat_flag
                jmp     loc_0_FE1A
; --------------------------------------------------------------

entry_getc:
                call    entry_kbhit      ; CODE XREF: F803j FE67j
                ora     a
                jz      entry_getc
                xra     a
                sta     7605h
                lda     7609h
                ret
; --------------------------------------------------------------

entry_scan_kbd:
                lda     8002h           ; CODE XREF: F81Bj F9A4p FE12p
                ani     80h             ; rus/lat ?
                jnz     loc_0_FE7D
                mvi     a, 0FEh         ; yes
                ret
; --------------------------------------------------------------

loc_0_FE7D:
                xra     a               ; CODE XREF: FE77j
                sta     8000h
                sta     8002h
                lda     ruslat_flag
                ani     1
                ori     6
                sta     8003h
                lda     8001h
                inr     a
                jnz     loc_0_FE97
                dcr     a
                ret
; --------------------------------------------------------------

loc_0_FE97:
                push    h               ; CODE XREF: FE92j
                mvi     l, 1            ; flying '1'
                mvi     h, 7            ; testing of 8 lines
                                        ; from 8 to 1

loc_0_FE9C:
                mov     a, l            ; CODE XREF: FEACj
                rrc
                mov     l, a
                cma
                sta     8000h
                lda     8001h
                cma
                ora     a
                jnz     loc_0_FEB3
                dcr     h
                jp      loc_0_FE9C

loc_0_FEAF:
                mvi     a, 0FFh         ; CODE XREF: FEBAj
                pop     h
                ret
; --------------------------------------------------------------

loc_0_FEB3:
                mvi     l, 20h ; ' '    ; CODE XREF: FEA8j

loc_0_FEB5:
                lda     8001h           ; CODE XREF: FEBEj
                cma
                ora     a
                jz      loc_0_FEAF
                dcr     l
                jnz     loc_0_FEB5
                mvi     l, 8

loc_0_FEC3:
                dcr     l               ; CODE XREF: FEC5j
                rlc
                jnc     loc_0_FEC3
                mov     a, h
                mov     h, l
                mov     l, a
                cpi     1
                jz      loc_0_FEFA
                jc      loc_0_FEF3
                rlc
                rlc
                rlc
                adi     20h ; ' '
                ora     h
                cpi     5Fh ; '_'
                jnz     loc_0_FF06
                mvi     a, 20h ; ' '
                pop     h
                ret
; --------------------------------------------------------------
unk_0_FEE2:     db    9 ;
                db 0Ah, 0Dh, 7Fh, 8, 19h, 18h, 1Ah
byte_0_FEEA:    db 0Ch, 1Fh, 1Bh
                db 0, 1, 2, 3, 4, 5
; --------------------------------------------------------------

loc_0_FEF3:
                mov     a, h            ; CODE XREF: FED0j
                lxi     h, byte_0_FEEA
                jmp     loc_0_FEFE
; --------------------------------------------------------------

loc_0_FEFA:
                mov     a, h            ; CODE XREF: FECDj
                lxi     h, unk_0_FEE2

loc_0_FEFE:
                add     l               ; CODE XREF: FEF7j
                mov     l, a
                mov     a, m
                cpi     40h ; '@'
                pop     h
                rc
                push    h

loc_0_FF06:
                mov     l, a            ; CODE XREF: FEDBj
                lda     8002h
                mov     h, a
                ani     40h
                jnz     loc_0_FF1A
                mov     a, l
                cpi     40h ; '@'
                jm      loc_0_FF3F
                ani     1Fh
                pop     h
                ret
; --------------------------------------------------------------

loc_0_FF1A:
                lda     ruslat_flag           ; CODE XREF: FF0Dj
                ora     a
                jz      loc_0_FF2A
                mov     a, l
                cpi     40h ; '@'
                jm      loc_0_FF2A
                ori     20h
                mov     l, a

loc_0_FF2A:
                mov     a, h            ; CODE XREF: FF1Ej FF24j
                ani     20h
                jnz     loc_0_FF3F
                mov     a, l
                cpi     40h ; '@'
                jm      loc_0_FF3B
                mov     a, l
                xri     20h
                pop     h
                ret
; --------------------------------------------------------------

loc_0_FF3B:
                mov     a, l            ; CODE XREF: FF33j
                ani     2Fh
                mov     l, a

loc_0_FF3F:
                mov     a, l            ; CODE XREF: FF13j FF2Dj
                cpi     40h ; '@'
                pop     h
                rp
                push    h
                mov     l, a
                ani     0Fh
                cpi     0Ch
                mov     a, l
                jm      loc_0_FF50
                xri     10h

loc_0_FF50:
                pop     h               ; CODE XREF: FF4Bj
                ret
; --------------------------------------------------------------

entry_getlim:
                lhld    memlim           ; CODE XREF: F830j
                ret
; --------------------------------------------------------------

entry_setlim:
                shld    memlim           ; CODE XREF: F833j
                ret
; --------------------------------------------------------------
RadioPrompt:    db  1Fh ;
m_Radio86rk:    db "radio-86rk"      ; CODE XREF: F8F3p
                db 0
Prompt:         dw 0A0Dh
m_FF68:         db "-->"
                db 0
m_FF6C:         dw 0A0Dh
                db 18h, 18h, 18h, 18h, 0   ; -> -> -> ->
Regs:           dw 0A0Dh
m_Pc:           db " PC-"
                dw 0A0Dh
m_Hl:           db " HL-"
                dw 0A0Dh
m_Bc:           db " BC-"
                dw 0A0Dh
m_De:           db " DE-"
                dw 0A0Dh
m_Sp:           db " SP-"
                dw 0A0Dh
m_Af:           db " AF-"
                db 19h, 19h, 19h, 19h, 19h, 19h, 0
BackClr:        db 8, 20h, 8, 0
; --------------------------------------------------------------

loc_0_FFA2:
                shld    7616h
                push    psw
                pop     h
                shld    761Eh
                pop     h
                dcx     h
                shld    7614h
                lxi     h, 0
                dad     sp
                lxi     sp, 761Eh
                push    h
                push    d
                push    b
                lhld    7614h
                lxi     sp, stack
                call    loc_0_FB78
                xchg
                lhld    7623h
                call    cmp_hl_de
                jnz     prompt_loop
                lda     7625h
                mov     m, a
                jmp     prompt_loop
; --------------------------------------------------------------

print_regs:
                lxi     h, Regs         ; CODE XREF: F889j
                call    entry_puts
                lxi     h, 7614h
                mvi     b, 6

loc_0_FFDE:
                mov     e, m            ; CODE XREF: FFFAj
                inx     h
                mov     d, m
                push    b
                push    h
                xchg
                call    loc_0_FB78
                call    loc_0_F8EE
                jnc     loc_0_FFF6
                call    loc_0_F95A
                pop     d
                push    d
                xchg
                mov     m, d
                dcx     h
                mov     m, e

loc_0_FFF6:
                pop     h               ; CODE XREF: FFEAj
                pop     b
                dcr     b
                inx     h
                jnz     loc_0_FFDE
                ret
; --------------------------------------------------------------
                dw 0FFFFh              ; junk

                end