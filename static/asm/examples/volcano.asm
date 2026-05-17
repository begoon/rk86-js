        org  100h
        section volcano

screen_area   equ 117fh
monitor_cout  equ 0F809h
monitor_cin   equ 0F803h
monitor       equ 0F800h
monitor_kbhit equ 0F812h

start:                                  ; offset=0100h
        lxi  sp, screen_area
        mvi  c, 1Fh
        call monitor_cout
        lxi  h, title_msg     ; "\x1BY) wersiq 1.0 r-86rk\r\n\n390008 rqzanx b"...
        call print_str
        call show_sound_status
        mvi  c, 1
        call display_controls
        lxi  h, 0F1Ah
        lxi  d, 2112h
        mvi  b, 5

loc_11E:                                ; offset=011Eh
        mov  a, m
        cpi  5
        jnc  loc_13E
        xchg
        call set_cursor
        xchg
        call print_number
        inx  h
        call print_number
        inx  h
        mvi  c, 20h     ; ' '
        call monitor_cout
        call print_str
        inr  e
        dcr  b
        jnz  loc_11E

loc_13E:                                ; offset=013Eh
        lxi  h, 2118h
        call set_cursor
        lxi  h, saved_people
        mov  a, m
        cpi  5
        jnc  loc_15C
        call print_number
        lxi  h, used_helicopters
        call print_number
        lxi  h, last_rescuer_msg     ; " - poslednij rezulxtat"
        call print_str

loc_15C:                                ; offset=015Ch
        mvi  c, 0Ch
        call monitor_cout
        push h
        lxi  h, 4E6h
        mvi  e, 7

loc_167:                                ; offset=0167h
        mvi  d, 7
        xthl
        lxi  h, volcano
        xthl

loc_16E:                                ; offset=016Eh
        mvi  b, 8
        mov  a, m

loc_171:                                ; offset=0171h
        ral
        jc   loc_191
        mvi  c, 20h     ; ' '

loc_177:                                ; offset=0177h
        call monitor_cout
        dcr  b
        jnz  loc_171
        inx  h
        xthl
        inx  h
        xthl
        dcr  d
        jnz  loc_16E
        call print_crlf
        dcr  e
        jnz  loc_167
        pop  h
        jmp  menu_loop

loc_191:                                ; offset=0191h
        xthl
        mov  c, m
        xthl
        jmp  loc_177

print_number:                           ; offset=0197h
        mov  a, m
        adi  30h        ; '0'
        mov  c, a
        call monitor_cout
        mvi  c, 20h     ; ' '
        call monitor_cout
        mvi  c, 20h     ; ' '
        jmp  monitor_cout

menu_loop:                              ; offset=01A8h
        lxi  h, input_command_msg
        call print_str
        call monitor_cin
        cpi  50h            ; 'P'
        jz   start_game
        cpi  4Bh            ; 'K'
        jz   loc_204
        cpi  53h            ; 'S'
        jz   change_sound_status
        cpi  45h            ; 'E'
        jnz  menu_loop
        lxi  h, end_msg     ; " konec ..."
        call print_str
        lxi  b, 190Ah       ; print 25 lines

loc_1CE:                                ; offset=01CEh
        call monitor_cout
        dcr  b
        jnz  loc_1CE
        jmp  monitor

change_sound_status:                    ; offset=01D8h
        lda  sound_status
        cpi  7
        mvi  a, 0Ch
        jz   loc_1E4
        mvi  a, 7

loc_1E4:                                ; offset=01E4h
        sta  sound_status
        call show_sound_status
        jmp  menu_loop

show_sound_status:                      ; offset=01EDh
        lxi  h, 310Eh
        call set_cursor
        lda  sound_status
        lxi  h, sound_on_msg
        cpi  7
        jz   print_str
        lxi  h, sound_off_msg
        jmp  print_str

loc_204:                                ; offset=0204h
        mvi  c, 0
        call display_controls
        jmp  menu_loop

display_controls:                       ; offset=020Ch
        lxi  h, 3009h
        lxi  d, 0F14h
        mvi  b, 4

loc_214:                                ; offset=0214h
        push b
        dcr  c
        jz   loc_220
        call sub_22B
        call monitor_cin
        stax d

loc_220:                                ; offset=0220h
        call sub_22B
        pop  b
        inr  l
        inx  d
        dcr  b
        jnz  loc_214
        ret

sub_22B:                                ; offset=022Bh
        call set_cursor
        lxi  b, 0F20h

loc_231:                                ; offset=0231h
        call monitor_cout
        dcr  b
        jnz  loc_231
        call set_cursor
        ldax d
        cpi  7Fh     ;
        jz   loc_24A
        cpi  21h     ; '!'
        jc   loc_253
        mov  c, a
        jmp  monitor_cout

loc_24A:                                ; offset=024Ah
        push h
        lxi  h, delete_msg     ; "DELETE"
        call print_str
        pop  h
        ret

loc_253:                                ; offset=0253h
        push h
        lxi  h, 3F8h
        mov  b, a

loc_258:                                ; offset=0258h
        dcr  b
        jm   loc_265

loc_25C:                                ; offset=025Ch
        mov  a, m
        ora  a
        inx  h
        jnz  loc_25C
        jmp  loc_258

loc_265:                                ; offset=0265h
        call print_str
        pop  h
        ret

title_msg:                              ; offset=026Ah
        db   1Bh, "Y) wersiq 1.0 r-86rk", 0Dh, 0Ah, 0Ah,
        db   "390008 rqzanx bratislawskaq 27", 0Dh, 0Ah,
        db   "radiotehni~eskij institut", 0Dh, 0Ah,
        db   "skb  ", 22h, "DESIGN", 22h, 0Dh, 0Ah,
        db   "(C) 1987 BONY", 0Dh, 0Ah, 0Ah,
        db   "Men`:", 0Dh, 0Ah, 0Ah,
        db   "P - igra", 0Dh, 0Ah,
        db   "K - programmirowanie klawi{", 0Dh, 0Ah,
        db   "S - zwuk", 0Dh, 0Ah,
        db   "E - wyhod",
        db   1Bh, "Y)Hwlewo -",
        db   1Bh, "Y*Hwprawo-",
        db   1Bh, "Y+Hwwerh -",
        db   1Bh, "Y,Hwniz  -",
        db   1Bh, "Y-Hogonx - dr.",
        db   1Bh, "Y.Hzwuk  - w",
        db   1Bh, "Y/C-+-",
        db   1Bh, "Y0AI  O-+ lu~{ie spasateli:",
        db   1Bh, "Y2>1)",
        db   1Bh, "Y3>2)",
        db   1Bh, "Y4>3)",
        db   1Bh, "Y5>4)",
        db   1Bh, "Y6>5)", 0
input_command_msg:                      ; offset=03A8h
        db   1Bh
        db   59h     ; Y
        db   38h     ; 8
        db   20h, "wwedite direktiwu:", 0
last_rescuer_msg:                       ; offset=03BFh
        db   " - poslednij rezulxtat", 0
end_msg:                                ; offset=03D6h
        db   " konec ...", 0
sound_on_msg:                           ; offset=03E1h
        db   6Bh     ; k
        db   6Ch     ; l
        db   20h, 0
sound_off_msg:                          ; offset=03E5h
        db   79h     ; y
        db   6Bh     ; k
        db   6Ch     ; l
        db   0, 1Fh, 1Bh
        db   62h     ; b
        db   0
set_cursor_somewhere:                   ; offset=03EDh
        db   1Fh, 1Bh
        db   61h     ; a
        db   0
delete_msg:                             ; offset=03F1h
        db   "DELETE", 0
; -----------------------------------------------------------------------
; Key name lookup table -- null-terminated strings for display_controls.
; Indexed by key code (0x00..0x1F). sub_22B scans through these
; null-terminated entries to find the name for a given key code.
; Used when showing/programming the helicopter control keys.
; -----------------------------------------------------------------------
f1_msg:                                 ; offset=03F8h
        db   "F1", 0
        db   "F2", 0
        db   "F3", 0
        db   "F4", 0
        db   "^D", 0
        db   "^E", 0
        db   "^F", 0
        db   "^G", 0
        db   "LEFT", 0
        db   "^J", 0
        db   "LINE FEED", 0
        db   "^K", 0
        db   "HOME", 0
        db   "RETURN", 0
        db   "^N", 0
        db   "^O", 0
        db   "^P", 0
        db   "^Q", 0
        db   "^R", 0
        db   "^S", 0
        db   "^T", 0
        db   "^U", 0
        db   "^V", 0
        db   "^W", 0
        db   "RIGHT", 0
        db   "UP", 0
        db   "DOWN", 0
        db   "ESCAPE", 0
        db   "^", 5Ch, 0     ; "^\"
        db   "^]", 0
        db   "^^", 0
        db   "^_", 0
        db   "SPACE", 0
