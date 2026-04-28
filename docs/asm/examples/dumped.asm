; Dump editor for the Radio-86RK (disassembled + relabelled).
; ----------------------------------------------------------------------
; Shows a 256-byte memory page as a 16x16 hex table, lets the user
; overwrite any byte by typing new hex digits, and navigates between
; pages with the cursor keys.
;
;   adres:  addr            >>> DUMP EDITOR <<<         summa  XXXX
;   ----------------------------------------------------------------
;   ADDR: b0 b1 b2 ... bf                                       XXXX
;   ...
;   ----------------------------------------------------------------
;    F1-wwerh   F2-adres   F3-wniz   F4-monitor
;
; F1 = page up (prev address), F2 = address prompt, F3 = page down
; (next address), F4 = exit to monitor. Arrows move inside the page;
; Ctrl-C also returns to the monitor.
;
; Entry at 3000h, stack is set to the top of user RAM (75FFh).

; -- monitor jump-table entries (see RK86.md) -------------------------
monitor_getc     equ 0f803h           ; block for one keypress, -> A
monitor_putc     equ 0f809h           ; C = char
monitor_hexb     equ 0f815h           ; A -> two hex digits
monitor_puts     equ 0f818h           ; HL = 0-terminated string
monitor_getxy    equ 0f81eh           ; HL = (y << 8) | x
monitor_chksum   equ 0f82ah           ; sum bytes in HL..DE -> BC
monitor_reset    equ 0f800h           ; reset vector (cold start)

; -- RK86 control codes (see RK86.md) ---------------------------------
bel              equ 07h              ; beep
cursor_left      equ 08h              ; getc key / putc "move left"
lf               equ 0ah              ; line feed
cr               equ 0dh              ; carriage return
cursor_right     equ 18h
cursor_up        equ 19h
cursor_down      equ 1ah
esc              equ 1bh              ; start of ESC-Y cursor sequence
cls              equ 1fh              ; clear screen + home
esc_y_bias       equ 2020h            ; ESC-Y y,x are each biased by +20h

; -- F-key codes (RK86 keyboard) --------------------------------------
key_f1           equ 00h
key_f2           equ 01h
key_f3           equ 02h
key_ctrl_c       equ 03h              ; also F4 here, treated as "reset"

  org 3000h

  lxi sp, 75ffh
  lxi h, hdr_msg
  call monitor_puts
  call print_hr                       ; dashes under the header
  lxi h, 1700h                        ; row 23, col 0
  call set_cursor
  call print_hr                       ; dashes above the footer
  lxi h, foot_msg
  call monitor_puts

; ---- ask the user for a page address --------------------------------
prompt:
  call cursor_to_addr
  lxi b, (4 << 8) | ' '               ; 4 spaces
  call put_rep                        ; blank the 4-digit address field
  call cursor_to_addr
  call read_hex_byte                  ; low byte -> L
  jz prompt                           ; terminator -> re-prompt
  mov h, l                            ; stash as high byte for a moment
  call read_hex_byte                  ; next byte -> L, so HL = page addr
  jz prompt

; ---- redraw the whole page starting at H, L forced to 0 -------------
page:
  push h                              ; save page address for char pass
  mvi l, 00h
  push h                              ; save again for the edit loop
  lxi h, 0400h                        ; row 4, col 0 (top of dump area)
  call set_cursor
  pop h

hex_row:
  call print_hex4                     ; "aaaa"
  mvi c, ':'
  call monitor_putc
  call dump_hex_row                   ; 16 bytes + row checksum
  call crlf
  mvi a, 10h
  add l
  mov l, a
  jnc hex_row                         ; 16 rows, then carry sets

char_loop:
  call redraw_byte                    ; paint each byte inside its cell
  inr l
  jnz char_loop
  pop h                               ; restore page base
  call print_page_sum

; ---- per-keystroke edit loop ----------------------------------------
redraw:
  call cursor_to_addr
  call print_hex4                     ; show the current HL at "adres:"
  call redraw_byte                    ; put cursor on the current byte

; cmd_state is self-modifying: the `00` operand below tracks whether we
; are mid-byte. cmd_left stores A (=08h) here so the next iteration
; knows to skip the hi-nibble wait and jump straight back into wait_lo.
cmd_state:
  mvi a, 00h
  ora a
  jz wait_hi                          ; no pending state
  xra a
  sta cmd_state+1                     ; clear it
  mvi c, cursor_right                 ; step past the just-echoed digit
  call monitor_putc
  jmp wait_lo

