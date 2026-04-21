        org  0000h
        section diverse

loc_0000:
        jmp  loc_0BF0
monitor_scan_kbd:                       ; offset=0003h
        jmp  0F81Bh
monitor_putc:                           ; offset=0006h
        jmp  0F809h
monitor_puts:                           ; offset=0009h
        jmp  0F818h
monitor_hexb:                           ; offset=000Ch
        jmp  0F815h
monitor_getlim:                         ; offset=000Fh
        jmp  0F830h
monitor_prompt:                         ; offset=0012h
        jmp  0F86Ch
monitor_beep:                           ; offset=0015h
        jmp  0FD27h
loc_0018:
        db   56h
loc_0019:
        db   04h
loc_001A:
        db   59h
loc_001B:
        db   04h
loc_001C:
        db   5Ch
loc_001D:
        db   04h
loc_001E:
        db   61h
loc_001F:
        db   04h
loc_0020:
        db   69h
loc_0021:
        db   04h
loc_0022:
        db   8Bh
loc_0023:
        db   04h
loc_0024:
        db   8Eh
loc_0025:
        db   04h
loc_0026:
        db   9Ah
loc_0027:
        db   04h
loc_0028:
        db   9Eh
loc_0029:
        db   04h
loc_002A:
        db   0A7h
loc_002B:
        db   04h
loc_002C:
        db   0BFh
loc_002D:
        db   04h
loc_002E:
        db   0EDh
loc_002F:
        db   04h
loc_0030:
        db   01h
loc_0031:
        db   05h
loc_0032:
        db   33h
loc_0033:
        db   01h
loc_0034:
        db   3Fh
loc_0035:
        db   05h
loc_0036:
        db   45h
loc_0037:
        db   05h
loc_0038:
        db   49h
loc_0039:
        db   05h
loc_003A:
        db   4Fh
loc_003B:
        db   05h
loc_003C:
        db   20h
loc_003D:
        push h
        lxi  h, 0C001h
        mvi  m, 00h
        dcx  h
        mvi  m, 4Dh              ; 78-1 = 77 (4Dh)
        mvi  m, 1Dh              ; 30-1 = 29 (1Dh)
        mvi  m, 99h              ; Высота символа 10 строк, подчеркивание на 10-й
        mvi  m, 0F3h
        inx  h
        mvi  m, 27h              ; Команда "начать отображение"
        jmp  0FAE0h              ; jmp в Монитор продолджить настройку видеопамяти
loc_0052:
        lxi  h, loc_0064
        call monitor_puts
        lhld loc_002B
        mov  a, h
        call monitor_hexb
        mov  a, l
        call monitor_hexb
        ret
loc_0064:
        db   1Bh, 'Y', 38h, 42h       ; ESC Y row=24 col=34
        db   'o~ki : ', 00h           ; "OCHKI :" -- points : 
loc_0070:
        lxi  h, loc_0077
        call monitor_puts
        ret
loc_0077:
        db   1Bh, 'Y', 38h, 2Ah       ; ESC Y row=24 col=10
        db   'diwersanty : ', 00h     ; "DIVERSANTY :" -- saboteurs : 
loc_0089:
        lxi  h, loc_0090
        call monitor_puts
        ret
loc_0090:
        db   1Bh, 'Y', 30h, 2Ch       ; ESC Y row=16 col=12
        db   'oni was uni~tovili !!!', 0Dh, 0Ah    ; "ONI VAS UNICHTOZHILI !!!" CR LF -- they destroyed you !!!
        db   'uplatite 15 kopeek', 00h             ; "UPLATITE 15 KOPEEK" -- pay 15 kopecks
loc_00BF:
        push b
        push d
        push psw
        lxi  h, 77C2h
        mvi  a, 18h
        sub  c
        mov  c, a
        inr  c
        lxi  d, 004Eh
loc_00CD:
        dcr  c
        jz   loc_00D5
        dad  d
        jmp  loc_00CD
loc_00D5:
        mov  e, b
        dad  d
        pop  psw
        pop  d
        pop  b
        ret
loc_00DB:
        mvi  m, 2Ah
        inx  h
        mvi  m, 0Bh
        inx  h
        mvi  m, 2Ah
        ret
loc_00E4:
        mvi  m, 12h
        inx  h
        mvi  m, 12h
        inx  h
        mvi  m, 10h
        ret
loc_00ED:
        dcx  h
        mvi  m, 20h
        inx  h
        mvi  m, 20h
        inx  h
        mvi  m, 20h
        inx  h
        mvi  m, 20h
        inx  h
        mvi  m, 20h
        inx  h
        mvi  m, 20h
        ret
loc_0100:
        push psw
        push b
        lda  loc_0030
        mov  c, a
        mvi  b, 0Eh
loc_0108:
        mov  a, b
        cpi  18h
        jnz  loc_0110
        mvi  b, 0Eh
loc_0110:
        inr  b
        dcr  c
        mov  a, c
        ora  c
        jnz  loc_0108
        mov  a, b
        pop  b
        mov  b, a
        adi  2Fh
        sta  loc_0030
        pop  psw
        ret
loc_0121:
        push h
        push d
        push b
        push psw
        mvi  c, 02h
        lxi  h, loc_002B
        lxi  d, loc_0035
        stc
        cmc
loc_012F:
        mov  a, m
        xchg
        adc  m
        daa
        xchg
        mov  m, a
        push psw
        mov  a, c
        cpi  01h
        jz   loc_013D
        pop  psw
loc_013D:
        dcr  c
        jz   loc_0146
        inx  d
        inx  h
        jmp  loc_012F
loc_0146:
        pop  psw
        jnc  loc_014F
        mvi  a, 01h
        sta  loc_002F
loc_014F:
        pop  psw
        pop  b
        pop  d
        pop  h
        ret
loc_0154:
        push h
        push d
        push b
        push psw
        lxi  d, loc_002B
        lxi  h, loc_0037
        mvi  c, 02h
        stc
loc_0161:
        mvi  a, 99h
        aci  00h
        sub  m
        xchg
        add  m
        daa
        mov  m, a
        push psw
        mov  a, c
        cpi  01h
        jz   loc_0172
        pop  psw
loc_0172:
        xchg
        dcr  c
        jz   loc_017C
        inx  d
        inx  h
        jmp  loc_0161
loc_017C:
        pop  psw
        jc   loc_0184
        xra  a
        sta  loc_002F
loc_0184:
        pop  psw
        pop  b
        pop  d
        pop  h
        ret
loc_0189:
        ldax d
        ora  a
        rz
        mov  m, a
        inx  d
        inx  h
        jmp  loc_0189
        db   77h
loc_0193:
        push psw
        push b
        push d
        lxi  b, 0919h
        mvi  d, 15h
loc_019B:
        push b
        call monitor_beep
        pop  b
        inr  b
        inr  b
        dcr  c
        dcr  c
        mov  a, b
        cmp  d
        jc   loc_019B
        pop  d
        pop  b
        pop  psw
        ret
loc_01AD:
        push psw
        push b
        push d
        lxi  b, 2009h
        mvi  d, 09h
loc_01B5:
        push b
        call monitor_beep
        pop  b
        inr  c
        dcr  b
        dcr  b
        mov  a, b
        cmp  d
        jnc  loc_01B5
        pop  d
        pop  b
        pop  psw
        ret
loc_01C6:
        push psw
        push b
        lda  loc_003B
        mov  b, a
        mvi  c, 08h
        inr  a
        sta  loc_003B
        call monitor_beep
        pop  b
        pop  psw
        ret
loc_01D8:
        push psw
        push b
        mvi  b, 0B0h
        mvi  c, 08h
        call monitor_beep
        pop  b
        pop  psw
        ret
loc_01E4:
        push b
        lda  loc_003C
        mov  c, a
