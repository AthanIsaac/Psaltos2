#!/usr/bin/env python3
"""
01_inventory.py — Walk AllHymns/ and produce data/manifest.csv.

Each row represents one audio (or video) file with:
  file_id, original_path, cantor_raw, season_raw, filename, ext,
  size_bytes, sha256, duration_s, is_tape, is_video

Run:  python3 scripts/01_inventory.py
      python3 scripts/01_inventory.py --allhymns /path/to/AllHymns
"""

import argparse
import csv
import hashlib
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".wma", ".ra", ".rm", ".ogg",
              ".flac", ".aac", ".aiff", ".opus"}
VIDEO_EXTS = {".mp4", ".wmv", ".avi", ".mov", ".mkv"}
ALL_MEDIA_EXTS = AUDIO_EXTS | VIDEO_EXTS

TAPE_KEYWORDS = {"tape", "unsplit", "tapes"}

FIELDS = [
    "file_id", "original_path", "cantor_raw", "season_raw",
    "filename", "ext", "size_bytes", "sha256", "duration_s",
    "is_tape", "is_video",
]


def sha256_of_file(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            data = f.read(chunk)
            if not data:
                break
            h.update(data)
    return h.hexdigest()


def ffprobe_duration(path: Path) -> float:
    """Return duration in seconds via ffprobe, or -1 on failure."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            return -1.0
        data = json.loads(result.stdout)
        return float(data.get("format", {}).get("duration", -1))
    except Exception:
        return -1.0


def is_tape_path(path: Path, allhymns_root: Path) -> bool:
    """True if any folder component (between root and file) looks like a tape folder."""
    try:
        rel = path.relative_to(allhymns_root)
    except ValueError:
        return False
    for part in rel.parts[:-1]:  # exclude the filename itself
        if any(kw in part.lower() for kw in TAPE_KEYWORDS):
            return True
    return False


def cantor_and_season(path: Path, allhymns_root: Path):
    """Return (cantor_raw, season_raw) from the top two folder levels under allhymns_root."""
    try:
        rel = path.relative_to(allhymns_root)
    except ValueError:
        return "", ""
    parts = rel.parts  # (cantor, [season, ...], filename)
    cantor = parts[0] if len(parts) >= 1 else ""
    season = parts[1] if len(parts) >= 3 else ""  # only set if there's a subfolder
    return cantor, season


def scan(allhymns_root: Path, out_csv: Path):
    total = 0
    skipped = 0

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()

        for dirpath, _dirs, files in os.walk(allhymns_root):
            for fname in files:
                fpath = Path(dirpath) / fname
                ext = fpath.suffix.lower()

                if ext not in ALL_MEDIA_EXTS:
                    skipped += 1
                    continue

                size = fpath.stat().st_size
                print(f"  [{total+1}] {fpath.name} ({size:,} bytes)", end="\r", flush=True)

                cantor, season = cantor_and_season(fpath, allhymns_root)
                tape = is_tape_path(fpath, allhymns_root)
                video = ext in VIDEO_EXTS
                duration = ffprobe_duration(fpath)
                checksum = sha256_of_file(fpath)

                writer.writerow({
                    "file_id": str(uuid.uuid4()),
                    "original_path": str(fpath),
                    "cantor_raw": cantor,
                    "season_raw": season,
                    "filename": fname,
                    "ext": ext,
                    "size_bytes": size,
                    "sha256": checksum,
                    "duration_s": f"{duration:.3f}" if duration >= 0 else "",
                    "is_tape": "1" if tape else "0",
                    "is_video": "1" if video else "0",
                })
                total += 1

    print()
    return total, skipped


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--allhymns",
        default=str(Path(__file__).parent.parent / "AllHymns"),
        help="Path to AllHymns root directory",
    )
    parser.add_argument(
        "--out",
        default=str(Path(__file__).parent.parent / "data" / "manifest.csv"),
        help="Output CSV path",
    )
    args = parser.parse_args()

    allhymns_root = Path(args.allhymns).resolve()
    out_csv = Path(args.out).resolve()

    if not allhymns_root.exists():
        print(f"ERROR: AllHymns directory not found: {allhymns_root}", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning: {allhymns_root}")
    print(f"Output:   {out_csv}")
    print()

    total, skipped = scan(allhymns_root, out_csv)

    print(f"Done. {total} media files written to {out_csv}")
    print(f"      {skipped} non-media files skipped")


if __name__ == "__main__":
    main()
