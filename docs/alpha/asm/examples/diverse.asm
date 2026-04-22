        org  0000h
        section diverse

; ---- RK86 monitor ROM entry points (F800h-FFFFh) ----
; Public jump-table slots are documented in ../rk86-js-kit/info/RK86.md
; and in the monitor source at ../rk86-monitor/monitor.asm. FD27h is
; the internal SOUND routine (see CLAUDE.md); FAE0h is the tail of
; entry_video (status poll + DMA setup), reused to inject a custom
; SCN4 byte while keeping the rest of the monitor's video init.
; ---- RK86 video memory ----
; Video RAM: 30 rows × 78 cols = 2340 bytes at 76D0h..7FF4h.
; Address of cell (row, col) = video_memory + row*video_stride + col.
video_memory     equ 76D0h      ; start of video RAM
video_stride     equ 78         ; bytes per row (= chars per row)
game_area_tl     equ video_memory + 3*video_stride + 8    ; 77C2h -- top-left of 64x25 text window

rom_getc         equ 0F803h     ; GETC     -- blocking keyboard read; A = key code
rom_putc         equ 0F809h     ; PUTC     -- print char; C = character
rom_hexb         equ 0F815h     ; HEXB     -- print A as two hex digits
rom_puts         equ 0F818h     ; PUTS     -- print NUL-terminated string at HL
rom_scan_kbd     equ 0F81Bh     ; SCAN_KBD -- raw matrix scan; A = FFh/FEh/code
rom_video        equ 0F82Dh     ; VIDEO    -- reinitialize CRT controller
rom_getlim       equ 0F830h     ; GETLIM   -- HL = memory limit
rom_prompt_loop  equ 0F86Ch     ; PROMPT   -- warm restart to monitor prompt
rom_video_tail   equ 0FAE0h     ; tail of entry_video: status poll + DMA setup
rom_sound        equ 0FD27h     ; SOUND    -- beep (B=duration, C=half-period)

loc_0000:
        jmp  main
; ---- Game-local trampolines into the monitor ROM. These 3-byte jmps
; give the game a compact "vector table" at the low end of its address
; space so most call sites can fit a 2-byte `rst n` trampoline pattern
; during hand-assembly. Each slot is reachable via CALL <offset>.
monitor_scan_kbd:                       ; offset=0003h
        jmp  rom_scan_kbd
monitor_putc:                           ; offset=0006h
        jmp  rom_putc
monitor_puts:                           ; offset=0009h
        jmp  rom_puts
monitor_hexb:                           ; offset=000Ch
        jmp  rom_hexb
monitor_getlim:                         ; offset=000Fh
        jmp  rom_getlim
monitor_prompt:                         ; offset=0012h
        jmp  rom_prompt_loop
monitor_beep:                           ; offset=0015h
        jmp  rom_sound
; ---- Game state variables at 0018h..003Ch ----
; Bytes 0018h..003Ah are zeroed on every new game by the init loop at
; loc_0247; the "initial" byte values shown here are effectively don't-care
; since they get overwritten before first use. 003Bh/003Ch persist across
; games (beep frequency ramp and РУС/ЛАТ case mask).
;
; Screen coordinates follow the mapping in xy_to_vaddr:
;   video_addr = 77C2h + (24 - y) * 78 + x
; y = 1 is bottom row of the game field, y = 24 is top; x = 1 is leftmost.

player_x:               ; offset 0018h -- player turret column (1..57)
        db   56h
saboteur_x:             ; offset 0019h -- flying diversant column (1..3Ch)
        db   04h
climber_x:              ; offset 001Ah -- climbing diversant column (0 = none)
        db   59h
torpedo_x:              ; offset 001Bh -- player torpedo column
        db   04h
ufo_x:                  ; offset 001Ch -- martian UFO column
        db   5Ch
player_y:               ; offset 001Dh -- player row (2..23)
        db   04h
saboteur_y:             ; offset 001Eh -- flying diversant row
        db   61h
climber_y:              ; offset 001Fh -- climbing diversant row
        db   04h
torpedo_y:              ; offset 0020h -- player torpedo row
        db   69h
ufo_y:                  ; offset 0021h -- martian UFO row
        db   04h
saboteur_active:        ; offset 0022h -- 1 = flying diversant on screen
        db   8Bh
saboteur_timer:         ; offset 0023h -- frames until next diversant step
        db   04h
kbd_debounce:           ; offset 0024h -- ignore repeat input while > 0
        db   8Eh
climber_timer:          ; offset 0025h -- frames until climber moves up a row
        db   04h
torpedo_timer:          ; offset 0026h -- frames until torpedo moves one cell
        db   9Ah
ufo_timer:              ; offset 0027h -- frames until UFO animation tick
        db   04h
saboteur_dir:           ; offset 0028h -- 1 = moving left, 2 = moving right
        db   9Eh
climber_active:         ; offset 0029h -- 1 = landed diversant climbing up
        db   04h
unused_002A:            ; offset 002Ah -- zeroed by init, never read
        db   0A7h
score_lo:               ; offset 002Bh -- BCD, low two digits of score
        db   04h
score_hi:               ; offset 002Ch -- BCD, high two digits of score
        db   0BFh
diversants_landed:      ; offset 002Dh -- BCD; game over at 16 (10h) landed
        db   04h
saved_climber_x:        ; offset 002Eh -- snapshot of climber_x for redraw
        db   0EDh
score_positive:         ; offset 002Fh -- 1 = positive score, 0 = "debt"
        db   04h
rng_state:              ; offset 0030h -- PRNG seed (see rng_next)
        db   01h
unused_0031:            ; offset 0031h -- unused
        db   05h
torpedo_active:         ; offset 0032h -- 1 = torpedo in flight
        db   33h
autotarget_on:          ; offset 0033h -- 1 = auto-targeting bonus awarded
        db   01h
hit_counter:            ; offset 0034h -- raw kill count; autotarget at 32h
        db   3Fh
score_delta_lo:         ; offset 0035h -- BCD bonus added by score_add
        db   05h
score_delta_hi:         ; offset 0036h
        db   45h
score_penalty_lo:       ; offset 0037h -- BCD penalty subtracted by score_sub
        db   05h
score_penalty_hi:       ; offset 0038h
        db   49h
ufo_active:             ; offset 0039h -- 1 = UFO on screen
        db   05h
ufo_anim_phase:         ; offset 003Ah -- 0..6, selects UFO glyph pattern
        db   4Fh
shoot_beep_freq:        ; offset 003Bh -- frequency ramp for shoot beep
        db   05h
letter_case_mask:       ; offset 003Ch -- 20h/00h, xor'd with letter key codes
        db   20h
