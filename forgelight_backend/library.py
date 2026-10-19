"""The image library: every image in Forge's output folders, newest first.

Only reads the output folders; it never moves, changes or deletes an image
(deleting moves it to the Recycle Bin, on the user's request). Each image's size
and settings text are read once and kept in data/library.json, small preview
images are made on demand into data/thumbs/, and starred images are listed in
data/favorites.json.
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
FAVORITES_FILE = "favorites.json"
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
        # Other programs leave small copies without settings (e.g. in a "miniatures"
        # folder); a settings-less image named like one with settings is such a copy.
        named = {Path(image["path"]).name for image in images if image["infotext"]}
        images = [image for image in images if image["infotext"] or Path(image["path"]).name not in named]
        images.sort(key=lambda image: image["mtime"], reverse=True)
        _scan = (time.monotonic(), images)
        return images


_MODEL = re.compile(r"(?:^|,\s*)Model: ([^,\n]+)")


def model_of(infotext: str) -> str | None:
    last_line = infotext.strip().rsplit("\n", 1)[-1]
    match = _MODEL.search(last_line)
    return match.group(1).strip() if match else None


# Words that mark a prompt as adult. Only the prompt counts: negative prompts often list
# "nsfw" precisely to avoid it. A guess, so images without such words may still be adult.
_ADULT_WORDS = (
    "nsfw",
    "rating_explicit",
    "rating_questionable",
    "explicit",
    "nude",
    "nudity",
    "naked",
    "topless",
    "bottomless",
    "uncensored",
    "sex",
    "sexual",
    "hetero",
    "penis",
    "pussy",
    "vagina",
    "vulva",
    "genitals",
    "nipples",
    "areola",
    "areolae",
    "cum",
    "cumshot",
    "ejaculation",
    "fellatio",
    "blowjob",
    "handjob",
    "paizuri",
    "anal",
    "penetration",
    "masturbation",
    "orgasm",
    "erection",
    "testicles",
    "futanari",
    "ahegao",
    "bdsm",
    "bondage",
    "porn",
    "hentai",
)
# Whole words only, allowing booru-style underscores and weights: "(nude:1.2)".
_ADULT = re.compile(r"(?<![a-z])(" + "|".join(_ADULT_WORDS) + r")(?![a-z])", re.IGNORECASE)
_PARAMS_LINE = re.compile(r"^\s*Steps: ")


def prompt_of(infotext: str) -> str:
    """The prompt part of an image's settings text, without negative prompt and settings."""
    lines = infotext.strip().split("\n")
    if lines and _PARAMS_LINE.match(lines[-1]):
        lines.pop()
    for index, line in enumerate(lines):
        if line.startswith("Negative prompt:"):
            return "\n".join(lines[:index])
    return "\n".join(lines)


def looks_nsfw(infotext: str) -> bool:
    return bool(_ADULT.search(prompt_of(infotext)))


RATINGS = ("all", "sfw", "nsfw")


def favorites() -> set[str]:
    """Ids of the images starred in the Library."""
    return set(store.read(FAVORITES_FILE, []))


def set_favorite(image_id: str, favorite: bool) -> bool:
    """Stars or unstars an image in the output folders. Written only when the user clicks."""
    resolve(image_id)
    with _lock:
        ids = favorites()
        if favorite:
            ids.add(image_id)
        else:
            ids.discard(image_id)
        store.write(FAVORITES_FILE, sorted(ids))
    return favorite


def listing(
    query: str, model: str, offset: int, limit: int, rating: str = "all", favorites_only: bool = False
) -> dict:
    images = scan()
    starred = favorites()
    models: dict[str, int] = {}
    for image in images:
        if name := model_of(image["infotext"]):
            models[name] = models.get(name, 0) + 1

    words = query.lower().split()
    if words or model or rating != "all" or favorites_only:

        def matches(image: dict) -> bool:
            if favorites_only and image["id"] not in starred:
                return False
            if model and model_of(image["infotext"]) != model:
                return False
            if rating != "all" and looks_nsfw(image["infotext"]) != (rating == "nsfw"):
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
        "items": [
            {
                **{k: v for k, v in image.items() if k != "path"},
                "nsfw": looks_nsfw(image["infotext"]),
                "favorite": image["id"] in starred,
            }
            for image in page
        ],
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


def _thumb_path(source: Path) -> Path:
    stat = source.stat()
    return THUMBS / f"{hashlib.sha1(f'{source}|{stat.st_mtime}|{stat.st_size}'.encode()).hexdigest()}.webp"


def thumbnail(image_id: str) -> Path:
    """A small WebP copy for the grid, made once per version of the image."""
    source = resolve(image_id)
    target = _thumb_path(source)
    digest = target.stem
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


def _recycle(paths: list[Path]) -> None:
    """Moves files to the Windows Recycle Bin, where they can still be restored."""
    import ctypes
    from ctypes import wintypes

    class SHFILEOPSTRUCTW(ctypes.Structure):
        _fields_ = [
            ("hwnd", wintypes.HWND),
            ("wFunc", wintypes.UINT),
            ("pFrom", wintypes.LPCWSTR),
            ("pTo", wintypes.LPCWSTR),
            ("fFlags", ctypes.c_ushort),
            ("fAnyOperationsAborted", wintypes.BOOL),
            ("hNameMappings", ctypes.c_void_p),
            ("lpszProgressTitle", wintypes.LPCWSTR),
        ]

    FO_DELETE = 0x3
    # Undoable (Recycle Bin), no prompts or progress window; but if a file can't be
    # recycled, Windows asks before deleting it for good instead of doing so silently.
    FLAGS = 0x40 | 0x10 | 0x4 | 0x400 | 0x4000
    # The list is a run of null-terminated paths, ended by an extra null.
    buffer = ctypes.create_unicode_buffer("\0".join(str(p) for p in paths) + "\0")
    operation = SHFILEOPSTRUCTW(wFunc=FO_DELETE, pFrom=ctypes.cast(buffer, wintypes.LPCWSTR), fFlags=FLAGS)
    result = ctypes.windll.shell32.SHFileOperationW(ctypes.byref(operation))
    if result != 0:
        raise OSError(f"Windows couldn't move the images to the Recycle Bin (code {result}).")


MAX_DELETE = 2000


def delete(image_ids: list[str]) -> dict:
    """Moves images to the Recycle Bin. Ids outside the output folders are skipped."""
    global _scan
    found: dict[str, Path] = {}
    for image_id in image_ids[:MAX_DELETE]:
        try:
            found[image_id] = resolve(image_id)
        except FileNotFoundError:
            continue
    paths = list(found.values())
    thumbs = [_thumb_path(path) for path in paths]
    if paths:
        try:
            _recycle(paths)
        finally:
            with _lock:
                _scan = None
    for thumb in thumbs:
        thumb.unlink(missing_ok=True)
    gone = {image_id for image_id, path in found.items() if not path.exists()}
    # A deleted image's star goes with it.
    with _lock:
        starred = favorites()
        if starred & gone:
            store.write(FAVORITES_FILE, sorted(starred - gone))
    return {"deleted": len(gone), "failed": len(image_ids) - len(gone)}


def reveal(image_id: str) -> None:
    """Opens the image's folder in File Explorer with the image selected."""
    import subprocess

    path = resolve(image_id)
    # Windows paths can't contain quotes, so the quoted path is always one argument.
    subprocess.Popen(f'explorer /select,"{path}"')
