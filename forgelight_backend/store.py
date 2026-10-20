"""Small JSON files in the extension's data/ folder, written atomically."""

from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

_lock = threading.Lock()


def version_in(path: Path) -> str | None:
    try:
        found = json.loads(path.read_text(encoding="utf-8"))["version"]
    except (OSError, ValueError, KeyError, TypeError):
        return None
    return found if isinstance(found, str) else None


def source_version() -> str | None:
    """The version in the interface's package.json; only a developer copy has the source."""
    return version_in(ROOT / "web" / "package.json")


def built_version() -> str | None:
    """The version the build wrote into page/, which released copies carry."""
    return version_in(ROOT / "page" / "version.json")


def version() -> str:
    """Forgelight's version: the source's in a developer copy, otherwise the built page's."""
    return source_version() or built_version() or "unknown"


def read(name: str, default: Any) -> Any:
    try:
        return json.loads((DATA / name).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def write(name: str, value: Any) -> None:
    with _lock:
        DATA.mkdir(exist_ok=True)
        target = DATA / name
        temp = target.with_suffix(target.suffix + ".tmp")
        temp.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
        # Windows refuses to replace a file while another request is reading it; that read
        # takes a moment at most, so try again briefly before giving up.
        for attempt in range(20):
            try:
                os.replace(temp, target)
                return
            except PermissionError:
                if attempt == 19:
                    raise
                time.sleep(0.025)
