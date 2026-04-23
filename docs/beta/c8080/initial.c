// "Aloha!"
//
// Monitor entry points:
//   0xF818  —  print C string, input: HL = address of string
//   0xF86C  —  return to monitor prompt
//
// c8080's __global convention passes the last int-sized param in HL, so
// calling print(msg) leaves HL = msg at the start of print's body. The
// prologue SHLDs HL into __a_1_print but leaves HL itself untouched, so
// the inline CALL sees the string address in HL as required.

char msg[] = "Aloha!";

void print(char *s)
{
    asm { CALL 0F818h }
}

void exit() { asm { jmp 0f86ch } }

int main(void)
{
    char *v = (unsigned short)0x76d0;
    for (char y = 0; y < 24; ++y)
    {
        for (char x = 0; x < 78; ++x)
        {
            *v++ = y * 3 + x;
        }
    }
    print(msg);
    exit();
}
