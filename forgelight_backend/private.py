"""Private mode: generations whose images go straight into the encrypted vault.

While private mode is on, the page sends its generation requests here instead of to
Forge. They are passed on to Forge's own API (the same /sdapi/v1 route the page uses),
changed in one field only: save_images is false, so Forge never writes the image to
disk. Each returned image is encrypted into the vault, and the reply is kept in memory
for a while, so the page can show it even when it was reloaded in the meantime.
"""

from __future__ import annotations

import base64
import io
import json
import threading
import time
from typing import Any

import requests

from . import cng, startup
from .vault import VaultError, vault

KINDS = ("txt2img", "img2img")
RESULT_TTL = 15 * 60
THUMB_WIDTH = 400

PREFIX = "private/"

# Kept across live reloads (reloading reuses this module's globals): the mode, the replies
# of running and recent private generations, and the settings of private images while
# unlocked (forgotten on Lock).
# Entries added in later versions are filled in, so a live reload never meets an older state.
_state: dict = globals().get("_state") or {}
for _key, _default in (("on", None), ("jobs", {}), ("metas", {}), ("lock", threading.Lock())):
    _state.setdefault(_key, _default)


def is_on() -> bool:
    """Private mode as the page shows it. Starts as chosen in settings once set up."""
    if _state["on"] is None:
        _state["on"] = bool(startup.preferences().get("start_private")) and vault.exists()
    return bool(_state["on"])


def pin_available() -> bool:
    """Whether this computer has a TPM security chip that can hold a PIN key. Checked once."""
    if "tpm" not in _state:
        _state["tpm"] = cng.tpm_available()
    return bool(_state["tpm"])


def status() -> dict:
    return {
        "setUp": vault.exists(),
        "on": is_on(),
        "unlocked": vault.is_unlocked(),
        "pin": vault.has_pin(),
        "pinAvailable": pin_available(),
    }


def set_on(on: bool) -> dict:
    """Switching to public also locks the vault."""
    if on and not vault.exists():
        raise VaultError("Set up private mode first.", 409)
    _state["on"] = on
    if not on:
        lock()
    return status()


def unlock(password: str | None, recovery: str | None, pin: str | None = None) -> dict:
    vault.unlock(password=password, recovery=recovery, pin=pin)
    return status()


def set_pin(pin: str) -> dict:
    try:
        vault.set_pin(pin)
    except cng.CryptoError as error:
        raise VaultError(f"The PIN couldn't be saved in the security chip: {error}", 500) from error
    return status()


def remove_pin() -> dict:
    try:
        vault.remove_pin()
    except cng.CryptoError as error:
        raise VaultError(f"The PIN couldn't be removed from the security chip: {error}", 500) from error
    return status()


def lock() -> dict:
    """Forgets the private key and every private image's settings held in memory."""
    vault.lock()
    with _state["lock"]:
        _state["metas"] = {}
    return status()


# ---- private images in the Library -------------------------------------------------------


def vault_id(image_id: str) -> str | None:
    """The vault's own id for a Library id like "private/3fa9…", or None for other images."""
    return image_id[len(PREFIX) :] if image_id.startswith(PREFIX) else None


def _metas() -> dict[str, dict]:
    """The settings of every private image, decrypted once per unlock and kept in memory."""
    ids = vault.ids()
    with _state["lock"]:
        cache = {item: meta for item, meta in _state["metas"].items() if item in ids}
    for item in ids:
        if item not in cache:
            try:
                cache[item] = vault.meta(item)[0]
            except VaultError:
                continue  # A damaged file stays out of the Library rather than breaking it.
    with _state["lock"]:
        _state["metas"] = cache
    return cache


def library_items() -> list[dict]:
    """Private images shaped like the Library's own entries. None while locked."""
    if not vault.exists() or not vault.is_unlocked():
        return []
    return [
        {
            "id": PREFIX + item,
            "path": "",
            "mtime": float(meta.get("created") or 0),
            "bytes": 0,
            "width": int(meta.get("width") or 0),
            "height": int(meta.get("height") or 0),
            "infotext": str(meta.get("infotext") or ""),
            "private": True,
        }
        for item, meta in _metas().items()
    ]


def hidden_count() -> int:
    """How many private images the Library leaves out because the vault is locked."""
    return len(vault.ids()) if vault.exists() and not vault.is_unlocked() else 0


def exists(image_id: str) -> bool:
    item = vault_id(image_id)
    return item is not None and item in vault.ids()


def image_bytes(image_id: str) -> bytes:
    return vault.image(vault_id(image_id) or "")


