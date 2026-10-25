(function () {
    var ATTEMPTS = [
        { blur: 1, bias: 8, fitMis: 2, radius: 1 },
        { blur: 2, bias: 14, fitMis: 2, radius: 1 },
        { blur: 1, bias: 14, fitMis: 2, radius: 1 },
        { blur: 2, bias: 8, fitMis: 2, radius: 1 },
        { blur: 2, bias: 10, fitMis: 2, radius: 1 },
        { blur: 1, bias: 8, fitMis: 4, radius: 1 }
    ];

    var input = document.getElementById("files");
    var drop = document.getElementById("drop");
    var list = document.getElementById("list");
    var go = document.getElementById("go");
    var save = document.getElementById("save");
    var status = document.getElementById("status");
    var chosen = [];
    var rom = null;

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
        save.disabled = true;
        render();
        go.disabled = chosen.length === 0;
        status.textContent = chosen.length ? chosen.length + " photo" + (chosen.length === 1 ? "" : "s") + ", alphabetical" : "";
    }

    function render(rows) {
        list.replaceChildren();
        for (var i = 0; i < chosen.length; i++) {
            var li = document.createElement("li");
            var name = document.createElement("span");
            name.className = "name";
            name.textContent = chosen[i].name;
            var meta = document.createElement("span");
            meta.className = "meta";
            meta.textContent = rows && rows[i] ? rows[i] : "";
            if (rows && rows[i] && rows[i].indexOf("failed") === 0) li.className = "bad";
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
        var rows = chosen.map(function () { return ""; });
        var parts = [];
        var failed = false;
        for (var i = 0; i < chosen.length; i++) {
            rows[i] = "reading…";
            render(rows);
            status.textContent = "Reading " + (i + 1) + " of " + chosen.length;
            await pause();
            try {
                var image = await loadGray(chosen[i]);
                var bytes = decodeGray(image.gray, image.width, image.height);
                parts.push(bytes);
                rows[i] = bytes.length + " bytes";
            } catch (err) {
                failed = true;
                rows[i] = "failed";
            }
            render(rows);
        }
        if (failed || !parts.length) {
            status.textContent = "One or more photos could not be read.";
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
        status.textContent = total + " bytes";
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
