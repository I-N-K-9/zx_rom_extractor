#!/usr/bin/env python3
"""Rebuild a 16 KiB ROM from photographed QR codes.

The symbols are version-40 binary QR codes (one screen pixel per module).
Five of them carry 2953 bytes and the last carries 1619. Alphabetical filename
order is the order in the ROM. This script shells out to ZXingReader, which
can read the codes straight off the screen photos. The payload is raw bytes;
nothing in it is inspected.

Usage:
    python3 decode.py
    python3 decode.py -o rom.bin img1.jpg img2.jpg ...
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROM_SIZE = 16384
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def decode_image(zxing: str, path: Path) -> bytes:
    """Return the binary payload of the single QR code in path."""
    errors = []
    # Local binarization copes with the bright spot in the middle of the screen.
    # The other modes are fallbacks if a photo is lit differently.
    attempts = (
        ["-binarizer", "local"],
        ["-binarizer", "global"],
        ["-binarizer", "fixed"],
        [],
    )
    for extra in attempts:
        cmd = [zxing, "-formats", "QRCode", "-single", "-bytes", *extra, str(path)]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode == 0 and proc.stdout:
            return proc.stdout
        err = proc.stderr.decode("utf-8", "replace").strip()
        errors.append(err or f"exit {proc.returncode}")
    detail = errors[-1] if errors else "no barcode"
    raise RuntimeError(f"{path.name}: {detail}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "images",
        nargs="*",
        help="photo files (default: images in this directory, alphabetical)",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="output ROM path (default: rom.bin next to this script)",
    )
    args = parser.parse_args()

    zxing = shutil.which("ZXingReader")
    if zxing is None:
        print("ZXingReader is not on PATH (package zxing-cpp)", file=sys.stderr)
        return 1

    here = Path(__file__).resolve().parent
    if args.images:
        files = [Path(p) for p in args.images]
    else:
        files = [p for p in here.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES]
    files = sorted(files, key=lambda p: p.name)
    if not files:
        print("no images to decode", file=sys.stderr)
        return 1

    parts: list[bytes] = []
    for path in files:
        if not path.is_file():
            print(f"not a file: {path}", file=sys.stderr)
            return 1
        payload = decode_image(zxing, path)
        parts.append(payload)
        print(f"{path.name}: {len(payload)} bytes")

    rom = b"".join(parts)
    out = Path(args.output) if args.output else here / "rom.bin"
    out.write_bytes(rom)
    print(f"wrote {out} ({len(rom)} bytes)")
    if len(rom) != ROM_SIZE:
        print(f"expected {ROM_SIZE} bytes, got {len(rom)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
