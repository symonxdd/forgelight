"""Finds model files waiting in Downloads or on the Desktop, and moves one into Forge on request.

Only the top level of those two folders is looked at, and only .safetensors files
whose header shows a checkpoint or a LoRA; unfinished downloads (.crdownload, .part)
never match. A file moves only when the user clicks Move to Forge. It is renamed
into Forge's folder for its type and never replaces a file there. Across drives it
is copied first, and the original is removed only once the copy is complete.
"""

from __future__ import annotations

import errno
import os
import shutil
import sys
from functools import lru_cache
from pathlib import Path

from . import store
from .architecture import detect, kind
from .civitai import lookups

# Windows' own ids for the user's Downloads and Desktop folders, wherever they were moved.
KNOWN_FOLDERS = {
    "downloads": ("Downloads", "{374DE290-123F-4565-9164-39C4925E467B}"),
    "desktop": ("Desktop", "{B4BFCC3A-DB2C-424C-B029-7FE99A87C641}"),
}
TARGET_LABELS = {"checkpoint": "Checkpoints", "lora": "Lora"}
HIDDEN_FILE = "newmodels.json"
MIN_SIZE = 1024 * 1024


class MoveError(Exception):
    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


@lru_cache(maxsize=None)
def _known_folder(guid: str) -> Path | None:
    if os.name != "nt":
        return None
    import ctypes
    from ctypes import wintypes

    class GUID(ctypes.Structure):
        _fields_ = [
            ("Data1", wintypes.DWORD),
            ("Data2", wintypes.WORD),
            ("Data3", wintypes.WORD),
            ("Data4", ctypes.c_ubyte * 8),
        ]

    folder_id = GUID()
    ctypes.oledll.ole32.CLSIDFromString(ctypes.c_wchar_p(guid), ctypes.byref(folder_id))
    path = ctypes.c_wchar_p()
    try:
        ctypes.windll.shell32.SHGetKnownFolderPath(ctypes.byref(folder_id), 0, None, ctypes.byref(path))
        return Path(path.value) if path.value else None
    except OSError:
        return None
    finally:
        ctypes.windll.ole32.CoTaskMemFree(path)


def folders() -> dict[str, Path]:
    found = {}
    for key, (_label, guid) in KNOWN_FOLDERS.items():
        path = _known_folder(guid)
        if path and path.is_dir():
            found[key] = path
    return found


def targets() -> dict[str, Path]:
    """Forge's folders for checkpoints and LoRAs, as Forge itself reads them."""
    from modules import sd_models, shared

    checkpoints = getattr(shared.cmd_opts, "ckpt_dir", None) or sd_models.model_path
    return {"checkpoint": Path(checkpoints), "lora": Path(shared.cmd_opts.lora_dir)}


def _installed(target: Path) -> dict[str, int]:
    """File name (lowercase) to size, for every file in a Forge folder and its subfolders."""
    if not target.is_dir():
        return {}
    return {path.name.lower(): path.stat().st_size for path in target.rglob("*") if path.is_file()}


def _free_name(target: Path, name: str) -> str:
    """The name itself, or "name (2)" and up when Forge already has a different file by that name."""
    stem, suffix = Path(name).stem, Path(name).suffix
    candidate, number = name, 2
    while (target / candidate).exists():
        candidate, number = f"{stem} ({number}){suffix}", number + 1
    return candidate


def _hidden() -> set[tuple[str, int]]:
    entries = store.read(HIDDEN_FILE, {}).get("hidden", [])
    return {(e["file"].lower(), e["size"]) for e in entries if isinstance(e, dict) and "file" in e and "size" in e}


def _candidates() -> list[tuple[str, Path, os.stat_result]]:
    found = []
    for key, folder in folders().items():
        try:
            paths = list(folder.iterdir())
        except OSError:
            continue
        for path in paths:
            try:
                stat = path.stat()
            except OSError:
                continue
            if path.suffix.lower() == ".safetensors" and path.is_file() and stat.st_size >= MIN_SIZE:
                found.append((key, path, stat))
    return found