loc_01E9:
        call monitor_scan_kbd
        cpi  0FFh
        jz   loc_01E9
        call loc_01AD
        cpi  03h
        jz   monitor_prompt
        cpi  0FEh
        jz   loc_0210
        cpi  40h
        jc   loc_0204
        xra  c
loc_0204:
        mov  b, a
loc_0205:
        call monitor_scan_kbd
        cpi  0FFh
        jnz  loc_0205
        mov  a, b
        pop  b
        ret
loc_0210:
        lda  loc_003C
        xri  20h
        sta  loc_003C
        mov  c, a
loc_0219:
        call monitor_scan_kbd
        cpi  0FFh
        jnz  loc_0219
        jmp  loc_01E9
loc_0224:
        mvi  c, 1Fh
        call monitor_putc
        call loc_003D
        call monitor_getlim
        sphl
        lxi  h, 7792h
        mvi  m, 4Dh
        inx  h
        mvi  m, 58h
        inx  h
        mvi  m, 2Dh
        inx  h
        mvi  m, 31h
        inx  h
        mvi  m, 32h
        lxi  h, 0017h
        lxi  d, loc_003A
loc_0247:
        inx  h
        mvi  m, 00h
        mov  a, h
        cmp  d
        jnz  loc_0247
        mov  a, l
        cmp  e
        jnz  loc_0247
        lxi  h, 7EC5h
        mvi  b, 0Ch
loc_0259:
        mvi  c, 03h
        mvi  d, 02h
loc_025D:
        mvi  a, 7Fh
        mov  m, a
        inx  h
        dcr  c
        jnz  loc_025D
loc_0265:
        mvi  a, 20h
        mov  m, a
        inx  h
        dcr  d
        jnz  loc_0265
        dcr  b
        jnz  loc_0259
        call loc_0052
        mvi  a, 1Eh
        sta  loc_0018
        mov  b, a
        mvi  a, 02h
        sta  loc_001D
        mov  c, a
        call loc_00BF
        call loc_00DB
        mvi  a, 02h
        sta  loc_0028
        mvi  a, 01h
        sta  loc_0019
        mov  b, a
        mvi  a, 18h
        sta  loc_001E
        mov  c, a
        call loc_00BF
        call loc_00E4
        mvi  a, 01h
        sta  loc_0022
        sta  loc_0023
        sta  loc_0027
        sta  loc_0024
        sta  loc_0025
        sta  loc_0026
        sta  loc_002F
        call loc_01E4
loc_02B7:
        lda  loc_0022
        ora  a
        jz   loc_032A
        lda  loc_0023
        dcr  a
        sta  loc_0023
        ora  a
        jnz  loc_039B
        mvi  a, 0Ah
        sta  loc_0023
        lda  loc_0028
        cpi  01h
        jz   loc_02F2
        lda  loc_0019
        mov  b, a
        lda  loc_001E
        mov  c, a
        call loc_00BF
        call loc_00ED
        inr  b
        mov  a, b
        sta  loc_0019
        call loc_00BF
        call loc_00E4
        jmp  loc_030B
loc_02F2:
        lda  loc_0019
        mov  b, a
        lda  loc_001E
        mov  c, a
        call loc_00BF
        call loc_00ED
        mov  a, b
        dcr  a
        sta  loc_0019
        call loc_00BF
        call loc_00E4
loc_030B:
        lda  loc_0019
        cpi  3Dh
        jnc  loc_031B
        cpi  02h
        jc   loc_031B
        jmp  loc_0367
loc_031B:
        lda  loc_0019
        dcr  a
        mov  b, a
        lda  loc_001E
        mov  c, a
        call loc_00BF
        call loc_00ED
loc_032A:
        call loc_0100
        mvi  a, 02h
        sta  loc_0028
        mov  a, b
        cpi  13h
        jc   loc_033D
        mvi  a, 01h
        sta  loc_0028
loc_033D:
        call loc_0100
        mov  a, b
        sta  loc_001E
        mvi  a, 01h
        sta  loc_0019
        sta  loc_0022
        call loc_0100
        mov  a, b
        cpi  18h
        jc   loc_035A
        mvi  a, 07h
        sta  loc_001E
loc_035A:
        lda  loc_0028
        cpi  01h
        jnz  loc_0367
        mvi  a, 3Ch
        sta  loc_0019
loc_0367:
        lda  loc_0029
        cpi  01h
        jz   loc_039B
        call loc_0100
        mov  a, b
        cpi  14h
        jc   loc_042E
        lda  loc_0019
        mov  b, a
        inr  b
        mvi  c, 01h
        call loc_00BF
        mov  a, m
        cpi  7Fh
        jnz  loc_042E
        mvi  a, 01h
        sta  loc_0029
        lda  loc_0019
        inr  a
        sta  loc_001A
        lda  loc_001E
        dcr  a
        sta  loc_001F
loc_039B:
        lda  loc_0029
        cpi  01h
        jnz  loc_042E
        lda  loc_0025
        dcr  a
        sta  loc_0025
        ora  a
        jnz  loc_042E
        mvi  a, 12h
        sta  loc_0025
        lda  loc_001D
        mov  b, a
        lda  loc_001F
        dcr  a
        sta  loc_001F
        cmp  b
        jnz  loc_03FC
        lda  loc_0018
        mov  b, a
        lda  loc_001A
        cmp  b
        jc   loc_03FC
        inr  b
        inr  b
        inr  b
        cmp  b
        jnc  loc_03FC
        xra  a
        sta  loc_0029
        lxi  h, 0005h
        shld loc_0035
        call loc_0121
        lda  loc_001A
        mov  b, a
        lda  loc_001F
        inr  a
        mov  c, a
        call loc_00BF
        mvi  m, 00h
        call loc_0193
        call loc_0052
        xra  a
        sta  loc_001A
        jmp  loc_042E
loc_03FC:
        lda  loc_001A
        mov  b, a
        lda  loc_001F
        inr  a
        mov  c, a
        call loc_00BF
        mvi  m, 00h
        dcr  c
        call loc_00BF
        mvi  m, 09h
        mov  a, c
        cpi  01h
        jnz  loc_042E
        lda  loc_002D
        inr  a
        daa
        sta  loc_002D
        call loc_0070
        lda  loc_002D
        call loc_0A34
        xra  a
        sta  loc_0029
        jmp  loc_0431
loc_042E:
        jmp  loc_0487
loc_0431:
        lda  loc_002D
        cpi  10h
        jnz  loc_0447
        call loc_0089
loc_043C:
        call loc_01E4
        cpi  0Dh
        jz   loc_082E
        jmp  loc_043C
loc_0447:
        lda  loc_001A
        sta  loc_002E
        call loc_01D8
        mov  b, a
        lxi  h, 0048h
        shld loc_0037
        call loc_0154
        call loc_0052
loc_045D:
        inr  b
        mvi  c, 01h
        call loc_00BF
        mvi  a, 7Fh
        cmp  m
        jnz  loc_046E
        mvi  m, 00h
        jmp  loc_045D
loc_046E:
        lda  loc_002E
        mov  b, a
loc_0472:
        xra  a
        sta  loc_001A
        dcr  b
        mvi  c, 01h
        call loc_00BF
        mvi  a, 7Fh
        cmp  m
        jnz  loc_0487
        mvi  m, 00h
        jmp  loc_0472
loc_0487:
        call monitor_scan_kbd
        cpi  08h
        jz   loc_04C5
        cpi  18h
        jz   loc_04F7
        cpi  19h
        jz   loc_0529
        cpi  1Ah
        jz   loc_055D
        cpi  20h
        jz   loc_05B3
        cpi  0Ch
        jz   loc_05B3
        cpi  03h
        jz   monitor_prompt
        cpi  1Fh
        jz   loc_0000
        cpi  1Bh
        jz   loc_04BA
        jmp  loc_05DE
