"""Reloads this package's modules when their files change, so Forge needs no restart.

Checked on every Forgelight API request; checking costs one file stat per module.
A reload waits until requests already running have finished, and requests that
arrive during a reload wait for it, so no request ever runs half-swapped code.
This module itself is never reloaded, so its state survives reloads.
"""

from __future__ import annotations

import importlib
import sys
import threading
from pathlib import Path
from typing import Any, Callable

PACKAGE = Path(__file__).resolve().parent
# Dependencies first, so each reloaded module picks up the fresh versions of what it imports.
ORDER = ["store", "security", "civitai", "models", "startup", "api"]

_gate = threading.Condition()
_active = 0
_reloading = False


def _snapshot() -> dict[str, float]:
    return {path.name: path.stat().st_mtime for path in PACKAGE.glob("*.py")}


_seen = _snapshot()


def maybe_reload() -> bool:
    global _seen, _reloading
    with _gate:
        current = _snapshot()
        if current == _seen or _reloading:
            return False
        _seen = current
        _reloading = True
        _gate.wait_for(lambda: _active == 0)
    try:
        for name in ORDER:
            module = sys.modules.get(f"{__package__}.{name}")
            if module is None:
                importlib.import_module(f"{__package__}.{name}")
            else:
                importlib.reload(module)
        print("[Forgelight] Reloaded its server code after a change.")
    finally:
        with _gate:
            _reloading = False
            _gate.notify_all()
    return True


def run(handler: Callable[..., Any], *args: Any) -> Any:
    """Runs one request, after any pending reload, and never during one."""
    global _active
    maybe_reload()
    with _gate:
        _gate.wait_for(lambda: not _reloading)
        _active += 1
    try:
        return handler(*args)
    finally:
        with _gate:
            _active -= 1
            _gate.notify_all()