def scan() -> list[dict]:
    """Checkpoints and LoRAs in Downloads and on the Desktop that Forge doesn't have yet."""
    places = targets()
    installed = {k: _installed(path) for k, path in places.items()}
    hidden = _hidden()
    result = []
    for key, path, stat in _candidates():
        try:
            model_kind = kind(path)
        except OSError:
            continue
        if model_kind is None:
            continue
        name = path.name
        if installed[model_kind].get(name.lower()) == stat.st_size:
            continue  # Forge has this very file already; this is a copy.
        target_name = _free_name(places[model_kind], name)
        result.append(
            {
                "id": f"{key}/{name}",
                "place": key,
                "placeLabel": KNOWN_FOLDERS[key][0],
                "file": name,
                "stem": path.stem,
                "size": stat.st_size,
                "kind": model_kind,
                "arch": detect(path),
                "targetLabel": TARGET_LABELS[model_kind],
                "targetName": target_name,
                "hidden": (name.lower(), stat.st_size) in hidden,
                "civitai": lookups.request(model_kind, path, None),
            }
        )
    return sorted(result, key=lambda entry: entry["file"].lower())


def _source(place: str, file: str, size: int) -> Path:
    folder = folders().get(place)
    if folder is None or not isinstance(file, str) or Path(file).name != file:
        raise MoveError("That folder or file name isn't one Forgelight looks at.")
    path = folder / file
    try:
        if not path.is_file() or path.stat().st_size != size:
            raise MoveError("The file is no longer there, or it changed. The list is refreshed.", 404)
    except OSError as error:
        raise MoveError(f"The file can't be read: {error.strerror}.", 404) from error
    return path


def _generating() -> bool:
    shared = sys.modules.get("modules.shared")
    return bool(shared and shared.state.job_count)


def move(place: str, file: str, size: int) -> dict:
    """Moves one found file into Forge's folder for its type, under a free name."""
    if _generating():
        raise MoveError("An image is being made. The file moves once it is done.", 409)
    source = _source(place, file, size)
    model_kind = kind(source)
    if model_kind is None:
        raise MoveError("This file isn't a checkpoint or a LoRA, so it stays where it is.")
    folder = targets()[model_kind]
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / _free_name(folder, file)
    try:
        # On the same drive a move is an instant rename; Windows never lets a rename replace a file.
        os.rename(source, target)
    except OSError as error:
        if error.errno != errno.EXDEV:
            raise MoveError(f"The file couldn't be moved: {error.strerror}. It is still where it was.", 500) from error
        _move_across_drives(source, target)
    return {"file": target.name, "kind": model_kind, "targetLabel": TARGET_LABELS[model_kind]}


def _move_across_drives(source: Path, target: Path) -> None:
    """Copies under a temporary name, renames, and only then removes the original."""
    partial = target.with_name(target.name + ".part")
    try:
        shutil.copyfile(source, partial)
        os.rename(partial, target)
    except OSError as error:
        partial.unlink(missing_ok=True)
        raise MoveError(f"The file couldn't be copied: {error.strerror}. It is still where it was.", 500) from error
    try:
        source.unlink()
    except OSError as error:
        raise MoveError("The file is now in Forge, but the original couldn't be removed and is still there.", 500) \
            from error


def set_hidden(file: str, size: int, hidden: bool) -> None:
    """Remembers a file not to suggest (or to suggest again), by its name and size."""
    entries = [
        entry
        for entry in store.read(HIDDEN_FILE, {}).get("hidden", [])
        if isinstance(entry, dict) and (str(entry.get("file", "")).lower(), entry.get("size")) != (file.lower(), size)
    ]
    if hidden:
        entries.append({"file": file, "size": size})
    store.write(HIDDEN_FILE, {"hidden": entries})


def reveal(model_kind: str, file: str) -> None:
    """Opens Forge's folder in File Explorer with the moved file selected."""
    import subprocess

    folder = targets().get(model_kind)
    if folder is None or not isinstance(file, str) or Path(file).name != file or not (folder / file).is_file():
        raise MoveError("That file isn't in Forge's folder.", 404)
    # Windows paths can't contain quotes, so the quoted path is always one argument.
    subprocess.Popen(f'explorer /select,"{folder / file}"')