loc_04BA:
        call loc_01E4
        cpi  1Bh
        jz   loc_04BA
        jmp  loc_0487
loc_04C5:
        lda  loc_0024
        dcr  a
        sta  loc_0024
        ora  a
        jnz  loc_05DE
        mvi  a, 04h
        sta  loc_0024
        lda  loc_0018
        cpi  01h
        jc   loc_05DE
        dcr  a
        ei
        mov  b, a
        sta  loc_0018
        lda  loc_001D
        mov  c, a
        di
        call loc_00BF
        call loc_00ED
        call loc_00BF
        call loc_00DB
        jmp  loc_058E
loc_04F7:
        lda  loc_0024
        dcr  a
        sta  loc_0024
        ora  a
        jnz  loc_05DE
        mvi  a, 04h
        sta  loc_0024
        lda  loc_0018
        cpi  3Ah
        jnc  loc_05DE
        inr  a
        ei
        mov  b, a
        sta  loc_0018
        lda  loc_001D
        mov  c, a
        di
        call loc_00BF
        call loc_00ED
        call loc_00BF
        call loc_00DB
        jmp  loc_058E
loc_0529:
        lda  loc_0024
        dcr  a
        sta  loc_0024
        ora  a
        jnz  loc_05DE
        mvi  a, 06h
        sta  loc_0024
        lda  loc_001D
        cpi  17h
        jnc  loc_05DE
        inr  a
        sta  loc_001D
        ei
        dcr  a
        mov  c, a
        lda  loc_0018
        mov  b, a
        di
        call loc_00BF
        call loc_00ED
        inr  c
        call loc_00BF
        call loc_00DB
        jmp  loc_058E
loc_055D:
        lda  loc_0024
        dcr  a
        sta  loc_0024
        ora  a
        jnz  loc_05DE
        mvi  a, 06h
        sta  loc_0024
        lda  loc_001D
        cpi  03h
        jc   loc_05DE
        dcr  a
        sta  loc_001D
        ei
        mov  c, a
        inr  c
        lda  loc_0018
        mov  b, a
        di
        call loc_00BF
        call loc_00ED
        dcr  c
        call loc_00BF
        call loc_00DB
loc_058E:
        lda  loc_0033
        ora  a
        jz   loc_05DE
        lda  loc_0032
        ora  a
        jnz  loc_05DE
        lda  loc_001A
        mov  b, a
        lda  loc_0018
        inr  a
        cmp  b
        jnz  loc_05DE
        lda  loc_001F
        mov  b, a
        lda  loc_001D
        cmp  b
        jnc  loc_05DE
loc_05B3:
        lda  loc_0032
        cpi  01h
        jz   loc_05E5
        lxi  h, 0005h
        shld loc_0037
        call loc_0154
        call loc_0052
        mvi  a, 01h
        sta  loc_0032
        lda  loc_0018
        inr  a
        sta  loc_001B
        lda  loc_001D
        sta  loc_0020
        mvi  a, 0Ah
        sta  loc_003B
loc_05DE:
        lda  loc_0032
        ora  a
        jz   loc_06D1
loc_05E5:
        lda  loc_0026
        dcr  a
        sta  loc_0026
        ora  a
        jnz  loc_06D1
        mvi  a, 04h
        sta  loc_0026
        call loc_01C6
        lda  loc_001B
        mov  b, a
        lda  loc_0020
        mov  c, a
        call loc_00BF
        mvi  m, 20h
        inr  c
        call loc_00BF
        mvi  m, 0Bh
        mov  a, c
        sta  loc_0020
        lda  loc_001E
        cmp  c
        jnz  loc_0659
        lda  loc_0019
        inr  b
        cmp  b
        jnc  loc_0659
        adi  04h
        cmp  b
        jc   loc_0659
        xra  a
        sta  loc_0032
        sta  loc_0022
        inr  a
        sta  loc_0039
        mvi  a, 08h
        sta  loc_003A
        lda  loc_0019
        sta  loc_001C
        lhld 078Eh
        dcx  h
        dcx  h
        dcx  h
        dcx  h
        shld 078Eh
        lda  loc_001E
        sta  loc_0021
        lxi  h, loc_0025
        shld loc_0035
        call loc_0121
        call loc_0052
        jmp  loc_06D8
loc_0659:
        lda  loc_001B
        mov  b, a
        lda  loc_001A
        cmp  b
        jnz  loc_06BB
        lda  loc_0020
        mov  a, c
        call loc_00BF
        lxi  d, 0FFB2h
        dad  d
        mvi  a, 09h
        cmp  m
        jz   loc_067A
        dad  d
        cmp  m
        jnz  loc_06BB
loc_067A:
        call loc_00BF
        mvi  m, 00h
        lda  loc_001A
        mov  b, a
        lda  loc_001F
        mov  c, a
        call loc_00BF
        mvi  m, 2Ah
        call loc_0193
        mvi  m, 00h
        xra  a
        sta  loc_0032
        sta  loc_0029
        sta  loc_001A
        sta  loc_001F
        lxi  h, loc_0034
        inr  m
        lxi  h, monitor_prompt
        shld loc_0035
        call loc_0121
        lda  loc_0020
        mov  l, a
        shld loc_0035
        call loc_0121
        call loc_0052
        jmp  loc_06D1
loc_06BB:
        lda  loc_0020
        cpi  18h
        jnz  loc_06D1
        mov  c, a
        lda  loc_001B
        mov  b, a
        call loc_00BF
        mvi  m, 00h
        xra  a
        sta  loc_0032
loc_06D1:
        lda  loc_0039
        ora  a
        jz   loc_078D
loc_06D8:
        lda  loc_0027
        dcr  a
        sta  loc_0027
        ora  a
        jnz  loc_078D
        mvi  a, 0Eh
        sta  loc_0027
        lda  loc_003A
        dcr  a
        ei
        di
        sta  loc_003A
        ora  a
        ei
        di
        jnz  loc_070F
        ei
        lda  loc_001C
        mov  b, a
        dcr  b
        lda  loc_0021
        mov  c, a
        di
        call loc_00BF
        call loc_00ED
        xra  a
        sta  loc_0039
        jmp  loc_078D
loc_070F:
        lda  loc_001C
        mov  b, a
        ei
        lda  loc_0021
        mov  c, a
        call loc_00BF
        call loc_00ED
        call loc_00BF
        di
        lda  loc_003A
        cpi  01h
        jz   loc_0785
        cpi  02h
        jz   loc_077A
        cpi  03h
        jz   loc_076F
        cpi  04h
        jz   loc_0764
        cpi  05h
        jz   loc_0759
        cpi  06h
        jz   loc_074E
        mvi  m, 10h
        inx  h
        mvi  m, 10h
        inx  h
        mvi  m, 10h
        jmp  loc_078D
loc_074E:
        mvi  m, 02h
        inx  h
        mvi  m, 02h
        inx  h
        mvi  m, 00h
        jmp  loc_078D
loc_0759:
        mvi  m, 10h
        inx  h
        mvi  m, 00h
        inx  h
        mvi  m, 10h
        jmp  loc_078D
loc_0764:
        mvi  m, 2Bh
        inx  h
        mvi  m, 2Bh
        inx  h
        mvi  m, 2Bh
        jmp  loc_078D
loc_076F:
        mvi  m, 2Dh
        inx  h
        mvi  m, 2Dh
        inx  h
        mvi  m, 2Dh
        jmp  loc_078D
loc_077A:
        mvi  m, 09h
        inx  h
        mvi  m, 09h
        inx  h
        mvi  m, 09h
        jmp  loc_078D
loc_0785:
        mvi  m, 00h
        inx  h
        mvi  m, 2Bh
        inx  h
        mvi  m, 00h
