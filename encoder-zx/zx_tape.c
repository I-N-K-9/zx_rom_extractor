typedef struct {
  unsigned char type;   /* 3 = CODE */
  char name[10];
  unsigned length;
  unsigned start;
  unsigned spare;       /* 0 = CODE */
} tape_hdr;


void save_code_block(unsigned int addr, unsigned int length) {
  const tape_hdr header = { 3, {'t','r','d','o','s','.','r','o','m',' '}, length, addr, 0 };
  __asm__ volatile(
      "PUSH DE\n"
      "DEFB #DD\n"
      "POP HL\n"
      "EI\n"
      "CALL #0970\n"
      "DI\n"
      :: "H"(addr), "D"(&header));
}
