"""Reloads this package's modules when their files change, so Forge needs no restart.

Checked on every Forgelight API request; checking costs one file stat per module.
"""

from __future__ import annotations

import importlib
import sys
import threading
from pathlib import Path

PACKAGE = Path(__file__).resolve().parent
# Dependencies first, so each reloaded module picks up the fresh versions of what it imports.
ORDER = ["store", "security", "civitai", "models", "startup", "api"]

_lock = threading.Lock()


def _snapshot() -> dict[str, float]:
    return {path.name: path.stat().st_mtime for path in PACKAGE.glob("*.py")}


_seen = _snapshot()


def maybe_reload() -> bool:
    global _seen
    with _lock:
        current = _snapshot()
        if current == _seen:
            return False
        _seen = current
        for name in ORDER:
            module = sys.modules.get(f"{__package__}.{name}")
            if module is None:
                importlib.import_module(f"{__package__}.{name}")
            else:
                importlib.reload(module)
        print("[Forgelight] Reloaded its server code after a change.")
        return True
