     ORG 3000H
     LXI SP,75FFH
     LXI  H,S00
     CALL S01
     CALL S02
     LXI  H,S03
     CALL S04
     CALL S02
     LXI  H,S05
     CALL S01
S0A: CALL S06
     LXI  B,S07
     CALL S08
     CALL S06
     CALL S09
     JZ   S0A
     MOV  H,L
     CALL S09
     JZ   S0A
S20: PUSH H
     MVI  L,00H
     PUSH H
     LXI  H,S0B
     CALL S04
     POP  H
S10: CALL S0C
     MVI  C,3AH
     CALL S0D
     CALL S0E
     CALL S0F
     MVI  A,10H
     ADD  L
     MOV  L,A
     JNC  S10
S12: CALL S11
     INR  L
     JNZ  S12
     POP  H
     CALL S13
S1C: CALL S06
     CALL S0C
     CALL S11
S15: MVI  A,00H
     ORA  A
     JZ   S14
     XRA  A
     STA  S15+1
     MVI  C,18H
     CALL S0D
     JMP  S16
S14: CALL S17
     JNZ  S18
     CPI 0
     JZ S1D
     CPI 1
     JZ S1D
     CPI 2
     JZ S1D
     CALL S19
     CPI  18H
     JZ   S16
     CPI  08H
     JZ   S1A
S24: CPI  19H
     JNZ  S1B
     MVI  A,0F0H
S1E: ADD  L
     MOV  L,A
     JMP  S1C
S1B: CPI  1AH
     JNZ  S1D
     MVI  A,10H
     JMP  S1E
S1D: DCR  A
     JZ   S0A
     DCR  A
     JZ   S1F
     DCR  H
     DCR  H
S1F: INR  H
     JMP  S20
S18: RLC
     RLC
     RLC
     RLC
     MVI  B,0FH
     CALL S21
S16: CALL S17
     JNZ  S22
     CPI 0
     JZ S1D
     CPI 1
     JZ S1D
     CPI 2
     JZ S1D
     CALL S19
     CPI  08H
     JZ   S14
     CPI  18H
     JZ   S23
     JMP  S24
S22: MVI  B,0F0H
     CALL S21
S23: INR  L
     JMP  S1C
S1A: STA  S15+1
     DCR  L
     JMP  S1C
S09: MVI  L,00H
     CALL S17
     RZ
     RLC
     RLC
     RLC
     RLC
     ORA  L
     MOV  L,A
     CALL S17
     RZ
     ORA  L
     MOV  L,A
     INR  A
     CMP  L
     RET
S21: MOV  C,A
     MOV  A,M
     ANA  B
     ORA  C
     MOV  M,A
     CALL S13
S0E: PUSH H
     MOV  A,L
     ANI  0F0H
     MOV  L,A
     ORI  0FH
     MOV  E,A
     MOV  D,H
     CALL S25
     CALL S26
     PUSH H
S29: MVI  L,3AH
     CALL S04
     MOV  H,B
     MOV  L,C
     CALL S0C
     POP  H
     JMP  S27
S06: PUSH H
     LXI  H,S28
S27: CALL S04
     POP  H
     RET
S13: PUSH H
     MVI  L,00H
     MOV  D,H
     MVI  E,0FFH
     CALL S25
     CALL S26
     PUSH H
     MVI  H,15H
     JMP  S29
S0C: MOV  A,H
     CALL S2A
     MOV  A,L
     JMP  S2A
S0F: MVI  C,0AH
     CALL S0D
     MVI  C,0DH
     JMP  S0D
S11: MOV  A,L
     ANI  0FH
     MOV  C,A
     ADD  A
     ADD  C
     ADI  07H
     MOV  E,A
     MOV  A,L
     ANI  0F0H
     RRC
     RRC
     RRC
     RRC
     ADI  04H
     MOV  D,A
     XCHG
     CALL S04
     XCHG
     MOV  A,M
     CALL S2A
     CALL S2B
S2B: MVI  C,08H
     JMP  S0D
S2F: LXI  B,S2C
     CALL S08
S17: CALL S2D
     CPI  03H
     JZ   S2E
     ORA  A
     RZ
     CPI  01H
     RZ
     CPI  02H
     RZ
     CPI  08H
     RZ
     CPI  18H
     RZ
     CPI  1AH
     RZ
     CPI  19H
     RZ
     CPI  30H
     JC   S2F
     CPI  3AH
     CC   S19
     JC   S30
     CPI  41H
     JC   S2F
     CPI  47H
     JNC  S2F
     CALL S19
     ADI  09H
S30: ANI  0FH
     CPI  0FFH
     RET
S02: LXI  B,S31
S08: CALL S0D
     DCR  B
     JNZ  S08
     RET
S00: DB   1FH
     DB   0AH
     DB   'adres:'
     DB   '               '
     DB   '>>> DUMP EDITOR <<<'
     DB   '                 '
     DB   'summa  '
     DB   00H
S05: DB   '       '
     DB   ' F1-wwerh   F2-adres   F3-wniz   F4-monitor'
     DB 0
S01: EQU  0F818H
S03: EQU  1700H
S07: EQU  0420H
S0B: EQU  0400H
S0D: EQU  0F809H
S28: EQU  0107H
S2A: EQU  0F815H
S2C: EQU  0807H
S2D: EQU  0F803H
S2E: EQU  0F800H
S31: EQU  402DH
S19: PUSH B
     MOV C,A
     CALL 0F809H
     POP B
     RET
S04: PUSH H
     PUSH D
     PUSH B
     LXI D,2020H
     DAD D
     MOV A,H
     STA CRD+2
     MOV A,L
     STA CRD+3
     LXI H,CRD
     CALL 0F818H
     POP B
     POP D
     POP H
     RET
CRD: DB 1BH,59H,20H,20H,0
S26: PUSH D
     CALL 0F81EH
     LXI D,0FCF8H
     DAD D
     POP D
     RET
S25: EQU 0F82AH
     end