loc_078D:
        lxi  h, 0200h
loc_0790:
        dcx  h
        mov  a, l
        ora  h
        jnz  loc_0790
        lhld 078Eh
        mov  a, h
        ora  a
        jnz  loc_07AA
        mov  a, l
        cpi  0Ah
        jnc  loc_07AA
        lxi  h, 0050h
        shld 078Eh
loc_07AA:
        lda  loc_0033
        ora  a
        jnz  loc_02B7
        lda  loc_0034
        cpi  32h
        jnz  loc_02B7
        lxi  h, 01A0h
        shld 078Eh
        mvi  a, 0Fh
loc_07C1:
        call loc_0193
        dcr  a
        ora  a
        jnz  loc_07C1
        lxi  h, loc_07F3
        call monitor_puts
        lxi  d, 0815h
        lxi  h, 7776h
        call loc_0189
        call loc_01E4
        lxi  h, loc_0829
        call monitor_puts
        mvi  a, 1Fh
        mvi  c, 00h
loc_07E5:
        call monitor_putc
        dcr  a
        jnz  loc_07E5
        lxi  h, loc_0033
        inr  m
        jmp  loc_02B7
loc_07F3:
        db   1Bh, 'Y', 20h, 31h       ; ESC Y row=0 col=17
        db   'wy premirowany awtonawod~ikom', 00h     ; "VY PREMIROVANY AVTONAVODCHIKOM" -- you are awarded an auto-targeting system
        db   73h, 69h, 73h, 74h, 65h, 6Dh, 61h, 20h, 61h, 77h, 74h, 6Fh, 6Eh, 61h, 77h, 6Fh
        db   64h, 6Bh, 69h, 00h
loc_0829:
        db   1Bh, 'Y', 20h, 31h       ; ESC Y row=0 col=17
        db   '', 00h                                  ; "" -- (cursor only)
loc_082E:
        lda  loc_002F
        ora  a
        jz   loc_08B8
        xra  a
        sta  09D8h
loc_0839:
        call loc_09BE
        lxi  d, 000Eh
        dad  d
        mov  d, m
        inx  h
        mov  e, m
        lhld loc_002B
        mov  a, h
        cmp  d
        jc   loc_08A9
        jnz  loc_0853
        mov  a, e
        cmp  l
        jnc  loc_08A9
loc_0853:
        call loc_09BE
        shld 09D9h
        call loc_091F
        lhld 09D9h
        call loc_095D
        lhld 09D9h
        lxi  d, 000Eh
        dad  d
        lxi  d, loc_002C
        ldax d
        mov  m, a
        dcx  d
        inx  h
        ldax d
        mov  m, a
loc_0872:
        call loc_09DB
        lda  09D8h
        cpi  14h
        jz   loc_08C0
        cpi  15h
        jz   loc_08D4
        lda  09D8h
        mov  b, a
        lxi  h, 77F6h
        lxi  d, 004Eh
loc_088C:
        mov  a, b
        ora  a
        jz   loc_0896
        dad  d
        dcr  b
        jmp  loc_088C
loc_0896:
        mvi  m, 80h
        lxi  d, 0FFDBh
        dad  d
        mvi  m, 82h
loc_089E:
        lxi  h, 7605h
        mvi  m, 00h
        call loc_01E4
        jmp  loc_0C9F
loc_08A9:
        lda  09D8h
        inr  a
        sta  09D8h
        cpi  14h
        jnz  loc_0839
        jmp  loc_0872
loc_08B8:
        mvi  a, 15h
        sta  09D8h
        jmp  loc_0872
loc_08C0:
        lxi  h, loc_08EA
        call monitor_puts
        lhld loc_002B
        mov  a, h
        call monitor_hexb
        mov  a, l
        call monitor_hexb
        jmp  loc_089E
loc_08D4:
        lxi  h, loc_08FF
        call monitor_puts
        lhld loc_002B
        mov  a, h
        cma
        call monitor_hexb
        mov  a, l
        cma
        call monitor_hexb
        jmp  loc_089E
loc_08EA:
        db   1Bh, 'Y', 37h, 36h       ; ESC Y row=23 col=22
        db   'wa{ rezulxtat : ', 00h                  ; "VASH REZULSOFTTAT :" -- your result : 
loc_08FF:
        db   1Bh, 'Y', 37h, 31h       ; ESC Y row=23 col=17
        db   'wy zadolvali gosudarstwu : ', 00h       ; "VY ZADOLZHALI GOSUDARSTVU :" -- you owe the state : 
loc_091F:
        push b
        push d
        push h
        lhld 09D9h
        push h
        pop  b
        dcx  b
        lxi  h, 0BD6h
        lxi  d, 0010h
        dad  d
        xchg
        lxi  h, 0BD6h
loc_0933:
        mov  a, m
        stax d
        dcx  d
        dcx  h
        mov  a, h
        cmp  b
        jnz  loc_0933
        mov  a, l
        cmp  c
        jnz  loc_0933
        pop  h
        pop  d
        pop  b
        ret
loc_0945:
        db   1Bh, 'Y', 37h, 36h       ; ESC Y row=23 col=22
        db   'wwedite wa{e imq : ', 00h               ; "VVEDITE VASHE IMYA :" -- enter your name : 
loc_095D:
        push b
        push h
        lxi  h, 7605h
        mvi  m, 00h
        call loc_09E8
        lxi  h, loc_0945
        call monitor_puts
        pop  h
        xra  a
        mov  b, a
loc_0970:
        call loc_01E4
        mov  m, a
        cpi  0Dh
        jz   loc_09B7
        cpi  08h
        jz   loc_09A1
        cpi  20h
        jc   loc_0970
        mov  c, a
        call monitor_putc
        inx  h
        inr  b
        mov  a, b
        cpi  0Dh
        jc   loc_0970
        push h
        lxi  h, loc_099C
        call monitor_puts
        pop  h
        dcx  h
        dcr  b
        jmp  loc_0970
loc_099C:
        db   07h, 08h, ' ', 08h, 00h    ; BEL, BS, " ", BS -- beep then erase-prev-char
loc_09A1:
        mov  a, b
        ora  a
        jz   loc_0970
        push h
        lxi  h, loc_09B3
        call monitor_puts
        pop  h
        dcx  h
        dcr  b
        jmp  loc_0970
loc_09B3:
        db   08h, ' ', 08h, 00h    ; BS, " ", BS -- erase-prev-char
loc_09B7:
        mov  a, b
        ora  a
        jz   loc_0970
        pop  b
        ret
loc_09BE:
        push b
        push d
        lxi  h, 0AA6h
        lxi  d, 0010h
        lda  09D8h
        mov  b, a
loc_09CA:
        mov  a, b
        ora  a
        jz   loc_09D4
        dad  d
        dcr  b
        jmp  loc_09CA
loc_09D4:
        pop  d
        pop  b
        ret
        db   0Ch, 00h, 0Ch, 00h
loc_09DB:
        mvi  b, 00h
        mvi  a, 01h
        sta  09D7h
        call loc_09E8
        jmp  loc_0A0A
loc_09E8:
        lxi  h, 77C0h
loc_09EB:
        mvi  m, 00h
        inx  h
        mov  a, h
        cpi  80h
        jnz  loc_09EB
        mvi  c, 0Ch
        call monitor_putc
        ret
loc_09FA:
        push b
        mvi  b, 0Ch
loc_09FD:
        dcr  b
        mvi  c, 00h
        call monitor_putc
        mov  a, b
        ora  a
        jnz  loc_09FD
        pop  b
        ret
