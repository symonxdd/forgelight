"""Forgelight's own endpoints under /forgelight/api/.

The extension's entry script forwards every request here, so changes to this
package take effect without restarting Forge (see reloader.py).
"""

from __future__ import annotations

import json
from typing import Any, Callable

from fastapi import HTTPException, Request

from . import models, startup
from .security import require_same_origin
from .store import ROOT

PAGE = ROOT / "page"

Handler = Callable[[Request, Any], Any]


def _version() -> str:
    try:
        return json.loads((ROOT / "web" / "package.json").read_text(encoding="utf-8"))["version"]
    except (OSError, ValueError, KeyError):
        return "unknown"


def _startup_state() -> dict:
    prefs = startup.preferences()
    try:
        shortcut = startup.desktop_shortcut_path()
    except (RuntimeError, OSError):
        shortcut = None
    return {"openOnStart": bool(prefs.get("open_on_start")), "desktopShortcut": bool(shortcut and shortcut.exists())}


def status(_request: Request, _body: Any) -> dict:
    from modules.shared_cmd_options import cmd_opts

    return {
        "name": "forgelight",
        "version": _version(),
        "built": (PAGE / "index.html").is_file(),
        "api_enabled": bool(cmd_opts.api),
    }


def list_models(_request: Request, _body: Any) -> dict:
    return {"checkpoints": models.checkpoints(), "loras": models.loras()}


def startup_state(_request: Request, _body: Any) -> dict:
    return _startup_state()


def open_on_start(_request: Request, body: Any) -> dict:
    startup.set_open_on_start(bool((body or {}).get("enabled")))
    return _startup_state()


def desktop_shortcut(_request: Request, _body: Any) -> dict:
    try:
        startup.create_desktop_shortcut()
    except (RuntimeError, OSError) as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    return _startup_state()


ROUTES: dict[tuple[str, str], Handler] = {
    ("GET", "status"): status,
    ("GET", "models"): list_models,
    ("GET", "startup"): startup_state,
    ("POST", "startup/open-on-start"): open_on_start,
    ("POST", "startup/desktop-shortcut"): desktop_shortcut,
}


def handle(method: str, path: str, request: Request, body: Any) -> Any:
    handler = ROUTES.get((method, path.strip("/")))
    if handler is None:
        raise HTTPException(status_code=404)
    if method != "GET":
        require_same_origin(request)
    return handler(request, body)
