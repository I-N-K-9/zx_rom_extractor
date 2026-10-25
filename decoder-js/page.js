(function () {
    var ATTEMPTS = [
        { blur: 1, bias: 8, fitMis: 2, radius: 1 },
        { blur: 2, bias: 14, fitMis: 2, radius: 1 },
        { blur: 1, bias: 14, fitMis: 2, radius: 1 },
        { blur: 2, bias: 8, fitMis: 2, radius: 1 },
        { blur: 2, bias: 10, fitMis: 2, radius: 1 },
        { blur: 1, bias: 8, fitMis: 4, radius: 1 }
    ];

    var STR = {
        en: {
            about: "ZRE is a ZX Spectrum program that copies out the SOS or TR-DOS ROM without a programmer or even unscrewing the case, as a screen dump, a tape file, or a set of QR codes.",
            tap: "Download TAP",
            howto1: "Load the tape on your ZX Spectrum, select which ROM to extract (SOS or TR-DOS), and press 3 to generate a set of QR codes. Each code takes about a minute. There are 6 codes in total. Then insert the QR code images in the form below and press Decode.",
            howto2: "You can also extract the ROM as a hex dump on the screen (but you'll need to decode it yourself) or save it to the tape.",
            join: "Join QR photos into a ROM",
            lead: "Add the JPEG or PNG photos. They are read in alphabetical order and saved as one binary file.",
            drop: "Drop photos here, or click to choose them",
            decode: "Decode",
            save: "Download rom.bin",
            reading: "reading…",
            failed: "failed",
            readingOf: "Reading {i} of {n}",
            failedPhotos: "One or more photos could not be read.",
            photoOne: "{n} photo, alphabetical",
            photoMany: "{n} photos, alphabetical",
            bytes: "{n} bytes"
        },
        ru: {
            about: "ZRE — это программа для ZX Spectrum, которая позволяет считать ПЗУ SOS или TR-DOS без программатора и даже без раскручивания корпуса: дампом на экран, записью на кассету или набором QR-кодов.",
            tap: "Скачать TAP",
            howto1: "Загрузите TAP-файл в свой ZX Spectrum, выберите, какой дамп ПЗУ достаём (SOS или TR-DOS), и нажмите 3, чтобы получить набор QR-кодов. Каждый код формируется около минуты, всего кодов 6. Затем вставьте изображения QR-кодов в форму ниже и нажмите «Декодировать».",
            howto2: "Также можно вывести ПЗУ на экран шестнадцатеричным дампом (но его придётся декодировать самостоятельно) или сохранить на кассету.",
            join: "Склеить фотографии QR-кодов в ПЗУ",
            lead: "Добавьте JPEG или PNG. Обработка идёт в алфавитном порядке. В конце данные склеются в один бинарь, который можно будет скачать.",
            drop: "Нажмите для выбора фото или просто перетащите сюда файлы",
            decode: "Декодировать",
            save: "Скачать rom.bin",
            reading: "чтение…",
            failed: "ошибка",
            readingOf: "Чтение {i} из {n}",
            failedPhotos: "Не удалось прочитать одно или несколько фото.",
            bytesOne: "{n} байт",
            bytesFew: "{n} байта",
            bytesMany: "{n} байт",
            photoOne: "{n} фотография, по алфавиту",
            photoFew: "{n} фотографии, по алфавиту",
            photoMany: "{n} фотографий, по алфавиту"
        }
    };

    var input = document.getElementById("files");
    var drop = document.getElementById("drop");
    var list = document.getElementById("list");
    var go = document.getElementById("go");
    var save = document.getElementById("save");
    var status = document.getElementById("status");
    var chosen = [];
    var rom = null;
    var lang = "en";
    var statusState = null;
    var rowState = [];

    function storedLang() {
        try {
            var saved = localStorage.getItem("zre-lang");
            if (saved === "ru" || saved === "en") return saved;
        } catch (err) {}
        return /^ru\b/i.test(navigator.language || "") ? "ru" : "en";
    }

    function t(key) {
        return STR[lang][key];
    }

    function ruForm(n, one, few, many) {
        var n10 = n % 10;
        var n100 = n % 100;
        if (n10 === 1 && n100 !== 11) return one;
        if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
        return many;
    }

    function fill(template, values) {
        return template.replace(/\{(\w+)\}/g, function (_, key) { return values[key]; });
    }

    function photosLabel(n) {
        if (lang === "ru") return fill(ruForm(n, t("photoOne"), t("photoFew"), t("photoMany")), { n: n });
        return fill(n === 1 ? t("photoOne") : t("photoMany"), { n: n });
    }

    function bytesLabel(n) {
        if (lang === "ru") return fill(ruForm(n, t("bytesOne"), t("bytesFew"), t("bytesMany")), { n: n });
        return fill(t("bytes"), { n: n });
    }

    function paintStatus() {
        var s = statusState;
        if (!s) {
            status.textContent = "";
            return;
        }
        if (s.key === "photos") status.textContent = photosLabel(s.n);
        else if (s.key === "readingOf") status.textContent = fill(t("readingOf"), { i: s.i, n: s.n });
        else if (s.key === "bytes") status.textContent = bytesLabel(s.n);
        else status.textContent = t(s.key);
    }

    function applyLang() {
        document.documentElement.lang = lang;
        var nodes = document.querySelectorAll("[data-i18n]");
        for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
        var switches = document.querySelectorAll("[data-set-lang]");
        for (var j = 0; j < switches.length; j++) {
            var on = switches[j].getAttribute("data-set-lang") === lang;
            switches[j].classList.toggle("on", on);
            switches[j].setAttribute("aria-pressed", on ? "true" : "false");
        }
        render();
        paintStatus();
    }

    function setLang(next) {
        lang = next === "ru" ? "ru" : "en";
        try { localStorage.setItem("zre-lang", lang); } catch (err) {}
        applyLang();
    }

    function byName(a, b) {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    }

    function setFiles(fileList) {
        var next = [];
        for (var i = 0; i < fileList.length; i++) {
            var file = fileList[i];
            if (!/\.(jpe?g|png)$/i.test(file.name)) continue;
            next.push(file);
        }
        next.sort(byName);
        chosen = next;
        rom = null;
        rowState = chosen.map(function () { return null; });
        save.disabled = true;
        go.disabled = chosen.length === 0;
        statusState = chosen.length ? { key: "photos", n: chosen.length } : null;
        render();
        paintStatus();
    }

    function render() {
        list.replaceChildren();
        for (var i = 0; i < chosen.length; i++) {
            var li = document.createElement("li");
            var name = document.createElement("span");
            name.className = "name";
            name.textContent = chosen[i].name;
            var meta = document.createElement("span");
            meta.className = "meta";
            var row = rowState[i];
            if (row && row.key === "bytes") meta.textContent = bytesLabel(row.n);
            else if (row) meta.textContent = t(row.key);
            if (row && row.key === "failed") li.className = "bad";
            li.append(name, meta);
            list.append(li);
        }
    }

    function loadGray(file) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                var ctx = canvas.getContext("2d", { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);
                var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                var gray = new Uint8ClampedArray(canvas.width * canvas.height);
                for (var i = 0, j = 0; i < data.length; i += 4, j++) {
                    gray[j] = (data[i] + 2 * data[i + 1] + data[i + 2]) >> 2;
                }
                URL.revokeObjectURL(url);
                resolve({ gray: gray, width: canvas.width, height: canvas.height });
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error("could not read the image"));
            };
            img.src = url;
        });
    }

    function payloadFromModules(modules) {
        var pure = QRGrid.toPure(modules);
        var hints = new Map();
        hints.set(ZXing.DecodeHintType.PURE_BARCODE, true);
        hints.set(ZXing.DecodeHintType.CHARACTER_SET, "ISO-8859-1");
        var source = new ZXing.RGBLuminanceSource(pure.gray, pure.width, pure.height);
        var bitmap = new ZXing.BinaryBitmap(new ZXing.GlobalHistogramBinarizer(source));
        var result = new ZXing.QRCodeReader().decode(bitmap, hints);
        var meta = result.getResultMetadata();
        var segs = meta && meta.get(ZXing.ResultMetadataType.BYTE_SEGMENTS);
        if (!segs || !segs.length) throw new Error("QR code has no binary payload");
        var total = 0;
        for (var i = 0; i < segs.length; i++) total += segs[i].length;
        var out = new Uint8Array(total);
        var at = 0;
        for (var s = 0; s < segs.length; s++) {
            out.set(segs[s], at);
            at += segs[s].length;
        }
        return out;
    }

    function decodeGray(gray, width, height) {
        var last = null;
        for (var i = 0; i < ATTEMPTS.length; i++) {
            try {
                var modules = QRGrid.readModules(gray, width, height, ATTEMPTS[i]);
                return payloadFromModules(modules);
            } catch (err) {
                last = err;
            }
        }
        throw last || new Error("could not read the QR code");
    }

    function pause() {
        return new Promise(function (resolve) { setTimeout(resolve, 0); });
    }

    async function decodeAll() {
        go.disabled = true;
        save.disabled = true;
        rom = null;
        rowState = chosen.map(function () { return null; });
        var parts = [];
        var failed = false;
        for (var i = 0; i < chosen.length; i++) {
            rowState[i] = { key: "reading" };
            statusState = { key: "readingOf", i: i + 1, n: chosen.length };
            render();
            paintStatus();
            await pause();
            try {
                var image = await loadGray(chosen[i]);
                var bytes = decodeGray(image.gray, image.width, image.height);
                parts.push(bytes);
                rowState[i] = { key: "bytes", n: bytes.length };
            } catch (err) {
                failed = true;
                rowState[i] = { key: "failed" };
            }
            render();
        }
        if (failed || !parts.length) {
            statusState = { key: "failedPhotos" };
            paintStatus();
            go.disabled = false;
            return;
        }
        var total = 0;
        for (var p = 0; p < parts.length; p++) total += parts[p].length;
        rom = new Uint8Array(total);
        var at = 0;
        for (var q = 0; q < parts.length; q++) {
            rom.set(parts[q], at);
            at += parts[q].length;
        }
        statusState = { key: "bytes", n: total };
        paintStatus();
        save.disabled = false;
        go.disabled = false;
    }

    input.addEventListener("change", function () {
        setFiles(input.files);
    });

    ["dragenter", "dragover"].forEach(function (name) {
        drop.addEventListener(name, function (event) {
            event.preventDefault();
            drop.classList.add("over");
        });
    });
    ["dragleave", "drop"].forEach(function (name) {
        drop.addEventListener(name, function (event) {
            event.preventDefault();
            drop.classList.remove("over");
        });
    });
    drop.addEventListener("drop", function (event) {
        setFiles(event.dataTransfer.files);
    });

    document.querySelectorAll("[data-set-lang]").forEach(function (button) {
        button.addEventListener("click", function () {
            setLang(button.getAttribute("data-set-lang"));
        });
    });

    setLang(storedLang());

    go.addEventListener("click", function () { decodeAll(); });
    save.addEventListener("click", function () {
        if (!rom) return;
        var blob = new Blob([rom], { type: "application/octet-stream" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = "rom.bin";
        link.click();
        URL.revokeObjectURL(url);
    });
})();