loc_0A0A:
        call loc_09FA
        lda  09D7h
        call loc_0A34
        mvi  c, 00h
        call monitor_putc
        call monitor_putc
        call monitor_putc
        call loc_0A52
        call loc_0A65
        inr  b
        lda  09D7h
        inr  a
        daa
        sta  09D7h
        mov  a, b
        cpi  14h
        jnz  loc_0A0A
        ret
loc_0A34:
        push b
        push psw
        ani  0F0h
        jz   loc_0A42
        pop  psw
        call monitor_hexb
        jmp  loc_0A50
loc_0A42:
        mvi  c, 20h
        call monitor_putc
        pop  psw
        ani  0Fh
        ori  30h
        mov  c, a
        call monitor_putc
loc_0A50:
        pop  b
        ret
loc_0A52:
        push b
        mov  a, b
        lxi  h, 0AA6h
        lxi  d, 0010h
loc_0A5A:
        ora  a
        jz   loc_0A63
        dad  d
        dcr  a
        jmp  loc_0A5A
loc_0A63:
        pop  b
        ret
loc_0A65:
        push b
        push h
        mvi  d, 1Eh
loc_0A69:
        mov  a, m
        cpi  0Dh
        jz   loc_0A7E
        mov  c, a
        call monitor_putc
        mvi  c, 00h
        call monitor_putc
        inx  h
        dcr  d
        dcr  d
        jmp  loc_0A69
loc_0A7E:
        mov  a, d
        ora  a
        jz   loc_0A8C
        mvi  c, 2Eh
        call monitor_putc
        dcr  d
        jmp  loc_0A7E
loc_0A8C:
        pop  h
        lxi  d, 000Eh
        dad  d
        mov  a, m
        call monitor_hexb
        inx  h
        mov  a, m
        call monitor_hexb
        mvi  c, 0Dh
        call monitor_putc
        mvi  c, 0Ah
        call monitor_putc
        pop  b
        ret
        db   60h, 72h, 69h, 6Bh, 20h, 6Dh, 68h, 2Dh, 31h, 32h, 0Dh, 00h, 00h, 00h, 32h, 24h
        db   77h, 69h, 74h, 61h, 6Ch, 69h, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 54h
        db   77h, 61h, 64h, 69h, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 19h, 83h
        db   4Ah, 49h, 4Dh, 4Dh, 45h, 45h, 20h, 4Dh, 49h, 4Ch, 0Dh, 20h, 20h, 20h, 12h, 34h
        db   6Fh, 6Ch, 65h, 6Eh, 78h, 6Bh, 61h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 10h, 94h
        db   7Bh, 75h, 72h, 69h, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 10h, 46h
        db   73h, 65h, 72h, 79h, 6Ah, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 09h, 55h
        db   4Dh, 41h, 55h, 53h, 45h, 20h, 4Dh, 49h, 4Bh, 0Dh, 20h, 20h, 20h, 20h, 08h, 85h
        db   41h, 50h, 50h, 4Ch, 45h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 06h, 47h
        db   61h, 67h, 2Eh, 30h, 30h, 37h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 05h, 36h
        db   77h, 6Fh, 6Ch, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 04h, 24h
        db   6Ch, 65h, 6Fh, 70h, 6Fh, 6Ch, 78h, 64h, 0Dh, 20h, 20h, 20h, 20h, 20h, 03h, 23h
        db   62h, 61h, 7Ah, 69h, 6Ch, 69h, 6Fh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 02h, 57h
        db   77h, 65h, 73h, 65h, 6Ch, 78h, 7Eh, 61h, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 02h, 31h
        db   70h, 6Fh, 72h, 6Fh, 73h, 65h, 6Eh, 6Fh, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 02h, 03h
        db   4Bh, 41h, 4Ch, 44h, 52h, 4Fh, 4Fh, 4Eh, 0Dh, 20h, 20h, 20h, 20h, 20h, 01h, 23h
        db   61h, 6Ah, 62h, 6Fh, 6Ch, 69h, 74h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 76h
        db   6Bh, 61h, 72h, 6Ch, 73h, 6Fh, 6Eh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 12h
        db   4Dh, 58h, 2Dh, 31h, 32h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 00h
        db   4Dh, 58h, 2Dh, 31h, 32h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 00h
        db   00h, 00h, 00h, 00h, 0Ch, 0C8h, 0FEh, 2Bh, 0CAh, 0F6h
loc_0BF0:
        call loc_12B7
        call 0F803h
        call loc_0BFF
        call 0F82Dh
        jmp  loc_0C9F
loc_0BFF:
        lxi  h, 77C2h
        shld 0C96h
        shld 0C9Ah
        lxi  h, 7801h
        shld 0C98h
        shld 0C9Ch
        mvi  a, 1Eh
        sta  0C9Eh
        mvi  b, 21h
loc_0C18:
        mvi  c, 20h
loc_0C1A:
        mvi  d, 19h
loc_0C1C:
        lhld 0C96h
        inx  h
        mov  a, m
        dcx  h
        mov  m, a
        push d
        lxi  d, 004Eh
        dad  d
        pop  d
        shld 0C96h
        lhld 0C98h
        dcx  h
        mov  a, m
        inx  h
        mov  m, a
        push d
        lxi  d, 004Eh
        dad  d
        pop  d
        shld 0C98h
        dcr  d
        jnz  loc_0C1C
        lhld 0C9Ah
        inx  h
        shld 0C9Ah
        shld 0C96h
        lhld 0C9Ch
        dcx  h
        shld 0C9Ch
        shld 0C98h
        dcr  c
        jnz  loc_0C1A
        lhld 0C96h
        push d
        lxi  d, 004Eh
loc_0C5F:
        mvi  m, 00h
        dad  d
        mov  a, h
        cpi  80h
        jc   loc_0C5F
        pop  d
        push b
        mvi  c, 13h
        lda  0C9Eh
        inr  a
        cpi  41h
        jnz  loc_0C77
        mvi  a, 1Eh
loc_0C77:
        sta  0C9Eh
        mov  b, a
        call 0FD27h
        pop  b
        lxi  h, 77C2h
        shld 0C96h
        shld 0C9Ah
        lxi  h, 7801h
        shld 0C98h
        shld 0C9Ch
        dcr  b
        jnz  loc_0C18
        ret
        db   20h, 21h, 21h, 21h, 0Dh, 0Ah, 75h, 70h, 6Ch
loc_0C9F:
        lxi  b, 0150h
loc_0CA2:
        push b
        call 0FD27h
        pop  b
        inr  b
        dcr  c
        mov  a, b
        cpi  23h
        jnz  loc_0CA2
        lxi  h, loc_0CE2
        call 0F818h
        lxi  h, loc_1290
        call 0F818h
        lda  loc_12B3
        jmp  loc_11F5
loc_0CC1:
        mvi  c, 0Ch
        call 0F809h
        call 0F803h
        ani  0DFh
        cpi  4Eh
        jz   loc_12B4
        cpi  55h
        jz   loc_11D3
        cpi  49h
        jz   loc_0D3E
        cpi  03h
        jz   0F86Ch
        jmp  loc_0CC1
loc_0CE2:
        db   1Fh                                  ; clear screen
        db   1Bh, 'Y', 24h, 3Bh                   ; ESC Y row=4 col=27
        db   'YOU CHOICE'                         ; (English, typo of "YOUR CHOICE")
        db   1Bh, 'Y', 28h, 34h                   ; ESC Y row=8 col=20
        db   'u - ustanowka urownq igry'          ; "U - USTANOVKA UROVNYA IGRY" -- U - set game level
        db   1Bh, 'Y', 2Bh, 34h                   ; ESC Y row=11 col=20
        db   'i - instrukciq'                     ; "I - INSTRUKTSIYA" -- I - instructions
        db   1Bh, 'Y', 2Eh, 34h                   ; ESC Y row=14 col=20
        db   'n - i g r a .'                      ; "N - I G R A ." -- N - g a m e .
        db   1Bh, 'Y', 35h, 48h                   ; ESC Y row=21 col=40
        db   'urowenx:', 00h                      ; "UROVEN':" -- level:
