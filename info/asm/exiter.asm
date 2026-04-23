puts        equ 0F818h

            org 0
            section exiter

            lxi h, message
            call puts
            jmp 0FFFEh

message:
            db 1Fh, "I JUMP TO FFFE TO EXIT EMULATOR", 0Dh, 0Ah, 0
