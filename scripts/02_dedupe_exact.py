#!/usr/bin/env python3
"""
02_dedupe_exact.py — Find exact duplicates (same SHA-256) in manifest.csv.

Outputs data/exact_dupes.csv — one row per duplicate pair with a suggested
"keep" choice (higher-quality format wins, then larger file, then path sort).

No files are touched. All decisions are recorded for human review.

Run:  python3 scripts/02_dedupe_exact.py
"""

import argparse
import csv
import os
from collections import defaultdict
from pathlib import Path

FORMAT_RANK = {".wav": 0, ".flac": 0, ".aiff": 0,
               ".mp3": 1, ".m4a": 1, ".aac": 1,
               ".ogg": 2, ".wma": 3, ".ra": 4, ".rm": 4}


def format_rank(ext: str) -> int:
    return FORMAT_RANK.get(ext.lower(), 99)


def pick_keeper(rows: list[dict]) -> str:
    """Return file_id of the row to keep from a duplicate group."""
    def key(r):
        return (
            format_rank(r["ext"]),
            -int(r["size_bytes"] or 0),
            r["original_path"],
        )
    return sorted(rows, key=key)[0]["file_id"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest",
        default=str(Path(__file__).parent.parent / "data" / "manifest.csv"),
    )
    parser.add_argument(
        "--out",
        default=str(Path(__file__).parent.parent / "data" / "exact_dupes.csv"),
    )
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    out_path = Path(args.out)

    if not manifest_path.exists():
        print(f"ERROR: manifest not found at {manifest_path}")
        print("Run 01_inventory.py first.")
        raise SystemExit(1)

    rows_by_hash: defaultdict[str, list] = defaultdict(list)
    with open(manifest_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["sha256"]:
                rows_by_hash[row["sha256"]].append(row)

    pairs = []
    for sha256, group in rows_by_hash.items():
        if len(group) < 2:
            continue
        keeper_id = pick_keeper(group)
        for row in group:
            if row["file_id"] != keeper_id:
                keeper = next(r for r in group if r["file_id"] == keeper_id)
                pairs.append({
                    "sha256": sha256,
                    "keep_file_id": keeper_id,
                    "keep_path": keeper["original_path"],
                    "keep_ext": keeper["ext"],
                    "keep_size": keeper["size_bytes"],
                    "drop_file_id": row["file_id"],
                    "drop_path": row["original_path"],
                    "drop_ext": row["ext"],
                    "drop_size": row["size_bytes"],
                    "status": "pending",   # pending | confirmed | dismissed
                    "notes": "",
                })

    out_path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["sha256", "keep_file_id", "keep_path", "keep_ext", "keep_size",
              "drop_file_id", "drop_path", "drop_ext", "drop_size", "status", "notes"]

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(pairs)

    dup_files = len({p["drop_path"] for p in pairs})
    dup_groups = len({p["sha256"] for p in pairs})
    print(f"Found {dup_groups} duplicate groups ({dup_files} redundant files).")
    print(f"Written to: {out_path}")
    print()
    print("Review the CSV and set 'status' to 'confirmed' to mark pairs for removal,")
    print("or 'dismissed' to keep both. No files are deleted until you run 05_organize.py.")


if __name__ == "__main__":
    main()
