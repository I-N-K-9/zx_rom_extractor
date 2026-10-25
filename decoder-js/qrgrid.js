/* Straighten a photographed QR symbol into a square module grid.

   The pictures are of a screen where each QR module is one pixel, so the
   modules are not square and a single detector pass does not sample them
   accurately enough. This finds the three finder patterns, fits the grid
   with the alignment patterns, and returns one sample per module.
*/
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.QRGrid = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    function boxMean(src, w, h, r) {
        var stride = w + 1;
        var ii = new Float64Array(stride * (h + 1));
        for (var y = 1; y <= h; y++) {
            var rowSum = 0;
            var srcRow = (y - 1) * w;
            var iiRow = y * stride;
            var iiPrev = (y - 1) * stride;
            for (var x = 1; x <= w; x++) {
                rowSum += src[srcRow + x - 1];
                ii[iiRow + x] = ii[iiPrev + x] + rowSum;
            }
        }
        var out = new Float64Array(w * h);
        for (var y2 = 0; y2 < h; y2++) {
            var y0 = y2 - r;
            if (y0 < 0) y0 = 0;
            var y1 = y2 + r + 1;
            if (y1 > h) y1 = h;
            for (var x2 = 0; x2 < w; x2++) {
                var x0 = x2 - r;
                if (x0 < 0) x0 = 0;
                var x1 = x2 + r + 1;
                if (x1 > w) x1 = w;
                var sum = ii[y1 * stride + x1] - ii[y0 * stride + x1] - ii[y1 * stride + x0] + ii[y0 * stride + x0];
                out[y2 * w + x2] = sum / ((y1 - y0) * (x1 - x0));
            }
        }
        return out;
    }

    function solve(a, b) {
        var n = b.length;
        var m = new Array(n);
        for (var i = 0; i < n; i++) {
            var row = new Float64Array(n + 1);
            for (var j = 0; j < n; j++) row[j] = a[i][j];
            row[n] = b[i];
            m[i] = row;
        }
        for (var col = 0; col < n; col++) {
            var pivot = col;
            for (var r = col + 1; r < n; r++) {
                if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
            }
            if (Math.abs(m[pivot][col]) < 1e-8) throw new Error("could not fit the QR grid");
            var tmp = m[col];
            m[col] = m[pivot];
            m[pivot] = tmp;
            var div = m[col][col];
            for (var j2 = col; j2 <= n; j2++) m[col][j2] /= div;
            for (var r2 = 0; r2 < n; r2++) {
                if (r2 === col) continue;
                var factor = m[r2][col];
                if (factor === 0) continue;
                for (var j3 = col; j3 <= n; j3++) m[r2][j3] -= factor * m[col][j3];
            }
        }
        var x = new Float64Array(n);
        for (var i2 = 0; i2 < n; i2++) x[i2] = m[i2][n];
        return x;
    }

    function fitHomography(src, dst) {
        var ata = new Array(8);
        var atb = new Float64Array(8);
        for (var i = 0; i < 8; i++) ata[i] = new Float64Array(8);
        function add(row, target) {
            for (var i = 0; i < 8; i++) {
                atb[i] += row[i] * target;
                for (var j = 0; j < 8; j++) ata[i][j] += row[i] * row[j];
            }
        }
        for (var k = 0; k < src.length; k++) {
            var x = src[k][0];
            var y = src[k][1];
            var u = dst[k][0];
            var v = dst[k][1];
            add([x, y, 1, 0, 0, 0, -u * x, -u * y], u);
            add([0, 0, 0, x, y, 1, -v * x, -v * y], v);
        }
        var h = solve(ata, atb);
        return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
    }

    function project(h, x, y) {
        var z = h[6] * x + h[7] * y + h[8];
        return [(h[0] * x + h[1] * y + h[2]) / z, (h[3] * x + h[4] * y + h[5]) / z];
    }

    function ratioOk(counts, ratios) {
        var total = 0;
        var weight = 0;
        for (var i = 0; i < counts.length; i++) {
            total += counts[i];
            weight += ratios[i];
        }
        var unit = total / weight;
        if (unit < 2.5) return false;
        var limit = unit * 0.6;
        for (var j = 0; j < counts.length; j++) {
            if (Math.abs(counts[j] - unit * ratios[j]) > limit) return false;
        }
        return true;
    }

    function centerRatio(line, length, center, ratios) {
        center = Math.round(center);
        if (center < 0 || center >= length || !line(center)) return null;
        var mid = (ratios.length / 2) | 0;
        var left = center;
        while (left > 0 && line(left - 1)) left--;
        var right = center;
        while (right + 1 < length && line(right + 1)) right++;
        var counts = [0, 0, 0, 0, 0];
        counts[mid] = right - left + 1;
        var pos = left - 1;
        var start = 0;
        for (var state = mid - 1; state >= 0; state--) {
            var expect = (mid - state) % 2 === 0;
            while (pos >= 0 && !!line(pos) === expect) {
                counts[state]++;
                pos--;
            }
            if (counts[state] === 0) return null;
        }
        start = pos + 1;
        pos = right + 1;
        for (var state2 = mid + 1; state2 < ratios.length; state2++) {
            var expect2 = (state2 - mid) % 2 === 0;
            while (pos < length && !!line(pos) === expect2) {
                counts[state2]++;
                pos++;
            }
            if (counts[state2] === 0) return null;
        }
        if (!ratioOk(counts, ratios)) return null;
        var total = 0;
        for (var i = 0; i < counts.length; i++) total += counts[i];
        return { center: start + total / 2, module: total / 7 };
    }

    function findFinders(black, w, h) {
        var ratios = [1, 1, 3, 1, 1];
        var hits = [];
        for (var y = 0; y < h; y++) {
            var row = y * w;
            var counts = [0, 0, 0, 0, 0];
            var state = 0;
            for (var x = 0; x < w; x++) {
                if (black[row + x]) {
                    if (state % 2 === 1) state++;
                    counts[state]++;
                } else if (state === 4) {
                    if (ratioOk(counts, ratios)) {
                        var cx = x - counts[4] - counts[3] - counts[2] / 2;
                        var vertical = centerRatio(function (i) { return black[i * w + (cx | 0)]; }, h, y, ratios);
                        if (vertical) {
                            var yy = Math.round(vertical.center);
                            var horizontal = centerRatio(function (i) { return black[yy * w + i]; }, w, cx, ratios);
                            if (horizontal) {
                                hits.push({
                                    x: horizontal.center,
                                    y: vertical.center,
                                    mh: horizontal.module,
                                    mv: vertical.module
                                });
                            }
                        }
                    }
                    counts = [counts[2], counts[3], counts[4], 1, 0];
                    state = 3;
                } else {
                    if (state % 2 === 0) state++;
                    counts[state]++;
                }
            }
        }
        var clusters = [];
        for (var i = 0; i < hits.length; i++) {
            var hit = hits[i];
            var placed = false;
            for (var c = 0; c < clusters.length; c++) {
                var cluster = clusters[c];
                if (Math.abs(cluster.x - hit.x) < 40 && Math.abs(cluster.y - hit.y) < 40) {
                    cluster.pts.push(hit);
                    var n = cluster.pts.length;
                    var sx = 0, sy = 0, sh = 0, sv = 0;
                    for (var p = 0; p < n; p++) {
                        sx += cluster.pts[p].x;
                        sy += cluster.pts[p].y;
                        sh += cluster.pts[p].mh;
                        sv += cluster.pts[p].mv;
                    }
                    cluster.x = sx / n;
                    cluster.y = sy / n;
                    cluster.mh = sh / n;
                    cluster.mv = sv / n;
                    cluster.n = n;
                    placed = true;
                    break;
                }
            }
            if (!placed) clusters.push({ x: hit.x, y: hit.y, mh: hit.mh, mv: hit.mv, n: 1, pts: [hit] });
        }
        var strong = [];
        for (var k = 0; k < clusters.length; k++) {
            if (clusters[k].n >= 8) strong.push(clusters[k]);
        }
        return strong;
    }

    function order(a, b, c) {
        var dab = Math.hypot(a.x - b.x, a.y - b.y);
        var dac = Math.hypot(a.x - c.x, a.y - c.y);
        var dbc = Math.hypot(b.x - c.x, b.y - c.y);
        var tl, p1, p2;
        if (dbc >= dab && dbc >= dac) { tl = a; p1 = b; p2 = c; }
        else if (dac >= dab && dac >= dbc) { tl = b; p1 = a; p2 = c; }
        else { tl = c; p1 = a; p2 = b; }
        var v1x = p1.x - tl.x, v1y = p1.y - tl.y;
        var v2x = p2.x - tl.x, v2y = p2.y - tl.y;
        var cross = v1x * v2y - v1y * v2x;
        return cross > 0 ? [tl, p1, p2] : [tl, p2, p1];
    }

    function chooseFinders(clusters) {
        if (clusters.length < 3) throw new Error("could not find a QR code");
        var best = null;
        var bestScore = Infinity;
        for (var i = 0; i < clusters.length; i++) {
            for (var j = i + 1; j < clusters.length; j++) {
                for (var k = j + 1; k < clusters.length; k++) {
                    var ordered = order(clusters[i], clusters[j], clusters[k]);
                    var tl = ordered[0], tr = ordered[1], bl = ordered[2];
                    var v1x = tr.x - tl.x, v1y = tr.y - tl.y;
                    var v2x = bl.x - tl.x, v2y = bl.y - tl.y;
                    var l1 = Math.hypot(v1x, v1y);
                    var l2 = Math.hypot(v2x, v2y);
                    if (l1 < 80 || l2 < 80) continue;
                    var dot = Math.abs((v1x * v2x + v1y * v2y) / (l1 * l2));
                    var score = dot - (clusters[i].n + clusters[j].n + clusters[k].n) / 1000;
                    if (score < bestScore) {
                        bestScore = score;
                        best = ordered;
                    }
                }
            }
        }
        if (!best) throw new Error("could not find a QR code");
        return best;
    }

    function symbolSize(tl, tr, bl) {
        var dh = Math.hypot(tr.x - tl.x, tr.y - tl.y);
        var dv = Math.hypot(bl.x - tl.x, bl.y - tl.y);
        var mh = (tl.mh + tr.mh) / 2;
        var mv = (tl.mv + bl.mv) / 2;
        var dim = Math.round(((dh / mh) + (dv / mv)) / 2) + 7;
        var version = Math.round((dim - 17) / 4);
        if (version < 1) version = 1;
        if (version > 40) version = 40;
        return 17 + 4 * version;
    }

    function alignmentPositions(version) {
        if (version < 2) return [];
        var num = (version / 7 | 0) + 2;
        var step = (((version * 8 + num * 3 + 5) / (num * 4 - 4)) | 0) * 2;
        var pos = new Array(num);
        var p = version * 4 + 10;
        for (var i = num - 1; i >= 1; i--, p -= step) pos[i] = p;
        pos[0] = 6;
        return pos;
    }

    function sampleAt(h, blur, local, w, hgt, bias, size, radius) {
        var modules = new Uint8Array(size * size);
        for (var y = 0; y < size; y++) {
            for (var x = 0; x < size; x++) {
                var p = project(h, x + 0.5, y + 0.5);
                var cx = p[0], cy = p[1];
                var x0 = Math.max(0, Math.floor(cx) - radius);
                var x1 = Math.min(w, Math.floor(cx) + radius + 1);
                var y0 = Math.max(0, Math.floor(cy) - radius);
                var y1 = Math.min(hgt, Math.floor(cy) + radius + 1);
                var tx = Math.max(0, Math.min(w - 1, Math.round(cx)));
                var ty = Math.max(0, Math.min(hgt - 1, Math.round(cy)));
                var thr = local[ty * w + tx] - bias;
                var dark = 0;
                for (var yy = y0; yy < y1 && !dark; yy++) {
                    var row = yy * w;
                    for (var xx = x0; xx < x1; xx++) {
                        if (blur[row + xx] < thr) { dark = 1; break; }
                    }
                }
                modules[y * size + x] = dark;
            }
        }
        return modules;
    }

    function alignmentShifts(modules, size, positions) {
        var shifts = [];
        var edge0 = positions[0];
        var edge1 = positions[positions.length - 1];
        var pat = [
            1, 1, 1, 1, 1,
            1, 0, 0, 0, 1,
            1, 0, 1, 0, 1,
            1, 0, 0, 0, 1,
            1, 1, 1, 1, 1
        ];
        for (var j = 0; j < positions.length; j++) {
            for (var i = 0; i < positions.length; i++) {
                var ax = positions[i], ay = positions[j];
                var onFinder = (ax === edge0 && ay === edge0) || (ax === edge0 && ay === edge1) || (ax === edge1 && ay === edge0);
                if (onFinder) continue;
                var bestMis = 99, bestDx = 0, bestDy = 0;
                for (var dy = -6; dy <= 6; dy++) {
                    for (var dx = -6; dx <= 6; dx++) {
                        var y0 = ay - 2 + dy, x0 = ax - 2 + dx;
                        if (y0 < 0 || x0 < 0 || y0 + 5 > size || x0 + 5 > size) continue;
                        var mis = 0;
                        for (var py = 0; py < 5; py++) {
                            var row = (y0 + py) * size + x0;
                            var prow = py * 5;
                            for (var px = 0; px < 5; px++) {
                                if (modules[row + px] !== pat[prow + px]) mis++;
                            }
                        }
                        if (mis < bestMis) {
                            bestMis = mis;
                            bestDx = dx;
                            bestDy = dy;
                        }
                    }
                }
                shifts.push({ x: ax, y: ay, dx: bestDx, dy: bestDy, mis: bestMis });
            }
        }
        return shifts;
    }

    function readModules(gray, width, height, opt) {
        opt = opt || {};
        var blurR = opt.blur == null ? 1 : opt.blur;
        var bias = opt.bias == null ? 8 : opt.bias;
        var fitMis = opt.fitMis == null ? 2 : opt.fitMis;
        var radius = opt.radius == null ? 1 : opt.radius;
        var blur = boxMean(gray, width, height, blurR);
        var local = boxMean(blur, width, height, 40);
        var black = new Uint8Array(width * height);
        for (var i = 0; i < black.length; i++) black[i] = blur[i] < local[i] - bias ? 1 : 0;
        var found = chooseFinders(findFinders(black, width, height));
        var tl = found[0], tr = found[1], bl = found[2];
        var size = symbolSize(tl, tr, bl);
        var version = (size - 17) / 4;
        var brx = tr.x + bl.x - tl.x;
        var bry = tr.y + bl.y - tl.y;
        var h = fitHomography(
            [[3.5, 3.5], [size - 3.5, 3.5], [3.5, size - 3.5], [size - 3.5, size - 3.5]],
            [[tl.x, tl.y], [tr.x, tr.y], [bl.x, bl.y], [brx, bry]]
        );
        var rough = sampleAt(h, blur, local, width, height, bias, size, 0);
        var shifts = alignmentShifts(rough, size, alignmentPositions(version));
        var src = [[3.5, 3.5], [size - 3.5, 3.5], [3.5, size - 3.5]];
        var dst = [[tl.x, tl.y], [tr.x, tr.y], [bl.x, bl.y]];
        for (var s = 0; s < shifts.length; s++) {
            var shift = shifts[s];
            if (shift.mis > fitMis) continue;
            var image = project(h, shift.x + shift.dx + 0.5, shift.y + shift.dy + 0.5);
            src.push([shift.x + 0.5, shift.y + 0.5]);
            dst.push(image);
        }
        var fitted = fitHomography(src, dst);
        return sampleAt(fitted, blur, local, width, height, bias, size, radius);
    }

    function toPure(modules) {
        var size = Math.round(Math.sqrt(modules.length));
        var scale = 4;
        var quiet = scale * 4;
        var side = size * scale + quiet * 2;
        var gray = new Uint8ClampedArray(side * side);
        gray.fill(255);
        for (var y = 0; y < size; y++) {
            for (var x = 0; x < size; x++) {
                if (!modules[y * size + x]) continue;
                for (var dy = 0; dy < scale; dy++) {
                    var row = (quiet + y * scale + dy) * side + quiet + x * scale;
                    for (var dx = 0; dx < scale; dx++) gray[row + dx] = 0;
                }
            }
        }
        return { gray: gray, width: side, height: side, size: size };
    }

    return { readModules: readModules, toPure: toPure };
});
