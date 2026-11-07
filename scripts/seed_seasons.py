#!/usr/bin/env python3
"""
seed_seasons.py — Build data/seasons.json and data/season_aliases.json from
the destFolder values found in src/importing/cache.json.

The 31 numbered folders from Cantor 09 become the canonical seasons.
Single-word / informal names become aliases pointing to a canonical slug.
Artifacts (Tapes, MISC, M Ebrahim, etc.) are excluded.

Run:  python3 scripts/seed_seasons.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent

# Folders that are organizational artifacts, not seasons
SKIP = {
    "tapes", "tape", "m ebrahim", "misc", "miscellaneous",
    "split tapes", "unsplit tapes", "word", "offering",
}

# Manual alias overrides: informal name → canonical slug
MANUAL_ALIASES = {
    "Basil":          "07a-st-basil-liturgy",
    "Gregorian":      "07b-st-gregory-liturgy",
    "HICS - Gregorian": "07b-st-gregory-liturgy",
    "Cyril":          "07c-st-cyril-liturgy",
    "Lent":           "13-great-lent",
    "Kiahk":          "10-kiahk",
    "Holy Week":      "16-holy-week",
    "Resurrection":   "18-resurrection",
    "Nativity":       "11-nativity",
    "Epiphany":       "12-epiphany",
    "Pentecost":      "21-pentecost-sagda",
    "Apostles":       "22-apostles-fast",
    "Hosanna":        "15-palm-sunday",
    "Cross":          "02-feast-of-the-cross",
    "Feasts":         None,   # too ambiguous — leave unmapped
    "Faithful":       None,
    "Matins":         "03-vespers-praises",
    "Vespers":        "03-vespers-praises",
    "Praises":        "03-vespers-praises",
    "Papal":          "24-glorification",
    "Veneration":     "24-glorification",
    "Wedding":        "31-wedding",
    "Twenty Four Presbyters": "extra-twenty-four-presbyters",
    "Miscellaneous":  None,
    "MISC":           None,
    "Misc":           None,
}


def slugify(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"\s+", "-", name.strip())
    name = re.sub(r"-+", "-", name)
    return name


def parse_numbered(name: str):
    """If the name starts with a number like '01 Foo Bar', return (num_str, clean_name)."""
    m = re.match(r"^(\d+[a-z]?)\s+(.+)$", name, re.IGNORECASE)
    if m:
        return m.group(1).lower(), m.group(2)
    return None, name


def main():
    cache_path = ROOT / "src" / "importing" / "cache.json"
    seasons_out = ROOT / "data" / "seasons.json"
    aliases_out = ROOT / "data" / "season_aliases.json"

    with open(cache_path, encoding="utf-8") as f:
        cache = json.load(f)

    # Extract all unique destFolder values
    all_dest_folders: set[str] = set()
    def extract(obj):
        if isinstance(obj, list):
            for i in obj: extract(i)
        elif isinstance(obj, dict):
            if "destFolder" in obj and obj["destFolder"]:
                all_dest_folders.add(obj["destFolder"])
            for v in obj.values(): extract(v)
    extract(cache)

    # Separate numbered (canonical) from unnumbered (alias candidates)
    canonical_seasons = []
    alias_candidates = []
    for folder in sorted(all_dest_folders):
        if folder.lower() in SKIP:
            continue
        num, clean = parse_numbered(folder)
        if num:
            canonical_seasons.append((num, clean, folder))
        else:
            alias_candidates.append(folder)

    # Sort canonical by number
    def sort_key(t):
        num = t[0]
        m = re.match(r"^(\d+)([a-z]?)$", num)
        return (int(m.group(1)), m.group(2)) if m else (999, "")

    canonical_seasons.sort(key=sort_key)

    # Build seasons list
    seasons = []
    slug_map = {}  # original_folder → slug (for alias building)
    for i, (num, clean, original) in enumerate(canonical_seasons):
        slug = f"{num}-{slugify(clean)}"
        seasons.append({
            "id": slug,
            "name_en": clean,
            "name_coptic": "",
            "name_ar": "",
            "sort_order": i + 1,
        })
        slug_map[original] = slug

    # Add extras not in numbered list
    extra_seasons = [
        {"id": "07c-st-cyril-liturgy", "name_en": "St. Cyril Liturgy",
         "name_coptic": "", "name_ar": "", "sort_order": len(seasons) + 1},
        {"id": "extra-twenty-four-presbyters", "name_en": "Twenty Four Presbyters",
         "name_coptic": "", "name_ar": "", "sort_order": len(seasons) + 2},
    ]
    seasons.extend(extra_seasons)

    # Build alias table
    aliases = {}
    for folder in alias_candidates:
        if folder in MANUAL_ALIASES:
            target = MANUAL_ALIASES[folder]
            if target:
                aliases[folder] = target
        elif folder in slug_map:
            aliases[folder] = slug_map[folder]

    seasons_out.parent.mkdir(parents=True, exist_ok=True)
    with open(seasons_out, "w", encoding="utf-8") as f:
        json.dump(seasons, f, indent=2, ensure_ascii=False)

    with open(aliases_out, "w", encoding="utf-8") as f:
        json.dump(aliases, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(seasons)} canonical seasons → {seasons_out}")
    print(f"Wrote {len(aliases)} season aliases  → {aliases_out}")
    print()
    print("Review data/seasons.json and add/edit seasons via /admin/seasons before")
    print("starting contractor work.")


if __name__ == "__main__":
    main()
