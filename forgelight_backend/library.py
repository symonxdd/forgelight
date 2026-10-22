"""The image library: every image in Forge's output folders, newest first.

Only reads the output folders; it never moves, changes or deletes an image
(deleting moves it to the Recycle Bin, on the user's request). The one thing it
adds there is an image the user upscaled with "Upscale only", saved as a new
file in the extras folder, where Forge's own Extras tab saves. Each image's size
and settings text are read once and kept in data/library.json, small preview
images are made on demand into data/thumbs/, and starred images are listed in
data/favorites.json.
"""

from __future__ import annotations

import base64
import hashlib
import io
import os
import re
import threading
import time
import uuid
from pathlib import Path

from PIL import Image
from PIL.PngImagePlugin import PngInfo

from . import private, store

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
    """Stars or unstars an image. Written only when the user clicks."""
    if private.vault_id(image_id) is None:
        resolve(image_id)
    elif not private.exists(image_id):
        raise FileNotFoundError(image_id)
    with _lock:
        ids = favorites()
        if favorite:
            ids.add(image_id)
        else:
            ids.discard(image_id)
        store.write(FAVORITES_FILE, sorted(ids))
    return favorite


def listing(
    query: str,
    model: str,
    offset: int,
    limit: int,
    rating: str = "all",
    favorites_only: bool = False,
    private_only: bool = False,
) -> dict:
    """One page of the Library. Private images join in only while the vault is unlocked."""
    images = scan()
    if extra := private.library_items():
        images = sorted(images + extra, key=lambda image: image["mtime"], reverse=True)
    starred = favorites()
    models: dict[str, int] = {}
    for image in images:
        if name := model_of(image["infotext"]):
            models[name] = models.get(name, 0) + 1

    words = query.lower().split()
    if words or model or rating != "all" or favorites_only or private_only:

        def matches(image: dict) -> bool:
            if favorites_only and image["id"] not in starred:
                return False
            if private_only and not image.get("private"):
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
                "private": bool(image.get("private")),
            }
            for image in page
        ],
        "models": [{"name": n, "count": c} for n, c in sorted(models.items(), key=lambda m: -m[1])],
        "lockedPrivate": private.hidden_count(),
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
    """Moves images to the Recycle Bin; private images are deleted for good. Unknown ids are skipped."""
    global _scan
    found: dict[str, Path] = {}
    gone_private = private.delete([i for i in image_ids[:MAX_DELETE] if private.vault_id(i) is not None])
    for image_id in image_ids[:MAX_DELETE]:
        if private.vault_id(image_id) is not None:
            continue
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
    gone = {image_id for image_id, path in found.items() if not path.exists()} | gone_private
    # A deleted image's star goes with it.
    with _lock:
        starred = favorites()
        if starred & gone:
            store.write(FAVORITES_FILE, sorted(starred - gone))
    return {"deleted": len(gone), "failed": len(image_ids) - len(gone)}


_SEED = re.compile(r"(?:^|,\s*)Seed: (-?\d+)")


def _seed_of(infotext: str) -> int | None:
    match = _SEED.search(infotext)
    return int(match.group(1)) if match else None


def _move_stars(renamed: dict[str, str]) -> None:
    """A moved image keeps its star under its new id."""
    if not renamed:
        return
    with _lock:
        starred = favorites()
        if starred & set(renamed):
            moved = {new for old, new in renamed.items() if old in starred}
            store.write(FAVORITES_FILE, sorted((starred - set(renamed)) | moved))


def make_private(image_ids: list[str]) -> dict:
    """Encrypts images into the vault, then deletes the originals for good.

    Not to the Recycle Bin, which would keep readable copies. Each image keeps its date
    and settings; its cached thumbnail goes with it. Works while the vault is locked.
    """
    global _scan
    if not private.vault.exists():
        raise private.VaultError("Set up private mode first.", 409)
    entries = {image["id"]: image for image in scan()}
    renamed: dict[str, str] = {}
    for image_id in image_ids[:MAX_DELETE]:
        if private.vault_id(image_id) is not None:
            continue
        try:
            path = resolve(image_id)
            thumb = _thumb_path(path)
            infotext = str((entries.get(image_id) or {}).get("infotext") or "")
            kind = image_id.partition("/")[0]
            new_id = private.store(path.read_bytes(), infotext, _seed_of(infotext), kind, path.stat().st_mtime)
            path.unlink()
            thumb.unlink(missing_ok=True)
        except (OSError, ValueError, private.VaultError):
            continue
        renamed[image_id] = private.PREFIX + new_id
    with _lock:
        _scan = None
    _move_stars(renamed)
    return {"moved": len(renamed), "failed": len(image_ids) - len(renamed)}