; Reinitialize the К580ВГ75 CRT controller to 78x30 text mode and
; hand off to the monitor's tail to finish DMA/buffer setup. The
; Reset command (00h on C001h) takes four parameter bytes on C000h,
; then Start Display (27h on C001h) re-enables output.
;
; vs the monitor's stock 93h SCN4, this one swaps the cursor to a
; non-blinking underline (so there's no 500 ms blink during play).
video_init:                             ; offset 003Dh
        push h
        lxi  h, 0C001h
        mvi  m, 00h              ; command: RESET (4 SCN params follow)
        dcx  h
        mvi  m, 4Dh              ; SCN1: 78 chars/row (H = 77)
        mvi  m, 1Dh              ; SCN2: 30 rows/frame (V = 29, VR = 0)
        mvi  m, 99h              ; SCN3: 10 lines/row, underline at line 9
        mvi  m, 0F3h             ; SCN4: L=1 non-offset, F=1 non-transparent,
                                 ;       C=11 non-blinking underline cursor,
                                 ;       Z=3 horizontal retrace = 8 char clocks
        inx  h
        mvi  m, 27h              ; command: START DISPLAY (begin DMA fetch)
        jmp  rom_video_tail      ; monitor tail: program DMA + buffer pointers
; Redraw the score line: "OCHKI : HHLL" where HHLL is the 2-byte BCD
; score (score_hi, score_lo). Cursor is parked at row 24, col 34 by
; the embedded ESC-Y sequence in str_ochki.
draw_score:                             ; offset 0052h
        lxi  h, str_ochki
        call monitor_puts
        lhld score_lo                   ; L = score_lo, H = score_hi
        mov  a, h
        call monitor_hexb
        mov  a, l
        call monitor_hexb
        ret
str_ochki:                              ; offset 0064h
        db   1Bh, 'Y', 38h, 42h       ; ESC Y row=24 col=34
        db   'o~ki : ', 00h           ; "OCHKI :" -- points : 
; Draw the "DIVERSANTY : " label at row 24, col 10. diversants_landed
; is printed as a two-hex-digit BCD number separately after this call.
draw_diversants_label:                  ; offset 0070h
        lxi  h, str_diversanty
        call monitor_puts
        ret
str_diversanty:                         ; offset 0077h
        db   1Bh, 'Y', 38h, 2Ah       ; ESC Y row=24 col=10
        db   'diwersanty : ', 00h     ; "DIVERSANTY :" -- saboteurs : 
; Show the "ONI VAS UNICHTOZHILI / UPLATITE 15 KOPEEK" game-over
; message at row 16, col 12. Shown when diversants_landed reaches 16.
show_game_over:                         ; offset 0089h
        lxi  h, str_game_over
        call monitor_puts
        ret
str_game_over:                          ; offset 0090h
        db   1Bh, 'Y', 30h, 2Ch       ; ESC Y row=16 col=12
        db   'oni was uni~tovili !!!', 0Dh, 0Ah    ; "ONI VAS UNICHTOZHILI !!!" CR LF -- they destroyed you !!!
        db   'uplatite 15 kopeek', 00h             ; "UPLATITE 15 KOPEEK" -- pay 15 kopecks
; Map game coordinates (B=x, C=y) to a video RAM address in HL.
;   hl = 77C2h + (18h - y) * 4Eh + x
; 77C2h is the top-left of the monitor's 64x25 text window and 4Eh=78
; is the row stride. The (18h - y) inversion makes y=1 the bottom of
; the play field and y=24 the top.
xy_to_vaddr:                            ; offset 00BFh
        push b
        push d
        push psw
        lxi  h, game_area_tl            ; 77C2h -- top-left of 64x25 text window
        mvi  a, 18h                     ; flip y: a = 24 - y
        sub  c
        mov  c, a
        inr  c                          ; pre-increment for dcr/jz loop
        lxi  d, video_stride            ; 004Eh -- bytes per row
loc_00CD:
        dcr  c
        jz   loc_00D5
        dad  d                          ; hl += 78 per row
        jmp  loc_00CD
loc_00D5:
        mov  e, b                       ; d=0 from lxi above; de = x
        dad  d                          ; hl += x
        pop  psw
        pop  d
        pop  b
        ret
; Draw the 3-cell player turret glyph at HL: "* ^ *" (asterisk, arrow
; up, asterisk). HL must be xy_to_vaddr(player_x, player_y).
draw_turret:                            ; offset 00DBh
        mvi  m, 2Ah                     ; '*'
        inx  h
        mvi  m, 0Bh                     ; arrow up
        inx  h
        mvi  m, 2Ah                     ; '*'
        ret
; Draw the 3-cell flying diversant glyph at HL (▞▞▖).
draw_saboteur:                          ; offset 00E4h
        mvi  m, 12h
        inx  h
        mvi  m, 12h
        inx  h
        mvi  m, 10h
        ret
; Erase 6 consecutive screen cells starting at HL-1. Used to clear a
; 3-cell sprite plus one-cell margins on either side after movement.
clear_6_cells:                          ; offset 00EDh
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
; Return a pseudo-random byte in B in the range 0Fh..17h, i.e. a value
; suitable as a screen row index. Algorithm: step B forward (rng_state)
; times through a 0Eh..17h cycle, then save the result + 2Fh as the
; next seed. Used to place flying diversants at random rows.
rng_next:                               ; offset 0100h
        push psw
        push b
        lda  rng_state
        mov  c, a                       ; c = seed steps
        mvi  b, 0Eh
loc_0108:
        mov  a, b
        cpi  18h                        ; wrap 18h back to 0Fh
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
        mov  b, a                       ; result in B
        adi  2Fh                        ; perturb seed for next call
        sta  rng_state
        pop  psw
        ret
; BCD-add the 2-byte value at score_delta_lo/score_delta_hi to the
; 2-byte score at score_lo/score_hi. If the final add carries, set
; score_positive = 1 (score overflowed back to positive territory).
score_add:                              ; offset 0121h
        push h
        push d
        push b
        push psw
        mvi  c, 02h                     ; 2 bytes
        lxi  h, score_lo
        lxi  d, score_delta_lo
        stc
        cmc                             ; CY = 0
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
        sta  score_positive
loc_014F:
        pop  psw
        pop  b
        pop  d
        pop  h
        ret
; BCD-subtract the 2-byte value at score_penalty_lo/score_penalty_hi
; from score_lo/score_hi. If the final subtract produces no borrow
; (i.e. score went negative), clear score_positive = 0 -- the game
; shows "VY ZADOLZHALI GOSUDARSTVU" (you owe the state) in that case.
score_sub:                              ; offset 0154h
        push h
        push d
        push b
        push psw
        lxi  d, score_lo
        lxi  h, score_penalty_lo
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
        sta  score_positive
loc_0184:
        pop  psw
        pop  b
        pop  d
        pop  h
        ret
; Copy bytes from [DE] to [HL] until a NUL is read from [DE]. NUL is
; NOT written to the destination.
str_copy_until_nul:                     ; offset 0189h
        ldax d
        ora  a
        rz
        mov  m, a
        inx  d
        inx  h
        jmp  str_copy_until_nul
        db   77h                        ; dead byte (fell through from rz)
; Rising chirp: call monitor_beep with (B=09..13h, C=19..09h). Used
; as a positive feedback cue when a diversant is destroyed.
beep_sweep_up:                          ; offset 0193h
        push psw
        push b
        push d
        lxi  b, 0919h                   ; B=09h (duration), C=19h (period)
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
; Descending click: a short sweep used as the key-press feedback
; inside get_key (called right after scan_kbd detects a key).
beep_sweep_down:                        ; offset 01ADh
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
; Click per torpedo cell moved, ramping pitch upward. shoot_beep_freq
; persists across calls so a long torpedo flight is a rising sweep.
beep_shoot:                             ; offset 01C6h
        push psw
        push b
        lda  shoot_beep_freq
        mov  b, a
        mvi  c, 08h
        inr  a
        sta  shoot_beep_freq
        call monitor_beep
        pop  b
        pop  psw
        ret
; Fixed low-pitched tone played when a diversant is hit.
beep_kill:                              ; offset 01D8h
        push psw
        push b
        mvi  b, 0B0h
        mvi  c, 08h
        call monitor_beep
        pop  b
        pop  psw
        ret
; Blocking keyboard read. Plays a click on every press, Ctrl-C bails
; out to the monitor prompt, РУС/ЛАТ (0FEh) flips letter_case_mask,
; and for any letter key (>= 40h) the case mask is XOR'd in so the
; caller sees a consistent lowercase code regardless of case.
get_key:                                ; offset 01E4h
        push b
        lda  letter_case_mask
        mov  c, a
loc_01E9:
        call monitor_scan_kbd
        cpi  0FFh                       ; no key yet -> keep polling
        jz   loc_01E9
        call beep_sweep_down            ; key-press click
        cpi  03h                        ; Ctrl-C: back to monitor
        jz   monitor_prompt
        cpi  0FEh                       ; РУС/ЛАТ: toggle case mask
        jz   get_key_toggle_case
        cpi  40h
        jc   loc_0204
        xra  c                          ; letter -> apply case mask
loc_0204:
        mov  b, a
loc_0205:
        call monitor_scan_kbd           ; wait for key release
        cpi  0FFh
        jnz  loc_0205
        mov  a, b
        pop  b
        ret
get_key_toggle_case:                    ; offset 0210h
        lda  letter_case_mask
        xri  20h
        sta  letter_case_mask
        mov  c, a
loc_0219:
        call monitor_scan_kbd           ; wait for РУС/ЛАТ release
        cpi  0FFh
        jnz  loc_0219
        jmp  loc_01E9
game_start:
        mvi  c, 1Fh
        call monitor_putc
        call video_init
        call monitor_getlim
        sphl
        lxi  h, video_memory + 2*video_stride + 38    ; 7792h -- row 2, col 38 (top banner slot)
        mvi  m, 4Dh             ; 'M'
        inx  h
        mvi  m, 58h             ; 'X'
        inx  h
        mvi  m, 2Dh             ; '-'
        inx  h
        mvi  m, 31h             ; '1'
        inx  h
        mvi  m, 32h             ; '2'    -> draws "MX-12" logo above the play field
        lxi  h, 0017h
        lxi  d, ufo_anim_phase
loc_0247:
        inx  h
        mvi  m, 00h
        mov  a, h
        cmp  d
        jnz  loc_0247
        mov  a, l
        cmp  e
        jnz  loc_0247
; Draw the ground row: 12 repeats of "███  " (three full blocks 7Fh +
; two spaces 20h) = 60 cells wide on screen row 26, col 9 onwards.
        lxi  h, video_memory + 26*video_stride + 9    ; 7EC5h -- row 26, col 9 (ground line)
        mvi  b, 0Ch              ; 12 pattern repeats
loc_0259:
        mvi  c, 03h              ; 3 solid cells
        mvi  d, 02h              ; 2 gap cells
loc_025D:
        mvi  a, 7Fh              ; '█' full block
        mov  m, a
        inx  h
        dcr  c
        jnz  loc_025D
loc_0265:
        mvi  a, 20h              ; ' ' space
        mov  m, a
        inx  h
        dcr  d
        jnz  loc_0265
        dcr  b
        jnz  loc_0259
        call draw_score
        mvi  a, 1Eh
        sta  player_x
        mov  b, a
        mvi  a, 02h
        sta  player_y
        mov  c, a
        call xy_to_vaddr
        call draw_turret
        mvi  a, 02h
        sta  saboteur_dir
        mvi  a, 01h
        sta  saboteur_x
        mov  b, a
        mvi  a, 18h
        sta  saboteur_y
        mov  c, a
        call xy_to_vaddr
        call draw_saboteur
        mvi  a, 01h
        sta  saboteur_active
        sta  saboteur_timer
        sta  ufo_timer
        sta  kbd_debounce
        sta  climber_timer
        sta  torpedo_timer
        sta  score_positive
        call get_key
game_loop:
        lda  saboteur_active
        ora  a
        jz   loc_032A
        lda  saboteur_timer
        dcr  a
        sta  saboteur_timer
        ora  a
        jnz  loc_039B
saboteur_timer_reload:                  ; offset 02C9h -- SMC: difficulty patches +1
        mvi  a, 0Ah                     ; default (medium): 0Ah; easy=0Fh; hard unchanged
        sta  saboteur_timer
        lda  saboteur_dir
        cpi  01h
        jz   loc_02F2
        lda  saboteur_x
        mov  b, a
        lda  saboteur_y
        mov  c, a
        call xy_to_vaddr
        call clear_6_cells
        inr  b
        mov  a, b
        sta  saboteur_x
        call xy_to_vaddr
        call draw_saboteur
        jmp  loc_030B
loc_02F2:
        lda  saboteur_x
        mov  b, a
        lda  saboteur_y
        mov  c, a
        call xy_to_vaddr
        call clear_6_cells
        mov  a, b
        dcr  a
        sta  saboteur_x
        call xy_to_vaddr
        call draw_saboteur
loc_030B:
        lda  saboteur_x
        cpi  3Dh
        jnc  loc_031B
        cpi  02h
        jc   loc_031B
        jmp  loc_0367
loc_031B:
        lda  saboteur_x
        dcr  a
        mov  b, a
        lda  saboteur_y
        mov  c, a
        call xy_to_vaddr
        call clear_6_cells
loc_032A:
        call rng_next
        mvi  a, 02h
        sta  saboteur_dir
        mov  a, b
        cpi  13h
        jc   loc_033D
        mvi  a, 01h
        sta  saboteur_dir
loc_033D:
        call rng_next
        mov  a, b
        sta  saboteur_y
        mvi  a, 01h
        sta  saboteur_x
        sta  saboteur_active
        call rng_next
        mov  a, b
        cpi  18h
        jc   loc_035A
        mvi  a, 07h
        sta  saboteur_y
loc_035A:
        lda  saboteur_dir
        cpi  01h
        jnz  loc_0367
        mvi  a, 3Ch
        sta  saboteur_x
loc_0367:
        lda  climber_active
        cpi  01h
        jz   loc_039B
        call rng_next
        mov  a, b
saboteur_spawn_rate:                    ; offset 0373h -- SMC: difficulty patches +1
        cpi  14h                        ; higher value = less frequent climb attempts
        jc   loc_042E                   ;   medium=14h, easy=16h, hard=12h
        lda  saboteur_x
        mov  b, a
        inr  b
        mvi  c, 01h
        call xy_to_vaddr
        mov  a, m
        cpi  7Fh                         ; '█' (full block) -- ground tile detected
        jnz  loc_042E
        mvi  a, 01h
        sta  climber_active
        lda  saboteur_x
        inr  a
        sta  climber_x
        lda  saboteur_y
        dcr  a
        sta  climber_y
loc_039B:
        lda  climber_active
        cpi  01h
        jnz  loc_042E
        lda  climber_timer
        dcr  a
        sta  climber_timer
        ora  a
        jnz  loc_042E
climber_timer_reload:                   ; offset 03AEh -- SMC: difficulty patches +1
        mvi  a, 12h                     ; frames between climber row-steps
        sta  climber_timer              ;   medium=12h, easy=1Ch, hard=0Fh
        lda  player_y
        mov  b, a
        lda  climber_y
        dcr  a
        sta  climber_y
        cmp  b
        jnz  loc_03FC
        lda  player_x
        mov  b, a
        lda  climber_x
        cmp  b
        jc   loc_03FC
        inr  b
        inr  b
        inr  b
        cmp  b
        jnc  loc_03FC
        xra  a
        sta  climber_active
        lxi  h, 0005h
        shld score_delta_lo
        call score_add
        lda  climber_x
        mov  b, a
        lda  climber_y
        inr  a
        mov  c, a
        call xy_to_vaddr
        mvi  m, 00h
        call beep_sweep_up
        call draw_score
        xra  a
        sta  climber_x
        jmp  loc_042E
loc_03FC:
        lda  climber_x
        mov  b, a
        lda  climber_y
        inr  a
        mov  c, a
        call xy_to_vaddr
        mvi  m, 00h
        dcr  c
        call xy_to_vaddr
        mvi  m, 09h
        mov  a, c
        cpi  01h
        jnz  loc_042E
        lda  diversants_landed
        inr  a
        daa
        sta  diversants_landed
        call draw_diversants_label
        lda  diversants_landed
        call print_hex_or_rank
        xra  a
        sta  climber_active
        jmp  loc_0431
loc_042E:
        jmp  handle_input
loc_0431:
        lda  diversants_landed
        cpi  10h                         ; 16 landed diversants -> game over
        jnz  loc_0447
        call show_game_over
loc_043C:
        call get_key
        cpi  0Dh                         ; CR (Enter) -- acknowledge game over
        jz   hiscore_try
        jmp  loc_043C
loc_0447:
        lda  climber_x
        sta  saved_climber_x
        call beep_kill
        mov  b, a
        lxi  h, 0048h
        shld score_penalty_lo
        call score_sub
        call draw_score
loc_045D:
        inr  b
        mvi  c, 01h
        call xy_to_vaddr
        mvi  a, 7Fh                      ; '█' (full block) -- ground tile
        cmp  m
        jnz  loc_046E
        mvi  m, 00h
        jmp  loc_045D
loc_046E:
        lda  saved_climber_x
        mov  b, a
loc_0472:
        xra  a
        sta  climber_x
        dcr  b
        mvi  c, 01h
        call xy_to_vaddr
        mvi  a, 7Fh                      ; '█' (full block) -- ground tile
        cmp  m
        jnz  handle_input
        mvi  m, 00h
        jmp  loc_0472
handle_input:
        call monitor_scan_kbd
        cpi  08h                         ; ← cursor left / BS
        jz   move_left
        cpi  18h                         ; → cursor right
        jz   move_right
        cpi  19h                         ; ↑ cursor up
        jz   move_up
        cpi  1Ah                         ; ↓ cursor down
        jz   move_down
        cpi  20h                         ; ' ' SPACE -- fire
        jz   fire_torpedo
        cpi  0Ch                         ; 0Ch (home/FF) -- also fires
        jz   fire_torpedo
        cpi  03h                         ; Ctrl-C -- exit to monitor
        jz   monitor_prompt
        cpi  1Fh                         ; clear-screen key -- hard restart
        jz   loc_0000
        cpi  1Bh                         ; 1Bh (АР2/ESC) -- pause
        jz   pause_loop
        jmp  torpedo_tick
pause_loop:
        call get_key
        cpi  1Bh                         ; 1Bh (АР2/ESC) -- keep pausing
        jz   pause_loop
        jmp  handle_input
move_left:
        lda  kbd_debounce
        dcr  a
        sta  kbd_debounce
        ora  a
        jnz  torpedo_tick
move_left_debounce:                     ; offset 04D0h -- SMC: difficulty patches +1
        mvi  a, 04h                     ; medium/easy=04h, hard=03h
        sta  kbd_debounce
        lda  player_x
        cpi  01h
        jc   torpedo_tick
        dcr  a
        ei
        mov  b, a
        sta  player_x
        lda  player_y
        mov  c, a
        di
        call xy_to_vaddr
        call clear_6_cells
        call xy_to_vaddr
        call draw_turret
        jmp  loc_058E
move_right:
        lda  kbd_debounce
        dcr  a
        sta  kbd_debounce
        ora  a
        jnz  torpedo_tick
move_right_debounce:                    ; offset 0502h -- SMC: difficulty patches +1
        mvi  a, 04h                     ; medium/easy=04h, hard=03h
        sta  kbd_debounce
        lda  player_x
        cpi  3Ah
        jnc  torpedo_tick
        inr  a
        ei
        mov  b, a
        sta  player_x
        lda  player_y
        mov  c, a
        di
        call xy_to_vaddr
        call clear_6_cells
        call xy_to_vaddr
        call draw_turret
        jmp  loc_058E
move_up:
        lda  kbd_debounce
        dcr  a
        sta  kbd_debounce
        ora  a
        jnz  torpedo_tick
move_up_debounce:                       ; offset 0534h -- SMC: difficulty patches +1
        mvi  a, 06h                     ; medium=06h, easy=05h, hard=04h
        sta  kbd_debounce
        lda  player_y
        cpi  17h
        jnc  torpedo_tick
        inr  a
        sta  player_y
        ei
        dcr  a
        mov  c, a
        lda  player_x
        mov  b, a
        di
        call xy_to_vaddr
        call clear_6_cells
        inr  c
        call xy_to_vaddr
        call draw_turret
        jmp  loc_058E
move_down:
        lda  kbd_debounce
        dcr  a
        sta  kbd_debounce
        ora  a
        jnz  torpedo_tick
move_down_debounce:                     ; offset 0568h -- SMC: difficulty patches +1
        mvi  a, 06h                     ; medium=06h, easy=05h, hard=04h
        sta  kbd_debounce
        lda  player_y
        cpi  03h
        jc   torpedo_tick
        dcr  a
        sta  player_y
        ei
        mov  c, a
        inr  c
        lda  player_x
        mov  b, a
        di
        call xy_to_vaddr
        call clear_6_cells
        dcr  c
        call xy_to_vaddr
        call draw_turret
loc_058E:
        lda  autotarget_on
        ora  a
        jz   torpedo_tick
        lda  torpedo_active
        ora  a
        jnz  torpedo_tick
        lda  climber_x
        mov  b, a
        lda  player_x
        inr  a
        cmp  b
        jnz  torpedo_tick
        lda  climber_y
        mov  b, a
        lda  player_y
        cmp  b
        jnc  torpedo_tick
fire_torpedo:
        lda  torpedo_active
        cpi  01h
        jz   loc_05E5
        lxi  h, 0005h
        shld score_penalty_lo
        call score_sub
        call draw_score
        mvi  a, 01h
        sta  torpedo_active
        lda  player_x
        inr  a
        sta  torpedo_x
        lda  player_y
        sta  torpedo_y
        mvi  a, 0Ah
        sta  shoot_beep_freq
torpedo_tick:
        lda  torpedo_active
        ora  a
        jz   ufo_tick
loc_05E5:
        lda  torpedo_timer
        dcr  a
        sta  torpedo_timer
        ora  a
        jnz  ufo_tick
torpedo_timer_reload:                   ; offset 05F0h -- SMC: difficulty patches +1
        mvi  a, 04h                     ; medium/hard=04h, easy=03h
        sta  torpedo_timer
        call beep_shoot
        lda  torpedo_x
        mov  b, a
        lda  torpedo_y
        mov  c, a
        call xy_to_vaddr
        mvi  m, 20h
        inr  c
        call xy_to_vaddr
        mvi  m, 0Bh
        mov  a, c
        sta  torpedo_y
        lda  saboteur_y
        cmp  c
        jnz  loc_0659
        lda  saboteur_x
        inr  b
        cmp  b
        jnc  loc_0659
        adi  04h
        cmp  b
        jc   loc_0659
        xra  a
        sta  torpedo_active
        sta  saboteur_active
        inr  a
        sta  ufo_active
        mvi  a, 08h
        sta  ufo_anim_phase
        lda  saboteur_x
        sta  ufo_x
        lhld frame_delay + 1
        dcx  h
        dcx  h
        dcx  h
        dcx  h
        shld frame_delay + 1
        lda  saboteur_y
        sta  ufo_y
        lxi  h, climber_timer
        shld score_delta_lo
        call score_add
        call draw_score
        jmp  loc_06D8
loc_0659:
        lda  torpedo_x
        mov  b, a
        lda  climber_x
        cmp  b
        jnz  loc_06BB
        lda  torpedo_y
        mov  a, c
        call xy_to_vaddr
        lxi  d, 0FFB2h          ; two's-complement of 004Eh: hl -= 78 (one row up)
        dad  d
        mvi  a, 09h              ; 09h = '✿' flower glyph (climber body)
        cmp  m
        jz   loc_067A
        dad  d                   ; hl -= 78 again: two rows above
        cmp  m
        jnz  loc_06BB
loc_067A:
        call xy_to_vaddr
        mvi  m, 00h
        lda  climber_x
        mov  b, a
        lda  climber_y
        mov  c, a
        call xy_to_vaddr
        mvi  m, 2Ah
        call beep_sweep_up
        mvi  m, 00h
        xra  a
        sta  torpedo_active
        sta  climber_active
        sta  climber_x
        sta  climber_y
        lxi  h, hit_counter
        inr  m
        lxi  h, monitor_prompt
        shld score_delta_lo
        call score_add
        lda  torpedo_y
        mov  l, a
        shld score_delta_lo
        call score_add
        call draw_score
        jmp  ufo_tick
loc_06BB:
        lda  torpedo_y
        cpi  18h
        jnz  ufo_tick
        mov  c, a
        lda  torpedo_x
        mov  b, a
        call xy_to_vaddr
        mvi  m, 00h
        xra  a
        sta  torpedo_active
ufo_tick:
        lda  ufo_active
        ora  a
        jz   frame_delay
loc_06D8:
        lda  ufo_timer
        dcr  a
        sta  ufo_timer
        ora  a
        jnz  frame_delay
        mvi  a, 0Eh
        sta  ufo_timer
        lda  ufo_anim_phase
        dcr  a
        ei
        di
        sta  ufo_anim_phase
        ora  a
        ei
        di
        jnz  loc_070F
        ei
        lda  ufo_x
        mov  b, a
        dcr  b
        lda  ufo_y
        mov  c, a
        di
        call xy_to_vaddr
        call clear_6_cells
        xra  a
        sta  ufo_active
        jmp  frame_delay
loc_070F:
        lda  ufo_x
        mov  b, a
        ei
        lda  ufo_y
        mov  c, a
        call xy_to_vaddr
        call clear_6_cells
        call xy_to_vaddr
        di
        lda  ufo_anim_phase
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
        jmp  frame_delay
loc_074E:
        mvi  m, 02h
        inx  h
        mvi  m, 02h
        inx  h
        mvi  m, 00h
        jmp  frame_delay
loc_0759:
        mvi  m, 10h
        inx  h
        mvi  m, 00h
        inx  h
        mvi  m, 10h
        jmp  frame_delay
loc_0764:
        mvi  m, 2Bh
        inx  h
        mvi  m, 2Bh
        inx  h
        mvi  m, 2Bh
        jmp  frame_delay
loc_076F:
        mvi  m, 2Dh
        inx  h
        mvi  m, 2Dh
        inx  h
        mvi  m, 2Dh
        jmp  frame_delay
loc_077A:
        mvi  m, 09h
        inx  h
        mvi  m, 09h
        inx  h
        mvi  m, 09h
        jmp  frame_delay
loc_0785:
        mvi  m, 00h
        inx  h
        mvi  m, 2Bh
        inx  h
        mvi  m, 00h
; ---- Frame-delay loop with a self-modifying count ----
; The `lxi h, 0200h` below is the SMC site: the 16-bit immediate at
; 078E/078Fh is the current loop count. Reads/writes of the count
; are done via `lhld/shld frame_delay + 1` elsewhere -- they are
; literally overwriting the immediate bytes in this instruction.
;   difficulty_easy   -> 0250h (slow, long delay)
;   difficulty_medium -> 0200h
;   difficulty_hard   -> 0160h (fast, short delay)
;   autotarget reward -> 01A0h (faster than the default)
;   auto-clamp below 0Ah -> 0050h (keeps the game playable)
frame_delay:                            ; offset 078Dh
        lxi  h, 0200h                   ; self-modified immediate at 078E/078Fh
loc_0790:
        dcx  h
        mov  a, l
        ora  h
        jnz  loc_0790
        lhld frame_delay + 1
        mov  a, h
        ora  a
        jnz  check_autotarget_award
        mov  a, l
        cpi  0Ah
        jnc  check_autotarget_award
        lxi  h, 0050h
        shld frame_delay + 1
check_autotarget_award:
        lda  autotarget_on
        ora  a
        jnz  game_loop
        lda  hit_counter
        cpi  32h
        jnz  game_loop
        lxi  h, 01A0h
        shld frame_delay + 1
        mvi  a, 0Fh
loc_07C1:
        call beep_sweep_up
        dcr  a
        ora  a
        jnz  loc_07C1
        lxi  h, str_autotarget_awarded
        call monitor_puts
        lxi  d, str_autotarget_awarded_2              ; 0815h -- second NUL-term string
        lxi  h, video_memory + 2*video_stride + 10    ; 7776h -- row 2, col 10 (second banner line)
        call str_copy_until_nul
        call get_key
        lxi  h, str_cursor_home_row
        call monitor_puts
        mvi  a, 1Fh
        mvi  c, 00h
loc_07E5:
        call monitor_putc
        dcr  a
        jnz  loc_07E5
        lxi  h, autotarget_on
        inr  m
        jmp  game_loop
; Two back-to-back NUL-terminated strings. monitor_puts prints just
; the first (up to and including its ESC-Y cursor-positioning header);
; the caller then uses str_copy_until_nul on str_autotarget_awarded_2
; to poke the second line straight into video RAM at row 2, col 10.
str_autotarget_awarded:                 ; offset 07F3h
        db   1Bh, 'Y', 20h, 31h       ; ESC Y row=0 col=17
        db   'wy premirowany awtonawod~ikom', 00h     ; "ВЫ ПРЕМИРОВАНЫ АВТОНАВОДЧИКОМ"
str_autotarget_awarded_2:               ; offset 0815h -- second line, no ESC-Y
        db   'sistema awtonawodki', 00h                ; "СИСТЕМА АВТОНАВОДКИ"
str_cursor_home_row:                    ; offset 0829h
        db   1Bh, 'Y', 20h, 31h       ; ESC Y row=0 col=17
        db   '', 00h                  ; "" -- (cursor only)
hiscore_try:
        lda  score_positive
        ora  a
        jz   loc_08B8
        xra  a
        sta  hiscore_idx
loc_0839:
        call hiscore_entry_addr
        lxi  d, 000Eh
        dad  d
        mov  d, m
        inx  h
        mov  e, m
        lhld score_lo
        mov  a, h
        cmp  d
        jc   loc_08A9
        jnz  loc_0853
        mov  a, e
        cmp  l
        jnc  loc_08A9
loc_0853:
        call hiscore_entry_addr
        shld hiscore_slot_ptr
        call hiscore_shift_down
        lhld hiscore_slot_ptr
        call hiscore_read_name
        lhld hiscore_slot_ptr
        lxi  d, 000Eh
        dad  d
        lxi  d, score_hi
        ldax d
        mov  m, a
        dcx  d
        inx  h
        ldax d
        mov  m, a
loc_0872:
        call hiscore_show_table
        lda  hiscore_idx
        cpi  14h
        jz   loc_08C0
        cpi  15h
        jz   loc_08D4
        lda  hiscore_idx
        mov  b, a
        lxi  h, video_memory + 3*video_stride + 60    ; 77F6h -- row 3, col 60 (rightmost of game area)
        lxi  d, video_stride     ; 004Eh -- bytes per row
loc_088C:
        mov  a, b
        ora  a
        jz   loc_0896
        dad  d                   ; step down one row per hiscore rank
        dcr  b
        jmp  loc_088C
loc_0896:
        mvi  m, 80h              ; inverse of 00h (blank) -- marker on rank row
        lxi  d, 0FFDBh          ; two's-complement of 0025h: hl -= 37
        dad  d
        mvi  m, 82h              ; inverse of 02h (▝ top-right quadrant) -- arrow
loc_089E:
        lxi  h, 7605h            ; monitor var pressed_key (7605h)
        mvi  m, 00h              ; clear "key held" state before reading keys
        call get_key
        jmp  show_menu
loc_08A9:
        lda  hiscore_idx
        inr  a
        sta  hiscore_idx
        cpi  14h
        jnz  loc_0839
        jmp  loc_0872
loc_08B8:
        mvi  a, 15h
        sta  hiscore_idx
        jmp  loc_0872
loc_08C0:
        lxi  h, str_your_result
        call monitor_puts
        lhld score_lo
        mov  a, h
        call monitor_hexb
        mov  a, l
        call monitor_hexb
        jmp  loc_089E
loc_08D4:
        lxi  h, str_you_owe
        call monitor_puts
        lhld score_lo
        mov  a, h
        cma
        call monitor_hexb
        mov  a, l
        cma
        call monitor_hexb
        jmp  loc_089E
str_your_result:                        ; offset 08EAh
        db   1Bh, 'Y', 37h, 36h       ; ESC Y row=23 col=22
        db   'wa{ rezulxtat : ', 00h                  ; "VASH REZULSOFTTAT :" -- your result : 
str_you_owe:                            ; offset 08FFh
        db   1Bh, 'Y', 37h, 31h       ; ESC Y row=23 col=17
        db   'wy zadolvali gosudarstwu : ', 00h       ; "VY ZADOLZHALI GOSUDARSTVU :" -- you owe the state : 
hiscore_shift_down:
        push b
        push d
        push h
        lhld hiscore_slot_ptr
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
str_enter_name:                           ; offset 0945h
        db   1Bh, 'Y', 37h, 36h           ; ESC Y row=23 col=22
        db   'wwedite wa{e imq : ', 00h   ; "VVEDITE VASHE IMYA :" -- enter your name : 
hiscore_read_name:
        push b
        push h
        lxi  h, 7605h            ; monitor var pressed_key (7605h)
        mvi  m, 00h              ; clear "key held" state before reading keys
        call clear_display
        lxi  h, str_enter_name
        call monitor_puts
        pop  h
        xra  a
        mov  b, a
loc_0970:
        call get_key
        mov  m, a
        cpi  0Dh                         ; CR (Enter) -- finished typing name
        jz   loc_09B7
        cpi  08h                         ; BS (←) -- erase previous char
        jz   loc_09A1
        cpi  20h                         ; ' ' -- ignore anything below space
        jc   loc_0970
        mov  c, a
        call monitor_putc
        inx  h
        inr  b
        mov  a, b
        cpi  0Dh                         ; name-length cap (13 chars)
        jc   loc_0970
        push h
        lxi  h, str_bel_erase
        call monitor_puts
        pop  h
        dcx  h
        dcr  b
        jmp  loc_0970
str_bel_erase:                          ; offset 099Ch
        db   07h, 08h, ' ', 08h, 00h    ; BEL, BS, " ", BS -- beep then erase-prev-char
loc_09A1:
        mov  a, b
        ora  a
        jz   loc_0970
        push h
        lxi  h, str_erase_prev
        call monitor_puts
        pop  h
        dcx  h
        dcr  b
        jmp  loc_0970
str_erase_prev:                         ; offset 09B3h
        db   08h, ' ', 08h, 00h    ; BS, " ", BS -- erase-prev-char
loc_09B7:
        mov  a, b
        ora  a
        jz   loc_0970
        pop  b
        ret
hiscore_entry_addr:
        push b
        push d
        lxi  h, hiscore_table
        lxi  d, 0010h
        lda  hiscore_idx
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
; ---- scratch variables for the hiscore screen (uninitialized) ----
hiscore_rank:                           ; offset hiscore_rank -- BCD, rank being printed
        db   0Ch
hiscore_idx:                            ; offset hiscore_idx -- current entry index 0..19
        db   00h
hiscore_slot_ptr:                       ; offset hiscore_slot_ptr (word) -- saved entry addr
        db   0Ch, 00h
hiscore_show_table:
        mvi  b, 00h
        mvi  a, 01h
        sta  hiscore_rank
        call clear_display
        jmp  hiscore_print_rows
clear_display:
        lxi  h, video_memory + 3*video_stride + 6     ; 77C0h -- row 3, col 6 (2 cells before text win)
loc_09EB:
        mvi  m, 00h              ; fill with blanks (renders as empty cell)
        inx  h
        mov  a, h
        cpi  80h                 ; stop when H = 80h (past end of video RAM 7FF4h)
        jnz  loc_09EB
        mvi  c, 0Ch
        call monitor_putc
        ret
put_12_nulls:
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
hiscore_print_rows:
        call put_12_nulls
        lda  hiscore_rank
        call print_hex_or_rank
        mvi  c, 00h
        call monitor_putc
        call monitor_putc
        call monitor_putc
        call hiscore_row_addr
        call hiscore_print_row
        inr  b
        lda  hiscore_rank
        inr  a
        daa
        sta  hiscore_rank
        mov  a, b
        cpi  14h
        jnz  hiscore_print_rows
        ret
print_hex_or_rank:
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
hiscore_row_addr:
        push b
        mov  a, b
        lxi  h, hiscore_table
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
hiscore_print_row:
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
; ---- default hiscore table (20 × 16 bytes) ----
; Each slot: name in KOI-7 N2 (Cyrillic at 60h..7Fh) terminated by
; CR (0Dh) and padded with spaces to byte 13, then two BCD bytes:
; byte 14 = score hi-pair, byte 15 = score lo-pair ("32 24" -> 3224).
; This is the factory default; in-game wins overwrite it in RAM
; (memory-resident only — the game is not tape-saving scores).
hiscore_table:                          ; offset 0AA6h
        db   60h, 72h, 69h, 6Bh, 20h, 6Dh, 68h, 2Dh, 31h, 32h, 0Dh, 00h, 00h, 00h, 32h, 24h  ; "ЮРИК МХ-12"     3224
        db   77h, 69h, 74h, 61h, 6Ch, 69h, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 54h  ; "ВИТАЛИК"        0054
        db   77h, 61h, 64h, 69h, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 19h, 83h  ; "ВАДИК"          1983
        db   4Ah, 49h, 4Dh, 4Dh, 45h, 45h, 20h, 4Dh, 49h, 4Ch, 0Dh, 20h, 20h, 20h, 12h, 34h  ; "JIMMEE MIL"     1234
        db   6Fh, 6Ch, 65h, 6Eh, 78h, 6Bh, 61h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 10h, 94h  ; "ОЛЕНЬКА"        1094
        db   7Bh, 75h, 72h, 69h, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 10h, 46h  ; "ШУРИК"          1046
        db   73h, 65h, 72h, 79h, 6Ah, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 09h, 55h  ; "СЕРЫЙ"          0955
        db   4Dh, 41h, 55h, 53h, 45h, 20h, 4Dh, 49h, 4Bh, 0Dh, 20h, 20h, 20h, 20h, 08h, 85h  ; "MAUSE MIK"      0885
        db   41h, 50h, 50h, 4Ch, 45h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 06h, 47h  ; "APPLE"          0647
        db   61h, 67h, 2Eh, 30h, 30h, 37h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 05h, 36h  ; "АГ.007"         0536
        db   77h, 6Fh, 6Ch, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 04h, 24h  ; "ВОЛК"           0424
        db   6Ch, 65h, 6Fh, 70h, 6Fh, 6Ch, 78h, 64h, 0Dh, 20h, 20h, 20h, 20h, 20h, 03h, 23h  ; "ЛЕОПОЛЬД"       0323
        db   62h, 61h, 7Ah, 69h, 6Ch, 69h, 6Fh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 02h, 57h  ; "БАЗИЛИО"        0257
        db   77h, 65h, 73h, 65h, 6Ch, 78h, 7Eh, 61h, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 02h, 31h  ; "ВЕСЕЛЬЧАК"      0231
        db   70h, 6Fh, 72h, 6Fh, 73h, 65h, 6Eh, 6Fh, 6Bh, 0Dh, 20h, 20h, 20h, 20h, 02h, 03h  ; "ПОРОСЕНОК"      0203
        db   4Bh, 41h, 4Ch, 44h, 52h, 4Fh, 4Fh, 4Eh, 0Dh, 20h, 20h, 20h, 20h, 20h, 01h, 23h  ; "KALDROON"       0123
        db   61h, 6Ah, 62h, 6Fh, 6Ch, 69h, 74h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 76h  ; "АЙБОЛИТ"        0076
        db   6Bh, 61h, 72h, 6Ch, 73h, 6Fh, 6Eh, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 12h  ; "КАРЛСОН"        0012
        db   4Dh, 58h, 2Dh, 31h, 32h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 00h  ; "MX-12"          0000
        db   4Dh, 58h, 2Dh, 31h, 32h, 0Dh, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 20h, 00h, 00h  ; "MX-12"          0000
; Trailing filler to the next 16-byte boundary (disassembles as
; fragmentary code ending in a truncated 3-byte jz, so not reachable).
        db   00h, 00h, 00h, 00h, 0Ch, 0C8h, 0FEh, 2Bh, 0CAh, 0F6h                            ; 0BE6h: dead filler
main:
        call cold_init
        call rom_getc
        call intro_anim
        call rom_video
        jmp  show_menu
intro_anim:
        lxi  h, game_area_tl                ; 77C2h -- row 3, col 8  (game area top-left)
        shld intro_left_bot
        shld intro_left_top
        lxi  h, video_memory + 3*video_stride + 71    ; 7801h -- row 3, col 71 (game area top-right)
        shld intro_right_bot
        shld intro_right_top
        mvi  a, 1Eh
        sta  intro_beep_freq
        mvi  b, 21h
loc_0C18:
        mvi  c, 20h
loc_0C1A:
        mvi  d, 19h
loc_0C1C:
        lhld intro_left_bot
        inx  h
        mov  a, m
        dcx  h
        mov  m, a
        push d
        lxi  d, video_stride
        dad  d
        pop  d
        shld intro_left_bot
        lhld intro_right_bot
        dcx  h
        mov  a, m
        inx  h
        mov  m, a
        push d
        lxi  d, video_stride
        dad  d
        pop  d
        shld intro_right_bot
        dcr  d
        jnz  loc_0C1C
        lhld intro_left_top
        inx  h
        shld intro_left_top
        shld intro_left_bot
        lhld intro_right_top
        dcx  h
        shld intro_right_top
        shld intro_right_bot
        dcr  c
        jnz  loc_0C1A
        lhld intro_left_bot
        push d
        lxi  d, video_stride
loc_0C5F:
        mvi  m, 00h
        dad  d
        mov  a, h
        cpi  80h
        jc   loc_0C5F
        pop  d
        push b
        mvi  c, 13h
        lda  intro_beep_freq
        inr  a
        cpi  41h
        jnz  loc_0C77
        mvi  a, 1Eh
loc_0C77:
        sta  intro_beep_freq
        mov  b, a
        call rom_sound
        pop  b
        lxi  h, game_area_tl                ; 77C2h -- reset left-scan to row 3, col 8
        shld intro_left_bot
        shld intro_left_top
        lxi  h, video_memory + 3*video_stride + 71    ; 7801h -- reset right-scan to row 3, col 71
        shld intro_right_bot
        shld intro_right_top
        dcr  b
        jnz  loc_0C18
        ret
; ---- scratch variables for intro_anim (4 words + 1 byte) ----
; Initial bytes here (20 21 21 21 0D 0A 75 70 6C) are leftover source
; garbage -- the first shld in intro_anim overwrites them before use.
intro_left_bot:                         ; offset intro_left_bot (word) -- left scan-bottom ptr
        db   20h, 21h
intro_right_bot:                        ; offset intro_right_bot (word) -- right scan-bottom ptr
        db   21h, 21h
intro_left_top:                         ; offset intro_left_top (word) -- left scan-top ptr
        db   0Dh, 0Ah
intro_right_top:                        ; offset intro_right_top (word) -- right scan-top ptr
        db   75h, 70h
intro_beep_freq:                        ; offset intro_beep_freq (byte) -- cycling tone pitch
        db   6Ch
show_menu:
        lxi  b, 0150h
loc_0CA2:
        push b
        call rom_sound
        pop  b
        inr  b
        dcr  c
        mov  a, b
        cpi  23h
        jnz  loc_0CA2
        lxi  h, str_main_menu
        call rom_puts
        lxi  h, str_diff_cursor
        call rom_puts
        lda  var_difficulty
        jmp  apply_difficulty
menu_input:
        mvi  c, 0Ch                       ; 0Ch = home cursor (form feed)
        call rom_putc
        call rom_getc
        ani  0DFh                         ; force uppercase ('a'..'z' -> 'A'..'Z')
        cpi  4Eh                          ; 'N' -- Начать игру (start game)
        jz   start_new_game
        cpi  55h                          ; 'U' -- Уровень (difficulty)
        jz   cycle_difficulty
        cpi  49h                          ; 'I' -- Инструкция (instructions)
        jz   show_instructions
        cpi  03h                          ; Ctrl-C -- back to monitor
        jz   rom_prompt_loop
        jmp  menu_input
str_main_menu:                          ; offset 0CE2h
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
show_instructions:
        lxi  h, str_instructions
loc_0D41:
        mov  a, m
        cpi  00h
        jz   loc_0D5B
        cpi  0Dh
        jnz  loc_0D51
        mvi  c, 07h
        call rom_putc
loc_0D51:
        mov  c, a
        ei
        call rom_putc
        di
        inx  h
        jmp  loc_0D41
loc_0D5B:
        call rom_getc
        call intro_anim
        jmp  show_menu
str_instructions:                       ; offset 0D64h
        db   1Fh                                 ; clear screen
        db   1Bh, 'Y', 20h, 33h                ; ESC Y row=0 col=19
        db   'i n s t r u k c i q'                         ; "И Н С Т Р У К Ц И Я"
        db   0Dh, 0Ah                             ; CR LF
        db   0Ah                                  ; LF
        db   'idet 2989 god...aprelx mesqc.na na{u planetu obru{ilosx'  ; "ИДЕТ 2989 ГОД...АПРЕЛЬ МЕСЯЦ.НА НАШУ ПЛАНЕТУ ОБРУШИЛОСЬ"
        db   0Dh, 0Ah                             ; CR LF
        db   'tqvkoe bedstwie.22 i`nq 2941 goda w 4 ~asa utra bez ob"-'  ; "ТЯЖКОЕ БЕДСТВИЕ.22 ИЮНЯ 2941 ГОДА В 4 ЧАСА УТРА БЕЗ ОБ""-"
        db   0Dh, 0Ah                             ; CR LF
        db   'qwleniq wojny na planetu "zemlq" obru{ilisx pol~i}a mar-'  ; "ЯВЛЕНИЯ ВОЙНЫ НА ПЛАНЕТУ ""ЗЕМЛЯ"" ОБРУШИЛИСЬ ПОЛЧИЩА МАР-"
        db   0Dh, 0Ah                             ; CR LF
        db   'sian ~toby porabotitx zeml` i nawqzatx ~uvdyj nam stroj,'  ; "СИАН ЧТОБЫ ПОРАБОТИТЬ ЗЕМЛЮ И НАВЯЗАТЬ ЧУЖДЫЙ НАМ СТРОЙ,"
        db   0Dh, 0Ah                             ; CR LF
        db   'i sdelatx "zeml`" stranoj rabow.'            ; "И СДЕЛАТЬ ""ЗЕМЛЮ"" СТРАНОЙ РАБОВ."
        db   0Dh, 0Ah                             ; CR LF
        db   0Ah                                  ; LF
        db   'wy mobilizowany rajonnym woenkomatom dlq za}ity rodiny'  ; "ВЫ МОБИЛИЗОВАНЫ РАЙОННЫМ ВОЕНКОМАТОМ ДЛЯ ЗАЩИТЫ РОДИНЫ"
        db   0Dh, 0Ah                             ; CR LF
        db   'i otprawleny w wojska pwo.'                  ; "И ОТПРАВЛЕНЫ В ВОЙСКА ПВО."
        db   0Dh, 0Ah                             ; CR LF
        db   0Ah                                  ; LF
        db   '   pod wa{im komandowaniem nahoditsq podwivnaq zenitnaq'  ; "   ПОД ВАШИМ КОМАНДОВАНИЕМ НАХОДИТСЯ ПОДВИЖНАЯ ЗЕНИТНАЯ"
        db   0Dh, 0Ah                             ; CR LF
        db   'sistema na wozdu{noj podu{ke.wa{a zada~a atakowatx marsi-'  ; "СИСТЕМА НА ВОЗДУШНОЙ ПОДУШКЕ.ВАША ЗАДАЧА АТАКОВАТЬ МАРСИ-"
        db   0Dh, 0Ah                             ; CR LF
        db   'an torpedami,a tak ve prepqtstwowatx proniknoweni` diwer-'  ; "АН ТОРПЕДАМИ,А ТАК ЖЕ ПРЕПЯТСТВОВАТЬ ПРОНИКНОВЕНИЮ ДИВЕР-"
        db   0Dh, 0Ah                             ; CR LF
        db   'santow desantnikow na strategi~eski wavnye ob"ekty,koto-'  ; "САНТОВ ДЕСАНТНИКОВ НА СТРАТЕГИЧЕСКИ ВАЖНЫЕ ОБ""ЕКТЫ,КОТО-"
        db   0Dh, 0Ah                             ; CR LF
        db   'rye nahodqtsq w zone wa{ego peredwiveniq.desantnikow mo-'  ; "РЫЕ НАХОДЯТСЯ В ЗОНЕ ВАШЕГО ПЕРЕДВИЖЕНИЯ.ДЕСАНТНИКОВ МО-"
        db   0Dh, 0Ah                             ; CR LF
        db   'vno perehwatywatx swoej platformoj,no tak kak pri obez-'  ; "ЖНО ПЕРЕХВАТЫВАТЬ СВОЕЙ ПЛАТФОРМОЙ,НО ТАК КАК ПРИ ОБЕЗ-"
        db   0Dh, 0Ah                             ; CR LF
        db   'wreviwanii ego wy terqete viwu` silu,|to slabo oceniwa-'  ; "ВРЕЖИВАНИИ ЕГО ВЫ ТЕРЯЕТЕ ЖИВУЮ СИЛУ,ЭТО СЛАБО ОЦЕНИВА-"
        db   0Dh, 0Ah                             ; CR LF
        db   'etsq.namnogo |ffektiwnee sbiwatx diwersantow torpedoj,'  ; "ЕТСЯ.НАМНОГО ЭФФЕКТИВНЕЕ СБИВАТЬ ДИВЕРСАНТОВ ТОРПЕДОЙ,"
        db   0Dh, 0Ah                             ; CR LF
        db   'no togda nuvno delatx pomenx{e promahow.za |ffektiwnoe'  ; "НО ТОГДА НУЖНО ДЕЛАТЬ ПОМЕНЬШЕ ПРОМАХОВ.ЗА ЭФФЕКТИВНОЕ"
        db   0Dh, 0Ah                             ; CR LF
        db   'uni~tovenie diwersantow federaciq premiruet was awtona-'  ; "УНИЧТОЖЕНИЕ ДИВЕРСАНТОВ ФЕДЕРАЦИЯ ПРЕМИРУЕТ ВАС АВТОНА-"
        db   0Dh, 0Ah                             ; CR LF
        db   'wodq}ej sistemoj na diwersantow.horo{o oceniwa`tsq sbi-'  ; "ВОДЯЩЕЙ СИСТЕМОЙ НА ДИВЕРСАНТОВ.ХОРОШО ОЦЕНИВАЮТСЯ СБИ-"
        db   0Dh, 0Ah                             ; CR LF
        db   'tye korabli marsian.'                        ; "ТЫЕ КОРАБЛИ МАРСИАН."
        db   0Dh, 0Ah                             ; CR LF
        db   'klawi{i '                                    ; "КЛАВИШИ "
        db   1Dh                                  ; ▶ (arrow right)
        db   ' '                                           ; " "
        db   0Eh                                  ; ◀ (arrow left)
        db   ' '                                           ; " "
        db   0Bh                                  ; ↑ (arrow up)
        db   ' '                                           ; " "
        db   0Fh                                  ; ▼ (arrow down)
        db   ' peredwiga`t wa{u sistemu,"probel"-wystrel'  ; " ПЕРЕДВИГАЮТ ВАШУ СИСТЕМУ,""ПРОБЕЛ""-ВЫСТРЕЛ"
        db   0Dh, 0Ah                             ; CR LF
        db   '"ar2"-priostanow igry.   vela` uda~i.  mh-12' ; """АР2""-ПРИОСТАНОВ ИГРЫ.   ЖЕЛАЮ УДАЧИ.  МХ-12"
        db   00h                                  ; NUL
cycle_difficulty:
        lxi  h, str_diff_cursor
        call rom_puts
        lxi  b, 0A30h
loc_11DC:
        push b
        call rom_sound
        pop  b
        dcr  b
        inr  c
        inr  c
        mov  a, b
        cpi  02h
        jnz  loc_11DC
        lda  var_difficulty
        inr  a
        cpi  04h
        jnz  apply_difficulty
        mvi  a, 01h
apply_difficulty:
        sta  var_difficulty
        cpi  01h
        jz   difficulty_easy
        cpi  02h
        jz   difficulty_medium
; Difficulty setters are SMC patchers: each one overwrites the
; immediate operand inside a handful of `mvi a, nn` / `cpi nn`
; instructions in the game loop. The labels <name>_reload /
; <name>_debounce / saboteur_spawn_rate point at those instructions,
; so `<label> + 1` is the byte holding the patched immediate.
        lxi  h, str_diff_hard
        call rom_puts
        mvi  a, 03h
        sta  move_left_debounce + 1
        sta  move_right_debounce + 1
        inr  a                           ; a = 04h
        sta  move_up_debounce + 1
        sta  move_down_debounce + 1
        sta  torpedo_timer_reload + 1
        mvi  a, 0Fh
        sta  climber_timer_reload + 1
        mvi  a, 12h
        sta  saboteur_spawn_rate + 1
        lxi  h, 0160h
        shld frame_delay + 1
        jmp  menu_input
difficulty_medium:
        lxi  h, str_diff_medium
        call rom_puts
        mvi  a, 04h
        sta  move_left_debounce + 1
        sta  torpedo_timer_reload + 1
        sta  move_right_debounce + 1
        mvi  a, 06h
        sta  move_up_debounce + 1
        sta  move_down_debounce + 1
        mvi  a, 0Ah
        sta  saboteur_timer_reload + 1
        mvi  a, 12h
        sta  climber_timer_reload + 1
        mvi  a, 14h
        sta  saboteur_spawn_rate + 1
        lxi  h, 0200h
        shld frame_delay + 1
        jmp  menu_input
difficulty_easy:
        lxi  h, str_diff_easy
        call rom_puts
        mvi  a, 04h
        sta  move_left_debounce + 1
        sta  move_right_debounce + 1
        dcr  a                           ; a = 03h
        sta  torpedo_timer_reload + 1
        mvi  a, 05h
        sta  move_up_debounce + 1
        sta  move_down_debounce + 1
        mvi  a, 0Fh
        sta  saboteur_timer_reload + 1
        mvi  a, 1Ch
        sta  climber_timer_reload + 1
        mvi  a, 16h
        sta  saboteur_spawn_rate + 1
        lxi  h, 0250h
        shld frame_delay + 1
        jmp  menu_input
str_diff_cursor:                        ; offset 1290h
        db   1Bh, 'Y', 34h, 48h, 00h    ; ESC Y row=20 col=40, NUL  (cursor-only)
str_diff_hard:                          ; offset 1295h
        db   'tqvelyj  ', 00h           ; "TYAZHELYJ  " -- hard
str_diff_medium:                        ; offset 129Fh
        db   'srednij  ', 00h           ; "SREDNIJ  " -- medium
str_diff_easy:                          ; offset 12A9h
        db   'legkij   ', 00h           ; "LEGKIJ   " -- easy
var_difficulty:
        db   01h                        ; var_difficulty (1=easy, 2=medium, 3=hard)
start_new_game:
        jmp  game_start
cold_init:
        mvi  c, 1Fh
        call rom_putc
        call video_reinit
        call run_patch_table
        ret
; Apply the static patch table that paints the game backdrop onto
; video RAM. Table format: sequence of (value, addr_lo, addr_hi)
; triplets terminated by a 1Bh sentinel at the value position.
; Each triplet writes `value` to the given 16-bit address. Called
; once from cold_init after the screen is cleared.
run_patch_table:                        ; offset 12C3h
        lxi  h, patch_table              ; 12F0h -- start of the triplet stream
loc_12C6:
        mov  a, m
        cpi  1Bh                         ; 1Bh -- end-of-table sentinel
        rz
        inx  h
        mov  c, m                        ; target addr low
        inx  h
        mov  b, m                        ; target addr high
        stax b                           ; [BC] = value
        inx  h
        jmp  loc_12C6
video_reinit:
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
        jmp  rom_video_tail
; ---- Orphan bytes at 12E8h..12EFh (8 bytes, not reachable) ----
; Disassembled looks like a truncated "mov c,a / call monitor_scan_kbd /
; cpi FFh / jz ..." fragment (the jz operand spills into the patch table).
; Left behind by the developer; run_patch_table jumps over them by
; pointing HL at 12F0h, so execution never reaches this byte range.
        db   4Fh, 0CDh, 03h, 00h, 0FEh, 0FFh, 0CAh, 0E9h                ; 12E8h: dead fragment
; ---- Patch table consumed by run_patch_table (12F0h..1707h) ----
; Each triplet is (value, addr_lo, addr_hi): run_patch_table writes
; `value` to the 16-bit address, advances 3 bytes, and repeats until
; a value byte of 1Bh is seen (terminator). All target addresses land
; in video RAM (76D0h..7FF4h), so this table paints the decorative
; backdrop of the play field at cold start. ~349 triplets total.
patch_table:                                                            ; offset 12F0h
        db   2Eh                                    ; '.'
        dw   video_memory +  3*video_stride + 10  ; 77C4h row  3 col 10
        db   04h                                    ; ▗
        dw   video_memory +  3*video_stride + 14  ; 77C8h row  3 col 14
        db   14h                                    ; ▄
        dw   video_memory +  3*video_stride + 15  ; 77C9h row  3 col 15
        db   17h                                    ; █
        dw   video_memory +  3*video_stride + 16  ; 77CAh row  3 col 16
        db   14h                                    ; ▄
        dw   video_memory +  3*video_stride + 17  ; 77CBh row  3 col 17
        db   10h                                    ; ▖
        dw   video_memory +  3*video_stride + 18  ; 77CCh row  3 col 18
        db   5Eh                                    ; '^'
        dw   video_memory +  3*video_stride + 30  ; 77D8h row  3 col 30
        db   5Eh                                    ; '^'
        dw   video_memory +  3*video_stride + 32  ; 77DAh row  3 col 32
        db   5Eh                                    ; '^'
        dw   video_memory +  3*video_stride + 34  ; 77DCh row  3 col 34
        db   5Eh                                    ; '^'
        dw   video_memory +  3*video_stride + 36  ; 77DEh row  3 col 36
        db   5Eh                                    ; '^'
        dw   video_memory +  3*video_stride + 38  ; 77E0h row  3 col 38
        db   5Eh                                    ; '^'
        dw   video_memory +  3*video_stride + 40  ; 77E2h row  3 col 40
        db   06h                                    ; ▐
        dw   video_memory +  3*video_stride + 66  ; 77FCh row  3 col 66
        db   17h                                    ; █
        dw   video_memory +  3*video_stride + 68  ; 77FEh row  3 col 68
        db   10h                                    ; ▖
        dw   video_memory +  3*video_stride + 69  ; 77FFh row  3 col 69

        db   04h                                    ; ▗
        dw   video_memory +  4*video_stride + 13  ; 7815h row  4 col 13
        db   17h                                    ; █
        dw   video_memory +  4*video_stride + 14  ; 7816h row  4 col 14
        db   17h                                    ; █
        dw   video_memory +  4*video_stride + 15  ; 7817h row  4 col 15
        db   17h                                    ; █
        dw   video_memory +  4*video_stride + 16  ; 7818h row  4 col 16
        db   17h                                    ; █
        dw   video_memory +  4*video_stride + 17  ; 7819h row  4 col 17
        db   17h                                    ; █
        dw   video_memory +  4*video_stride + 18  ; 781Ah row  4 col 18
        db   10h                                    ; ▖
        dw   video_memory +  4*video_stride + 19  ; 781Bh row  4 col 19
        db   2Eh                                    ; '.'
        dw   video_memory +  4*video_stride + 25  ; 7821h row  4 col 25
        db   4Fh                                    ; 'O'
        dw   video_memory +  4*video_stride + 29  ; 7825h row  4 col 29
        db   4Fh                                    ; 'O'
        dw   video_memory +  4*video_stride + 31  ; 7827h row  4 col 31
        db   4Fh                                    ; 'O'
        dw   video_memory +  4*video_stride + 33  ; 7829h row  4 col 33
        db   4Fh                                    ; 'O'
        dw   video_memory +  4*video_stride + 35  ; 782Bh row  4 col 35
        db   4Fh                                    ; 'O'
        dw   video_memory +  4*video_stride + 37  ; 782Dh row  4 col 37
        db   4Fh                                    ; 'O'
        dw   video_memory +  4*video_stride + 39  ; 782Fh row  4 col 39
        db   4Fh                                    ; 'O'
        dw   video_memory +  4*video_stride + 41  ; 7831h row  4 col 41
        db   2Eh                                    ; '.'
        dw   video_memory +  4*video_stride + 46  ; 7836h row  4 col 46
        db   2Eh                                    ; '.'
        dw   video_memory +  4*video_stride + 66  ; 784Ah row  4 col 66
        db   17h                                    ; █
        dw   video_memory +  4*video_stride + 67  ; 784Bh row  4 col 67
        db   06h                                    ; ▐
        dw   video_memory +  4*video_stride + 68  ; 784Ch row  4 col 68
        db   11h                                    ; ▌
        dw   video_memory +  4*video_stride + 69  ; 784Dh row  4 col 69

        db   03h                                    ; ▀
        dw   video_memory +  5*video_stride + 13  ; 7863h row  5 col 13
        db   07h                                    ; ▜
        dw   video_memory +  5*video_stride + 14  ; 7864h row  5 col 14
        db   13h                                    ; ▛
        dw   video_memory +  5*video_stride + 18  ; 7868h row  5 col 18
        db   03h                                    ; ▀
        dw   video_memory +  5*video_stride + 19  ; 7869h row  5 col 19
        db   2Eh                                    ; '.'
        dw   video_memory +  5*video_stride + 23  ; 786Dh row  5 col 23
        db   3Dh                                    ; '='
        dw   video_memory +  5*video_stride + 30  ; 7874h row  5 col 30
        db   3Dh                                    ; '='
        dw   video_memory +  5*video_stride + 32  ; 7876h row  5 col 32
        db   3Dh                                    ; '='
        dw   video_memory +  5*video_stride + 34  ; 7878h row  5 col 34
        db   3Dh                                    ; '='
        dw   video_memory +  5*video_stride + 36  ; 787Ah row  5 col 36
        db   3Dh                                    ; '='
        dw   video_memory +  5*video_stride + 38  ; 787Ch row  5 col 38
        db   3Dh                                    ; '='
        dw   video_memory +  5*video_stride + 40  ; 787Eh row  5 col 40
        db   2Eh                                    ; '.'
        dw   video_memory +  5*video_stride + 55  ; 788Dh row  5 col 55
        db   2Eh                                    ; '.'
        dw   video_memory +  5*video_stride + 60  ; 7892h row  5 col 60
        db   06h                                    ; ▐
        dw   video_memory +  5*video_stride + 67  ; 7899h row  5 col 67
        db   03h                                    ; ▀
        dw   video_memory +  5*video_stride + 69  ; 789Bh row  5 col 69

        db   2Eh                                    ; '.'
        dw   video_memory +  6*video_stride +  9  ; 78ADh row  6 col  9
        db   16h                                    ; ▟
        dw   video_memory +  6*video_stride + 14  ; 78B2h row  6 col 14
        db   14h                                    ; ▄
        dw   video_memory +  6*video_stride + 16  ; 78B4h row  6 col 16
        db   15h                                    ; ▙
        dw   video_memory +  6*video_stride + 18  ; 78B6h row  6 col 18
        db   2Eh                                    ; '.'
        dw   video_memory +  6*video_stride + 42  ; 78CEh row  6 col 42
        db   2Eh                                    ; '.'
        dw   video_memory +  6*video_stride + 50  ; 78D6h row  6 col 50
        db   2Eh                                    ; '.'
        dw   video_memory +  6*video_stride + 63  ; 78E3h row  6 col 63
        db   07h                                    ; ▜
        dw   video_memory +  6*video_stride + 68  ; 78E8h row  6 col 68
        db   06h                                    ; ▐
        dw   video_memory +  6*video_stride + 71  ; 78EBh row  6 col 71

        db   13h                                    ; ▛
        dw   video_memory +  7*video_stride + 14  ; 7900h row  7 col 14
        db   06h                                    ; ▐
        dw   video_memory +  7*video_stride + 15  ; 7901h row  7 col 15
        db   17h                                    ; █
        dw   video_memory +  7*video_stride + 16  ; 7902h row  7 col 16
        db   11h                                    ; ▌
        dw   video_memory +  7*video_stride + 17  ; 7903h row  7 col 17
        db   07h                                    ; ▜
        dw   video_memory +  7*video_stride + 18  ; 7904h row  7 col 18
        db   2Eh                                    ; '.'
        dw   video_memory +  7*video_stride + 32  ; 7912h row  7 col 32
        db   2Eh                                    ; '.'
        dw   video_memory +  7*video_stride + 55  ; 7929h row  7 col 55
        db   03h                                    ; ▀
        dw   video_memory +  7*video_stride + 69  ; 7937h row  7 col 69
        db   17h                                    ; █
        dw   video_memory +  7*video_stride + 70  ; 7938h row  7 col 70
        db   02h                                    ; ▝
        dw   video_memory +  7*video_stride + 71  ; 7939h row  7 col 71

        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 14  ; 794Eh row  8 col 14
        db   14h                                    ; ▄
        dw   video_memory +  8*video_stride + 15  ; 794Fh row  8 col 15
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 16  ; 7950h row  8 col 16
        db   14h                                    ; ▄
        dw   video_memory +  8*video_stride + 17  ; 7951h row  8 col 17
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 18  ; 7952h row  8 col 18
        db   82h                                    ; inverse ▝
        dw   video_memory +  8*video_stride + 21  ; 7955h row  8 col 21
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 25  ; 7959h row  8 col 25
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 26  ; 795Ah row  8 col 26
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 29  ; 795Dh row  8 col 29
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 33  ; 7961h row  8 col 33
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 35  ; 7963h row  8 col 35
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 36  ; 7964h row  8 col 36
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 37  ; 7965h row  8 col 37
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 40  ; 7968h row  8 col 40
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 41  ; 7969h row  8 col 41
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 42  ; 796Ah row  8 col 42
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 43  ; 796Bh row  8 col 43
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 46  ; 796Eh row  8 col 46
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 47  ; 796Fh row  8 col 47
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 51  ; 7973h row  8 col 51
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 52  ; 7974h row  8 col 52
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 56  ; 7978h row  8 col 56
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 57  ; 7979h row  8 col 57
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 60  ; 797Ch row  8 col 60
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 63  ; 797Fh row  8 col 63
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 65  ; 7981h row  8 col 65
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 66  ; 7982h row  8 col 66
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 67  ; 7983h row  8 col 67
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 68  ; 7984h row  8 col 68
        db   17h                                    ; █
        dw   video_memory +  8*video_stride + 69  ; 7985h row  8 col 69
        db   80h                                    ; inverse blank
        dw   video_memory +  8*video_stride + 70  ; 7986h row  8 col 70
        db   07h                                    ; ▜
        dw   video_memory +  8*video_stride + 71  ; 7987h row  8 col 71

        db   06h                                    ; ▐
        dw   video_memory +  9*video_stride + 15  ; 799Dh row  9 col 15
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 16  ; 799Eh row  9 col 16
        db   11h                                    ; ▌
        dw   video_memory +  9*video_stride + 17  ; 799Fh row  9 col 17
        db   82h                                    ; inverse ▝
        dw   video_memory +  9*video_stride + 21  ; 79A3h row  9 col 21
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 24  ; 79A6h row  9 col 24
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 26  ; 79A8h row  9 col 26
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 29  ; 79ABh row  9 col 29
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 32  ; 79AEh row  9 col 32
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 33  ; 79AFh row  9 col 33
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 35  ; 79B1h row  9 col 35
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 38  ; 79B4h row  9 col 38
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 40  ; 79B6h row  9 col 40
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 45  ; 79BBh row  9 col 45
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 48  ; 79BEh row  9 col 48
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 50  ; 79C0h row  9 col 50
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 53  ; 79C3h row  9 col 53
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 55  ; 79C5h row  9 col 55
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 58  ; 79C8h row  9 col 58
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 60  ; 79CAh row  9 col 60
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 63  ; 79CDh row  9 col 63
        db   17h                                    ; █
        dw   video_memory +  9*video_stride + 67  ; 79D1h row  9 col 67
        db   80h                                    ; inverse blank
        dw   video_memory +  9*video_stride + 71  ; 79D5h row  9 col 71

        db   04h                                    ; ▗
        dw   video_memory + 10*video_stride + 14  ; 79EAh row 10 col 14
        db   13h                                    ; ▛
        dw   video_memory + 10*video_stride + 15  ; 79EBh row 10 col 15
        db   03h                                    ; ▀
        dw   video_memory + 10*video_stride + 16  ; 79ECh row 10 col 16
        db   07h                                    ; ▜
        dw   video_memory + 10*video_stride + 17  ; 79EDh row 10 col 17
        db   10h                                    ; ▖
        dw   video_memory + 10*video_stride + 18  ; 79EEh row 10 col 18
        db   82h                                    ; inverse ▝
        dw   video_memory + 10*video_stride + 21  ; 79F1h row 10 col 21
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 24  ; 79F4h row 10 col 24
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 26  ; 79F6h row 10 col 26
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 29  ; 79F9h row 10 col 29
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 31  ; 79FBh row 10 col 31
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 33  ; 79FDh row 10 col 33
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 35  ; 79FFh row 10 col 35
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 36  ; 7A00h row 10 col 36
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 37  ; 7A01h row 10 col 37
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 40  ; 7A04h row 10 col 40
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 41  ; 7A05h row 10 col 41
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 42  ; 7A06h row 10 col 42
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 45  ; 7A09h row 10 col 45
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 48  ; 7A0Ch row 10 col 48
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 50  ; 7A0Eh row 10 col 50
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 55  ; 7A13h row 10 col 55
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 58  ; 7A16h row 10 col 58
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 60  ; 7A18h row 10 col 60
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 61  ; 7A19h row 10 col 61
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 62  ; 7A1Ah row 10 col 62
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 63  ; 7A1Bh row 10 col 63
        db   17h                                    ; █
        dw   video_memory + 10*video_stride + 67  ; 7A1Fh row 10 col 67
        db   80h                                    ; inverse blank
        dw   video_memory + 10*video_stride + 71  ; 7A23h row 10 col 71

        db   15h                                    ; ▙
        dw   video_memory + 11*video_stride + 13  ; 7A37h row 11 col 13
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 14  ; 7A38h row 11 col 14
        db   01h                                    ; ▘
        dw   video_memory + 11*video_stride + 15  ; 7A39h row 11 col 15
        db   02h                                    ; ▝
        dw   video_memory + 11*video_stride + 17  ; 7A3Bh row 11 col 17
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 18  ; 7A3Ch row 11 col 18
        db   16h                                    ; ▟
        dw   video_memory + 11*video_stride + 19  ; 7A3Dh row 11 col 19
        db   82h                                    ; inverse ▝
        dw   video_memory + 11*video_stride + 21  ; 7A3Fh row 11 col 21
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 23  ; 7A41h row 11 col 23
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 24  ; 7A42h row 11 col 24
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 25  ; 7A43h row 11 col 25
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 26  ; 7A44h row 11 col 26
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 27  ; 7A45h row 11 col 27
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 29  ; 7A47h row 11 col 29
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 30  ; 7A48h row 11 col 30
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 33  ; 7A4Bh row 11 col 33
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 35  ; 7A4Dh row 11 col 35
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 38  ; 7A50h row 11 col 38
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 40  ; 7A52h row 11 col 40
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 45  ; 7A57h row 11 col 45
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 46  ; 7A58h row 11 col 46
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 47  ; 7A59h row 11 col 47
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 50  ; 7A5Ch row 11 col 50
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 53  ; 7A5Fh row 11 col 53
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 55  ; 7A61h row 11 col 55
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 56  ; 7A62h row 11 col 56
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 57  ; 7A63h row 11 col 57
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 58  ; 7A64h row 11 col 58
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 60  ; 7A66h row 11 col 60
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 63  ; 7A69h row 11 col 63
        db   17h                                    ; █
        dw   video_memory + 11*video_stride + 67  ; 7A6Dh row 11 col 67
        db   80h                                    ; inverse blank
        dw   video_memory + 11*video_stride + 71  ; 7A71h row 11 col 71

        db   2Eh                                    ; '.'
        dw   video_memory + 12*video_stride + 10  ; 7A82h row 12 col 10
        db   01h                                    ; ▘
        dw   video_memory + 12*video_stride + 14  ; 7A86h row 12 col 14
        db   02h                                    ; ▝
        dw   video_memory + 12*video_stride + 18  ; 7A8Ah row 12 col 18
        db   82h                                    ; inverse ▝
        dw   video_memory + 12*video_stride + 21  ; 7A8Dh row 12 col 21
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 23  ; 7A8Fh row 12 col 23
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 27  ; 7A93h row 12 col 27
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 29  ; 7A95h row 12 col 29
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 33  ; 7A99h row 12 col 33
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 35  ; 7A9Bh row 12 col 35
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 36  ; 7A9Ch row 12 col 36
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 37  ; 7A9Dh row 12 col 37
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 40  ; 7AA0h row 12 col 40
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 41  ; 7AA1h row 12 col 41
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 42  ; 7AA2h row 12 col 42
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 43  ; 7AA3h row 12 col 43
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 45  ; 7AA5h row 12 col 45
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 51  ; 7AABh row 12 col 51
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 52  ; 7AACh row 12 col 52
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 55  ; 7AAFh row 12 col 55
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 58  ; 7AB2h row 12 col 58
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 60  ; 7AB4h row 12 col 60
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 63  ; 7AB7h row 12 col 63
        db   17h                                    ; █
        dw   video_memory + 12*video_stride + 67  ; 7ABBh row 12 col 67
        db   80h                                    ; inverse blank
        dw   video_memory + 12*video_stride + 71  ; 7ABFh row 12 col 71

        db   2Eh                                    ; '.'
        dw   video_memory + 13*video_stride + 18  ; 7AD8h row 13 col 18
        db   2Eh                                    ; '.'
        dw   video_memory + 13*video_stride + 32  ; 7AE6h row 13 col 32
        db   2Eh                                    ; '.'
        dw   video_memory + 13*video_stride + 35  ; 7AE9h row 13 col 35
        db   04h                                    ; ▗
        dw   video_memory + 13*video_stride + 57  ; 7AFFh row 13 col 57
        db   14h                                    ; ▄
        dw   video_memory + 13*video_stride + 58  ; 7B00h row 13 col 58
        db   17h                                    ; █
        dw   video_memory + 13*video_stride + 59  ; 7B01h row 13 col 59
        db   14h                                    ; ▄
        dw   video_memory + 13*video_stride + 60  ; 7B02h row 13 col 60
        db   10h                                    ; ▖
        dw   video_memory + 13*video_stride + 61  ; 7B03h row 13 col 61
        db   2Eh                                    ; '.'
        dw   video_memory + 13*video_stride + 70  ; 7B0Ch row 13 col 70

        db   2Eh                                    ; '.'
        dw   video_memory + 14*video_stride + 22  ; 7B2Ah row 14 col 22
        db   2Eh                                    ; '.'
        dw   video_memory + 14*video_stride + 50  ; 7B46h row 14 col 50
        db   04h                                    ; ▗
        dw   video_memory + 14*video_stride + 56  ; 7B4Ch row 14 col 56
        db   17h                                    ; █
        dw   video_memory + 14*video_stride + 57  ; 7B4Dh row 14 col 57
        db   17h                                    ; █
        dw   video_memory + 14*video_stride + 58  ; 7B4Eh row 14 col 58
        db   17h                                    ; █
        dw   video_memory + 14*video_stride + 59  ; 7B4Fh row 14 col 59
        db   17h                                    ; █
        dw   video_memory + 14*video_stride + 60  ; 7B50h row 14 col 60
        db   17h                                    ; █
        dw   video_memory + 14*video_stride + 61  ; 7B51h row 14 col 61
        db   10h                                    ; ▖
        dw   video_memory + 14*video_stride + 62  ; 7B52h row 14 col 62

        db   2Eh                                    ; '.'
        dw   video_memory + 15*video_stride + 29  ; 7B7Fh row 15 col 29
        db   2Eh                                    ; '.'
        dw   video_memory + 15*video_stride + 33  ; 7B83h row 15 col 33
        db   2Eh                                    ; '.'
        dw   video_memory + 15*video_stride + 46  ; 7B90h row 15 col 46
        db   03h                                    ; ▀
        dw   video_memory + 15*video_stride + 56  ; 7B9Ah row 15 col 56
        db   07h                                    ; ▜
        dw   video_memory + 15*video_stride + 57  ; 7B9Bh row 15 col 57
        db   13h                                    ; ▛
        dw   video_memory + 15*video_stride + 61  ; 7B9Fh row 15 col 61
        db   03h                                    ; ▀
        dw   video_memory + 15*video_stride + 62  ; 7BA0h row 15 col 62
        db   2Eh                                    ; '.'
        dw   video_memory + 15*video_stride + 65  ; 7BA3h row 15 col 65
        db   2Eh                                    ; '.'
        dw   video_memory + 15*video_stride + 71  ; 7BA9h row 15 col 71

        db   2Eh                                    ; '.'
        dw   video_memory + 16*video_stride + 11  ; 7BBBh row 16 col 11
        db   2Eh                                    ; '.'
        dw   video_memory + 16*video_stride + 42  ; 7BDAh row 16 col 42
        db   16h                                    ; ▟
        dw   video_memory + 16*video_stride + 57  ; 7BE9h row 16 col 57
        db   14h                                    ; ▄
        dw   video_memory + 16*video_stride + 59  ; 7BEBh row 16 col 59
        db   15h                                    ; ▙
        dw   video_memory + 16*video_stride + 61  ; 7BEDh row 16 col 61

        db   04h                                    ; ▗
        dw   video_memory + 17*video_stride + 19  ; 7C11h row 17 col 19
        db   15h                                    ; ▙
        dw   video_memory + 17*video_stride + 20  ; 7C12h row 17 col 20
        db   2Eh                                    ; '.'
        dw   video_memory + 17*video_stride + 39  ; 7C25h row 17 col 39
        db   13h                                    ; ▛
        dw   video_memory + 17*video_stride + 57  ; 7C37h row 17 col 57
        db   06h                                    ; ▐
        dw   video_memory + 17*video_stride + 58  ; 7C38h row 17 col 58
        db   17h                                    ; █
        dw   video_memory + 17*video_stride + 59  ; 7C39h row 17 col 59
        db   11h                                    ; ▌
        dw   video_memory + 17*video_stride + 60  ; 7C3Ah row 17 col 60
        db   07h                                    ; ▜
        dw   video_memory + 17*video_stride + 61  ; 7C3Bh row 17 col 61
        db   2Eh                                    ; '.'
        dw   video_memory + 17*video_stride + 68  ; 7C42h row 17 col 68

        db   04h                                    ; ▗
        dw   video_memory + 18*video_stride + 18  ; 7C5Eh row 18 col 18
        db   17h                                    ; █
        dw   video_memory + 18*video_stride + 19  ; 7C5Fh row 18 col 19
        db   17h                                    ; █
        dw   video_memory + 18*video_stride + 20  ; 7C60h row 18 col 20
        db   15h                                    ; ▙
        dw   video_memory + 18*video_stride + 21  ; 7C61h row 18 col 21
        db   2Eh                                    ; '.'
        dw   video_memory + 18*video_stride + 32  ; 7C6Ch row 18 col 32
        db   17h                                    ; █
        dw   video_memory + 18*video_stride + 57  ; 7C85h row 18 col 57
        db   14h                                    ; ▄
        dw   video_memory + 18*video_stride + 58  ; 7C86h row 18 col 58
        db   17h                                    ; █
        dw   video_memory + 18*video_stride + 59  ; 7C87h row 18 col 59
        db   14h                                    ; ▄
        dw   video_memory + 18*video_stride + 60  ; 7C88h row 18 col 60
        db   17h                                    ; █
        dw   video_memory + 18*video_stride + 61  ; 7C89h row 18 col 61

        db   2Eh                                    ; '.'
        dw   video_memory + 19*video_stride + 10  ; 7CA4h row 19 col 10
        db   11h                                    ; ▌
        dw   video_memory + 19*video_stride + 20  ; 7CAEh row 19 col 20
        db   2Eh                                    ; '.'
        dw   video_memory + 19*video_stride + 40  ; 7CC2h row 19 col 40
        db   2Eh                                    ; '.'
        dw   video_memory + 19*video_stride + 51  ; 7CCDh row 19 col 51
        db   06h                                    ; ▐
        dw   video_memory + 19*video_stride + 58  ; 7CD4h row 19 col 58
        db   17h                                    ; █
        dw   video_memory + 19*video_stride + 59  ; 7CD5h row 19 col 59
        db   11h                                    ; ▌
        dw   video_memory + 19*video_stride + 60  ; 7CD6h row 19 col 60
        db   2Eh                                    ; '.'
        dw   video_memory + 19*video_stride + 70  ; 7CE0h row 19 col 70

        db   2Eh                                    ; '.'
        dw   video_memory + 20*video_stride + 13  ; 7CF5h row 20 col 13
        db   2Eh                                    ; '.'
        dw   video_memory + 20*video_stride + 27  ; 7D03h row 20 col 27
        db   2Eh                                    ; '.'
        dw   video_memory + 20*video_stride + 46  ; 7D16h row 20 col 46
        db   04h                                    ; ▗
        dw   video_memory + 20*video_stride + 57  ; 7D21h row 20 col 57
        db   13h                                    ; ▛
        dw   video_memory + 20*video_stride + 58  ; 7D22h row 20 col 58
        db   03h                                    ; ▀
        dw   video_memory + 20*video_stride + 59  ; 7D23h row 20 col 59
        db   07h                                    ; ▜
        dw   video_memory + 20*video_stride + 60  ; 7D24h row 20 col 60
        db   10h                                    ; ▖
        dw   video_memory + 20*video_stride + 61  ; 7D25h row 20 col 61
        db   2Eh                                    ; '.'
        dw   video_memory + 20*video_stride + 68  ; 7D2Ch row 20 col 68

        db   2Eh                                    ; '.'
        dw   video_memory + 21*video_stride + 33  ; 7D57h row 21 col 33
        db   2Eh                                    ; '.'
        dw   video_memory + 21*video_stride + 42  ; 7D60h row 21 col 42
        db   15h                                    ; ▙
        dw   video_memory + 21*video_stride + 56  ; 7D6Eh row 21 col 56
        db   17h                                    ; █
        dw   video_memory + 21*video_stride + 57  ; 7D6Fh row 21 col 57
        db   01h                                    ; ▘
        dw   video_memory + 21*video_stride + 58  ; 7D70h row 21 col 58
        db   02h                                    ; ▝
        dw   video_memory + 21*video_stride + 60  ; 7D72h row 21 col 60
        db   17h                                    ; █
        dw   video_memory + 21*video_stride + 61  ; 7D73h row 21 col 61
        db   16h                                    ; ▟
        dw   video_memory + 21*video_stride + 62  ; 7D74h row 21 col 62

        db   06h                                    ; ▐
        dw   video_memory + 22*video_stride + 19  ; 7D97h row 22 col 19
        db   16h                                    ; ▟
        dw   video_memory + 22*video_stride + 20  ; 7D98h row 22 col 20
        db   01h                                    ; ▘
        dw   video_memory + 22*video_stride + 57  ; 7DBDh row 22 col 57
        db   02h                                    ; ▝
        dw   video_memory + 22*video_stride + 61  ; 7DC1h row 22 col 61

        db   2Eh                                    ; '.'
        dw   video_memory + 23*video_stride + 10  ; 7DDCh row 23 col 10
        db   11h                                    ; ▌
        dw   video_memory + 23*video_stride + 20  ; 7DE6h row 23 col 20
        db   2Eh                                    ; '.'
        dw   video_memory + 23*video_stride + 24  ; 7DEAh row 23 col 24
        db   90h                                    ; inverse ▖
        dw   video_memory + 23*video_stride + 32  ; 7DF2h row 23 col 32
        db   80h                                    ; inverse blank
        dw   video_memory + 23*video_stride + 50  ; 7E04h row 23 col 50

        db   2Eh                                    ; '.'
        dw   video_memory + 24*video_stride + 10  ; 7E2Ah row 24 col 10
        db   11h                                    ; ▌
        dw   video_memory + 24*video_stride + 20  ; 7E34h row 24 col 20
        db   90h                                    ; inverse ▖
        dw   video_memory + 24*video_stride + 32  ; 7E40h row 24 col 32
        db   12h                                    ; ▞
        dw   video_memory + 24*video_stride + 35  ; 7E43h row 24 col 35
        db   12h                                    ; ▞
        dw   video_memory + 24*video_stride + 36  ; 7E44h row 24 col 36
        db   10h                                    ; ▖
        dw   video_memory + 24*video_stride + 37  ; 7E45h row 24 col 37
        db   05h                                    ; ▚
        dw   video_memory + 24*video_stride + 38  ; 7E46h row 24 col 38
        db   12h                                    ; ▞
        dw   video_memory + 24*video_stride + 39  ; 7E47h row 24 col 39
        db   14h                                    ; ▄
        dw   video_memory + 24*video_stride + 41  ; 7E49h row 24 col 41
        db   14h                                    ; ▄
        dw   video_memory + 24*video_stride + 42  ; 7E4Ah row 24 col 42
        db   16h                                    ; ▟
        dw   video_memory + 24*video_stride + 44  ; 7E4Ch row 24 col 44
        db   12h                                    ; ▞
        dw   video_memory + 24*video_stride + 46  ; 7E4Eh row 24 col 46
        db   05h                                    ; ▚
        dw   video_memory + 24*video_stride + 47  ; 7E4Fh row 24 col 47
        db   80h                                    ; inverse blank
        dw   video_memory + 24*video_stride + 50  ; 7E52h row 24 col 50

        db   14h                                    ; ▄
        dw   video_memory + 25*video_stride + 17  ; 7E7Fh row 25 col 17
        db   04h                                    ; ▗
        dw   video_memory + 25*video_stride + 18  ; 7E80h row 25 col 18
        db   16h                                    ; ▟
        dw   video_memory + 25*video_stride + 19  ; 7E81h row 25 col 19
        db   17h                                    ; █
        dw   video_memory + 25*video_stride + 20  ; 7E82h row 25 col 20
        db   14h                                    ; ▄
        dw   video_memory + 25*video_stride + 21  ; 7E83h row 25 col 21
        db   04h                                    ; ▗
        dw   video_memory + 25*video_stride + 22  ; 7E84h row 25 col 22
        db   10h                                    ; ▖
        dw   video_memory + 25*video_stride + 23  ; 7E85h row 25 col 23
        db   90h                                    ; inverse ▖
        dw   video_memory + 25*video_stride + 32  ; 7E8Eh row 25 col 32
        db   11h                                    ; ▌
        dw   video_memory + 25*video_stride + 35  ; 7E91h row 25 col 35
        db   11h                                    ; ▌
        dw   video_memory + 25*video_stride + 37  ; 7E93h row 25 col 37
        db   12h                                    ; ▞
        dw   video_memory + 25*video_stride + 38  ; 7E94h row 25 col 38
        db   05h                                    ; ▚
        dw   video_memory + 25*video_stride + 39  ; 7E95h row 25 col 39
        db   03h                                    ; ▀
        dw   video_memory + 25*video_stride + 41  ; 7E97h row 25 col 41
        db   03h                                    ; ▀
        dw   video_memory + 25*video_stride + 42  ; 7E98h row 25 col 42
        db   06h                                    ; ▐
        dw   video_memory + 25*video_stride + 44  ; 7E9Ah row 25 col 44
        db   14h                                    ; ▄
        dw   video_memory + 25*video_stride + 46  ; 7E9Ch row 25 col 46
        db   15h                                    ; ▙
        dw   video_memory + 25*video_stride + 47  ; 7E9Dh row 25 col 47
        db   80h                                    ; inverse blank
        dw   video_memory + 25*video_stride + 50  ; 7EA0h row 25 col 50
        db   31h                                    ; '1'
        dw   video_memory + 25*video_stride + 65  ; 7EAFh row 25 col 65
        db   39h                                    ; '9'
        dw   video_memory + 25*video_stride + 66  ; 7EB0h row 25 col 66
        db   38h                                    ; '8'
        dw   video_memory + 25*video_stride + 67  ; 7EB1h row 25 col 67
        db   39h                                    ; '9'
        dw   video_memory + 25*video_stride + 68  ; 7EB2h row 25 col 68
        db   67h                                    ; Г
        dw   video_memory + 25*video_stride + 70  ; 7EB4h row 25 col 70
        db   2Eh                                    ; '.'
        dw   video_memory + 25*video_stride + 71  ; 7EB5h row 25 col 71

        db   80h                                    ; inverse blank
        dw   video_memory + 26*video_stride +  8  ; 7EC4h row 26 col  8
        db   02h                                    ; ▝
        dw   video_memory + 26*video_stride + 16  ; 7ECCh row 26 col 16
        db   17h                                    ; █
        dw   video_memory + 26*video_stride + 17  ; 7ECDh row 26 col 17
        db   01h                                    ; ▘
        dw   video_memory + 26*video_stride + 18  ; 7ECEh row 26 col 18
        db   03h                                    ; ▀
        dw   video_memory + 26*video_stride + 19  ; 7ECFh row 26 col 19
        db   03h                                    ; ▀
        dw   video_memory + 26*video_stride + 20  ; 7ED0h row 26 col 20
        db   01h                                    ; ▘
        dw   video_memory + 26*video_stride + 21  ; 7ED1h row 26 col 21
        db   07h                                    ; ▜
        dw   video_memory + 26*video_stride + 22  ; 7ED2h row 26 col 22
        db   13h                                    ; ▛
        dw   video_memory + 26*video_stride + 23  ; 7ED3h row 26 col 23
        db   90h                                    ; inverse ▖
        dw   video_memory + 26*video_stride + 32  ; 7EDCh row 26 col 32
        db   80h                                    ; inverse blank
        dw   video_memory + 26*video_stride + 50  ; 7EEEh row 26 col 50
        db   80h                                    ; inverse blank
        dw   video_memory + 26*video_stride + 71  ; 7F03h row 26 col 71

        db   90h                                    ; inverse ▖
        dw   video_memory + 27*video_stride +  8  ; 7F12h row 27 col  8

; Author signature: row 27, cols 64..70 spells "ХАРЬКОВ" (Kharkov),
; almost certainly the home city of the game's author.
        db   68h                                    ; Х
        dw   video_memory + 27*video_stride + 64  ; 7F4Ah row 27 col 64
        db   61h                                    ; А
        dw   video_memory + 27*video_stride + 65  ; 7F4Bh row 27 col 65
        db   72h                                    ; Р
        dw   video_memory + 27*video_stride + 66  ; 7F4Ch row 27 col 66
        db   78h                                    ; Ь
        dw   video_memory + 27*video_stride + 67  ; 7F4Dh row 27 col 67
        db   6Bh                                    ; К
        dw   video_memory + 27*video_stride + 68  ; 7F4Eh row 27 col 68
        db   6Fh                                    ; О
        dw   video_memory + 27*video_stride + 69  ; 7F4Fh row 27 col 69
        db   77h                                    ; В
        dw   video_memory + 27*video_stride + 70  ; 7F50h row 27 col 70

        db   1Bh                                    ; end-of-table sentinel
; ---- Trailing 8 bytes at 1708h..170Fh (not reachable) ----
; Disassembled: "cpi 01h / jz difficulty_easy / cpi 02h / jz ??" --
; looks like a leftover/earlier-draft copy of the difficulty dispatch
; at apply_difficulty. The final jz is truncated (only 2 of 3 bytes).
; run_patch_table already stopped at the 1Bh sentinel, so these bytes
; are never executed.
        db   0FEh, 01h, 0CAh, 5Eh, 12h, 0FEh, 02h, 0CAh                 ; 1708h: dead fragment