wait_hi:
  call read_cmd
  jnz got_hi_digit
  cpi key_f1
  jz fkey
  cpi key_f2
  jz fkey
  cpi key_f3
  jz fkey
  call putc_a                         ; echo the navigation char
  cpi cursor_right
  jz wait_lo
  cpi cursor_left
  jz cmd_left
check_up:
  cpi cursor_up
  jnz check_down
  mvi a, 0f0h                         ; L -= 16
add_to_l:
  add l
  mov l, a
  jmp redraw
check_down:
  cpi cursor_down
  jnz fkey
  mvi a, 10h                          ; L += 16
  jmp add_to_l

; F-keys arrive as 00h/01h/02h. Three DCRs turn them into a dispatch:
;   F1 (A=0) -> fall through       (H -= 2, then +1 -> previous page)
;   F2 (A=1) -> jz prompt          (re-enter address)
;   F3 (A=2) -> jz skip_dec_h      (H unchanged, +1 -> next page)
;   F4 never reaches here: its code 03h is caught by read_cmd as
;       "Ctrl-C" and routed to monitor_reset.
fkey:
  dcr a
  jz prompt
  dcr a
  jz skip_dec_h
  dcr h
  dcr h
skip_dec_h:
  inr h
  jmp page

; -- user typed a hex digit while we were waiting for the hi nibble ---
got_hi_digit:
  rlc                                 ; move nibble to high half
  rlc
  rlc
  rlc
  mvi b, 0fh                          ; preserve low nibble of memory
  call store_nibble

wait_lo:
  call read_cmd
  jnz got_lo_digit
  cpi key_f1
  jz fkey
  cpi key_f2
  jz fkey
  cpi key_f3
  jz fkey
  call putc_a
  cpi cursor_left                     ; back to wait_hi (re-edit this byte)
  jz wait_hi
  cpi cursor_right                    ; advance to next byte
  jz advance
  jmp check_up                        ; share arrow handling with wait_hi

got_lo_digit:
  mvi b, 0f0h                         ; preserve high nibble of memory
  call store_nibble
advance:
  inr l
  jmp redraw

cmd_left:
  sta cmd_state+1                     ; remember the pending 08h
  dcr l
  jmp redraw

; ---- read_hex_byte --------------------------------------------------
; Read two hex digits into L. Returns Z set on a terminator (00/01/02)
; and NZ with the assembled byte in L on success.
read_hex_byte:
  mvi l, 00h
  call read_cmd
  rz                                  ; terminator - bail with Z
  rlc
  rlc
  rlc
  rlc
  ora l
  mov l, a
  call read_cmd
  rz
  ora l
  mov l, a
  inr a                               ; INR + CMP L = guaranteed NZ
  cmp l
  ret

; ---- store_nibble ---------------------------------------------------
; mem[HL] = (mem[HL] & B) | A. Refresh the page-wide checksum, then
; fall through to dump_hex_row to repaint the row.
store_nibble:
  mov c, a
  mov a, m
  ana b
  ora c
  mov m, a
  call print_page_sum

; ---- dump_hex_row ---------------------------------------------------
; Print the 16 bytes covering L (bytes (L & F0h)..(L | 0Fh)), then the
; row checksum. Falls through into print_sum.
dump_hex_row:
  push h
  mov a, l
  ani 0f0h                            ; row start
  mov l, a
  ori 0fh                             ; row end
  mov e, a
  mov d, h
  call monitor_chksum                 ; HL..DE -> BC
  call getxy_rel                      ; current cursor - 0308h
  push h
print_sum:
  mvi l, 3ah                          ; ':' column (x = 58)
  call set_cursor
  mov h, b                            ; BC -> HL for printing
  mov l, c
  call print_hex4
  pop h
  jmp restore_cursor

; ---- cursor_to_addr -------------------------------------------------
; Place the cursor at the "adres:" field (row 1, col 7) and fall
; through into the shared "print ESC-Y then pop" tail.
cursor_to_addr:
  push h
  lxi h, 0107h                        ; row 1, col 7
restore_cursor:
  call set_cursor
  pop h
  ret

; ---- print_page_sum -------------------------------------------------
; Sum the whole page and print it on row 21 ("summa" row).
print_page_sum:
  push h
  mvi l, 00h
  mov d, h
  mvi e, 0ffh
  call monitor_chksum
  call getxy_rel
  push h
  mvi h, 15h                          ; row 21
  jmp print_sum

