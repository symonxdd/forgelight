"""Looks up models on Civitai, once per file, and remembers the answers.

What is sent: the SHA256 hash when Forge already knows it, otherwise a quick
hash of 64 KB from the file (Civitai's "AutoV1"), and only if neither matches,
the file name as a search term. Matches are confirmed by file size. Nothing
else about the user or their images leaves the computer.
"""

from __future__ import annotations

import hashlib
import threading
import time
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


def _summary(model: dict, version: dict) -> dict:
    model_id = version.get("modelId") or model.get("id")
    version_id = version.get("id")
    return {
        "status": "found",
        "name": model.get("name"),
        "version": version.get("name"),
        "type": model.get("type"),
        "baseModel": version.get("baseModel"),
        "nsfw": bool(model.get("nsfw")),
        "trainedWords": (version.get("trainedWords") or [])[:20],
        "url": f"https://civitai.com/models/{model_id}?modelVersionId={version_id}",
        "checkedAt": int(time.time()),
    }


def _get(path: str, params: Any = None) -> dict | None:
    response = requests.get(f"{API}{path}", params=params, headers=HEADERS, timeout=TIMEOUT)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()


def lookup(kind: str, path: Path, sha256: str | None) -> dict:
    size = path.stat().st_size
    hashes = [h for h in (sha256, quick_hash(path)) if h]
    for value in hashes:
        version = _get(f"/model-versions/by-hash/{value}")
        if version and any(_size_matches(f, size) for f in version.get("files", [])):
            return _summary(version.get("model") or {}, version)
        time.sleep(PAUSE)

    found = _get(
        "/models",
        params={"query": path.stem, "limit": 10, "nsfw": "true", "types": SEARCH_TYPES.get(kind, [])},
    )
    for model in (found or {}).get("items", []):
        for version in model.get("modelVersions", []):
            for file_info in version.get("files", []):
                if file_info.get("name", "").lower() == path.name.lower() and _size_matches(file_info, size):
                    return _summary(model, version)
    return {"status": "not_found", "checkedAt": int(time.time())}


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
        """Returns the known result, or queues a lookup and reports it as pending."""
        key = cache_key(kind, path)
        with self._lock:
            known = self._results.get(key)
            retry = known and known["status"] == "error" and time.time() - known["checkedAt"] > RETRY_ERRORS_AFTER
            if known and not retry:
                return known
            self._queue.setdefault(key, (kind, path, sha256))
            if not self._worker or not self._worker.is_alive():
                self._worker = threading.Thread(target=self._run, name="forgelight-civitai", daemon=True)
                self._worker.start()
        return {"status": "pending"}

    def _run(self) -> None:
        while True:
            with self._lock:
                if not self._queue:
                    return
                key, (kind, path, sha256) = next(iter(self._queue.items()))
            try:
                result = lookup(kind, path, sha256)
            except (requests.RequestException, OSError, ValueError):
                result = {"status": "error", "checkedAt": int(time.time())}
            with self._lock:
                self._queue.pop(key, None)
                self._results[key] = result
                snapshot = dict(self._results)
                failed = result["status"] == "error"
                if failed:
                    # Offline or Civitai unavailable: stop for now and try again later.
                    for other in list(self._queue):
                        self._queue.pop(other)
            store.write(CACHE_FILE, snapshot)
            if failed:
                return
            time.sleep(PAUSE)


lookups = Lookups()
