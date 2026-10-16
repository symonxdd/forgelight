"""Tells SD 1.x, SDXL and other model families apart from a safetensors file's header.

Only the header is read: an 8-byte length, then a JSON index of the tensors and
optional training metadata. That takes milliseconds even for a 7 GB checkpoint.
"""

from __future__ import annotations

import json
import struct
from functools import lru_cache
from pathlib import Path

MAX_HEADER = 64 * 1024 * 1024


def _header(path: Path) -> dict:
    if path.suffix.lower() != ".safetensors":
        return {}
    with open(path, "rb") as file:
        (length,) = struct.unpack("<Q", file.read(8))
        if length > MAX_HEADER:
            return {}
        return json.loads(file.read(length))


def _from_metadata(meta: dict) -> str | None:
    base = str(meta.get("ss_base_model_version", "")).lower()
    spec = str(meta.get("modelspec.architecture", "")).lower()
    for text in (base, spec):
        if "sdxl" in text or "stable-diffusion-xl" in text:
            return "sdxl"
        if text.startswith(("sd_v1", "sd_1", "stable-diffusion-v1")):
            return "sd1"
        if "flux" in text:
            return "flux"
    return None


def _from_keys(keys: list[str]) -> str:
    joined = "\n".join(keys)
    if "double_blocks" in joined:
        return "flux"
    if "conditioner.embedders.1" in joined or "lora_te2_" in joined or "lora_te2." in joined:
        return "sdxl"
    if "cond_stage_model.transformer" in joined or "lora_te_text_model" in joined:
        return "sd1"
    if "lora_unet_input_blocks" in joined or "lora_unet_down_blocks" in joined:
        return "sd1"
    return "unknown"


@lru_cache(maxsize=512)
def _detect(path: str, size: int, mtime: float) -> str:
    try:
        header = _header(Path(path))
    except (OSError, ValueError, struct.error):
        return "unknown"
    return _from_metadata(header.get("__metadata__") or {}) or _from_keys(list(header))


def detect(path: Path) -> str:
    """"sd1", "sdxl", "flux" or "unknown". Pony, Illustrious and NoobAI models are SDXL."""
    stat = path.stat()
    return _detect(str(path), stat.st_size, stat.st_mtime)