you_best_rescuer_msg:                   ; offset=0476h
        db   1Bh
        db   59h     ; Y
        db   28h     ; (
        db   20h, "wy lu~{ij spasatelx  !", 0
your_name_history_msg:                  ; offset=0491h
        db   1Bh
        db   59h     ; Y
        db   2Eh     ; .
        db   2Ah     ; *
        db   "wa{e imq wojdet w istori`  - ", 0
you_good_pilot_msg:                     ; offset=04B3h
        db   1Bh
        db   59h     ; Y
        db   2Ah     ; *
        db   2Fh     ; /
        db   " i wysokoklasnyj pilot wertoletow !", 0
back_space_back_msg:                    ; offset=04DBh
        db   8, " ", 8, 0
; -----------------------------------------------------------------------
; volcano -- title screen bitmap font data
; Structure: 7 bytes of character table ("VOLCANO") followed by
; 49 bytes of bitmap data (7 rows x 7 bytes per row).
;
; Rendering (see loc_167): for each of the 7 rows, 7 bitmap bytes are
; processed. Each byte is 8 pixels (MSB first via RAL). A '1' bit prints
; the corresponding column's letter from "VOLCANO"; a '0' bit prints space.
;
; Result: large pixel-art title where each letter column uses its own char:
;   V.....V. .OOOOO.. L....... .CCCCC.. ......A. N.....N. .OOOOO..
;   V....V.. O.....O. L....... C.....C. .....AA. NN....N. O.....O.
;   V...V... O.....O. L....... C....... ....A.A. N.N...N. O.....O.
;   V..V.... O.....O. L....... C....... ...A..A. N..N..N. O.....O.
;   V.V..... O.....O. L....... C....... ..A...A. N...N.N. O.....O.
;   VV...... O.....O. L....... C.....C. .AAAAAA. N....NN. O.....O.
;   V....... .OOOOO.. LLLLLLL. .CCCCC.. A.....A. N.....N. .OOOOO..
; -----------------------------------------------------------------------
volcano:                                ; offset=04DFh
        db   'V', 'O', 'L', 'C', 'A', 'N', 'O'
        db   82h
        db   7Ch     ; |
        db   80h
        db   7Ch     ; |
        db   2
        db   82h
        db   7Ch     ; |
        db   84h
        db   82h
        db   80h
        db   82h
        db   6
        db   0C2h
        db   82h
        db   88h
        db   82h
        db   80h
        db   80h
        db   0Ah
        db   0A2h
        db   82h
        db   90h
        db   82h
        db   80h
        db   80h
        db   12h
        db   92h
        db   82h
        db   0A0h
        db   82h
        db   80h
        db   80h
        db   22h     ; "
        db   8Ah
        db   82h
        db   0C0h
        db   82h
        db   80h
        db   82h
        db   7Eh     ; ~
        db   86h
        db   82h
        db   80h
        db   7Ch     ; |
        db   0FEh
        db   7Ch     ; |
        db   82h
        db   82h
        db   7Ch     ; |

; -----------------------------------------------------------------------
; move_stone -- update one stone/ash particle position and draw it
; Input:  HL = pointer to 8-byte stone structure (see init_stone)
; Output: HL = pointer past the structure (HL+8)
;
; Updates position using 16-bit fixed-point arithmetic:
;   x_pos += x_vel (constant horizontal drift)
;   y_vel += 1 (gravity acceleration)
;   y_pos += y_vel (vertical movement)
; If stone goes off-screen (row >= 25 or col >= 64), respawns it.
; Erases old '*' from screen, draws new '*' at updated position.
; If new position hits helicopter 'O', triggers collision.
; If new position has '-' (bullet), replaces with '+' (hit marker).
; -----------------------------------------------------------------------
move_stone:                             ; offset=0517h
        push b
        mov  a, m     ; [0] x_vel_lo
        inx  h
        add  m        ; + [1] x_pos_lo
        mov  m, a     ; [1] x_pos_lo += x_vel_lo
        inx  h
        mov  a, m     ; [2] x_vel_hi
        inx  h
        mov  c, m     ; c = [3] x_pos_hi (old column)
        adc  c        ; a = x_vel_hi + x_pos_hi + carry
        mov  m, a     ; [3] x_pos_hi = new column
        mov  b, a     ; b = new column
        inx  h
        mov  a, m     ; [4] y_vel_lo
        adi  1        ; y_vel_lo += 1 (gravity!)
        mov  m, a     ; [4] y_vel_lo updated
        mov  e, a     ; e = new y_vel_lo
        inx  h
        mov  a, m     ; [5] y_vel_hi
        aci  0        ; y_vel_hi += carry from y_vel_lo overflow
        mov  m, a     ; [5] y_vel_hi updated
        mov  d, a     ; d = new y_vel_hi
        inx  h
        mov  a, m     ; [6] y_pos_lo
        add  e        ; y_pos_lo += y_vel_lo
        mov  m, a     ; [6] y_pos_lo updated
        inx  h
        mov  a, m     ; [7] y_pos_hi (old row)
        mov  e, a     ; e = old row (for erasing)
        adc  d        ; a = y_pos_hi + y_vel_hi + carry
        mov  m, a     ; [7] y_pos_hi = new row
        mov  d, a     ; d = new row
        inx  h        ; HL past the 8-byte structure
        push h
        cpi  19h      ; new row >= 25? (off screen bottom)
        jnc  respawn_stone
        mov  a, b     ; new column
        cpi  40h      ; new column >= 64? (off screen)
        jnc  respawn_stone
        ; -- erase old position, draw new position --
        ; at this point: b=new_col, c=old_col, d=new_row, e=old_row
        mov  a, e                    ; a = old row
        mov  l, c                    ; l = old column
        call screen_area_address     ; get screen buffer address for old pos
        mov  a, m                    ; what's at old position in buffer?
        cpi  2Ah                     ; is it '*' (our stone)?
        jnz  stone_done              ; if not '*', someone else overwrote it, skip erase

erase_and_draw_stone:                 ; offset=0551h
        mvi  m, 20h                  ; clear old position in screen buffer
        mov  l, e                    ; l = old row
        mov  h, c                    ; h = old column
        call set_cursor              ; position terminal cursor at old pos
        mvi  c, 20h                  ; print space (erase on screen)
        call monitor_cout
        mov  l, b                    ; l = new column
        mov  a, d                    ; a = new row
        call screen_area_address     ; get screen buffer address for new pos
        mov  a, m                    ; what's at new position?
        cpi  2Dh                     ; is it '-' (bullet)?
        jz   stone_hit_bullet        ; bullet hit: show '+' instead of '*'
        cpi  4Fh                     ; is it 'O' (helicopter cockpit)?
        jz   collision_condition     ; helicopter crash!
        mvi  c, 2Ah                  ; draw '*' (normal stone)

draw_stone_char:              ; offset=056Fh
        mov  m, c             ; write to screen buffer
        mov  l, d             ; l = new row
        mov  h, b             ; h = new column
        call set_cursor       ; position terminal cursor
        call monitor_cout     ; draw the character

stone_done:                   ; offset=0578h
        pop  h
        pop  b
        ret

stone_hit_bullet:             ; offset=057Bh
        mvi  c, 2Bh     ; '+' = stone destroyed by bullet
        jmp  draw_stone_char

set_cursor:                             ; offset=0580h
        push b
        mvi  c, 1Bh
        call monitor_cout
        mvi  c, 59h     ; 'Y'
        call monitor_cout
        mvi  a, 20h     ; ' '
        add  l
        mov  c, a
        call monitor_cout
        mvi  a, 20h     ; ' '
        add  h
        mov  c, a
        call monitor_cout
        pop  b
        ret


; -----------------------------------------------------------------------
; set_cursor_in_screen_arena -- set terminal cursor AND return buffer addr
; Input: H = column, L = row
; Output: HL = screen_area buffer address, cursor positioned on screen
; Combines set_cursor (for terminal) with screen_area_address_hl (for buffer).
; -----------------------------------------------------------------------
set_cursor_in_screen_arena:     ; offset=059Bh
        call set_cursor     ; set terminal cursor (Y=l, X=h)
        ; fall through to screen_area_address_hl

; screen_area_address_hl -- convert (row=L, col=H) to buffer address
; Input: H = column, L = row
; Output: HL = screen_area buffer address
screen_area_address_hl:     ; offset=059Eh
        mov  a, l     ; a = row (swap: screen_area_address wants col in A)
        mov  l, h     ; l = column
        ; fall through to screen_area_address

; -----------------------------------------------------------------------
; screen_area_address -- convert (row, col) to screen buffer address
; Input: A = column (0-63), L = row (0-24)
; Output: HL = address in screen_area buffer
;
; RK86 screen layout: 64 columns x 25 rows, but memory is NOT linear.
; Address = screen_area + (col >> 2) * 256 + (col & 3) * 64 + row
;
; The two RRC instructions rotate A (column) right by 2:
;   A = [c1 c0 c7 c6 c5 c4 c3 c2]
; Then H gets top 6 bits (col >> 2), and L gets (col & 3) * 64 + row.
; This matches the RK86 video RAM interleaved bank layout.
; -----------------------------------------------------------------------
screen_area_address:     ; offset=05A0h
        push d
        rrc           ; rotate column right (step 1 of 2)
        rrc           ; A = [c1 c0 c7 c6 c5 c4 c3 c2]
        mov  h, a     ; save rotated value
        ani  0C0h     ; a = [c1 c0 0 0 0 0 0 0] = (col & 3) << 6
        ora  l        ; a = (col & 3) * 64 + row
        mov  l, a     ; L = low byte of offset
        mvi  a, 3Fh
        ana  h        ; a = [0 0 c7 c6 c5 c4 c3 c2] = col >> 2
        mov  h, a     ; H = high byte of offset
        lxi  d, screen_area
        dad  d        ; HL = screen_area + offset
        pop  d
        ret

; -----------------------------------------------------------------------
; init_stone -- initialize one 8-byte stone/ash particle structure
; Input:  HL = pointer to 8-byte structure
; Output: HL = pointer past the structure (HL+8)
;
; Stone structure (8 bytes, 16-bit fixed-point with 8.8 format):
;   byte 0: x_vel_lo   - X velocity fraction (constant per stone)
;   byte 1: x_pos_lo   - X position fraction
;   byte 2: x_vel_hi   - X velocity integer (signed, constant per stone)
;   byte 3: x_pos_hi   - X position integer (column 0-63)
;   byte 4: y_vel_lo   - Y velocity fraction (+1 each frame = gravity)
;   byte 5: y_vel_hi   - Y velocity integer (starts 0xFF = -1 = upward)
;   byte 6: y_pos_lo   - Y position fraction
;   byte 7: y_pos_hi   - Y position integer (row 0-24)
;
; Physics: x_pos += x_vel (constant horizontal drift)
;          y_vel += 1 per frame (gravity acceleration)
;          y_pos += y_vel (parabolic arc: starts upward, curves down)
;
; Spawns at volcano peak (columns 37-40, row 8) with random velocity.
; Maps to Python's make_ash(x, y, vx, vy) + ash spawn logic.
; -----------------------------------------------------------------------
init_stone:               ; offset=05B2h
        push b
        mvi  a, 3
        call random      ; random [0..3]
        mov  c, a        ; c = column offset
        adi  25h         ; a = 37 + offset = column 37-40 (peak)
        mov  d, a        ; d = x_pos_hi (initial column)
        mvi  a, 0FFh
        call random      ; random [0..255]
        mov  e, a        ; e = x_pos_lo (random fraction)
        ani  0FCh
        ora  c           ; mix column offset into random byte
        rrc
        rrc              ; >>2: scale down
        sui  80h         ; subtract 128 to center around 0 (signed)
        mov  c, a        ; c = x_vel_lo (signed random velocity)
        sbb  a           ; a = sign extension (0x00 or 0xFF)
        mov  m, c        ; [0] x_vel_lo
        inx  h
        mov  m, e        ; [1] x_pos_lo (random)
        inx  h
        mov  m, a        ; [2] x_vel_hi (sign extension)
        inx  h
        mov  m, d        ; [3] x_pos_hi (column 37-40)
        inx  h
        xra  c           ; a = sign ^ vel_lo (derive Y vel from X vel)
        sui  83h         ; bias upward
        mov  m, a        ; [4] y_vel_lo (upward component)
        inx  h
        mvi  m, 0FFh     ; [5] y_vel_hi = -1 (moving upward)
        inx  h
        mvi  m, 0        ; [6] y_pos_lo = 0
        inx  h
        mvi  m, 8        ; [7] y_pos_hi = row 8 (near volcano peak)
        inx  h
        pop  b
        ret

; Stone went off-screen -- rewind HL to start of structure, reinitialize
respawn_stone:                         ; offset=05E3h
        push d
        lxi  d, 0FFF8h                ; -8
        dad  d                        ; hl -= 8 (back to start of stone struct)
        call init_stone               ; reinitialize with new random trajectory
        mov  b, d                     ; b = new x_pos_hi (column)
        pop  d
        mvi  d, 8                     ; d = row 8 (initial Y for drawing)
        mov  a, e
        mov  l, c
        call screen_area_address
        jmp  erase_and_draw_stone     ; draw '*' at new position

; -----------------------------------------------------------------------
; random(max) -- pseudo-random number generator
; Input:  A = max value (inclusive upper bound)
; Output: A = random value in [0..max]
;
; Algorithm:
;   1. Uses rng_seed (16-bit) as a pointer into low memory (0x0000-0x1FFF,
;      the ROM monitor area on RK86) to read a byte for entropy.
;   2. Mixes that byte with rng_accum and the max parameter.
;   3. Advances the seed: rng_seed += (max << 8 | rng_accum) + 1
;   4. Rejection sampling with a narrowing bitmask to produce an unbiased
;      result in [0..max]: starts with mask=0xFF, halves it until
;      (random_byte & mask) <= max.
; -----------------------------------------------------------------------
random:                     ; offset=05F7h
        push d
        push h
        mov  d, a          ; d = max (parameter)
        lhld rng_seed
        mvi  a, 1Fh
        ana  h             ; h &= 0x1F -- limit pointer to 0x0000-0x1FFF
        mov  h, a
        lda  rng_accum
        add  m             ; a += byte read from memory[rng_seed & 0x1FFF]
        add  d             ; a += max
        sta  rng_accum     ; save updated accumulator
        mov  e, a          ; e = random byte
        dad  d             ; rng_seed += de (d=max, e=accum)
        inx  h             ; rng_seed += 1
        shld rng_seed
        mvi  a, 0FFh       ; initial bitmask = 0xFF
        jmp  rng_narrow_check

rng_narrow_mask:                        ; offset=0614h  mask >>= 1 (halve the mask)
        mov  a, h
        rar

rng_narrow_check:                       ; offset=0616h
        mov  h, a                ; h = current mask
        ana  e                   ; a = mask & random_byte
        cmp  d                   ; compare with max
        jz   rng_done            ; if == max, accept
        jnc  rng_narrow_mask     ; if > max, narrow mask and retry
        ; if < max, fall through and accept
rng_done:                               ; offset=061Fh
        pop  h
        pop  d
        ret

print_str:                              ; offset=0622h
        push b
        jmp  print_str_check

print_str_loop:                         ; offset=0626h
        mov  c, a
        call monitor_cout

print_str_check:                        ; offset=062Ah
        mov  a, m
        ora  a
        inx  h
        jnz  print_str_loop
        pop  b
        ret

start_game:                             ; offset=0632h
        lxi  h, set_cursor_somewhere     ; CTP
        call print_str
        lxi  h, 9
        call set_cursor
        lxi  h, screen_area
        lxi  d, 640h                     ; 64x25

clean_screen_area_loop:                 ; offset=0644h
        mvi  m, 20h                  ; ' '
        inx  h
        dcx  d
        mov  a, d
        ora  e
        jnz  clean_screen_area_loop
        lxi  h, packed_landscape     ; format: counter,    char, or 0xFF and ASCIIZ
        lxi  d, 013bfh               ; unpacked_landscape

landscape_unpack_loop_0:                ; offset=0653h
        push d

landscape_unpack_loop_1:                ; offset=0654h
        mov  a, m                        ; get a counter
        mov  b, a                        ; b = counter
        inx  h
        ora  a
        jz   init_bullets_and_stones     ; if the counter is 0,    we done
        jm   landscape_print_till_0      ; the character    is negative?
        mov  a, m                        ; get a character
        inx  h
        ora  a
        jz   next_landspace_line         ; if the character    is 0, go to the    next line to print
        mov  c, a                        ; c = character

landscape_char_loop:                    ; offset=0665h
        mov  a, c
        stax d
        call monitor_cout
        inx  d
        dcr  b
        jnz  landscape_char_loop
        jmp  landscape_unpack_loop_1     ; get a counter

landscape_print_till_0:                 ; offset=0672h
        mov  a, m                        ; get a character
        inx  h
        ora  a
        jz   landscape_unpack_loop_1     ; get a counter
        mov  c, a
        stax d
        call monitor_cout
        inx  d
        jmp  landscape_print_till_0      ; get a    character

next_landspace_line:                    ; offset=0681h
        call print_crlf
        pop  d
        xchg
        lxi  b, 40h     ; '@'
        dad  b
        xchg
        jmp  landscape_unpack_loop_0

print_crlf:                             ; offset=068Eh
        mvi  c, 0Dh
        call monitor_cout
        mvi  c, 0Ah
        jmp  monitor_cout

init_bullets_and_stones:                ; offset=0698h
        pop  d
        lxi  h, bullets_coords     ; 10 (0x0a), 4 bytes each, 40 bytes total
        shld free_bullet
        mvi  b, 0Ah                ; 10

zero_bullets_loop:                      ; offset=06A1h
        mvi  m, 0
        lxi  d, 4
        dad  d
        dcr  b
        jnz  zero_bullets_loop
        lxi  h, 3911h     ; H=39h (col 57), L=11h (row 17): first slot inside station
        shld station_deposit_pos
        lxi  h, stone_coords
        mvi  b, 14h       ; number of stones?

init_stones_loop:                       ; offset=06B6h
        call init_stone
        push h
        mvi  a, 8
        mov  l, d
        call screen_area_address
        mvi  m, 2Ah     ; '*'
        mvi  l, 8
        mov  h, d
        call set_cursor
        mvi  c, 2Ah     ; '*'
        call monitor_cout
        pop  h
        dcr  b
        jnz  init_stones_loop
        mvi  a, 0FFh
        sta  hanging_human_y
        mvi  a, 0Ah
        sta  lava_timer
        mvi  a, 10h
        sta  lava_level
        xra  a
        sta  number_of_souls
        sta  saved_people
        mvi  a, 3
        sta  used_helicopters
        mvi  a, 7
        sta  human_hands_timer

loc_6F2:                                ; offset=06F2h
        lxi  sp, screen_area
        call monitor_kbhit
        ora  a
        jz   loc_6FF     ; no_key_pressed
        call monitor_cin

loc_6FF:                                ; offset=06FFh
        xra  a
        sta  helicopter_orientation         ; 0 - left, FF - right
        sta  hanging_human
        lda  used_helicopters
        dcr  a
        jm   game_over_screen
        sta  used_helicopters
        add  a
        adi  14h
        mov  l, a
        mvi  h, 3Ah                         ; ':'
        call set_cursor_in_screen_arena     ; Y = l, X = h
        mvi  d, 20h                         ; ' '
        xra  a
        call write_heli_to_buffer
        lxi  h, clear_helicopter_left_msg
        call print_str
        lxi  h, 3A0Fh
        shld helicopter_xy
        call set_cursor_in_screen_arena     ; Y = l, X = h
        mvi  d, 4Fh                         ; 'O'
        xra  a
        call write_heli_to_buffer
        lxi  h, helicopter_left_msg
        call print_str
        call beep

game_loop:                              ; offset=073Dh
        lxi  h, bullets_coords     ; 10 (0x0a), 4 bytes each, 40 bytes total
        mvi  b, 0Ah

loc_742:                                ; offset=0742h
        call process_bullet
        dcr  b
        jnz  loc_742
        lxi  h, stone_coords
        mvi  b, 14h

move_stones_loop:                       ; offset=074Eh
        call move_stone            ; disable stone development
        dcr  b
        jnz  move_stones_loop      ; disable stone development
        lxi  h, bullets_coords     ; 10 (0x0a), 4 bytes each, 40 bytes total
        mvi  b, 0Ah

loc_75A:                                ; offset=075Ah
        call process_bullet
        dcr  b
        jnz  loc_75A
        lhld hanging_human_y
        mov  a, l
        ora  a
        jm   loc_79F
        xchg
        mov  l, d
        call screen_area_address
        mvi  m, 20h     ; ' '
        lxi  b, 40h     ; '@'
        dad  b
        mov  a, m
        cpi  20h        ; ' '
        jnz  loc_874
        mvi  m, 59h     ; 'Y'
        xchg
        call set_cursor
        mvi  c, 20h     ; ' '
        call monitor_cout
        mvi  c, 1Ah
        call monitor_cout
        mvi  c, 8
        call monitor_cout
        mov  a, l
        rrc
        mvi  c, 4Ch     ; 'L'
        jc   loc_798
        mvi  c, 4Ah     ; 'J'

loc_798:                                ; offset=0798h
        call monitor_cout
        inr  l
        shld hanging_human_y

loc_79F:                                ; offset=079Fh
        call process_helicopter
        lda  number_of_souls
        ora  a
        jz   skip_printing_souls
        mov  b, a
        lxi  h, souls_positions

souls_print_loop:                       ; offset=07ADh
        mov  e, m
        inx  h
        mov  d, m
        inx  h
        xchg
        call set_cursor
        lxi  h, soul_msg     ; "()"
        call print_str
        xchg
        dcr  b
        jnz  souls_print_loop

skip_printing_souls:                    ; offset=07C0h
        lda  human_hands_timer
        dcr  a
        sta  human_hands_timer
        jnz  game_loop
        lxi  h, 316h
        call animate_person_wave
        lxi  h, 0A14h
        call animate_person_wave
        lxi  h, 1311h
        call animate_person_wave
        lxi  h, 1C0Dh
        call animate_person_wave
        mvi  a, 7
        sta  human_hands_timer
        lda  number_of_souls
        ora  a
        jz   skip_souls_collision_check
        mov  b, a
        lxi  h, souls_positions

souls_collision_check:                  ; offset=07F2h
        call move_and_check_soul
        dcr  b
        jnz  souls_collision_check

skip_souls_collision_check:             ; offset=07F9h
        lda  lava_timer
        dcr  a
        jnz  skip_lava
        call process_lava               ; disable lava development
        mvi  a, 0Ah

skip_lava:                              ; offset=0805h
        sta  lava_timer
        lda  hanging_human
        ora  a
        jz   game_loop
        mov  b, a
        lda  hanging_human_timer
        dcr  a
        sta  hanging_human_timer
        jz   hanging_human_timer_expired
        cpi  0Ah
        jnc  game_loop
        mov  a, b
        cpi  4Ah        ; 'J'
        mvi  a, 4Ch     ; 'L'
        jz   swing_handing_man
        mvi  a, 4Ah     ; 'J'

swing_handing_man:                      ; offset=0829h
        sta  hanging_human
        jmp  game_loop

; -----------------------------------------------------------------------
; process_lava -- advance lava one row down the volcano
; Decrements lava_level (which counts down from 0x10 toward 0).
; Uses lava_levels table: each entry is 5 bytes:
;   byte 0: count   - number of '+' chars to draw on this row
;   byte 1: row     - screen row (Y coordinate)
;   byte 2: column  - starting screen column (X coordinate)
;   byte 3: human_row - row of person on this ledge (0 = no person)
;   byte 4: human_col - column of person on this ledge
; If a person ('I' or 'Y') is at the human position, they are killed
; (erased, explosion triggered, soul created).
; Maps to Python's lava_level increment + person kill check.
; -----------------------------------------------------------------------
process_lava:                                ; offset=082Fh
        lda  lava_level
        dcr  a                              ; advance lava one step
        rm                                  ; if < 0, lava reached bottom, done
        sta  lava_level
        mov  b, a
        add  a
        add  a
        add  b                              ; a = lava_level * 5
        mov  e, a
        mvi  d, 0                           ; de = lava_level * 5
        lxi  h, lava_levels
        dad  d                              ; hl = &lava_levels[lava_level]
        mov  b, m                           ; b = count (number of '+' to draw)
        inx  h
        mov  e, m                           ; e = row
        inx  h
        mov  d, m                           ; d = column
        xchg                                ; hl = row,col for cursor; de = table ptr
        call set_cursor_in_screen_arena     ; set cursor + get buffer ptr

        mvi  c, 2Bh     ; '+' = lava character
lava_fill_loop:                ; offset=084Dh
        call monitor_cout     ; draw '+' on screen
        mov  m, c             ; write '+' to screen buffer
        inx  h
        dcr  b
        jnz  lava_fill_loop

        call beep
        xchg       ; hl = table ptr (at byte 2)
        inx  h     ; hl -> byte 3 (human_row)
        mov  a, m
        ora  a
        rz         ; human_row == 0 means no person here

        ; Check if person is still alive at this position
        inx  h                       ; hl -> byte 4 (human_col)
        mov  d, m                    ; d = human_col
        mov  e, a                    ; e = human_row
        mov  l, d
        call screen_area_address     ; get buffer addr for person position
        mov  a, m
        cpi  59h                     ; is it 'Y' (person waving)?
        jz   lava_hits_human
        cpi  49h                     ; is it 'I' (person standing)?
        rnz                          ; neither -> person already rescued/dead

lava_hits_human:              ; offset=086Eh
        mvi  m, 20h          ; erase person from screen buffer
        xchg                 ; hl = person row,col
        jmp  kill_person     ; trigger explosion + create soul

loc_874:                                ; offset=0874h
        call beep
        xchg
        cpi  59h     ; 'Y'
        cz   erase_and_kill_person
        cpi  49h     ; 'I'
        cz   erase_and_kill_person
        mvi  a, 0FFh
        sta  hanging_human_y
        call kill_person
        jmp  loc_79F

erase_and_kill_person:                  ; offset=088Dh
        xchg
        mvi  m, 20h     ; ' '
        xchg
        jmp  kill_person

; kill_person -- explosion + slow_explosion + create_soul
; Input: HL = position of dying person
kill_person:     ; offset=0894h
        push b
        call explosion
        call slow_explosion
        call create_soul
        pop  b
        ret

; -----------------------------------------------------------------------
; create_soul -- add a soul "()" to the souls array and draw it
; Input: HL = position (row, col) where person died
; Increments number_of_souls, stores position in souls_positions array.
; Checks if cell to the right is free to avoid overlapping terrain.
; If number_of_souls + saved_people == 4 (all people accounted for),
; triggers game over via game_over_screen.
; -----------------------------------------------------------------------
create_soul:                          ; offset=08A0h
        push h
        xchg
        lda  number_of_souls
        inr  a
        sta  number_of_souls
        dcr  a
        add  a
        mov  c, a
        mvi  b, 0
        mov  a, e
        mov  l, d
        call screen_area_address
        inx  h
        mov  a, m
        cpi  20h     ; ' '
        jz   soul_pos_ok
        dcr  d

soul_pos_ok:                            ; offset=08BBh
        lxi  h, 0FAFh
        dad  b
        mov  m, e
        inx  h
        mov  m, d
        xchg
        call set_cursor
        lxi  h, soul_msg     ; "()"
        call print_str
        call beep
        lda  number_of_souls
        lxi  h, 0F19h
        add  m
        pop  h
        cpi  4
        rnz
        jmp  game_over_screen

hanging_human_timer_expired:            ; offset=08DDh
        xra  a
        sta  hanging_human
        lhld helicopter_xy
        inr  l
        shld hanging_human_y
        call screen_area_address_hl
        mvi  m, 59h     ; 'Y'
        jmp  game_loop

; -----------------------------------------------------------------------
; animate_person_wave -- toggle person between 'I' (arms down) and 'Y'
;   (arms up) to create waving animation. Called every 7 game ticks.
; Input:  HL = person screen position (L=row, H=column)
; If cell is 'I', change to 'Y'. If 'Y', change to 'I'. Otherwise no-op.
; Maps to Python's wave_toggle alternating between 'I' and 'Y'.
; -----------------------------------------------------------------------
animate_person_wave:                         ; offset=08F0h
        call set_cursor_in_screen_arena     ; set cursor + get screen buffer addr
        mov  a, m                           ; read current character at person position
        mvi  c, 59h                         ; 'Y' (arms up)
        cpi  49h                            ; is it 'I'?
        jz   do_person_wave                 ; yes -> change to 'Y'
        mvi  c, 49h                         ; 'I' (arms down)
        cpi  59h                            ; is it 'Y'?
        rnz                                 ; neither 'I' nor 'Y' -> person gone, skip

do_person_wave:                ; offset=0900h
        mov  m, c             ; update screen buffer
        jmp  monitor_cout     ; print new character to screen

; -----------------------------------------------------------------------
; process_helicopter -- handle keyboard input, move helicopter, check collisions
; Reads keyboard for directional keys and fire button.
; Movement: updates helicopter_xy, checks if new position is clear
;   (3 cells for body row + 3 cells for rotor row must all be spaces).
; If blocked by terrain/lava/station, triggers collision_condition.
; If person (I/Y) is directly below cockpit, picks them up.
; Fire: creates a bullet entry in bullets_coords array.
; Maps to Python's helicopter update + pickup + collision logic.
; -----------------------------------------------------------------------
process_helicopter:                               ; offset=0904h
        lda  helicopter_orientation              ; 0 - left, FF - right
        sta  helicopter_orientation_original
        lhld helicopter_xy
        shld prev_helicopter_xy
        xchg
        lxi  b, 0
        call monitor_kbhit
        ora  a
        jz   heli_bounds_check
        call monitor_cin
        lxi  h, control_codes
        cmp  m
        jz   move_up
        inx  h
        cmp  m
        jz   move_left
        inx  h
        cmp  m
        jz   move_down
        inx  h
        cmp  m
        jz   move_right
        lhld free_bullet
        mov  a, m
        ora  a
        rnz                                      ; if no free cell for a bullet -> exit
        lda  helicopter_orientation_original     ; 0 - left, FF - right
        cma
        mov  b, a                                ; b = bullet X direction: FF (-1) left, 1 right
        ori  1
        mov  m, a
        inx  h
        mov  m, b
        inx  h
        mov  m, e
        inx  h
        mov  m, d
        ret

move_left:                              ; offset=0949h
        inr  d
        lxi  b, 1
        mvi  a, 0FFh

heli_set_orientation:                   ; offset=094Fh
        sta  helicopter_orientation     ; 0 - left, FF - right

heli_bounds_check:                      ; offset=0952h
        mov  a, d
        dcr  a
        cpi  3Dh                        ; '='
        rnc
        mov  a, e
        ora  a
        rz
        xchg
        shld helicopter_xy
        lhld prev_helicopter_xy
        call screen_area_address_hl
        push h
        mvi  d, 20h                     ; ' '
        lda  helicopter_orientation_original
        call write_heli_to_buffer
        pop  h
        dad  b
        push h
        lda  helicopter_orientation     ; 0 - left, FF - right
        ora  a
        mvi  a, 20h                     ; ' '
        jnz  heli_check_right
        call check_3_cells_empty
        jnz  heli_person_in_way
        lxi  d, 0FFBDh

heli_check_body:                        ; offset=0982h
        dad  d
        call check_3_cells_empty
        jnz  heli_person_in_way
        lxi  d, 7Fh
        dad  d
        lda  hanging_human
        mov  b, a
        ora  a
        jz   heli_check_pickup
        mov  a, m
        cpi  20h        ; ' '
        jnz  heli_person_in_way
        lxi  d, 40h     ; '@'
        dad  d
        mov  a, m
        cpi  3Dh        ; '='
        cz   deposit_person

heli_draw_and_print:                    ; offset=09A5h
        pop  h
        mvi  d, 4Fh                     ; 'O'
        lda  helicopter_orientation     ; 0 - left, FF - right
        call write_heli_to_buffer
        lhld prev_helicopter_xy
        call set_cursor
        lda  helicopter_orientation_original
        ora  a
        lxi  h, clear_helicopter_left_msg
        cnz  clear_helicopter_right_address
        call print_str
        dcr  b
        jm   heli_print_new
        mvi  c, 20h                     ; ' '
        call monitor_cout

heli_print_new:                         ; offset=09CAh
        lhld helicopter_xy
        call set_cursor
        lda  helicopter_orientation     ; 0 - left, FF - right
        ora  a
        lxi  h, helicopter_left_msg
        cnz  helicopter_right_address
        call print_str
        lda  hanging_human
        ora  a
        rz
        mov  c, a
        jmp  monitor_cout

move_down:                              ; offset=09E6h
        dcr  e
        lxi  b, 0FFC0h
        jmp  heli_bounds_check

move_up:                                ; offset=09EDh
        dcr  d
        lxi  b, 0FFFFh
        xra  a
        jmp  heli_set_orientation

move_right:                             ; offset=09F5h
        lxi  b, 40h     ; '@'
        inr  e
        mov  a, e
        mov  l, d
        call screen_area_address
        mov  a, m
        cpi  3Dh        ; '='
        jnz  heli_bounds_check
        dcr  e
        mvi  c, 0
        jmp  heli_bounds_check

; write_3_to_buffer -- write byte A to 3 consecutive screen buffer cells
; Used to fill rotor or body line of helicopter in screen buffer.
write_3_to_buffer:     ; offset=0A0Ah
        mov  m, a
        inx  h
        mov  m, a
        inx  h
        mov  m, a
        ret

heli_write_right:                       ; offset=0A10h
        lxi  d, 0FFFEh
        dad  d
        call write_3_to_buffer
        lxi  d, 0FFBFh
        jmp  heli_write_rotor

; -----------------------------------------------------------------------
; write_heli_to_buffer -- write helicopter sprite to screen buffer
; Input: HL = screen buffer address at cockpit position
;        A (on entry via ORA A): 0=left-facing, nonzero=right-facing
;        D = character to write (0x20=space for erase, 0x4F=O for draw)
; Writes 3 chars to body row and 3 chars to rotor row in buffer.
; If hanging_human is active, also writes person char below cockpit.
; -----------------------------------------------------------------------
write_heli_to_buffer:     ; offset=0A1Dh
        ora  a
        mov  a, d
        jnz  heli_write_right
        call write_3_to_buffer
        lxi  d, 0FFBDh

heli_write_rotor:                       ; offset=0A28h
        dad  d
        call write_3_to_buffer
        lxi  d, 7Fh
        dad  d
        mov  d, a
        lda  hanging_human
        ora  a
        rz
        mov  m, d
        ret

heli_check_right:                       ; offset=0A38h
        lxi  d, 0FFFEh
        dad  d
        call check_3_cells_empty
        jnz  heli_person_in_way
        lxi  d, 0FFBFh
        jmp  heli_check_body

; check_3_cells_empty -- check if 3 consecutive screen buffer cells are space
; Input: A = 0x20 (space), HL = buffer address
; Output: Z flag set if all 3 cells are space (path clear for helicopter)
check_3_cells_empty:     ; offset=0A48h
        cmp  m
        rnz
        inx  h
        cmp  m
        rnz
        inx  h
        cmp  m
        ret

heli_check_pickup:                      ; offset=0A50h
        mov  a, m
        cpi  49h     ; 'I'
        jz   heli_pickup_person
        cpi  59h     ; 'Y'
        jnz  heli_draw_and_print

heli_pickup_person:                     ; offset=0A5Bh
        mvi  a, 49h     ; 'I'
        sta  hanging_human
        mvi  a, 28h     ; '('
        sta  hanging_human_timer
        jmp  heli_draw_and_print

clear_helicopter_right_address:         ; offset=0A68h
        lxi  h, clear_helicopter_right_msg
        ret

helicopter_right_address:               ; offset=0A6Ch
        lxi  h, helicopter_right_msg
        ret

; -----------------------------------------------------------------------
; deposit_person -- drop rescued person at station
; Called when helicopter with hanging person moves over station roof (=).
; Places 'I' in station, increments saved_people counter.
; If all 4 people saved, triggers game over (win).
; -----------------------------------------------------------------------
deposit_person:                              ; offset=0A70h
        lhld station_deposit_pos
        inr  h
        shld station_deposit_pos
        dcr  h
        call set_cursor_in_screen_arena     ; Y = l, X = h
        mvi  c, 49h                         ; 'I'
        mov  m, c
        call monitor_cout
        call beep
        xra  a
        sta  hanging_human
        lda  saved_people
        inr  a
        sta  saved_people
        lxi  h, 0FACh
        add  m
        cpi  4
        rnz

game_over_screen:                       ; offset=0A96h
        lxi  sp, screen_area
        lxi  h, 3E9h
        call print_str
        lda  saved_people
        ora  a
        jz   start
        cpi  4
        jnz  loc_ABF
        lxi  h, you_best_rescuer_msg
        call print_str
        lda  used_helicopters
        cpi  3
        jnz  loc_ABF
        lxi  h, you_good_pilot_msg
        call print_str

loc_ABF:                                ; offset=0ABFh
        lxi  h, 0F1Ah
        mvi  b, 5

loc_AC4:                                ; offset=0AC4h
        lda  saved_people
        cmp  m
        jz   loc_ADF
        jnc  loc_AEB
        mov  a, m
        cpi  5
        jnc  loc_B5F

loc_AD4:                                ; offset=0AD4h
        lxi  d, 19h
        dad  d
        dcr  b
        jnz  loc_AC4
        jmp  start

loc_ADF:                                ; offset=0ADFh
        lda  used_helicopters
        inx  h
        cmp  m
        dcx  h
        jz   loc_AD4
        jc   loc_AD4

loc_AEB:                                ; offset=0AEBh
        dcr  b
        push h
        lxi  h, 0F7Dh
        lxi  d, 0F96h

loc_AF3:                                ; offset=0AF3h
        mvi  c, 19h

loc_AF5:                                ; offset=0AF5h
        mov  a, m
        stax d
        dcx  h
        dcx  d
        dcr  c
        jnz  loc_AF5
        dcr  b
        jnz  loc_AF3

loc_B01:                                ; offset=0B01h
        pop  h
        push h
        mvi  b, 18h

loc_B05:                                ; offset=0B05h
        mvi  m, 20h     ; ' '
        inx  h
        dcr  b
        jnz  loc_B05
        mvi  m, 0
        lxi  h, your_name_history_msg
        call print_str
        pop  h
        lda  saved_people
        mov  m, a
        inx  h
        lda  used_helicopters
        mov  m, a
        inx  h
        mvi  b, 0

loc_B21:                                ; offset=0B21h
        call monitor_cin
        mov  c, a
        cpi  8
        jz   loc_B43
        cpi  0Dh
        jz   start
        cpi  20h     ; ' '
        jc   loc_B57
        mov  a, b
        cpi  17h
        jz   loc_B57
        inr  b
        mov  m, c
        inx  h
        call monitor_cout
        jmp  loc_B21

loc_B43:                                ; offset=0B43h
        mov  a, b
        ora  a
        jz   loc_B57
        dcr  b
        dcx  h
        mvi  m, 20h                     ; ' '
        xchg
        lxi  h, back_space_back_msg     ; "\b \b"
        call print_str
        xchg
        jmp  loc_B21

loc_B57:                                ; offset=0B57h
        mvi  c, 7
        call monitor_cout
        jmp  loc_B21

loc_B5F:                                ; offset=0B5Fh
        push h
        lxi  d, 19h
        dad  d
        mvi  m, 0FFh
        jmp  loc_B01

; -----------------------------------------------------------------------
; process_bullet -- update one bullet position
; Input: HL = pointer to 4-byte bullet entry
; Output: HL = pointer past entry (+4)
;
; Bullet structure (4 bytes):
;   byte 0: active flag / step direction (0=free, 1/-1=direction)
;   byte 1: X delta per step (+1 or -1)
;   byte 2: current row (Y)
;   byte 3: current column (X)
;
; Each tick: erases '-' at old position, advances X by delta.
; Collision checks at new position:
;   'O' (helicopter) -> skip erase, advance cursor, recheck
;   '*' (stone) -> replace with '+' (destroyed stone)
;   'I'/'Y' (person) -> kill person, free bullet
;   space -> draw '-' at new position
;   anything else -> free bullet (hit terrain/wall)
; Bullets move 2 cells per game tick (called twice in game_loop).
; -----------------------------------------------------------------------
process_bullet:                         ; offset=0B69h
        push b
        mov  c, m                  ; bullet's step X
        inx  h
        mov  b, m
        inx  h
        mov  e, m
        inx  h
        mov  d, m                  ; de = bullet XY
        push h
        mov  a, c
        ora  a
        jz   free_bullet_entry     ; if the bullet entry is zero, exit
        xchg
        call set_cursor
        xchg
        mov  l, d
        mov  a, e
        call screen_area_address
        mov  a, m
        cpi  4Fh                   ; 'O'
        jz   bullet_skip_heli
        mvi  m, 20h                ; ' '
        push b
        mvi  c, 20h                ; ' '
        call monitor_cout
        pop  b
        cpi  2Dh                   ; '-'
        jnz  free_bullet_entry     ; hl    -= 4

bullet_advance:                         ; offset=0B95h
        mov  a, d                  ; recalculate bullet X
        add  c
        cpi  40h                   ; '@'
        jnc  free_bullet_entry     ; if X >= 64 (0x40) -> free the bullet entry
        mov  d, a                  ; d = new bullet X
        dad  b                     ; hl = new bullet screen address
        dcr  c
        jz   bullet_check_new_pos
        mvi  c, 8
        call monitor_cout
        call monitor_cout

bullet_check_new_pos:                   ; offset=0BAAh
        mov  a, m
        cpi  4Fh                   ; 'O'
        jz   collision_condition
        cpi  2Ah                   ; '*'
        jz   bullet_hits_stone
        cpi  49h                   ; 'I'
        jz   bullet_hits_person
        cpi  59h                   ; 'Y'
        jz   bullet_hits_person
        cpi  20h                   ; ' '
        jnz  free_bullet_entry     ; hl -= 4
        mvi  c, 2Dh                ; '-'

bullet_draw:                            ; offset=0BC6h
        mov  m, c
        call monitor_cout
        pop  h
        mov  m, d

bullet_done:                            ; offset=0BCCh
        inx  h
        pop  b
        ret

bullet_hits_person:                     ; offset=0BCFh
        mvi  m, 20h     ; ' '
        xchg
        call kill_person

free_bullet_entry:                      ; offset=0BD5h
        lxi  h, 0FFFDh     ; hl -= 4
        pop  d
        dad  d
        mvi  m, 0
        shld free_bullet
        xchg
        jmp  bullet_done

bullet_skip_heli:                       ; offset=0BE3h
        push b
        mvi  c, 18h
        call monitor_cout
        pop  b
        jmp  bullet_advance     ; recalculate bullet X

bullet_hits_stone:                      ; offset=0BEDh
        mvi  c, 2Bh     ; '+'
        jmp  bullet_draw

heli_person_in_way:                     ; offset=0BF2h
        mov  a, m
        mvi  b, 0
        cpi  49h     ; 'I'
        jz   loc_BFF
        cpi  59h     ; 'Y'
        jnz  heli_restore_and_crash

loc_BFF:                                ; offset=0BFFh
        mvi  m, 20h               ; ' '
        lda  helicopter_xy
        cma
        adi  18h
        mov  d, a
        add  a
        add  a
        add  d
        mov  c, a
        lxi  h, lava_levels+3     ; format: counter, y, x, human_y, human_x
        dad  b
        mov  e, m
        inx  h
        mov  d, m
        xchg
        call set_cursor
        mvi  c, 20h               ; ' '
        call monitor_cout
        mvi  b, 0FFh

heli_restore_and_crash:                 ; offset=0C1Eh
        lhld prev_helicopter_xy
        lda  helicopter_orientation_original
        jmp  heli_crash_common

collision_condition:                    ; offset=0C27h
        lhld helicopter_xy
        lda  helicopter_orientation     ; 0 - left, FF - right
        mvi  b, 0

heli_crash_common:                      ; offset=0C2Fh
        push b
        mov  b, a
        call set_cursor
        xchg
        mov  a, b
        ora  a
        lxi  h, clear_helicopter_left_msg
        cnz  clear_helicopter_right_address
        call print_str
        lda  hanging_human
        ora  a
        jz   heli_crash_clear_buffer
        mvi  c, 20h     ; ' '
        call monitor_cout

heli_crash_clear_buffer:                ; offset=0C4Ch
        mov  a, e
        mov  l, d
        call screen_area_address
        mvi  d, 20h     ; ' '
        mov  a, b
        call write_heli_to_buffer
        call beep
        lhld helicopter_xy
        call explosion
        pop  b
        lda  hanging_human
        ora  b
        jz   loc_6F2
        call slow_explosion
        lhld prev_helicopter_xy
        call create_soul
        jmp  loc_6F2

; -----------------------------------------------------------------------
; Explosion animation system
;
; explosion_plot_dot -- plot or erase one dot at offset (h,l) from center
; Input: DE = center (row,col), H = X offset, L = Y offset, C = char (or 0)
; If C=0, reads existing char from screen buffer (restore mode).
; Bounds-checks: col < 64, row < 25. Skips if 'O' (helicopter) at target.
; -----------------------------------------------------------------------
explosion_plot_dot:                          ; offset=0C74h
        mov  a, h
        add  a                              ; double X offset (accelerating expansion)
        mov  h, a
        dad  d                              ; hl = center + offset (h=col, l=row)
        mov  a, h
        cpi  40h                            ; col >= 64?
        rnc                                 ; out of bounds
        mov  a, l
        cpi  19h                            ; row >= 25?
        rnc                                 ; out of bounds
        call set_cursor_in_screen_arena     ; set cursor + get buffer addr
        mov  a, m
        cpi  4Fh                            ; don't overwrite helicopter 'O'
        rz
        push b
        mov  a, c
        ora  a
        cz   explosion_read_char            ; c=0: restore mode, read original char
        call monitor_cout
        pop  b
        ret

; explosion_radiate -- draw/erase 8 dots radiating from center
; Input: B = radius step, C = char to draw (or 0 to erase), DE = center
; Plots dots at 8 directions: N, NE, E, SE, S, SW, W, NW
explosion_radiate:                    ; offset=0C92h
        push b
        call explosion_axis_dots     ; plot N, E, S (along axes)
        mov  a, b
        cma
        inr  a                       ; a = -b (negate for opposite direction)
        mov  h, a
        mov  l, b                    ; (-b, +b) = SW direction
        call explosion_plot_dot
        mov  a, b
        cma
        inr  a                       ; a = -b
        mov  l, a
        mov  h, b                    ; (+b, -b) = NE direction
        mov  b, a
        call explosion_plot_dot
        call explosion_axis_dots     ; plot remaining diagonals
        pop  b
        ret

; explosion_axis_dots -- plot 3 dots along cardinal directions
; Input: B = radius, C = char, DE = center
explosion_axis_dots:     ; offset=0CACh
        mov  h, b
        mvi  l, 0     ; (+b, 0) = East
        call explosion_plot_dot
        mov  l, b
        mov  h, b     ; (+b, +b) = SE diagonal
        call explosion_plot_dot
        mvi  h, 0
        mov  l, b     ; (0, +b) = South
        jmp  explosion_plot_dot

explosion_read_char:     ; offset=0CBDh
        mov  c, m     ; read char from screen buffer (for erase/restore)
        ret

; -----------------------------------------------------------------------
; explosion -- fast expanding ring animation (helicopter crash)
; Input: HL = position (row, col)
; Expands dots '.' outward in 8 directions for 32 steps.
; Each step: draw dots, short delay, erase dots. Fast animation.
; -----------------------------------------------------------------------
explosion:             ; offset=0CBFh
        xchg          ; de = position (center of explosion)
        mvi  b, 0     ; b = radius (starts at 0)

explosion_step:                     ; offset=0CC2h
        mvi  c, 2Eh                ; '.' = explosion dot
        call explosion_radiate     ; draw dots at current radius
        mvi  a, 0FFh               ; short delay (~255 iterations)
explosion_delay:                        ; offset=0CC9h
        dcr  a
        jnz  explosion_delay
        mvi  c, 0                  ; c=0 = restore original chars
        call explosion_radiate     ; erase dots
        inr  b                     ; increase radius
        mov  a, b
        cpi  20h                   ; 32 steps total
        jnz  explosion_step
        xchg
        ret

; -----------------------------------------------------------------------
; slow_explosion -- slow expanding ring animation (soul/death effect)
; Input: HL = position (row, col)
; Same as explosion but 33 steps with longer delay (0x200 iterations).
; Used after person death (falling into lava, dropped from helicopter).
; -----------------------------------------------------------------------
slow_explosion:          ; offset=0CDBh
        xchg            ; de = position (center)
        mvi  b, 20h     ; b = radius (starts at 32, counts down)

slow_explosion_step:                ; offset=0CDEh
        mvi  c, 2Eh                ; '.'
        call explosion_radiate     ; draw dots
        lxi  h, 200h               ; long delay (~512 iterations)
slow_explosion_delay:                   ; offset=0CE6h
        dcx  h
        mov  a, h
        ora  l
        jnz  slow_explosion_delay
        mvi  c, 0                    ; restore original chars
        call explosion_radiate       ; erase dots
        dcr  b                       ; decrease radius
        jp   slow_explosion_step     ; repeat until b < 0
        xchg
        ret

; -----------------------------------------------------------------------
; move_and_check_soul -- move one soul "()" and check helicopter collision
; Input:  HL = pointer to soul entry (2 bytes: row, column)
; Output: HL = pointer past this entry (+2)
;
; Soul data: 2 bytes per soul in souls_positions array
;   byte 0: row  (Y coordinate)
;   byte 1: column (X coordinate)
;
; Movement: partially seeks the helicopter with random element
;   Vertical:  1/3 move up, 1/3 stay, 1/3 move toward helicopter
;   Horizontal: 1/2 stay, 1/2 move toward helicopter
; If new position is blocked (not space), reverts to old position.
; If soul touches 'O' (helicopter cockpit), triggers crash.
; Maps to Python's soul update loop with random walk + bounce.
; -----------------------------------------------------------------------
move_and_check_soul:     ; offset=0CF7h
        push b
        mov  e, m     ; e = current soul row
        mov  c, e     ; c = new row (default: same)

        ; -- vertical movement --
        mvi  a, 2
        call random              ; a = [0..2]
        dcr  a                   ; a = -1 (up), 0 (stay), or 1
        jpe  soul_vert_apply     ; parity even for -1 and 0: random move
        ; parity odd (a=1): seek helicopter vertically
        lda  helicopter_xy     ; helicopter row
        cmp  e                 ; compare with soul row
        sbb  a                 ; 0x00 if heli below, 0xFF if heli above
        ori  1                 ; +1 (move down) or -1 (move up) toward heli

soul_vert_apply:                 ; offset=0D0Ah
        add  e                  ; new_row = soul_row + delta
        cpi  19h                ; >= 25? (off screen)
        jnc  soul_vert_skip     ; out of bounds -> keep old row
        mov  c, a               ; c = new row (accepted)

soul_vert_skip:                 ; offset=0D11h
        ; -- horizontal movement --
        inx  h
        mov  d, m                 ; d = current soul column
        mov  b, d                 ; b = new column (default: same)
        mvi  a, 1
        call random               ; a = [0..1]
        ora  a
        jz   soul_horiz_apply     ; 0 -> no horizontal movement
        ; seek helicopter horizontally
        lda  helicopter_xy+1     ; helicopter column
        cmp  d                   ; compare with soul column
        sbb  a                   ; 0x00 if heli right, 0xFF if heli left
        ori  1                   ; +1 or -1 toward helicopter

soul_horiz_apply:                 ; offset=0D24h
        add  d                   ; new_col = soul_col + delta
        cpi  3Fh                 ; >= 63?
        jnc  soul_check_dest     ; out of bounds -> keep old col
        mov  b, a                ; b = new column (accepted)

soul_check_dest:                 ; offset=0D2Bh
        ; -- check collision at new position --
        ; c=new_row, b=new_col, e=old_row, d=old_col
        push h
        mov  a, c                    ; new row
        mov  l, b                    ; new column
        call screen_area_address
        mov  a, m
        cpi  4Fh                     ; 'O' = helicopter cockpit?
        jz   collision_condition     ; soul hits helicopter!
        cpi  20h                     ; space = empty?
        jnz  soul_blocked            ; blocked -> revert position
        inx  h                       ; check adjacent cell (soul is 2 chars "()")
        mov  a, m
        cpi  4Fh                     ; 'O'?
        jz   collision_condition
        cpi  20h                     ; space?
        jz   soul_draw               ; both cells clear -> accept move

soul_blocked:          ; offset=0D48h
        mov  b, d     ; revert: b = old column
        mov  c, e     ; revert: c = old row

soul_draw:     ; offset=0D4Ah
        ; -- erase old and draw new "()" --
        pop  h
        xchg                 ; de = souls_positions ptr
        call set_cursor      ; cursor at old row,col (from hl)
        lxi  h, two_spaces_msg
        call print_str       ; erase old "()"
        mov  l, c            ; new row
        mov  h, b            ; new column
        call set_cursor
        lxi  h, soul_msg     ; "()"
        call print_str       ; draw soul at new position
        xchg                 ; hl = souls_positions ptr
        mov  m, b            ; store new column
        dcx  h
        mov  m, c            ; store new row
        inx  h
        inx  h               ; advance to next soul entry
        pop  b
        ret

; beep -- play sound if enabled
; Sends sound_status byte to monitor_cout:
;   7 = BEL (audible beep), 0Ch = FF (form feed, silent on RK86)
; Toggled by 'S' key in menu. Preserves all registers.
beep:     ; offset=0D68h
        push psw
        push b
        lda  sound_status
        mov  c, a
        call monitor_cout
        pop  b
        pop  psw
        ret
lava_levels:                            ; offset=0D74h
        ; format: count, y, x, human_y, human_x  (5 bytes per entry)
        ; human_y/human_x = 0,0 means no person on this ledge
        db   37h, 18h, 0, 0, 0           ; count=55, row=24, col=0
        db   35h, 17h, 2, 16h, 3         ; count=53, row=23, col=2,  person at (22,3)
        db   30h, 16h, 7, 0, 0           ; count=48, row=22, col=7
        db   2Eh, 15h, 9, 14h, 0Ah       ; count=46, row=21, col=9,  person at (20,10)
        db   29h, 14h, 0Eh, 0, 0         ; count=41, row=20, col=14
        db   25h, 13h, 10h, 0, 0         ; count=37, row=19, col=16
        db   22h, 12h, 12h, 11h, 13h     ; count=34, row=18, col=18, person at (17,19)
        db   1Ch, 11h, 17h, 0, 0         ; count=28, row=17, col=23
        db   18h, 10h, 19h, 0, 0         ; count=24, row=16, col=25
        db   16h, 0Fh, 1Ah, 0, 0         ; count=22, row=15, col=26
        db   14h, 0Eh, 1Bh, 0Dh, 1Ch     ; count=20, row=14, col=27, person at (13,28)
        db   0Dh, 0Dh, 20h, 0, 0         ; count=13, row=13, col=32
        db   0Bh, 0Ch, 21h, 0, 0         ; count=11, row=12, col=33
        db   9, 0Bh, 22h, 0, 0           ; count=9,  row=11, col=34
        db   7, 0Ah, 23h, 0, 0           ; count=7,  row=10, col=35
        db   4, 9, 25h, 0, 0             ; count=4,  row=9,  col=37
two_spaces_msg:                         ; offset=0DC4h
        db   20h, 20h, 0
soul_msg:                               ; offset=0DC7h
        db   "()", 0
; -----------------------------------------------------------------------
; Helicopter sprite strings -- drawn via print_str using VT52 cursor codes
; These encode 2-line sprites in a single string using:
;   0x19 = cursor up    0x1A = cursor down    0x08 = backspace
;   0x20 = space         0x00 = string terminator
;
; The trick: after drawing the body line (row of cockpit 'O'),
; the cursor codes move up to draw the rotor line, then back down.
;
; Left-facing helicopter:    Right-facing helicopter:
;     -+-                        -+-
;     O-+                        +-O
;
; clear_helicopter_left_msg:  erase left-facing (spaces with cursor movement)
; clear_helicopter_right_msg: erase right-facing
; helicopter_left_msg:        draw left-facing (O-+ body, -+- rotor)
; helicopter_right_msg:       draw right-facing (+-O body, -+- rotor)
; -----------------------------------------------------------------------
;
; Cursor starts at cockpit 'O' position.
;
; clear_helicopter_left_msg: erase "O-+" on body row
;   20 20 20 = "   " (erase O-+)
;   19       = cursor up (to rotor row)
;   08 08 08 08 = 4x backspace (back to start of rotor)
;   20 20 20 = "   " (erase -+-)
;   1A 1A    = 2x cursor down (back to below body)
;   08 08    = 2x backspace (realign)
clear_helicopter_left_msg:              ; offset=0DCAh
        db   20h, 20h, 20h, 19h, 08h, 08h, 08h, 08h, 20h, 20h, 20h, 1Ah, 1Ah, 08h, 08h, 0

; clear_helicopter_right_msg: erase "+-O" on body row
;   08 08    = 2x backspace (back past +-)
;   20 20 20 = "   " (erase +-O)
;   19       = cursor up
;   08 08    = 2x backspace
;   20 20 20 = "   " (erase -+-)
;   1A 1A    = 2x cursor down
;   08 08    = 2x backspace
clear_helicopter_right_msg:             ; offset=0DDAh
        db   08h, 08h, 20h, 20h, 20h, 19h, 08h, 08h, 20h, 20h, 20h, 1Ah, 1Ah, 08h, 08h, 0

; helicopter_left_msg: draw left-facing "O-+"
;   4F 2D 2B = "O-+"  (body: cockpit, dash, tail)
;   19       = cursor up
;   08 08 08 08 = 4x backspace
;   2D 2B 2D = "-+-"  (rotor)
;   1A 1A    = 2x cursor down
;   08 08    = 2x backspace
helicopter_left_msg:                    ; offset=0DEAh
        db   4Fh, 2Dh, 2Bh, 19h, 08h, 08h, 08h, 08h, 2Dh, 2Bh, 2Dh, 1Ah, 1Ah, 08h, 08h, 0

; helicopter_right_msg: draw right-facing "+-O"
;   08 08    = 2x backspace (position to start of +-)
;   2B 2D 4F = "+-O"  (body: tail, dash, cockpit)
;   19       = cursor up
;   08 08    = 2x backspace
;   2D 2B 2D = "-+-"  (rotor)
;   1A 1A    = 2x cursor down
;   08 08    = 2x backspace
helicopter_right_msg:                   ; offset=0DFAh
        db   08h, 08h, 2Bh, 2Dh, 4Fh, 19h, 08h, 08h, 2Dh, 2Bh, 2Dh, 1Ah, 1Ah, 08h, 08h, 0
; -----------------------------------------------------------------------
; packed_landscape -- RLE-compressed initial screen layout
; Encoding (printed left-to-right, top-to-bottom):
;   N, char     : repeat 'char' N times (N > 0, char != 0)
;   N, 0        : end of row (print CR/LF, advance to next screen row)
;   0xFF, ...0  : literal string until null terminator (for mixed chars)
;   0           : end of data
;
; The landscape includes volcano slopes (X), people (I/Y), station
; walls (!), station roof (=), and spare helicopters (O-+, -+-).
; Unpacked into screen_area buffer (64x25) and printed simultaneously.
; -----------------------------------------------------------------------
packed_landscape:                       ; offset=0E0Ah
        db   25h     ; %
        db   20h, 4
        db   58h     ; X
        db   1, 0
        db   23h     ; #
        db   20h, 1
        db   58h     ; X
        db   1
        db   58h     ; X
        db   4, 20h, 1
        db   58h     ; X
        db   1, 0
        db   22h     ; "
        db   20h, 1
        db   58h     ; X
        db   7, 20h, 1
        db   58h     ; X
        db   1, 0
        db   21h     ; !
        db   20h, 1
        db   58h     ; X
        db   9, 20h, 1
        db   58h     ; X
        db   1, 0, 1Ch, 20h, 1
        db   59h     ; Y
        db   3, 20h, 1
        db   58h     ; X
        db   0Bh, 20h, 1
        db   58h     ; X
        db   1, 0, 1Bh, 20h, 4
        db   58h     ; X
        db   1
        db   58h     ; X
        db   0Dh, 20h, 1
        db   58h     ; X
        db   1
        db   58h     ; X
        db   1, 0, 1Ah, 20h, 1
        db   58h     ; X
        db   14h, 20h, 1
        db   58h     ; X
        db   1, 0, 19h, 20h, 1
        db   58h     ; X
        db   16h, 20h, 1
        db   58h     ; X
        db   6, 20h, 8
        db   3Dh     ; =
        db   1, 0, 13h, 20h, 1
        db   49h     ; I
        db   3, 20h, 1
        db   58h     ; X
        db   1
        db   58h     ; X
        db   18h, 20h, 1
        db   58h     ; X
        db   1
        db   58h     ; X
        db   4, 20h, 1
        db   21h     ; !
        db   6, 20h, 1
        db   21h     ; !
        db   1, 0, 12h, 20h, 4
        db   58h     ; X
        db   1
        db   58h     ; X
        db   1Ch, 20h, 1
        db   58h     ; X
        db   3, 20h, 1
        db   21h     ; !
        db   6, 20h, 1
        db   21h     ; !
        db   1, 0, 10h, 20h, 1
        db   58h     ; X
        db   1
        db   58h     ; X
        db   22h     ; "
        db   20h, 0FFh
        db   58h     ; X
        db   20h, 20h
        db   21h     ; !
        db   20h
        db   2Dh     ; -
        db   2Bh     ; +
        db   2Dh     ; -
        db   20h, 20h
        db   21h     ; !
        db   0, 1, 0, 0Ah, 20h, 1
        db   59h     ; Y
        db   3, 20h, 1
        db   58h     ; X
        db   1
        db   58h     ; X
        db   25h     ; %
        db   20h, 0FFh
        db   58h     ; X
        db   58h     ; X
        db   21h     ; !
        db   20h, 20h
        db   4Fh     ; O
        db   2Dh     ; -
        db   2Bh     ; +
        db   20h
        db   21h     ; !
        db   0, 1, 0, 9, 20h, 4
        db   58h     ; X
        db   1
        db   58h     ; X
        db   29h     ; )
        db   20h, 0FFh
        db   21h     ; !
        db   20h
        db   2Dh     ; -
        db   2Bh     ; +
        db   2Dh     ; -
        db   20h, 20h
        db   21h     ; !
        db   0, 1, 0, 3, 20h, 1
        db   49h     ; I
        db   3, 20h, 1
        db   58h     ; X
        db   1
        db   58h     ; X
        db   2Eh     ; .
        db   20h, 0FFh
        db   21h     ; !
        db   20h, 20h
        db   4Fh     ; O
        db   2Dh     ; -
        db   2Bh     ; +
        db   20h
        db   21h     ; !
        db   0, 1, 0, 2, 20h, 4
        db   58h     ; X
        db   1
        db   58h     ; X
        db   30h     ; 0
        db   20h, 0FFh
        db   21h     ; !
        db   20h
        db   2Dh     ; -
        db   2Bh     ; +
        db   2Dh     ; -
        db   20h, 20h
        db   21h     ; !
        db   0, 1, 0, 1
        db   58h     ; X
        db   1
        db   58h     ; X
        db   35h     ; 5
        db   20h, 0FFh
        db   21h     ; !
        db   20h, 20h
        db   4Fh     ; O
        db   2Dh     ; -
        db   2Bh     ; +
        db   20h
        db   21h     ; !
        db   0, 0
