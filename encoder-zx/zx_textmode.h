#ifndef ZX_TEXTMODE_H
#define ZX_TEXTMODE_H

void cls(void);
void set_channel_s(void);
void set_channel_k(void);
void zx_putchar(unsigned char c);
void zx_printf(char* s);

void print_hex(unsigned char c);

unsigned char in_kbd(unsigned char halfrow_mask);
unsigned char wait_any_key(void);

#endif
