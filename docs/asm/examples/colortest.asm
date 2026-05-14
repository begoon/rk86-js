vram        equ 76D0h

vram_corner equ vram + 7*78 + 8

vram_bw       equ vram_corner 
vram_tolkalin equ vram_corner + 40
vram_akimenko equ vram_corner + 12 * 78
vram_apogey   equ vram_corner + 12 * 78 + 40

            org 0
            section colortest

            lxi sp, 75FFh

            lxi h, about
            call 0f818h

            lxi h, 0C001h
            mvi m, 0                    ; reset command
            dcx h
            mvi m, 4Dh                  ; SCN1 — 78 cols (77+1)
            mvi m, 1Dh                  ; SCN2 — 30 rows (29+1)
            mvi m, 99h                  ; SCN3 — char height + underline (same as default)
            mvi m, 0D3h                 ; SCN4 — bit 6 = 1, visible FA
            inx h
            mvi m, 27h                  ; start display
            mov a, m
crt_wait:            
            mov a, m
            ani 20h
            jz crt_wait

            lxi h, 0E008h
            mvi m, 080h
            mvi l, 4
            mvi m, 0D0h
            mvi m, 76h
            inr l
            mvi m, 23h
            mvi m, 49h
            mvi l, 8
            mvi m, 0A4h

            lxi h, vram_bw
            lxi d, bw_data
            call draw

            lxi h, vram_tolkalin
            lxi d, tolkalin_data
            call draw

            lxi h, vram_akimenko
            lxi d, akimenko_data
            call draw

            lxi h, vram_apogey
            lxi d, apogey_data
            call draw

            jmp $

draw:
            lxi b, 78
draw_line:
            push h
draw_char:
            ldax d
            inx d
            ora a
            jz draw_eol
            mov m, a
            inx h
            jmp draw_char
draw_eol:
            pop h
            dad b
            ldax d              ; peek next byte (do not advance)
            ora a               ; second 0 — done
            jnz draw_line
            ret

about:      db 1fh
            db "cwetowaq palitra - wersiq 1.0 - demin a. 2026", 13, 10, 13, 10
            db "otobravenie cwetow dolvno sowpadatx s wybranym revimom", 0

bw_data:
            db "~erno-beloe", 0
            db "-----------", 0
            db "80 oby~yj       ", 80h, "#### ", 80h, 0
            db "90 inwersiq     ", 90h, "####", 80h, 80h, 0
            db "82 miganie      ", 82h, "#### ", 80h, 0
            db "B2 mig/inw/pod~ ", 0B2h, "####", 80h, 80h, 0
            db "A0 pod~erkiwanie", 0A0h, "####", 80h, 80h, 0
            db 0

tolkalin_data:
            db "tolkalin", 0
            db "--------", 0
            db "80 seryj      ", 80h, "#### ", 80h, 0
            db "81 krasnyj    ", 81h, "#### ", 80h, 0
            db "84 zelenyj    ", 84h, "#### ", 80h, 0
            db "85 veltyj     ", 85h, "#### ", 80h, 0
            db "88 sinij      ", 88h, "#### ", 80h, 0
            db "89 fioletowyj ", 89h, "#### ", 80h, 0
            db "8C goluboj    ", 8Ch, "#### ", 80h, 0
            db "8D belyj      ", 8Dh, "#### ", 80h, 0
            db 0

akimenko_data:
            db "akimenko", 0
            db "--------", 0
            db "80 belyj      ", 80h, "#### ", 80h, 0
            db "81 veltyj     ", 81h, "#### ", 80h, 0
            db "84 goluboj    ", 84h, "#### ", 80h, 0
            db "85 zelenyj    ", 85h, "#### ", 80h, 0
            db "88 fioletowyj ", 88h, "#### ", 80h, 0
            db "89 krasnyj    ", 89h, "#### ", 80h, 0
            db "8C sinij      ", 8Ch, "#### ", 80h, 0
            db "8D ~ernyj     ", 8Dh, "#### ", 80h, 0
            db 0

apogey_data:
            db "apogej", 0
            db "------", 0
            db "80 belyj      ", 80h, "#### ", 80h, 0
            db "81 goluboj    ", 81h, "#### ", 80h, 0
            db "84 zoltyj     ", 84h, "#### ", 80h, 0
            db "85 zelenyj    ", 85h, "#### ", 80h, 0
            db "88 fioletowyj ", 88h, "#### ", 80h, 0
            db "89 sinij      ", 89h, "#### ", 80h, 0
            db "8C krasnyj    ", 8Ch, "#### ", 80h, 0
            db "8D ~ernyj     ", 8Dh, "#### ", 80h, 0
            db 0
