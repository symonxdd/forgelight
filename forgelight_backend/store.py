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