loc_0D3E:
        lxi  h, loc_0D64
loc_0D41:
        mov  a, m
        cpi  00h
        jz   loc_0D5B
        cpi  0Dh
        jnz  loc_0D51
        mvi  c, 07h
        call 0F809h
loc_0D51:
        mov  c, a
        ei
        call 0F809h
        di
        inx  h
        jmp  loc_0D41
loc_0D5B:
        call 0F803h
        call loc_0BFF
        jmp  loc_0C9F
loc_0D64:
        db   1Fh                                 ; clear screen
        db   1Bh, 'Y', 20h, 33h                ; ESC Y row=0 col=19
        db   'i n s t r u k c i q'                         ; "I N S T R U K TS I YA"
        db   0Dh, 0Ah                             ; CR LF
        db   0Ah                                  ; LF
        db   'idet 2989 god...aprelx mesqc.na na{u planetu obru{ilosx'  ; "IDET 2989 GOD...APREL' MESYATS.NA NASHU PLANETU OBRUSHILOS'"
        db   0Dh, 0Ah                             ; CR LF
        db   'tqvkoe bedstwie.22 i`nq 2941 goda w 4 ~asa utra bez ob"-'  ; "TYAZHKOE BEDSTVIE.22 IYUNYA 2941 GODA V 4 CHASA UTRA BEZ OB"-"
        db   0Dh, 0Ah                             ; CR LF
        db   'qwleniq wojny na planetu "zemlq" obru{ilisx pol~i}a mar-'  ; "YAVLENIYA VOJNY NA PLANETU "ZEMLYA" OBRUSHILIS' POLCHISCHA MAR-"
        db   0Dh, 0Ah                             ; CR LF
        db   'sian ~toby porabotitx zeml` i nawqzatx ~uvdyj nam stroj,'  ; "SIAN CHTOBY PORABOTIT' ZEMLYU I NAVYAZAT' CHUZHDYJ NAM STROJ,"
        db   0Dh, 0Ah                             ; CR LF
        db   'i sdelatx "zeml`" stranoj rabow.'            ; "I SDELAT' "ZEMLYU" STRANOJ RABOV."
        db   0Dh, 0Ah                             ; CR LF
        db   0Ah                                  ; LF
        db   'wy mobilizowany rajonnym woenkomatom dlq za}ity rodiny'  ; "VY MOBILIZOVANY RAJONNYM VOENKOMATOM DLYA ZASCHITY RODINY"
        db   0Dh, 0Ah                             ; CR LF
        db   'i otprawleny w wojska pwo.'                  ; "I OTPRAVLENY V VOJSKA PVO."
        db   0Dh, 0Ah                             ; CR LF
        db   0Ah                                  ; LF
        db   '   pod wa{im komandowaniem nahoditsq podwivnaq zenitnaq'  ; "   POD VASHIM KOMANDOVANIEM NAKHODITSYA PODVIZHNAYA ZENITNAYA"
        db   0Dh, 0Ah                             ; CR LF
        db   'sistema na wozdu{noj podu{ke.wa{a zada~a atakowatx marsi-'  ; "SISTEMA NA VOZDUSHNOJ PODUSHKE.VASHA ZADACHA ATAKOVAT' MARSI-"
        db   0Dh, 0Ah                             ; CR LF
        db   'an torpedami,a tak ve prepqtstwowatx proniknoweni` diwer-'  ; "AN TORPEDAMI,A TAK ZHE PREPYATSTVOVAT' PRONIKNOVENIYU DIVER-"
        db   0Dh, 0Ah                             ; CR LF
        db   'santow desantnikow na strategi~eski wavnye ob"ekty,koto-'  ; "SANTOV DESANTNIKOV NA STRATEGICHESKI VAZHNYE OB"EKTY,KOTO-"
        db   0Dh, 0Ah                             ; CR LF
        db   'rye nahodqtsq w zone wa{ego peredwiveniq.desantnikow mo-'  ; "RYE NAKHODYATSYA V ZONE VASHEGO PEREDVIZHENIYA.DESANTNIKOV MO-"
        db   0Dh, 0Ah                             ; CR LF
        db   'vno perehwatywatx swoej platformoj,no tak kak pri obez-'  ; "ZHNO PEREKHVATYVAT' SVOEJ PLATFORMOJ,NO TAK KAK PRI OBEZ-"
        db   0Dh, 0Ah                             ; CR LF
        db   'wreviwanii ego wy terqete viwu` silu,|to slabo oceniwa-'  ; "VREZHIVANII EGO VY TERYAETE ZHIVUYU SILU,ETO SLABO OTSENIVA-"
        db   0Dh, 0Ah                             ; CR LF
        db   'etsq.namnogo |ffektiwnee sbiwatx diwersantow torpedoj,'  ; "ETSYA.NAMNOGO EFFEKTIVNEE SBIVAT' DIVERSANTOV TORPEDOJ,"
        db   0Dh, 0Ah                             ; CR LF
        db   'no togda nuvno delatx pomenx{e promahow.za |ffektiwnoe'  ; "NO TOGDA NUZHNO DELAT' POMEN'SHE PROMAKHOV.ZA EFFEKTIVNOE"
        db   0Dh, 0Ah                             ; CR LF
        db   'uni~tovenie diwersantow federaciq premiruet was awtona-'  ; "UNICHTOZHENIE DIVERSANTOV FEDERATSIYA PREMIRUET VAS AVTONA-"
        db   0Dh, 0Ah                             ; CR LF
        db   'wodq}ej sistemoj na diwersantow.horo{o oceniwa`tsq sbi-'  ; "VODYASCHEJ SISTEMOJ NA DIVERSANTOV.KHOROSHO OTSENIVAYUTSYA SBI-"
        db   0Dh, 0Ah                             ; CR LF
        db   'tye korabli marsian.'                        ; "TYE KORABLI MARSIAN."
        db   0Dh, 0Ah                             ; CR LF
        db   'klawi{i '                                    ; "KLAVISHI "
        db   1Dh
        db   ' '                                           ; " "
        db   0Eh
        db   ' '                                           ; " "
        db   0Bh
        db   ' '                                           ; " "
        db   0Fh
        db   ' peredwiga`t wa{u sistemu,"probel"-wystrel'  ; " PEREDVIGAYUT VASHU SISTEMU,"PROBEL"-VYSTREL"
        db   0Dh, 0Ah                             ; CR LF
        db   '"ar2"-priostanow igry.   vela` uda~i.  mh-12' ; ""AR2"-PRIOSTANOV IGRY.   ZHELAYU UDACHI.  MKH-12"
        db   00h                                  ; NUL
loc_11D3:
        lxi  h, loc_1290
        call 0F818h
        lxi  b, 0A30h
loc_11DC:
        push b
        call 0FD27h
        pop  b
        dcr  b
        inr  c
        inr  c
        mov  a, b
        cpi  02h
        jnz  loc_11DC
        lda  loc_12B3
        inr  a
        cpi  04h
        jnz  loc_11F5
        mvi  a, 01h
loc_11F5:
        sta  loc_12B3
        cpi  01h
        jz   loc_125E
        cpi  02h
        jz   loc_122D
        lxi  h, loc_1295
        call 0F818h
        mvi  a, 03h
        sta  04D1h
        sta  0503h
        inr  a
        sta  0535h
        sta  0569h
        sta  05F1h
        mvi  a, 0Fh
        sta  03AFh
        mvi  a, 12h
        sta  0374h
        lxi  h, 0160h
        shld 078Eh
        jmp  loc_0CC1
