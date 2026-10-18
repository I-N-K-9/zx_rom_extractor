REM TODO: Replace with makefile when x80cc is available for linux

x80cc.exe --target=zx --stack-top=0xC000 --org=26000 --lst main.c zx_textmode.c zx_tape.c zx_qrdraw.c qrcodegen.c -DUSE_QR