; -----------------------------------------------------------------------
; Game variables and control data
; -----------------------------------------------------------------------
; control_codes -- keyboard mappings for helicopter movement
; Default: 08h=backspace (up), 18h=^X (left), 19h=^Y (down), 1Ah=^Z (right)
; Can be reprogrammed via 'K' menu option (display_controls routine).
control_codes:                          ; offset=0F14h
        db   8, 18h, 19h, 1Ah     ; up, left, down, right
sound_status:                           ; offset=0F18h
        db   7     ; 7=BEL (sound on), 0Ch=FF (sound off)
; -----------------------------------------------------------------------
; High score table -- 5 entries x 25 bytes = 125 bytes starting at 0x0F1A
; Entry format:
;   byte 0:    saved_people count (0xFF = empty slot)
;   byte 1:    used_helicopters count (lower = better)
;   bytes 2-24: player name (null-terminated, space-padded)
;
; The first entry's byte 0 doubles as the saved_people game variable.
; Scores compared by: saved_people (higher better), then helicopters (lower better).
; -----------------------------------------------------------------------
saved_people:                           ; offset=0F19h
        ; entry 1 (0=saved, 1=helis, 2-24=name) -- all 0xFF = empty slot
        db   0FFh, 0FFh, 0, 0, 0, 0, 0
        db   32h, 0B7h, 0C2h, 0F6h, 19h, 3Ah, 0EFh, 14h, 0FEh, 5, 0CAh
        db   4, 14h, 0FEh, 0Ch, 0CAh, 4, 14h
        ; entry 2
        db   3Ah, 0Ch, 1, 0B7h, 0CAh, 4, 14h
        db   3Ah, 26h, 3Bh, 3Dh, 6Fh, 26h, 0, 3Ah, 0FAh, 3Ah, 3Ch
        db   4Fh, 0CDh, 40h, 1Ch, 7Bh, 32h, 0D1h
        ; entry 3
        db   32h, 3Ah, 0FBh, 3Ah, 4Fh, 3Ah, 12h
        db   3Bh, 0A1h, 4Fh, 45h, 21h, 16h, 3Bh, 0CAh, 0BCh, 13h
        db   3Eh, 10h, 0B7h, 1Fh, 0Dh, 0C2h, 0B4h, 13h
        ; entry 4
        db   80h, 47h, 5, 0FAh, 0CBh, 13h, 23h
        db   0CDh, 52h, 13h, 0CAh, 0BCh, 13h, 23h, 0C3h, 0BCh, 13h
        db   7Eh, 5Eh, 32h, 0Ah, 34h, 0CDh, 52h, 13h
        ; entry 5
        db   57h, 0CAh, 0D9h, 22h, 4Fh, 13h, 2Ah
        db   4Fh, 13h, 0EBh, 21h, 15h, 1Bh, 19h, 5Eh, 16h, 0
        db   0D5h, 21h, 30h, 0, 0D1h, 7Bh, 95h, 6Fh
        ; (not part of high score table)
        db   7Ah