loc_122D:
        lxi  h, loc_129F
        call 0F818h
        mvi  a, 04h
        sta  04D1h
        sta  05F1h
        sta  0503h
        mvi  a, 06h
        sta  0535h
        sta  0569h
        mvi  a, 0Ah
        sta  02CAh
        mvi  a, 12h
        sta  03AFh
        mvi  a, 14h
        sta  0374h
        lxi  h, 0200h
        shld 078Eh
        jmp  loc_0CC1
loc_125E:
        lxi  h, loc_12A9
        call 0F818h
        mvi  a, 04h
        sta  04D1h
        sta  0503h
        dcr  a
        sta  05F1h
        mvi  a, 05h
        sta  0535h
        sta  0569h
        mvi  a, 0Fh
        sta  02CAh
        mvi  a, 1Ch
        sta  03AFh
        mvi  a, 16h
        sta  0374h
        lxi  h, 0250h
        shld 078Eh
        jmp  loc_0CC1
loc_1290:
        db   1Bh, 'Y', 34h, 48h, 00h               ; ESC Y row=20 col=40, NUL  (cursor-only)
loc_1295:
        db   'tqvelyj  ', 00h                      ; "TYAZHELYJ  " -- hard
loc_129F:
        db   'srednij  ', 00h                      ; "SREDNIJ  " -- medium
loc_12A9:
        db   'legkij   ', 00h                      ; "LEGKIJ   " -- easy
loc_12B3:
        db   01h                                   ; var_difficulty (1=easy, 2=medium, 3=hard)
loc_12B4:
        jmp  loc_0224
loc_12B7:
        mvi  c, 1Fh
        call 0F809h
        call loc_12D3
        call loc_12C3
        ret
loc_12C3:
        lxi  h, 12F0h
loc_12C6:
        mov  a, m
        cpi  1Bh
        rz
        inx  h
        mov  c, m
        inx  h
        mov  b, m
        stax b
        inx  h
        jmp  loc_12C6