def _with_settings(data: bytes, infotext: str) -> bytes:
    """A PNG with its settings text written in, as Forge saves it, when it lacks one."""
    with Image.open(io.BytesIO(data)) as image:
        if image.format != "PNG" or image.info.get("parameters") or not infotext:
            return data
        info = PngInfo()
        info.add_text("parameters", infotext)
        out = io.BytesIO()
        image.save(out, "PNG", pnginfo=info)
        return out.getvalue()


def make_public(image_ids: list[str]) -> dict:
    """Saves private images as normal files in Forge's output folders again, then removes
    them from the vault. They go back to their own kind's folder and date, numbered the
    way Forge numbers files, and never replace an existing file. Needs the vault unlocked.
    """
    global _scan
    places = roots()
    if not places:
        raise FileNotFoundError("Forge has no output folder.")
    renamed: dict[str, str] = {}
    for image_id in image_ids[:MAX_DELETE]:
        if private.vault_id(image_id) is None:
            continue
        try:
            meta = private.meta(image_id)
            data = private.image_bytes(image_id)
            kind = str(meta.get("kind") or "txt2img")
            name = kind if kind in places else next(iter(places))
            root = places[name]
            created = float(meta["created"]) if meta.get("created") is not None else time.time()
            folder = root / time.strftime("%Y-%m-%d", time.localtime(created))
            folder.mkdir(parents=True, exist_ok=True)
            suffix = {"JPEG": ".jpg", "WEBP": ".webp"}.get(str(meta.get("format") or "PNG"), ".png")
            data = _with_settings(data, str(meta.get("infotext") or ""))
            seed = meta.get("seed")
            number = _next_number(folder)
            while True:
                path = folder / f"{number:05}-{seed if seed is not None else 'image'}{suffix}"
                try:
                    # "x" creates the file only if it doesn't exist yet: nothing is ever overwritten.
                    with open(path, "xb") as file:
                        file.write(data)
                    break
                except FileExistsError:
                    number += 1
            os.utime(path, (created, created))
            private.delete([image_id])
        except (OSError, ValueError, private.VaultError):
            continue
        renamed[image_id] = f"{name}/{path.relative_to(root).as_posix()}"
    with _lock:
        _scan = None
    _move_stars(renamed)
    return {"moved": len(renamed), "failed": len(image_ids) - len(renamed)}


# The largest upscaled image accepted, in decoded bytes.
MAX_UPSCALED_BYTES = 256 * 1024 * 1024


def _next_number(folder: Path) -> int:
    """Forge numbers the files in a folder; a new file takes the next number."""
    numbers = [int(m.group(1)) for p in folder.iterdir() if (m := re.match(r"(\d+)-", p.name))]
    return max(numbers, default=-1) + 1


def save_upscaled(image_b64: str, infotext: str, note: str, source_name: str) -> dict:
    """Saves an image enlarged by "Upscale only" as a new file in the extras folder.

    It keeps the original's settings text with a note of the upscale added, and never
    replaces an existing file.
    """
    global _scan
    data = base64.b64decode(image_b64.split(",", 1)[-1], validate=True)
    if len(data) > MAX_UPSCALED_BYTES:
        raise ValueError("The upscaled image is too large to save.")
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        name, root = next(((n, r) for n, r in roots().items() if n in ("extras", "outputs")), (None, None))
        if root is None:
            raise FileNotFoundError("Forge has no folder for upscaled images.")
        folder = root / time.strftime("%Y-%m-%d")
        folder.mkdir(parents=True, exist_ok=True)
        stem = re.sub(r"[^\w.-]+", "_", Path(source_name).stem)[:80].strip("._") or "upscaled"
        settings = f"{infotext}, {note}" if infotext.strip() else note
        info = PngInfo()
        info.add_text("parameters", settings)
        number = _next_number(folder)
        while True:
            path = folder / f"{number:05}-{stem}.png"
            try:
                # "x" creates the file only if it doesn't exist yet: nothing is ever overwritten.
                with open(path, "xb") as file:
                    image.save(file, "PNG", pnginfo=info)
                break
            except FileExistsError:
                number += 1
    with _lock:
        _scan = None
    return {"id": f"{name}/{path.relative_to(root).as_posix()}", "infotext": settings}


def reveal(image_id: str) -> None:
    """Opens the image's folder in File Explorer with the image selected."""
    import subprocess

    path = resolve(image_id)
    # Windows paths can't contain quotes, so the quoted path is always one argument.
    subprocess.Popen(f'explorer /select,"{path}"')
