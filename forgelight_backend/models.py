"""Lists the user's checkpoints and LoRAs with their Civitai details.

Reads Forge's own model lists and caches; never loads or changes a model.
"""

from __future__ import annotations

from pathlib import Path

from .architecture import detect
from .civitai import lookups

LORA_EXTENSIONS = {".safetensors", ".pt", ".ckpt"}


def _entry(kind: str, path: Path, root: Path | None, sha256: str | None, title: str | None = None) -> dict:
    try:
        relative = str(path.relative_to(root)) if root else path.name
    except ValueError:
        relative = path.name
    return {
        "kind": kind,
        "title": title,
        "file": relative.replace("\\", "/"),
        "stem": path.stem,
        "size": path.stat().st_size,
        "arch": detect(path),
        "civitai": lookups.request(kind, path, sha256),
    }


def checkpoints() -> list[dict]:
    from modules import hashes, sd_models

    result = []
    for info in list(sd_models.checkpoints_list.values()):
        path = Path(info.filename)
        if not path.is_file():
            continue
        sha256 = info.sha256 or hashes.sha256_from_cache(info.filename, f"checkpoint/{info.name}")
        root = Path(sd_models.model_path) if hasattr(sd_models, "model_path") else None
        result.append(_entry("checkpoint", path, root, sha256, title=info.title))
    return result


def loras() -> list[dict]:
    from modules import hashes, shared

    root = Path(shared.cmd_opts.lora_dir)
    if not root.is_dir():
        return []
    result = []
    for path in sorted(root.rglob("*")):
        if path.suffix.lower() in LORA_EXTENSIONS and path.is_file():
            relative = str(path.relative_to(root).with_suffix("")).replace("\\", "/")
            sha256 = hashes.sha256_from_cache(str(path), f"lora/{relative}")
            result.append(_entry("lora", path, root, sha256))
    return result