loc_12D3:
        push h
        lxi  h, 0C001h
        mvi  m, 00h
        dcx  h
        mvi  m, 4Dh
        mvi  m, 5Dh
        mvi  m, 78h
        mvi  m, 0F3h
        inx  h
        mvi  m, 27h
        jmp  0FAE0h
        db   4Fh, 0CDh, 03h, 00h, 0FEh, 0FFh, 0CAh, 0E9h, 2Eh, 0C4h, 77h, 04h, 0C8h, 77h, 14h, 0C9h
        db   77h, 17h, 0CAh, 77h, 14h, 0CBh, 77h, 10h, 0CCh, 77h, 5Eh, 0D8h, 77h, 5Eh, 0DAh, 77h
        db   5Eh, 0DCh, 77h, 5Eh, 0DEh, 77h, 5Eh, 0E0h, 77h, 5Eh, 0E2h, 77h, 06h, 0FCh, 77h, 17h
        db   0FEh, 77h, 10h, 0FFh, 77h, 04h, 15h, 78h, 17h, 16h, 78h, 17h, 17h, 78h, 17h, 18h
        db   78h, 17h, 19h, 78h, 17h, 1Ah, 78h, 10h, 1Bh, 78h, 2Eh, 21h, 78h, 4Fh, 25h, 78h
        db   4Fh, 27h, 78h, 4Fh, 29h, 78h, 4Fh, 2Bh, 78h, 4Fh, 2Dh, 78h, 4Fh, 2Fh, 78h, 4Fh
        db   31h, 78h, 2Eh, 36h, 78h, 2Eh, 4Ah, 78h, 17h, 4Bh, 78h, 06h, 4Ch, 78h, 11h, 4Dh
        db   78h, 03h, 63h, 78h, 07h, 64h, 78h, 13h, 68h, 78h, 03h, 69h, 78h, 2Eh, 6Dh, 78h
        db   3Dh, 74h, 78h, 3Dh, 76h, 78h, 3Dh, 78h, 78h, 3Dh, 7Ah, 78h, 3Dh, 7Ch, 78h, 3Dh
        db   7Eh, 78h, 2Eh, 8Dh, 78h, 2Eh, 92h, 78h, 06h, 99h, 78h, 03h, 9Bh, 78h, 2Eh, 0ADh
        db   78h, 16h, 0B2h, 78h, 14h, 0B4h, 78h, 15h, 0B6h, 78h, 2Eh, 0CEh, 78h, 2Eh, 0D6h, 78h
        db   2Eh, 0E3h, 78h, 07h, 0E8h, 78h, 06h, 0EBh, 78h, 13h, 00h, 79h, 06h, 01h, 79h, 17h
        db   02h, 79h, 11h, 03h, 79h, 07h, 04h, 79h, 2Eh, 12h, 79h, 2Eh, 29h, 79h, 03h, 37h
        db   79h, 17h, 38h, 79h, 02h, 39h, 79h, 17h, 4Eh, 79h, 14h, 4Fh, 79h, 17h, 50h, 79h
        db   14h, 51h, 79h, 17h, 52h, 79h, 82h, 55h, 79h, 17h, 59h, 79h, 17h, 5Ah, 79h, 17h
        db   5Dh, 79h, 17h, 61h, 79h, 17h, 63h, 79h, 17h, 64h, 79h, 17h, 65h, 79h, 17h, 68h
        db   79h, 17h, 69h, 79h, 17h, 6Ah, 79h, 17h, 6Bh, 79h, 17h, 6Eh, 79h, 17h, 6Fh, 79h
        db   17h, 73h, 79h, 17h, 74h, 79h, 17h, 78h, 79h, 17h, 79h, 79h, 17h, 7Ch, 79h, 17h
        db   7Fh, 79h, 17h, 81h, 79h, 17h, 82h, 79h, 17h, 83h, 79h, 17h, 84h, 79h, 17h, 85h
        db   79h, 80h, 86h, 79h, 07h, 87h, 79h, 06h, 9Dh, 79h, 17h, 9Eh, 79h, 11h, 9Fh, 79h
        db   82h, 0A3h, 79h, 17h, 0A6h, 79h, 17h, 0A8h, 79h, 17h, 0ABh, 79h, 17h, 0AEh, 79h, 17h
        db   0AFh, 79h, 17h, 0B1h, 79h, 17h, 0B4h, 79h, 17h, 0B6h, 79h, 17h, 0BBh, 79h, 17h, 0BEh
        db   79h, 17h, 0C0h, 79h, 17h, 0C3h, 79h, 17h, 0C5h, 79h, 17h, 0C8h, 79h, 17h, 0CAh, 79h
        db   17h, 0CDh, 79h, 17h, 0D1h, 79h, 80h, 0D5h, 79h, 04h, 0EAh, 79h, 13h, 0EBh, 79h, 03h
        db   0ECh, 79h, 07h, 0EDh, 79h, 10h, 0EEh, 79h, 82h, 0F1h, 79h, 17h, 0F4h, 79h, 17h, 0F6h
        db   79h, 17h, 0F9h, 79h, 17h, 0FBh, 79h, 17h, 0FDh, 79h, 17h, 0FFh, 79h, 17h, 00h, 7Ah
        db   17h, 01h, 7Ah, 17h, 04h, 7Ah, 17h, 05h, 7Ah, 17h, 06h, 7Ah, 17h, 09h, 7Ah, 17h
        db   0Ch, 7Ah, 17h, 0Eh, 7Ah, 17h, 13h, 7Ah, 17h, 16h, 7Ah, 17h, 18h, 7Ah, 17h, 19h
        db   7Ah, 17h, 1Ah, 7Ah, 17h, 1Bh, 7Ah, 17h, 1Fh, 7Ah, 80h, 23h, 7Ah, 15h, 37h, 7Ah
        db   17h, 38h, 7Ah, 01h, 39h, 7Ah, 02h, 3Bh, 7Ah, 17h, 3Ch, 7Ah, 16h, 3Dh, 7Ah, 82h
        db   3Fh, 7Ah, 17h, 41h, 7Ah, 17h, 42h, 7Ah, 17h, 43h, 7Ah, 17h, 44h, 7Ah, 17h, 45h
        db   7Ah, 17h, 47h, 7Ah, 17h, 48h, 7Ah, 17h, 4Bh, 7Ah, 17h, 4Dh, 7Ah, 17h, 50h, 7Ah
        db   17h, 52h, 7Ah, 17h, 57h, 7Ah, 17h, 58h, 7Ah, 17h, 59h, 7Ah, 17h, 5Ch, 7Ah, 17h
        db   5Fh, 7Ah, 17h, 61h, 7Ah, 17h, 62h, 7Ah, 17h, 63h, 7Ah, 17h, 64h, 7Ah, 17h, 66h
        db   7Ah, 17h, 69h, 7Ah, 17h, 6Dh, 7Ah, 80h, 71h, 7Ah, 2Eh, 82h, 7Ah, 01h, 86h, 7Ah
        db   02h, 8Ah, 7Ah, 82h, 8Dh, 7Ah, 17h, 8Fh, 7Ah, 17h, 93h, 7Ah, 17h, 95h, 7Ah, 17h
        db   99h, 7Ah, 17h, 9Bh, 7Ah, 17h, 9Ch, 7Ah, 17h, 9Dh, 7Ah, 17h, 0A0h, 7Ah, 17h, 0A1h
        db   7Ah, 17h, 0A2h, 7Ah, 17h, 0A3h, 7Ah, 17h, 0A5h, 7Ah, 17h, 0ABh, 7Ah, 17h, 0ACh, 7Ah
        db   17h, 0AFh, 7Ah, 17h, 0B2h, 7Ah, 17h, 0B4h, 7Ah, 17h, 0B7h, 7Ah, 17h, 0BBh, 7Ah, 80h
        db   0BFh, 7Ah, 2Eh, 0D8h, 7Ah, 2Eh, 0E6h, 7Ah, 2Eh, 0E9h, 7Ah, 04h, 0FFh, 7Ah, 14h, 00h
        db   7Bh, 17h, 01h, 7Bh, 14h, 02h, 7Bh, 10h, 03h, 7Bh, 2Eh, 0Ch, 7Bh, 2Eh, 2Ah, 7Bh
        db   2Eh, 46h, 7Bh, 04h, 4Ch, 7Bh, 17h, 4Dh, 7Bh, 17h, 4Eh, 7Bh, 17h, 4Fh, 7Bh, 17h
        db   50h, 7Bh, 17h, 51h, 7Bh, 10h, 52h, 7Bh, 2Eh, 7Fh, 7Bh, 2Eh, 83h, 7Bh, 2Eh, 90h
        db   7Bh, 03h, 9Ah, 7Bh, 07h, 9Bh, 7Bh, 13h, 9Fh, 7Bh, 03h, 0A0h, 7Bh, 2Eh, 0A3h, 7Bh
        db   2Eh, 0A9h, 7Bh, 2Eh, 0BBh, 7Bh, 2Eh, 0DAh, 7Bh, 16h, 0E9h, 7Bh, 14h, 0EBh, 7Bh, 15h
        db   0EDh, 7Bh, 04h, 11h, 7Ch, 15h, 12h, 7Ch, 2Eh, 25h, 7Ch, 13h, 37h, 7Ch, 06h, 38h
        db   7Ch, 17h, 39h, 7Ch, 11h, 3Ah, 7Ch, 07h, 3Bh, 7Ch, 2Eh, 42h, 7Ch, 04h, 5Eh, 7Ch
        db   17h, 5Fh, 7Ch, 17h, 60h, 7Ch, 15h, 61h, 7Ch, 2Eh, 6Ch, 7Ch, 17h, 85h, 7Ch, 14h
        db   86h, 7Ch, 17h, 87h, 7Ch, 14h, 88h, 7Ch, 17h, 89h, 7Ch, 2Eh, 0A4h, 7Ch, 11h, 0AEh
        db   7Ch, 2Eh, 0C2h, 7Ch, 2Eh, 0CDh, 7Ch, 06h, 0D4h, 7Ch, 17h, 0D5h, 7Ch, 11h, 0D6h, 7Ch
        db   2Eh, 0E0h, 7Ch, 2Eh, 0F5h, 7Ch, 2Eh, 03h, 7Dh, 2Eh, 16h, 7Dh, 04h, 21h, 7Dh, 13h
        db   22h, 7Dh, 03h, 23h, 7Dh, 07h, 24h, 7Dh, 10h, 25h, 7Dh, 2Eh, 2Ch, 7Dh, 2Eh, 57h
        db   7Dh, 2Eh, 60h, 7Dh, 15h, 6Eh, 7Dh, 17h, 6Fh, 7Dh, 01h, 70h, 7Dh, 02h, 72h, 7Dh
        db   17h, 73h, 7Dh, 16h, 74h, 7Dh, 06h, 97h, 7Dh, 16h, 98h, 7Dh, 01h, 0BDh, 7Dh, 02h
        db   0C1h, 7Dh, 2Eh, 0DCh, 7Dh, 11h, 0E6h, 7Dh, 2Eh, 0EAh, 7Dh, 90h, 0F2h, 7Dh, 80h, 04h
        db   7Eh, 2Eh, 2Ah, 7Eh, 11h, 34h, 7Eh, 90h, 40h, 7Eh, 12h, 43h, 7Eh, 12h, 44h, 7Eh
        db   10h, 45h, 7Eh, 05h, 46h, 7Eh, 12h, 47h, 7Eh, 14h, 49h, 7Eh, 14h, 4Ah, 7Eh, 16h
        db   4Ch, 7Eh, 12h, 4Eh, 7Eh, 05h, 4Fh, 7Eh, 80h, 52h, 7Eh, 14h, 7Fh, 7Eh, 04h, 80h
        db   7Eh, 16h, 81h, 7Eh, 17h, 82h, 7Eh, 14h, 83h, 7Eh, 04h, 84h, 7Eh, 10h, 85h, 7Eh
        db   90h, 8Eh, 7Eh, 11h, 91h, 7Eh, 11h, 93h, 7Eh, 12h, 94h, 7Eh, 05h, 95h, 7Eh, 03h
        db   97h, 7Eh, 03h, 98h, 7Eh, 06h, 9Ah, 7Eh, 14h, 9Ch, 7Eh, 15h, 9Dh, 7Eh, 80h, 0A0h
        db   7Eh, 31h, 0AFh, 7Eh, 39h, 0B0h, 7Eh, 38h, 0B1h, 7Eh, 39h, 0B2h, 7Eh, 67h, 0B4h, 7Eh
        db   2Eh, 0B5h, 7Eh, 80h, 0C4h, 7Eh, 02h, 0CCh, 7Eh, 17h, 0CDh, 7Eh, 01h, 0CEh, 7Eh, 03h
        db   0CFh, 7Eh, 03h, 0D0h, 7Eh, 01h, 0D1h, 7Eh, 07h, 0D2h, 7Eh, 13h, 0D3h, 7Eh, 90h, 0DCh
        db   7Eh, 80h, 0EEh, 7Eh, 80h, 03h, 7Fh, 90h, 12h, 7Fh, 68h, 4Ah, 7Fh, 61h, 4Bh, 7Fh
        db   72h, 4Ch, 7Fh, 78h, 4Dh, 7Fh, 6Bh, 4Eh, 7Fh, 6Fh, 4Fh, 7Fh, 77h, 50h, 7Fh, 1Bh
        db   0FEh, 01h, 0CAh, 5Eh, 12h, 0FEh, 02h, 0CAh