def meta(image_id: str) -> dict:
    return vault.meta(vault_id(image_id) or "")[0]


def image_mime(image_id: str) -> str:
    """The image's file type: generated images are PNGs, moved-in ones keep their own."""
    known = _state["metas"].get(vault_id(image_id) or "")
    return MIME.get(str((known or {}).get("format") or "PNG"), "image/png")


def thumbnail_bytes(image_id: str) -> bytes:
    return vault.meta(vault_id(image_id) or "")[1]


def delete(image_ids: list[str]) -> set[str]:
    """Deletes private images for good: there is no Recycle Bin for encrypted files."""
    gone = set()
    for image_id in image_ids:
        item = vault_id(image_id)
        if item is not None and item in vault.ids():
            vault.remove(item)
            gone.add(image_id)
    return gone


def _forge_url(path: str) -> str:
    from modules.shared_cmd_options import cmd_opts

    return f"http://127.0.0.1:{int(cmd_opts.port or 7860)}{path}"


def decode(image: str) -> bytes:
    return base64.b64decode(image.split(",", 1)[-1])


MIME = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}


def store(png: bytes, infotext: str, seed: int | None, kind: str = "txt2img", created: float | None = None) -> str:
    """Encrypts one image into the vault with its settings and a small thumbnail.

    `created` keeps an existing image's date, so it stays in its place in the Library.
    """
    from PIL import Image

    with Image.open(io.BytesIO(png)) as image:
        width, height = image.size
        image_format = image.format or "PNG"
        small = image.convert("RGB")
        small.thumbnail((THUMB_WIDTH, THUMB_WIDTH * 4), Image.Resampling.LANCZOS, reducing_gap=2.0)
    thumb = io.BytesIO()
    small.save(thumb, "WEBP", quality=82, method=4)
    meta = {
        "infotext": infotext,
        "seed": seed,
        "width": width,
        "height": height,
        "created": created if created is not None else time.time(),
        "kind": kind,
        "format": image_format,
    }
    return vault.add(png, meta, thumb.getvalue())


def _error_text(response: requests.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return f"Forge returned {response.status_code}."
    message = body.get("detail") or body.get("errors") or body.get("error")
    return str(message or f"Forge returned {response.status_code}.")


def _run(kind: str, body: dict, task: str) -> None:
    try:
        response = requests.post(_forge_url(f"/sdapi/v1/{kind}"), json=body, timeout=None)
        if response.status_code != 200:
            raise VaultError(_error_text(response), response.status_code)
        reply = response.json()
        info = json.loads(reply.get("info") or "{}")
        first = int(info.get("index_of_first_image") or 0)
        seeds, infotexts = info.get("all_seeds") or [], info.get("infotexts") or []
        # A batch's overview grid comes first and is not kept, as on the public side.
        for index, image in enumerate((reply.get("images") or [])[first:]):
            infotext = infotexts[index + first] if index + first < len(infotexts) else ""
            store(decode(image), infotext, seeds[index] if index < len(seeds) else None, kind)
        job = {"status": "done", "images": reply.get("images") or [], "info": reply.get("info") or ""}
    except (requests.RequestException, VaultError, OSError, ValueError) as error:
        job = {"status": "error", "message": str(error) or "The private generation failed."}
    with _state["lock"]:
        _state["jobs"][task] = {**job, "at": time.time()}


def _prune() -> None:
    cutoff = time.time() - RESULT_TTL
    for task in [t for t, job in _state["jobs"].items() if job["at"] < cutoff and job["status"] != "running"]:
        del _state["jobs"][task]


def generate(kind: str, body: Any) -> dict:
    """Starts a private generation in the background; the page follows it by its task id."""
    if kind not in KINDS or not isinstance(body, dict) or not isinstance(body.get("force_task_id"), str):
        raise VaultError("Send the kind of generation and its request.")
    if not vault.exists():
        raise VaultError("Set up private mode first.", 409)
    task = body["force_task_id"]
    with _state["lock"]:
        _prune()
        _state["jobs"][task] = {"status": "running", "at": time.time()}
    request = {**body, "save_images": False}
    threading.Thread(target=_run, args=(kind, request, task), name="forgelight-private", daemon=True).start()
    return {"task": task}


def result(task: str) -> dict:
    """The reply of a private generation, handed out once: it holds unencrypted images."""
    with _state["lock"]:
        job = _state["jobs"].get(task)
        if job is None:
            return {"status": "unknown"}
        if job["status"] != "running":
            del _state["jobs"][task]
        return {key: value for key, value in job.items() if key != "at"}
