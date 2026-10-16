"""The image library: every image in Forge's output folders, newest first.

Only reads the output folders; it never moves, changes or deletes an image.
Each image's size and settings text are read once and kept in data/library.json,
and small preview images are made on demand into data/thumbs/.
"""

from __future__ import annotations

import hashlib
import os
import re
import threading
import time
import uuid
from pathlib import Path

from PIL import Image

from . import store

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
# Folders other programs keep next to the images, holding copies or previews.
SKIPPED_DIRS = {"thumbnails", ".thumbnails", "__pycache__"}
THUMBS = store.DATA / "thumbs"
THUMB_WIDTH = 400
INDEX_FILE = "library.json"
# Rescanning the folders is cheap, but not on every page of a scroll.
SCAN_TTL = 2.0

_lock = threading.Lock()
_index: dict[str, dict] | None = None
_scan: tuple[float, list[dict]] | None = None


def roots() -> dict[str, Path]:
    """Forge's output folders by short name, as set in its settings."""
    from modules.shared import opts

    def resolve(value: str) -> Path:
        # Forge saves relative to its own folder, which is the working directory.
        return Path(os.path.abspath(value))

    if getattr(opts, "outdir_samples", ""):
        return {"outputs": resolve(opts.outdir_samples)}
    names = {
        "txt2img": "outdir_txt2img_samples",
        "img2img": "outdir_img2img_samples",
        "extras": "outdir_extras_samples",
    }
    return {name: resolve(value) for name, key in names.items() if (value := getattr(opts, key, ""))}


def _read_settings(image: Image.Image) -> str:
    """The settings text Forge writes into each image; empty when there is none."""
    text = image.info.get("parameters")
    if isinstance(text, str):
        return text
    exif = image.info.get("exif")
    if exif:
        try:
            import piexif
            import piexif.helper

            comment = piexif.load(exif).get("Exif", {}).get(piexif.ExifIFD.UserComment, b"")
            return piexif.helper.UserComment.load(comment) if comment else ""
        except Exception:  # noqa: BLE001  (any unreadable metadata just means none)
            return ""
    return ""


def _describe(path: Path) -> dict:
    try:
        with Image.open(path) as image:
            return {"width": image.width, "height": image.height, "infotext": _read_settings(image)}
    except Exception:  # noqa: BLE001  (a broken file is listed without details)
        return {"width": 0, "height": 0, "infotext": ""}


def _walk(root: Path):
    for folder, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d.lower() not in SKIPPED_DIRS and not d.startswith(".")]
        for name in files:
            if Path(name).suffix.lower() in IMAGE_EXTENSIONS:
                yield Path(folder) / name


def _load_index() -> dict[str, dict]:
    global _index
    if _index is None:
        _index = store.read(INDEX_FILE, {})
    return _index


def scan() -> list[dict]:
    """All images, newest first, each with its id, size, date and settings text."""
    global _scan
    with _lock:
        if _scan and time.monotonic() - _scan[0] < SCAN_TTL:
            return _scan[1]
        index = _load_index()
        seen: set[str] = set()
        changed = False
        images = []
        for name, root in roots().items():
            if not root.is_dir():
                continue
            for path in _walk(root):
                try:
                    stat = path.stat()
                except OSError:
                    continue
                key = str(path)
                seen.add(key)
                entry = index.get(key)
                if not entry or entry["mtime"] != stat.st_mtime or entry["bytes"] != stat.st_size:
                    entry = {"mtime": stat.st_mtime, "bytes": stat.st_size, **_describe(path)}
                    index[key] = entry
                    changed = True
                relative = path.relative_to(root).as_posix()
                images.append({"id": f"{name}/{relative}", "path": key, **entry})
        for key in [k for k in index if k not in seen]:
            del index[key]
            changed = True
        if changed:
            store.write(INDEX_FILE, index)
        images.sort(key=lambda image: image["mtime"], reverse=True)
        _scan = (time.monotonic(), images)
        return images


_MODEL = re.compile(r"(?:^|,\s*)Model: ([^,\n]+)")


def model_of(infotext: str) -> str | None:
    last_line = infotext.strip().rsplit("\n", 1)[-1]
    match = _MODEL.search(last_line)
    return match.group(1).strip() if match else None


def listing(query: str, model: str, offset: int, limit: int) -> dict:
    images = scan()
    models: dict[str, int] = {}
    for image in images:
        if name := model_of(image["infotext"]):
            models[name] = models.get(name, 0) + 1

    words = query.lower().split()
    if words or model:

        def matches(image: dict) -> bool:
            if model and model_of(image["infotext"]) != model:
                return False
            haystack = f"{image['infotext']}\n{image['id']}".lower()
            return all(word in haystack for word in words)

        images = [image for image in images if matches(image)]

    # Per day on this computer's clock, so day headings show full counts from the first page.
    days: dict[str, int] = {}
    for image in images:
        day = time.strftime("%Y-%m-%d", time.localtime(image["mtime"]))
        days[day] = days.get(day, 0) + 1

    page = images[offset : offset + limit]
    return {
        "total": len(images),
        "days": days,
        "offset": offset,
        "items": [{k: v for k, v in image.items() if k != "path"} for image in page],
        "models": [{"name": n, "count": c} for n, c in sorted(models.items(), key=lambda m: -m[1])],
    }


def resolve(image_id: str) -> Path:
    """The file for an image id, refusing anything outside the output folders."""
    name, _, relative = image_id.partition("/")
    root = roots().get(name)
    if root is None or not relative:
        raise FileNotFoundError(image_id)
    target = (root / relative).resolve()
    if (
        not target.is_relative_to(root.resolve())
        or target.suffix.lower() not in IMAGE_EXTENSIONS
        or not target.is_file()
    ):
        raise FileNotFoundError(image_id)
    return target


def thumbnail(image_id: str) -> Path:
    """A small WebP copy for the grid, made once per version of the image."""
    source = resolve(image_id)
    stat = source.stat()
    digest = hashlib.sha1(f"{source}|{stat.st_mtime}|{stat.st_size}".encode()).hexdigest()
    target = THUMBS / f"{digest}.webp"
    if target.is_file():
        return target
    THUMBS.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.draft("RGB", (THUMB_WIDTH, THUMB_WIDTH * 4))
        small = image.convert("RGB")
        small.thumbnail((THUMB_WIDTH, THUMB_WIDTH * 4), Image.Resampling.LANCZOS, reducing_gap=2.0)
    temp = THUMBS / f"{digest}.{uuid.uuid4().hex}.tmp"
    small.save(temp, "WEBP", quality=82, method=4)
    try:
        os.replace(temp, target)
    except PermissionError:
        # Another request made the same preview at the same moment and is sending it.
        temp.unlink(missing_ok=True)
        if not target.is_file():
            raise
    return target


def reveal(image_id: str) -> None:
    """Opens the image's folder in File Explorer with the image selected."""
    import subprocess

    path = resolve(image_id)
    # Windows paths can't contain quotes, so the quoted path is always one argument.
    subprocess.Popen(f'explorer /select,"{path}"')
