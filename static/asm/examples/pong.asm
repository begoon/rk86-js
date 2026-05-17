; One-paddle pong for RK-86
; Play area: 64x25, direct video memory access
; Controls: up/down arrow keys

puts        equ 0F818h

kbd_port    equ 8000h       ; keyboard row select (active low)
kbd_data    equ 8001h       ; keyboard column read (active low)

vidbase     equ 77C2h       ; play area top-left in video memory
rowstride   equ 78          ; bytes per video row

            org 0
            section pong

            lxi sp, 76CFh

            lxi h, clear_screen
            call puts

            mvi a, 30
            sta ball_x
            mvi a, 12
            sta ball_y
            mvi a, 1
            sta ball_dx
            sta ball_dy
            mvi a, 10
            sta pad_y
            mvi a, 12
            sta ball_speed
            sta frame_cnt

            call draw_walls
            call draw_pad
            call draw_ball

game_loop:
            call input          ; poll keyboard every tick (fast paddle)
            call tick_delay
            lda frame_cnt       ; move ball every Nth tick
            dcr a
            sta frame_cnt
            jnz game_loop
            lda ball_speed        ; reload current ball speed
            sta frame_cnt
            call erase_ball
            call move_ball
            call draw_ball
            jmp game_loop

; video address for play area (B=x, C=y) -> HL
; preserves BC, DE
get_addr:
            push d
            lxi h, vidbase
            mov a, c
            ora a
            jz get_addr_add_x
            lxi d, rowstride
get_addr_add_y:
            dad d           ; hl += rowstride
            dcr a
            jnz get_addr_add_y
get_addr_add_x:
            mov a, b        ; hl += x
            add l
            mov l, a
            mov a, h
            aci 0
            mov h, a
            pop d
            ret

; write char A at play area position (B=x, C=y)
plot:
            push psw
            push b
            call get_addr
            pop b
            pop psw
            mov m, a
            ret

; top/bottom walls (row 0, 24) and right wall (col 63)
draw_walls:
            push b
            push d
            mvi b, 0
            mvi c, 0
wall_top:   mvi a, 7Fh
            call plot
            inr b
            mov a, b
            cpi 64
            jnz wall_top
            mvi b, 0
            mvi c, 24
wall_bot:   mvi a, 7Fh
            call plot
            inr b
            mov a, b
            cpi 64
            jnz wall_bot
            mvi b, 63
            mvi c, 1
wall_right: mvi a, 7Fh
            call plot
            inr c
            mov a, c
            cpi 24
            jnz wall_right
            pop d
            pop b
            ret

; draw paddle at col 0, rows pad_y..pad_y+3
draw_pad:
            push b
            push d
            lda pad_y
            mov c, a
            mvi b, 0
            mvi d, 4
draw_pad_loop:
            mvi a, 58h     ; 'X'
            call plot
            inr c
            dcr d
            jnz draw_pad_loop
            pop d
            pop b
            ret

; erase paddle at col 0, rows E..E+3
erase_pad:
            push b
            push d
            mov c, e
            mvi b, 0
            mvi d, 4
erase_pad_loop:
            mvi a, 20h
            call plot
            inr c
            dcr d
            jnz erase_pad_loop
            pop d
            pop b
            ret

draw_ball:
            push b
            lda ball_x
            mov b, a
            lda ball_y
            mov c, a
            mvi a, 4Fh     ; 'O'
            call plot
            pop b
            ret

erase_ball:
            push b
            lda ball_x
            mov b, a
            lda ball_y
            mov c, a
            mvi a, 20h
            call plot
            pop b
            ret

; read keyboard row 1 (arrows), move paddle
; bit 5 = up, bit 7 = down
input:
            push b
            push d
            mvi a, 0FDh    ; select row 1
            sta kbd_port
            lda kbd_data
            cma             ; invert: 1 = pressed
            mov d, a

            ani 20h         ; up arrow?
            jz input_check_down
            lda pad_y
            cpi 1           ; already at top wall?
            jz input_done
            mov e, a        ; old position for erase
            dcr a
            sta pad_y
            call erase_pad
            call draw_pad
            jmp input_done

input_check_down:
            mov a, d
            ani 80h         ; down arrow?
            jz input_done
            lda pad_y
            cpi 20          ; already at bottom? (24-4)
            jz input_done
            mov e, a        ; old position for erase
            inr a
            sta pad_y
            call erase_pad
            call draw_pad

input_done: pop d
            pop b
            ret

; move ball, bounce off walls, check paddle
move_ball:
            push b

            lda ball_y      ; update y
            mov b, a
            lda ball_dy
            add b
            sta ball_y

            cpi 1           ; hit top wall?
            jnc check_bottom
            mvi a, 1
            sta ball_y
            call neg_dy
            jmp update_x

check_bottom:
            cpi 24          ; hit bottom wall?
            jc update_x
            mvi a, 23
            sta ball_y
            call neg_dy

update_x:   lda ball_x      ; update x
            mov b, a
            lda ball_dx
            add b
            sta ball_x

            cpi 63          ; hit right wall?
            jc check_left
            mvi a, 62
            sta ball_x
            call neg_dx
            jmp move_done

check_left: cpi 1           ; reached paddle column?
            jnc move_done

            lda ball_y      ; paddle collision check
            mov c, a        ; C = ball_y
            lda pad_y
            mov b, a        ; B = pad_y
            mov a, c
            sub b           ; A = ball_y - pad_y
            jc ball_miss    ; above paddle
            cpi 4           ; within paddle height?
            jnc ball_miss   ; below paddle

            mvi a, 1        ; paddle hit - bounce back
            sta ball_x
            call neg_dx
            lda ball_speed    ; speed up (decrease ticks between moves)
            cpi 2           ; minimum speed
            jz move_done
            dcr a
            sta ball_speed
            jmp move_done

ball_miss:  mvi a, 30       ; reset ball to center
            sta ball_x
            mvi a, 12
            sta ball_y
            mvi a, 1
            sta ball_dx
            sta ball_dy
            mvi a, 12       ; reset speed to slow
            sta ball_speed

move_done:  pop b
            ret

; two's complement negate
neg_dx:     lda ball_dx
            cma
            inr a
            sta ball_dx
            ret

neg_dy:     lda ball_dy
            cma
            inr a
            sta ball_dy
            ret

; short delay per tick — controls paddle poll rate
tick_delay:
            push b
            lxi b, 0600h
tick_loop:  dcx b
            mov a, b
            ora c
            jnz tick_loop
            pop b
            ret

clear_screen:    db 1Fh, 0

ball_x:     db 0
ball_y:     db 0
ball_dx:    db 0
ball_dy:    db 0
pad_y:      db 0
frame_cnt:  db 0
ball_speed:   db 0
