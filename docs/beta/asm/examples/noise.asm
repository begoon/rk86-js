  org 0h

  lxi h, 0f800h
begin:
  push h
  lxi d, 76d0h
  lxi b, 78*30
loop:
  mov a, m
  xra l
  xra e
  xra c
  stax d
  inx h
  inx d
  dcx b
  mov a, c
  ora b
  jnz loop
  pop h
  inx h
  jmp begin
