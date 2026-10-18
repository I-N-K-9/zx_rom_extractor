#include "zx_textmode.h"
#include "zx_tape.h"
#include "zx_qrdraw.h"

__attribute__((noinline)) 
void get_trdos_rom()
{
  __asm__ volatile(
    "LD HL, #2FF0\n"
    "PUSH HL\n"
    "LD HL, #0000\n"
    "LD DE, #C000\n"
    "LD BC, #4000\n"
    "JP #3D2F\n"
    :
    :
    : "H", "D", "B"
  );
}

void dump_to_screen(unsigned char* rom)
{
  unsigned int addr = 0;

  while (addr < 0x4000)
  {
    cls();

    print_hex((unsigned char)(addr >> 8));
    print_hex((unsigned char)addr);

    set_channel_s();

    for (int i = 0; i < 22 * 32 / 2; i++)
    {
      print_hex(*rom++);
      addr++;
    }

    // Sleep
    for (unsigned int i = 0; i < 0xFFFF; i++)
    {
      __asm__ volatile("nop");
    }
  }
}

void main()
{
restart:
  cls();
  set_channel_s();

  zx_printf("--=  ZX ROM EXTRACTOR (ZRE)  =--\r            Ver. 1.0\r\r");

  zx_printf("Please press:\r");
  zx_printf(" 1 - extract SOS ROM\r");
  zx_printf(" 2 - extract TR-DOS ROM\r\r");

  unsigned char* address;
  unsigned char key;
  while (1)
  {
    key = wait_any_key(); // all halfrows
    if (key == 1)
    {
      address = (unsigned char*)0x0000;
      break;
    }
    else if (key == 2)
    {
      zx_printf("Copying the TRDOS ROM to RAM...\r");
      get_trdos_rom();
      zx_printf("Completed!\r\r");
      address = (unsigned char*)0xC000;
      break;
    }
  }

  zx_printf("Please press:\r");
  zx_printf(" 1 - dump to screen\r");
  zx_printf(" 2 - dump to tape\r");

#ifdef USE_QR
  zx_printf(" 3 - QR\r");
#endif

  while (1)
  {
    key = wait_any_key();
    if (key == 1)
    {
      dump_to_screen(address);
      break;
    }
    else if (key == 2)
    {
      save_code_block((unsigned int)address, 0x4000);
      break;
    }
#ifdef USE_QR
    else if (key == 4)
    {
      generate_and_draw_upper(address);
      break;
    }
#endif
  }

  cls();
  zx_printf("Done! Press any key to return\r");
  wait_any_key();
  goto restart;
}