rng_seed:                               ; offset=0F97h
        dw   679Ch
rng_accum:                              ; offset=0F99h
        db   0E5h
prev_helicopter_xy:                     ; offset=0F9Ah
        dw   121h     ; previous helicopter position (for erase)
helicopter_xy:                          ; offset=0F9Ch
        dw   0D100h     ; current helicopter position (L=row, H=col)
helicopter_orientation_original:        ; offset=0F9Eh
        db   19h     ; saved orientation before move
helicopter_orientation:                 ; offset=0F9Fh
        db   0E5h     ; 0=left-facing, FF=right-facing
hanging_human:                          ; offset=0FA0h
        db   21h     ; 0=none, 'I'/'J'/'L'=person hanging from heli
hanging_human_timer:                    ; offset=0FA1h
        db   9     ; countdown until person falls (0x28=start)
hanging_human_y:                        ; offset=0FA2h
        dw   0E500h     ; falling person position (0xFF=inactive)
station_deposit_pos:                    ; offset=0FA4h
        dw   0EFCDh     ; next position in station for rescued person
free_bullet:                            ; offset=0FA6h
        dw   0F102h     ; pointer to next free bullet slot
used_helicopters:                       ; offset=0FA8h
        db   0D2h     ; remaining lives (3=start)
human_hands_timer:                      ; offset=0FA9h
        db   0FDh     ; countdown for person wave animation (7=reset)
        db   0Fh
        db   2Ah      ; *
