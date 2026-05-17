puts    equ 0F818h

        org 0
        section claude

        lxi h, message
        call puts
        jmp 0f86ch

message:
        db 1Fh, "I AM CLAUDE. I CAN PROGRAM I8080 FOR RK86!", 0Dh, 0Ah, 0
