void cls(void) 
{
  __asm__ volatile("CALL #0D6B"); // CLS, select channel K
}

void set_channel(unsigned char c)
{
    __asm__ volatile(
      "CALL #1601"
      :
      : "a"(c)
    );
}

void set_channel_s(void)
{
  set_channel(2);
}

void set_channel_k(void)
{
  set_channel(0);
}

__attribute__((noinline)) 
void zx_putchar(unsigned char c)
{
  __asm__ volatile("RST #10" : : "a"(c));
}

void zx_printf(char* s)
{
  while (*s != 0)
    zx_putchar(*s++);
}

void print_hex(unsigned char c)
{
  unsigned char sym = c >> 4;
  if (sym > 9)
    sym += 'A' - 10;
  else
    sym += '0';
  zx_putchar(sym);

  sym = c & 0x0F;
  if (sym > 9)
    sym += 'A' - 10;
  else
    sym += '0';
  zx_putchar(sym);
}

unsigned char in_kbd(unsigned char halfrow_mask) {
    __asm__ volatile("IN A,(#FE)" : "+a"(halfrow_mask));
    return (unsigned char)(~halfrow_mask & 0x1F);
}

unsigned char wait_any_key(void)
{
    unsigned char c;
    while (!(c = in_kbd(0))) {}
    while (in_kbd(0)) {}
    return c;
}
