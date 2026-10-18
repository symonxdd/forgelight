"""Forgelight's own endpoints under /forgelight/api/.

The extension's entry script forwards every request here, so changes to this
package take effect without restarting Forge (see reloader.py).
"""

from __future__ import annotations

from typing import Any, Callable

from fastapi import HTTPException, Request
from fastapi.responses import FileResponse

from . import library, loading, models, startup
from .security import require_own_page, require_same_origin
from .store import ROOT, version

PAGE = ROOT / "page"

Handler = Callable[[Request, Any], Any]


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
        "version": version(),
        "built": (PAGE / "index.html").is_file(),
        "api_enabled": bool(cmd_opts.api),
    }


def list_models(_request: Request, _body: Any) -> dict:
    return {"checkpoints": models.checkpoints(), "loras": models.loras()}


def loading_state(_request: Request, _body: Any) -> dict:
    return loading.state()


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


def stop_forge(_request: Request, _body: Any) -> dict:
    startup.stop_forge()
    return {"ok": True}


def _int(value: str | None, default: int, low: int, high: int) -> int:
    try:
        return max(low, min(high, int(value or default)))
    except ValueError:
        return default


def library_list(request: Request, _body: Any) -> dict:
    params = request.query_params
    return library.listing(
        query=params.get("q", ""),
        model=params.get("model", ""),
        rating=params.get("rating", "all") if params.get("rating") in library.RATINGS else "all",
        offset=_int(params.get("offset"), 0, 0, 10_000_000),
        limit=_int(params.get("limit"), 100, 1, 500),
    )


def _image_file(request: Request, make) -> FileResponse:
    try:
        path = make(request.query_params.get("id", ""))
    except (FileNotFoundError, OSError) as error:
        raise HTTPException(status_code=404, detail="That image isn't in Forge's output folders.") from error
    # The address carries the file's date, so a changed file gets a new address.
    return FileResponse(path, headers={"Cache-Control": "private, max-age=31536000, immutable"})


def library_image(request: Request, _body: Any) -> FileResponse:
    return _image_file(request, library.resolve)


def library_thumb(request: Request, _body: Any) -> FileResponse:
    return _image_file(request, library.thumbnail)


def library_reveal(_request: Request, body: Any) -> dict:
    try:
        library.reveal(str((body or {}).get("id", "")))
    except (FileNotFoundError, OSError) as error:
        raise HTTPException(status_code=404, detail="That image isn't in Forge's output folders.") from error
    return {"ok": True}


def library_delete(_request: Request, body: Any) -> dict:
    ids = (body or {}).get("ids")
    if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
        raise HTTPException(status_code=400, detail="Send the image ids to delete.")
    try:
        return library.delete(ids)
    except OSError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


ROUTES: dict[tuple[str, str], Handler] = {
    ("GET", "status"): status,
    ("GET", "models"): list_models,
    ("GET", "startup"): startup_state,
    ("POST", "startup/open-on-start"): open_on_start,
    ("POST", "startup/desktop-shortcut"): desktop_shortcut,
    ("POST", "forge/stop"): stop_forge,
    ("GET", "loading"): loading_state,
    ("GET", "library"): library_list,
    ("GET", "library/image"): library_image,
    ("GET", "library/thumb"): library_thumb,
    ("POST", "library/reveal"): library_reveal,
    ("POST", "library/delete"): library_delete,
}


def handle(method: str, path: str, request: Request, body: Any) -> Any:
    handler = ROUTES.get((method, path.strip("/")))
    if handler is None:
        raise HTTPException(status_code=404)
    if method == "GET":
        require_own_page(request)
    else:
        require_same_origin(request)
    return handler(request, body)