; ---- print_hex4: HL -> "HHLL" --------------------------------------
print_hex4:
  mov a, h
  call monitor_hexb
  mov a, l
  jmp monitor_hexb

; ---- crlf: LF then CR ----------------------------------------------
crlf:
  mvi c, lf
  call monitor_putc
  mvi c, cr
  jmp monitor_putc

; ---- redraw_byte ----------------------------------------------------
; Position the cursor on the cell for the byte at [HL] and repaint its
; two hex digits, then leave the cursor on the first digit (two 08h
; backspaces: one via CALL, the second via fall-through into backspace).
redraw_byte:
  mov a, l
  ani 0fh                             ; column index
  mov c, a
  add a
  add c                               ; = col * 3
  adi 07h                             ; + left margin
  mov e, a                            ; x
  mov a, l
  ani 0f0h
  rrc
  rrc
  rrc
  rrc                                 ; = row index
  adi 04h                             ; + top margin
  mov d, a                            ; y
  xchg                                ; HL = (y,x), DE = mem ptr
  call set_cursor
  xchg
  mov a, m
  call monitor_hexb
  call backspace                      ; prints one cursor-left, returns
backspace:
  mvi c, cursor_left                  ; fall-through prints a second
  jmp monitor_putc

; ---- bell_retry -----------------------------------------------------
; Unknown key: beep 8 times, then fall through into read_cmd to retry.
bell_retry:
  lxi b, (8 << 8) | bel               ; 8 beeps
  call put_rep

; ---- read_cmd -------------------------------------------------------
; Block until the user types a recognized key. Returns:
;   NZ + A in 0..0Fh     for hex digits (echoed as we go)
;   Z  + A = raw code    for F1/F2/F3 and cursor_{left,right,up,down}
; Ctrl-C / F4 (03h) resets to the monitor and never returns.
read_cmd:
  call monitor_getc
  cpi key_ctrl_c
  jz monitor_reset
  ora a                               ; key_f1 == 0
  rz
  cpi key_f2
  rz
  cpi key_f3
  rz
  cpi cursor_left
  rz
  cpi cursor_right
  rz
  cpi cursor_down
  rz
  cpi cursor_up
  rz
  cpi '0'
  jc bell_retry
  cpi '9'+1
  cc putc_a                           ; echo the digit on the way past
  jc hex_digit_done                   ; '0'..'9' -> low nibble already
  cpi 'A'
  jc bell_retry
  cpi 'F'+1
  jnc bell_retry
  call putc_a
  adi 09h                             ; 'A'..'F' + 09h => 0Ah..0Fh (mod 10h)
hex_digit_done:
  ani 0fh
  cpi 0ffh                            ; A is 0..0Fh, so this sets NZ
  ret

; ---- print_hr: 64 dashes --------------------------------------------
print_hr:
  lxi b, (64 << 8) | '-'              ; 64 '-' chars
put_rep:
  call monitor_putc
  dcr b
  jnz put_rep
  ret

; ---- strings --------------------------------------------------------
hdr_msg:
  db cls                              ; clear screen + home
  db lf
  db 'adres:'
  db '               '                ; 15 spaces
  db '>>> DUMP EDITOR <<<'
  db '                 '              ; 17 spaces
  db 'summa  '
  db 00h
foot_msg:
  db '       '                        ; 7 spaces
  db ' F1-wwerh   F2-adres   F3-wniz   F4-monitor'
  db 00h

; ---- putc_a: echo A as char, preserving B ---------------------------
putc_a:
  push b
  mov c, a
  call monitor_putc
  pop b
  ret

; ---- set_cursor -----------------------------------------------------
; Move the cursor to (H, L) using the RK86 "ESC Y y x" sequence.
; The two coordinate bytes are biased by +20h because ESC-Y expects
; them that way.
set_cursor:
  push h
  push d
  push b
  lxi d, esc_y_bias
  dad d
  mov a, h
  sta esc_y+2                         ; y byte in the sequence
  mov a, l
  sta esc_y+3                         ; x byte in the sequence
  lxi h, esc_y
  call monitor_puts
  pop b
  pop d
  pop h
  ret
esc_y:
  db esc, 'Y', ' ', ' ', 0            ; ESC Y <y> <x> <term>

; ---- getxy_rel ------------------------------------------------------
; Return HL = current_cursor - 0308h (i.e. subtract the dump-origin
; offset) so callers can derive a row number relative to the dump.
getxy_rel:
  push d
  call monitor_getxy
  lxi d, 0fcf8h                       ; -0308h
  dad d
  pop d
  ret

  end
