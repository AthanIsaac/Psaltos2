#!/usr/bin/env python3
"""
03_dedupe_near.py — Flag candidate near-duplicates: different files where the
normalized hymn name + cantor match strongly, suggesting the same hymn may
have been catalogued twice under different filenames or formats.

This does NOT flag two recordings of the same hymn by different cantors, or
recordings from clearly different years/contexts. It only flags within the
same cantor where the name collision is suspicious.

Output: data/near_dupes.csv  (human review required before any action)

Run:  python3 scripts/03_dedupe_near.py
"""

import argparse
import csv
import re
import unicodedata
from collections import defaultdict
from itertools import combinations
from pathlib import Path

# Words that carry no hymn-identity information
STOPWORDS = {
    "the", "a", "an", "of", "in", "for", "st", "saint", "tune",
    "version", "long", "short", "part", "vol", "cd", "tape",
    "response", "responses", "liturgy", "rite", "1", "2", "3",
    "i", "ii", "iii", "iv", "v",
}

# Generic hymn-category words too common to signal identity on their own
GENERIC_WORDS = {
    "gospel", "praises", "vespers", "matins", "communion",
    "doxology", "doxologies", "agios", "alleluia", "psalm", "amen",
    "introduction", "explanation", "rites", "hymn", "hymns",
}


def normalize(name: str) -> frozenset[str]:
    """Strip leading track number, lowercase, remove accents/punctuation,
    drop stopwords and generic words, keep 4-digit years → word set."""
    name = re.sub(r"^\d{1,3}\s+", "", name)  # drop leading "001 " etc.
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode()
    name = re.sub(r"[^a-z0-9\s]", " ", name.lower())
    words = name.split()
    words = [
        w for w in words
        if w not in STOPWORDS
        and w not in GENERIC_WORDS
        and not (w.isdigit() and len(w) != 4)  # drop numbers except 4-digit years
        and len(w) > 2
    ]
    return frozenset(words)


def jaccard(a: frozenset, b: frozenset) -> float:
    if not a or not b:   # skip empty sets — they match everything otherwise
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest",
        default=str(Path(__file__).parent.parent / "data" / "manifest.csv"),
    )
    parser.add_argument(
        "--out",
        default=str(Path(__file__).parent.parent / "data" / "near_dupes.csv"),
    )
    parser.add_argument(
        "--threshold", type=float, default=0.75,
        help="Jaccard similarity threshold (0–1). Default 0.75.",
    )
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"ERROR: manifest not found at {manifest_path}")
        print("Run 01_inventory.py first.")
        raise SystemExit(1)

    rows = []
    with open(manifest_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            stem = Path(row["filename"]).stem
            row["_norm"] = normalize(stem)
            rows.append(row)

    # Group by (cantor, season_raw) — near-dupes only within same cantor+folder
    by_group: defaultdict[str, list] = defaultdict(list)
    for row in rows:
        key = f"{row['cantor_raw']}||{row['season_raw']}"
        by_group[key].append(row)

    pairs = []
    for group_key, group in by_group.items():
        cantor = group_key.split("||")[0]
        for a, b in combinations(group, 2):
            if a["sha256"] == b["sha256"]:
                continue  # exact dupe already handled
            score = jaccard(a["_norm"], b["_norm"])
            if score >= args.threshold:
                pairs.append({
                    "cantor": cantor,
                    "similarity": f"{score:.2f}",
                    "file_id_a": a["file_id"],
                    "path_a": a["original_path"],
                    "name_a": a["filename"],
                    "ext_a": a["ext"],
                    "size_a": a["size_bytes"],
                    "duration_a": a["duration_s"],
                    "file_id_b": b["file_id"],
                    "path_b": b["original_path"],
                    "name_b": b["filename"],
                    "ext_b": b["ext"],
                    "size_b": b["size_bytes"],
                    "duration_b": b["duration_s"],
                    "status": "pending",  # pending | confirmed_dupe | not_dupe
                    "notes": "",
                })

    # Sort by similarity descending
    pairs.sort(key=lambda p: -float(p["similarity"]))

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "cantor", "similarity",
        "file_id_a", "path_a", "name_a", "ext_a", "size_a", "duration_a",
        "file_id_b", "path_b", "name_b", "ext_b", "size_b", "duration_b",
        "status", "notes",
    ]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(pairs)

    print(f"Found {len(pairs)} candidate near-duplicate pairs (threshold={args.threshold}).")
    print(f"Written to: {out_path}")
    print()
    print("Set 'status' to 'confirmed_dupe' or 'not_dupe' for each pair.")
    print("Use --threshold 0.8 for stricter matching if results are noisy.")


if __name__ == "__main__":
    main()
