"""Forgelight's own endpoints under /forgelight/api/.

The extension's entry script forwards every request here, so changes to this
package take effect without restarting Forge (see reloader.py).
"""

from __future__ import annotations

from typing import Any, Callable

from fastapi import HTTPException, Request
from fastapi.responses import FileResponse, Response

from . import library, loading, models, newmodels, private, startup, updates
from .vault import VaultError, vault
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


def new_models(_request: Request, _body: Any) -> dict:
    return {"models": newmodels.scan()}


def _found_file(body: Any) -> tuple[str, int]:
    body = body or {}
    file, size = body.get("file"), body.get("size")
    if not isinstance(file, str) or not isinstance(size, int):
        raise HTTPException(status_code=400, detail="Send the file name and its size.")
    return file, size


def new_models_move(_request: Request, body: Any) -> dict:
    file, size = _found_file(body)
    try:
        return newmodels.move(str((body or {}).get("place")), file, size)
    except newmodels.MoveError as error:
        raise HTTPException(status_code=error.status, detail=str(error)) from error


def new_models_hide(_request: Request, body: Any) -> dict:
    file, size = _found_file(body)
    newmodels.set_hidden(file, size, bool((body or {}).get("hidden")))
    return {"ok": True}


def new_models_reveal(_request: Request, body: Any) -> dict:
    body = body or {}
    try:
        newmodels.reveal(str(body.get("kind")), body.get("file"))
    except newmodels.MoveError as error:
        raise HTTPException(status_code=error.status, detail=str(error)) from error
    return {"ok": True}


def _private_call(action: Callable[[], Any]) -> Any:
    try:
        return action()
    except VaultError as error:
        raise HTTPException(status_code=error.status, detail=str(error)) from error


def private_status(_request: Request, _body: Any) -> dict:
    return private.status()


def private_setup(_request: Request, body: Any) -> dict:
    password = (body or {}).get("password")
    if not isinstance(password, str):
        raise HTTPException(status_code=400, detail="Send the password.")
    return _private_call(lambda: {"recoveryCode": vault.create(password), **private.status()})


def private_mode(_request: Request, body: Any) -> dict:
    return _private_call(lambda: private.set_on(bool((body or {}).get("on"))))


def private_unlock(_request: Request, body: Any) -> dict:
    body = body or {}
    secrets = {key: value for key in ("password", "recovery", "pin") if isinstance(value := body.get(key), str)}
    if len(secrets) != 1:
        raise HTTPException(status_code=400, detail="Send the password, the PIN or the recovery key.")
    return _private_call(lambda: private.unlock(secrets.get("password"), secrets.get("recovery"), secrets.get("pin")))


def private_pin(_request: Request, body: Any) -> dict:
    pin = (body or {}).get("pin")
    if pin is None:
        return _private_call(private.remove_pin)
    if not isinstance(pin, str):
        raise HTTPException(status_code=400, detail="Send the PIN.")
    return _private_call(lambda: private.set_pin(pin))


def private_lock(_request: Request, _body: Any) -> dict:
    return private.lock()


def private_generate(_request: Request, body: Any) -> dict:
    body = body or {}
    return _private_call(lambda: private.generate(str(body.get("kind")), body.get("request")))


def private_result(request: Request, _body: Any) -> dict:
    return private.result(request.query_params.get("task", ""))


def private_add(_request: Request, body: Any) -> dict:
    body = body or {}
    image, infotext = body.get("image"), body.get("infotext")
    if not isinstance(image, str) or not isinstance(infotext, str):
        raise HTTPException(status_code=400, detail="Send the image and its settings.")
    return _private_call(lambda: {"id": private.store(private.decode(image), infotext, None, "extras")})


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


def updates_state(_request: Request, _body: Any) -> dict:
    return updates.state(check_if_due=True)


def _updates_call(action: Callable[[], dict]) -> dict:
    try:
        return action()
    except updates.UpdateError as error:
        raise HTTPException(status_code=error.status, detail=str(error)) from error
    except OSError as error:
        raise HTTPException(status_code=500, detail=f"The update couldn't be written: {error}") from error


def updates_check(_request: Request, _body: Any) -> dict:
    return _updates_call(updates.check_now)


def updates_auto(_request: Request, body: Any) -> dict:
    enabled = (body or {}).get("enabled")
    if not isinstance(enabled, bool):
        raise HTTPException(status_code=400, detail="Send whether the daily check is on.")
    return updates.set_auto(enabled)


def updates_skip(_request: Request, body: Any) -> dict:
    version = (body or {}).get("version")
    if version is not None and not isinstance(version, str):
        raise HTTPException(status_code=400, detail="Send the version to skip.")
    return updates.skip(version)


def updates_install(_request: Request, body: Any) -> dict:
    version = (body or {}).get("version")
    if not isinstance(version, str):
        raise HTTPException(status_code=400, detail="Send the version to install.")
    return _updates_call(lambda: updates.install(version))


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
        favorites_only=params.get("favorites") == "1",
        private_only=params.get("private") == "1",
    )


