"""由每個圖庫封面產生圖庫總覽專用的 240×320 WebP 小縮圖。"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


PROJECT_DIR = Path(__file__).resolve().parent.parent
CATALOG_PATH = PROJECT_DIR / "v2" / "catalog.json"
THUMBNAIL_SIZE = (240, 320)


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    for seed_entry in catalog["packs"]:
        pack_id = seed_entry["packId"]
        version = seed_entry["version"]
        entry_path = PROJECT_DIR / "packs" / pack_id / f"v{version}" / "catalog-entry.json"
        entry = json.loads(entry_path.read_text(encoding="utf-8"))
        cover_path = PROJECT_DIR / entry["cover"]
        thumbnail_path = entry_path.parent / "thumbnail.webp"

        with Image.open(cover_path) as source:
            source.convert("RGB").resize(THUMBNAIL_SIZE, Image.Resampling.LANCZOS).save(
                thumbnail_path,
                "WEBP",
                quality=72,
                method=6,
            )

        entry["thumbnail"] = f"packs/{pack_id}/v{version}/thumbnail.webp"
        entry_path.write_text(
            json.dumps(entry, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"{pack_id}: {thumbnail_path.relative_to(PROJECT_DIR)}")


if __name__ == "__main__":
    main()