number_of_souls:                        ; offset=0FACh
        db   4Fh     ; count of active souls on screen
lava_level:                             ; offset=0FADh
        db   13h     ; current lava level (counts down from 0x10)
lava_timer:                             ; offset=0FAEh
        db   0E5h     ; countdown until next lava advance (0x0A=reset)
souls_positions:                        ; offset=0FAFh
        db   21h     ; array of soul positions (2 bytes each: row, col)
        db   30h     ; 0
        db   0
        db   0E5h
        db   0C1h
        db   0E1h
        db   0EBh
        db   21h     ; !
bullets_coords:                         ; offset=0FB7h  10 entries, 4 bytes each, 40 bytes total
        dw   1B15h
        dw   7119h
        dw   4F2Ah
        dw   0E513h
        dw   121h
        dw   0D100h
        dw   957Bh
        dw   7A6Fh
        dw   679Ch
        dw   2AE5h
        dw   133Bh
        dw   0CDE5h
        dw   2BCh
        dw   0D2F1h
        dw   0FE9h
        dw   4F2Ah
        dw   0E513h
        dw   221h
        dw   0D100h
        dw   957Bh
stone_coords:                           ; offset=0FDFh
        dw   7A6Fh
        dw   679Ch
        dw   4F22h
        dw   0C313h
        dw   0FFAh
        dw   4F2Ah
        dw   0E513h
        dw   121h
        dw   0D100h
        dw   957Bh
        dw   7A6Fh
        dw   679Ch
        dw   4F22h
        dw   0C313h
        dw   0F83h
        dw   4F2Ah
        db   13h
