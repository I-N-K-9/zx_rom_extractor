#ifdef USE_QR

#include "qrcodegen.h"
#include "zx_textmode.h"
#include <string.h>

typedef unsigned char uint8_t;

uint8_t qr_temp[qrcodegen_BUFFER_LEN_MAX];
uint8_t qr_code[qrcodegen_BUFFER_LEN_MAX];

#define QR_PAYLOAD_MAX 2953
#define QR_BITMAP_BYTES 2226

uint8_t* attr = (uint8_t*)0x5800;
// white paper, black ink
#define DEFAULT_ATTR 0x38 

static uint8_t qr_byte(const uint8_t *saved, size_t length, int i) {
    if ((size_t)i < length)
        return saved[i];
    return qr_code[i];
}

static void plot(int x, int y, bool is_black) {
    uint8_t *cell = (uint8_t *)(((uint16_t)(0x40u | ((y >> 3) & 0x18u) | (y & 7u)) << 8) | (uint8_t)((uint8_t)((y & 0xF8) << 2) | (uint8_t)(x >> 3)));
    uint8_t bit = (uint8_t)(0x80u >> (x & 7));
    if (is_black)
        *cell |= bit;
    else
        *cell &= (uint8_t)~bit;
}

static void draw_qr(void) {
    int size = qr_code[0];
    int index = 0;
    for (int y = 0; y < size; y++) {
        for (int x = 0; x < size; x++, index++) {
            int byte = (index >> 3) + 1;
            bool is_black = (qr_code[byte] >> (index & 7)) & 0x01;
            plot(x, y, is_black);
        }
    }

    int cells = (size + 7) >> 3;
    for (int cy = 0; cy < cells; cy++) {
        for (int cx = 0; cx < cells; cx++)
            attr[cy * 32 + cx] = DEFAULT_ATTR;
    }
}

bool generate_and_draw_qr(const uint8_t *addr, size_t length) {
    memcpy(qr_temp, addr, length);
    if (!qrcodegen_encodeBinary(qr_temp, length, qr_code, qrcodegen_Ecc_LOW, 40, 40, qrcodegen_Mask_0, true))
        return false;
    draw_qr();
    return true;
}

void generate_and_draw_upper(uint8_t * rom) {
    size_t remaining = 0x4000;
    uint8_t num = 1;

    while (remaining != 0) {
        cls();
        set_channel_s();
        zx_printf("Preparing QR code\rPlease wait              ");

        size_t n = remaining > QR_PAYLOAD_MAX ? QR_PAYLOAD_MAX : remaining;
        if (!generate_and_draw_qr(rom, n))
            return;
        
        zx_printf("Code ");
        print_hex(num++);

        set_channel_k();
        zx_printf(" Make photo and press any key");
        
        wait_any_key();
        rom += n;
        remaining -= n;
    }
}


#endif