def _image_file(request: Request, make) -> FileResponse:
    try:
        path = make(request.query_params.get("id", ""))
    except (FileNotFoundError, OSError) as error:
        raise HTTPException(status_code=404, detail="That image isn't in Forge's output folders.") from error
    # The address carries the file's date, so a changed file gets a new address.
    return FileResponse(path, headers={"Cache-Control": "private, max-age=31536000, immutable"})


def _private_file(image_id: str, make: Callable[[str], bytes], media_type: str) -> Response:
    """A private image, decrypted in memory. The browser is told never to keep a copy."""
    try:
        data = make(image_id)
    except VaultError as error:
        raise HTTPException(status_code=error.status, detail=str(error)) from error
    return Response(data, media_type=media_type, headers={"Cache-Control": "no-store"})


def library_image(request: Request, _body: Any) -> Response:
    image_id = request.query_params.get("id", "")
    if private.vault_id(image_id) is not None:
        return _private_file(image_id, private.image_bytes, private.image_mime(image_id))
    return _image_file(request, library.resolve)


def library_thumb(request: Request, _body: Any) -> Response:
    image_id = request.query_params.get("id", "")
    if private.vault_id(image_id) is not None:
        return _private_file(image_id, private.thumbnail_bytes, "image/webp")
    return _image_file(request, library.thumbnail)


def library_reveal(_request: Request, body: Any) -> dict:
    try:
        library.reveal(str((body or {}).get("id", "")))
    except (FileNotFoundError, OSError) as error:
        raise HTTPException(status_code=404, detail="That image isn't in Forge's output folders.") from error
    return {"ok": True}


def library_favorite(_request: Request, body: Any) -> dict:
    body = body or {}
    image_id, favorite = body.get("id"), body.get("favorite")
    if not isinstance(image_id, str) or not isinstance(favorite, bool):
        raise HTTPException(status_code=400, detail="Send the image id and whether it is a favorite.")
    try:
        return {"favorite": library.set_favorite(image_id, favorite)}
    except (FileNotFoundError, OSError) as error:
        raise HTTPException(status_code=404, detail="That image isn't in Forge's output folders.") from error


def library_save_upscaled(_request: Request, body: Any) -> dict:
    body = body or {}
    fields = [body.get(key) for key in ("image", "infotext", "note", "name")]
    if not all(isinstance(value, str) for value in fields):
        raise HTTPException(status_code=400, detail="Send the image, its settings, a note and its name.")
    try:
        return library.save_upscaled(*fields)
    except (ValueError, OSError) as error:
        raise HTTPException(status_code=500, detail=f"The upscaled image couldn't be saved: {error}") from error


def _library_ids(body: Any) -> list[str]:
    ids = (body or {}).get("ids")
    if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
        raise HTTPException(status_code=400, detail="Send the image ids.")
    return ids


def library_make_private(_request: Request, body: Any) -> dict:
    ids = _library_ids(body)
    return _private_call(lambda: library.make_private(ids))


def library_make_public(_request: Request, body: Any) -> dict:
    ids = _library_ids(body)
    try:
        return _private_call(lambda: library.make_public(ids))
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


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
    ("GET", "new-models"): new_models,
    ("POST", "new-models/move"): new_models_move,
    ("POST", "new-models/hide"): new_models_hide,
    ("POST", "new-models/reveal"): new_models_reveal,
    ("GET", "startup"): startup_state,
    ("POST", "startup/open-on-start"): open_on_start,
    ("POST", "startup/desktop-shortcut"): desktop_shortcut,
    ("POST", "forge/stop"): stop_forge,
    ("GET", "loading"): loading_state,
    ("GET", "private"): private_status,
    ("POST", "private/setup"): private_setup,
    ("POST", "private/mode"): private_mode,
    ("POST", "private/unlock"): private_unlock,
    ("POST", "private/lock"): private_lock,
    ("POST", "private/pin"): private_pin,
    ("POST", "private/generate"): private_generate,
    ("GET", "private/result"): private_result,
    ("POST", "private/add"): private_add,
    ("GET", "updates"): updates_state,
    ("POST", "updates/check"): updates_check,
    ("POST", "updates/auto"): updates_auto,
    ("POST", "updates/skip"): updates_skip,
    ("POST", "updates/install"): updates_install,
    ("GET", "library"): library_list,
    ("GET", "library/image"): library_image,
    ("GET", "library/thumb"): library_thumb,
    ("POST", "library/reveal"): library_reveal,
    ("POST", "library/delete"): library_delete,
    ("POST", "library/make-private"): library_make_private,
    ("POST", "library/make-public"): library_make_public,
    ("POST", "library/favorite"): library_favorite,
    ("POST", "library/save-upscaled"): library_save_upscaled,
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
