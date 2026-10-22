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

from . import startup
from .vault import VaultError, vault

KINDS = ("txt2img", "img2img")
RESULT_TTL = 15 * 60
THUMB_WIDTH = 400

# Kept across live reloads (reloading reuses this module's globals): the mode and the
# replies of running and recent private generations.
_state: dict = globals().get("_state") or {"on": None, "jobs": {}, "lock": threading.Lock()}


def is_on() -> bool:
    """Private mode as the page shows it. Starts as chosen in settings once set up."""
    if _state["on"] is None:
        _state["on"] = bool(startup.preferences().get("start_private")) and vault.exists()
    return bool(_state["on"])


def status() -> dict:
    return {"setUp": vault.exists(), "on": is_on(), "unlocked": vault.is_unlocked()}


def set_on(on: bool) -> dict:
    """Switching to public also locks the vault."""
    if on and not vault.exists():
        raise VaultError("Set up private mode first.", 409)
    _state["on"] = on
    if not on:
        vault.lock()
    return status()


def _forge_url(path: str) -> str:
    from modules.shared_cmd_options import cmd_opts

    return f"http://127.0.0.1:{int(cmd_opts.port or 7860)}{path}"


def decode(image: str) -> bytes:
    return base64.b64decode(image.split(",", 1)[-1])


def store(png: bytes, infotext: str, seed: int | None) -> str:
    """Encrypts one image into the vault with its settings and a small thumbnail."""
    from PIL import Image

    with Image.open(io.BytesIO(png)) as image:
        width, height = image.size
        small = image.convert("RGB")
        small.thumbnail((THUMB_WIDTH, THUMB_WIDTH * 4), Image.Resampling.LANCZOS, reducing_gap=2.0)
    thumb = io.BytesIO()
    small.save(thumb, "WEBP", quality=82, method=4)
    meta = {"infotext": infotext, "seed": seed, "width": width, "height": height, "created": time.time()}
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
            store(decode(image), infotext, seeds[index] if index < len(seeds) else None)
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
