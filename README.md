# ZX ROM Extractor

ZRE is a ZX Spectrum program that copies out the SOS or TR-DOS ROM without a programmer or even unscrewing the case, as a screen dump, a tape file, or a set of QR codes.

It consists of two parts: an encoder that runs on a ZX Spectrum and encodes the ROM, and a decoder written in JavaScript and available online.

## Download

- Tape image: [ZRE_v1_1.TAP](https://github.com/atsidaev/zx_rom_extractor/releases/download/v1.1/ZRE_v1_1.TAP)
- Decoder (online): [https://i-n-k-9.github.io/zx_rom_extractor/](https://i-n-k-9.github.io/zx_rom_extractor/)

## Usage

Load the TAP on a ZX Spectrum, or in an emulator, the usual way (`LOAD ""`).

The program asks which ROM to copy:

1. SOS, the ROM at address 0
2. TR-DOS. This needs a machine with TR-DOS. The ROM is copied into RAM first

Then it asks how to deliver the 16K image:

1. Hex dump on the screen. The dump is shown page by page. Decoding it is left to you
2. A tape file. The block is CODE, 16384 bytes
3. QR codes. Six codes are drawn, and each one takes about a minute. Photograph the screen after each code and press any key to continue

To turn the photographs into a ROM, open the decoder page. Add the JPEG or PNG files. They are read in alphabetical order of the file name. Press Decode, then download `rom.bin`. The file is 16384 bytes.

## Build

The sources are in `encoder-zx`. The build runs on Windows. It needs the [x80cc C compiler](https://zx-pk.ru/threads/36788-x80cc-optimiziruyushchij-kompilyator-c23-dlya-intel-8080-(kr580vm80a).html) (currently Windows-only).

From `encoder-zx`:

```bat
build.bat
```

The result is `encoder-zx/ZRE.TAP`.

## Acknowledgements and licensing

Thanks to [@evgs](https://github.com/evgs) for the idea of using QR codes.

The QR generation code is taken from [nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator/blob/master/c/qrcodegen.c). Lookup tables were introduced as an optimization.

The application is licensed under GPLv3. 

# ZX ROM Extractor

ZRE — это программа для ZX Spectrum, которая позволяет считать ПЗУ SOS или TR-DOS без программатора и даже без раскручивания корпуса: дампом на экран, записью на кассету или набором QR-кодов.

Она состоит из двух частей: кодировщика, который работает на ZX Spectrum и кодирует ПЗУ, и декодера, написанного на JavaScript и доступного онлайн.

## Скачивание

- Образ кассеты: [ZRE_v1_1.TAP](https://github.com/atsidaev/zx_rom_extractor/releases/download/v1.1/ZRE_v1_1.TAP)
- Декодер (онлайн): [https://i-n-k-9.github.io/zx_rom_extractor/](https://i-n-k-9.github.io/zx_rom_extractor/)

## Использование

Загрузите TAP на ZX Spectrum или в эмуляторе обычным способом (`LOAD ""`).

Программа спрашивает, какое ПЗУ копировать:

1. SOS, ПЗУ по адресу 0
2. TR-DOS. Нужна машина с TR-DOS. Сначала ПЗУ копируется в ОЗУ

Затем она спрашивает, как отдать образ на 16 КБ:

1. Шестнадцатеричный дамп на экран. Дамп идёт постранично. Декодировать его нужно самостоятельно
2. Файл на кассету. Блок CODE, 16384 байта
3. QR-коды. Рисуется шесть кодов, каждый формируется около минуты. Сфотографируйте экран после каждого кода и нажмите любую клавишу, чтобы продолжить

Чтобы собрать фотографии в ПЗУ, откройте страницу декодера. Добавьте файлы JPEG или PNG. Они читаются в алфавитном порядке имён. Нажмите «Декодировать» и скачайте `rom.bin`. В файле 16384 байта.

## Сборка

Исходники лежат в `encoder-zx`. Сборка запускается под Windows. Нужен [компилятор C x80cc](https://zx-pk.ru/threads/36788-x80cc-optimiziruyushchij-kompilyator-c23-dlya-intel-8080-(kr580vm80a).html) (пока только для Windows).

Из каталога `encoder-zx`:

```bat
build.bat
```

Результат — `encoder-zx/ZRE.TAP`.

## Благодарности и лицензия

Спасибо [@evgs](https://github.com/evgs) за идею использовать QR-коды.

Код генерации QR взят из [nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator/blob/master/c/qrcodegen.c). Добавлены look-up tables для ускорения (а то по пять минут ждать было грустно).

Программа распространяется под лицензией GPLv3.
