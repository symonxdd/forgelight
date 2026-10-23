"""Looks up models on Civitai, once per file, and remembers the answers.

What is sent: the SHA256 hash when Forge already knows it, otherwise a quick
hash of 64 KB from the file (Civitai's "AutoV1"), and only if neither matches,
the file name as a search term. Matches are confirmed by file size. Nothing
else about the user or their images leaves the computer.

Besides the name, the answer keeps the creator's description and the settings of
their example images (never the images or their prompts), for recommended settings.
"""

from __future__ import annotations

import hashlib
import re
import threading
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import requests

from . import store

API = "https://civitai.com/api/v1"
CACHE_FILE = "civitai.json"
HEADERS = {"User-Agent": "Forgelight (Forge extension)"}
TIMEOUT = 15
PAUSE = 1.2
RETRY_ERRORS_AFTER = 6 * 3600
# Raised when a lookup keeps more than before; older cache entries are then fetched again.
FORMAT = 2
MAX_EXAMPLES = 20
MAX_NOTES = 6000

SEARCH_TYPES = {"checkpoint": ["Checkpoint"], "lora": ["LORA", "LoCon", "DoRA"]}


def cache_key(kind: str, path: Path) -> str:
    return f"{kind}|{path.name.lower()}|{path.stat().st_size}"


def quick_hash(path: Path) -> str:
    """Civitai's AutoV1: SHA256 of 64 KB starting 1 MB into the file, first 8 hex digits."""
    with open(path, "rb") as file:
        file.seek(0x100000)
        return hashlib.sha256(file.read(0x10000)).hexdigest()[:8]


def _size_matches(file_info: dict, size: int) -> bool:
    size_kb = file_info.get("sizeKB")
    if not isinstance(size_kb, (int, float)):
        return False
    return abs(size_kb * 1024 - size) <= max(4096, size * 0.001)


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number and abs(number) != float("inf") else None


def _text(value: Any) -> str | None:
    return value.strip()[:80] if isinstance(value, str) and value.strip() else None


LORA_TAG = re.compile(r"<lora:([^:>]+):([-\d.]+)>", re.IGNORECASE)


def _lora_weight(meta: dict, hashes: set[str]) -> float | None:
    """The strength this LoRA had in an example: by its hash, or when it was the only LoRA."""
    resources = [r for r in meta.get("resources") or [] if isinstance(r, dict) and r.get("type") == "lora"]
    for resource in resources:
        if str(resource.get("hash", "")).lower() in hashes:
            return _number(resource.get("weight"))
    if len(resources) == 1:
        return _number(resources[0].get("weight"))
    tags = LORA_TAG.findall(str(meta.get("prompt") or ""))
    return _number(tags[0][1]) if len(tags) == 1 else None


def _example(meta: Any, kind: str, hashes: set[str]) -> dict | None:
    """The settings one example image was made with. Its prompt is never kept."""
    if not isinstance(meta, dict):
        return None
    size = re.fullmatch(r"\s*(\d+)\s*x\s*(\d+)\s*", str(meta.get("Size") or ""))
    width, height = (size.group(1), size.group(2)) if size else (meta.get("width"), meta.get("height"))
    hires = _number(meta.get("Hires upscale"))
    example = {
        "sampler": _text(meta.get("sampler")),
        "scheduler": _text(meta.get("Schedule type") or meta.get("scheduler")),
        "steps": _number(meta.get("steps")),
        "cfgScale": _number(meta.get("cfgScale")),
        "width": _number(width),
        "height": _number(height),
        "hiresScale": hires,
        "hiresUpscaler": _text(meta.get("Hires upscaler")) if hires else None,
        "hiresDenoise": _number(meta.get("Denoising strength")) if hires else None,
        "loraWeight": _lora_weight(meta, hashes) if kind == "lora" else None,
        "adetailer": any(str(key).startswith("ADetailer") for key in meta) or None,
    }
    example = {key: value for key, value in example.items() if value is not None}
    return example if set(example) - {"adetailer"} else None


def _examples(version: dict, kind: str) -> list[dict]:
    hashes = {
        str(value).lower()
        for file_info in version.get("files") or []
        for value in (file_info.get("hashes") or {}).values()
    }
    examples = (_example(image.get("meta"), kind, hashes) for image in version.get("images") or [])
    return [example for example in examples if example][:MAX_EXAMPLES]


class _PlainText(HTMLParser):
    """Turns Civitai's description HTML into plain lines of text."""

    BREAKS = {"p", "br", "li", "div", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "blockquote"}

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: Any) -> None:
        if tag in self.BREAKS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.BREAKS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def plain_text(html: Any) -> str:
    if not isinstance(html, str) or not html.strip():
        return ""
    parser = _PlainText()
    parser.feed(html)
    lines = (" ".join(line.split()) for line in "".join(parser.parts).splitlines())
    return "\n".join(line for line in lines if line)[:MAX_NOTES]


def _summary(model: dict, version: dict, kind: str) -> dict:
    model_id = version.get("modelId") or model.get("id")
    version_id = version.get("id")
    return {
        "status": "found",
        "v": FORMAT,
        "name": model.get("name"),
        "version": version.get("name"),
        "type": model.get("type"),
        "baseModel": version.get("baseModel"),
        "nsfw": bool(model.get("nsfw")),
        "trainedWords": (version.get("trainedWords") or [])[:20],
        "url": f"https://civitai.com/models/{model_id}?modelVersionId={version_id}",
        "examples": _examples(version, kind),
        "notes": plain_text(model.get("description")),
        "versionNotes": plain_text(version.get("description")),
        "checkedAt": int(time.time()),
    }


def _get(path: str, params: Any = None) -> dict | None:
    response = requests.get(f"{API}{path}", params=params, headers=HEADERS, timeout=TIMEOUT)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()


def _details(kind: str, version: dict, model: dict | None) -> dict:
    """The summary of a matched version, fetching its example settings and description when missing."""
    if not any(image.get("meta") for image in version.get("images") or []):
        time.sleep(PAUSE)
        version = {**version, **(_get(f"/model-versions/{version['id']}") or {})}
    if not model or "description" not in model:
        time.sleep(PAUSE)
        model = _get(f"/models/{version.get('modelId')}") or model or {}
    return _summary(model, version, kind)


def lookup(kind: str, path: Path, sha256: str | None) -> dict:
    size = path.stat().st_size
    hashes = [h for h in (sha256, quick_hash(path)) if h]
    for value in hashes:
        version = _get(f"/model-versions/by-hash/{value}")
        if version and any(_size_matches(f, size) for f in version.get("files", [])):
            return _details(kind, version, version.get("model"))
        time.sleep(PAUSE)

    found = _get(
        "/models",
        params={"query": path.stem, "limit": 10, "nsfw": "true", "types": SEARCH_TYPES.get(kind, [])},
    )
    for model in (found or {}).get("items", []):
        for version in model.get("modelVersions", []):
            for file_info in version.get("files", []):
                if file_info.get("name", "").lower() == path.name.lower() and _size_matches(file_info, size):
                    return _details(kind, {**version, "modelId": model.get("id")}, model)
    return {"status": "not_found", "checkedAt": int(time.time())}


def refresh(kind: str, known: dict) -> dict:
    """Fetches an older cache entry again by its version, to add what it lacks."""
    match = re.search(r"/models/(\d+)\?modelVersionId=(\d+)", known.get("url") or "")
    if not match:
        raise ValueError("no version to refresh")
    version = _get(f"/model-versions/{match.group(2)}")
    if not version:
        raise ValueError("version gone")
    return _details(kind, {**version, "modelId": version.get("modelId") or int(match.group(1))}, None)


def _outdated(known: dict) -> bool:
    return (
        known["status"] == "found"
        and known.get("v", 1) < FORMAT
        and time.time() - known.get("refreshTriedAt", 0) > RETRY_ERRORS_AFTER
    )


class Lookups:
    """Runs lookups one at a time in the background and keeps a cache on disk."""

    def __init__(self) -> None:
        self._results: dict[str, dict] = store.read(CACHE_FILE, {})
        self._queue: dict[str, tuple[str, Path, str | None]] = {}
        self._lock = threading.Lock()
        self._worker: threading.Thread | None = None

    def result(self, kind: str, path: Path) -> dict | None:
        with self._lock:
            return self._results.get(cache_key(kind, path))

    def request(self, kind: str, path: Path, sha256: str | None) -> dict:
        """Returns the known result, or queues a lookup and reports it as pending.

        An entry from before the current FORMAT is returned as it is, marked as
        refreshing, while it is fetched again in the background.
        """
        key = cache_key(kind, path)
        with self._lock:
            known = self._results.get(key)
            retry = known and known["status"] == "error" and time.time() - known["checkedAt"] > RETRY_ERRORS_AFTER
            outdated = known and _outdated(known)
            if known and not retry and not outdated:
                return known
            self._queue.setdefault(key, (kind, path, sha256))
            if not self._worker or not self._worker.is_alive():
                self._worker = threading.Thread(target=self._run, name="forgelight-civitai", daemon=True)
                self._worker.start()
        return {**known, "refreshing": True} if outdated else {"status": "pending"}

    def _run(self) -> None:
        while True:
            with self._lock:
                if not self._queue:
                    return
                key, (kind, path, sha256) = next(iter(self._queue.items()))
                known = self._results.get(key)
            outdated = bool(known and _outdated(known))
            try:
                result = refresh(kind, known) if known and outdated else lookup(kind, path, sha256)
            except (requests.RequestException, OSError, ValueError):
                result = {"status": "error", "checkedAt": int(time.time())}
            failed = result["status"] == "error"
            if known and outdated and result["status"] != "found":
                # Keep what was known and try adding the rest again later.
                result = {**known, "refreshTriedAt": int(time.time())}
            with self._lock:
                self._queue.pop(key, None)
                self._results[key] = result
                snapshot = dict(self._results)
                if failed:
                    # Offline or Civitai unavailable: stop for now and try again later.
                    for other in list(self._queue):
                        self._queue.pop(other)
            store.write(CACHE_FILE, snapshot)
            if failed:
                return
            time.sleep(PAUSE)


lookups = Lookups()
