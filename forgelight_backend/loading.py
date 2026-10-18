"""How far a checkpoint load has got, for the progress bar.

Forge reports no progress while it loads a checkpoint, which can take minutes when
the file comes from disk. This module looks at what Forge's generating thread is
doing at this moment (its call stack) and, while the file is being read, at how many
of its tensors are already in memory. It only reads: nothing in Forge is changed,
wrapped or patched.

Forge loads a checkpoint lazily, at the first generation after it was picked (or
after Forge started), in modules.sd_models.forge_model_reload:
  1. unloading: the previous checkpoint leaves memory
  2. reading: safetensors.torch.load_file reads the file, one tensor at a time
  3. building: backend.loader.forge_loader sets up each part (UNet, text encoders, VAE)
  4. moving: backend.memory_management.load_models_gpu moves parts to the graphics card;
     this also happens briefly in ordinary generations, so it only counts after a load.
"""

from __future__ import annotations

import json
import os
import struct
import sys
import threading
from functools import lru_cache
from types import FrameType
from typing import Any, Optional

_SEP = os.sep
_READ = (f"safetensors{_SEP}torch.py", "load_file")
_BUILD = (f"backend{_SEP}loader.py", "forge_loader")
_UNLOAD = (f"backend{_SEP}memory_management.py", "unload_all_models")
_MOVE = (f"backend{_SEP}memory_management.py", "load_models_gpu")
_RELOAD = (f"modules{_SEP}sd_models.py", "forge_model_reload")


def _is(frame: FrameType, where: tuple[str, str]) -> bool:
    code = frame.f_code
    return code.co_name == where[1] and code.co_filename.endswith(where[0])


def _same_file(a: Any, b: Any) -> bool:
    try:
        return os.path.normcase(os.path.abspath(str(a))) == os.path.normcase(os.path.abspath(str(b)))
    except (TypeError, ValueError):
        return False


@lru_cache(maxsize=8)
def _tensor_sizes(path: str, _mtime: float) -> tuple[dict[str, int], int]:
    """Byte size of every tensor in a safetensors file, from the header at its start."""
    with open(path, "rb") as handle:
        (length,) = struct.unpack("<Q", handle.read(8))
        header = json.loads(handle.read(length))
    header.pop("__metadata__", None)
    sizes = {name: entry["data_offsets"][1] - entry["data_offsets"][0] for name, entry in header.items()}
    return sizes, max(1, sum(sizes.values()))


def _read_progress(frame: FrameType) -> Optional[float]:
    """Share of the file's bytes already read, from the tensors load_file has collected so far."""
    local = frame.f_locals
    path, result = local.get("filename"), local.get("result")
    if not isinstance(result, dict):
        return None
    try:
        sizes, total = _tensor_sizes(str(path), os.path.getmtime(path))
    except (OSError, ValueError, KeyError, struct.error):
        return None
    done = sum(sizes.get(name, 0) for name in list(result))
    return min(1.0, done / total)


def _build_progress(frame: FrameType) -> Optional[float]:
    """Share of the model's parts already set up: the part being set up counts as half done."""
    local = frame.f_locals
    config, current = local.get("config"), local.get("component_name")
    if not isinstance(config, dict):
        return None
    # The pipeline config also holds plain entries such as "_class_name"; parts are [library, class].
    parts = [name for name, value in config.items() if isinstance(value, list) and len(value) == 2]
    if current not in parts:
        return None
    return (parts.index(current) + 0.5) / len(parts)


def _stacks() -> list[list[FrameType]]:
    """The call stack of every other thread, innermost frame first."""
    own = threading.get_ident()
    stacks = []
    for thread_id, frame in sys._current_frames().items():
        if thread_id == own:
            continue
        stack: list[FrameType] = []
        while frame is not None:
            stack.append(frame)
            frame = frame.f_back
        stacks.append(stack)
    return stacks


def _step(stack: list[FrameType], checkpoint: Any) -> Optional[dict]:
    reloading = any(_is(f, _RELOAD) for f in stack)
    for frame in stack:
        if reloading and _is(frame, _READ):
            path = frame.f_locals.get("filename")
            return {
                "stage": "reading",
                "progress": _read_progress(frame),
                "file": os.path.basename(str(path)),
                "isCheckpoint": _same_file(path, checkpoint),
            }
        if _is(frame, _BUILD):
            return {"stage": "building", "progress": _build_progress(frame)}
        if reloading and _is(frame, _UNLOAD):
            return {"stage": "unloading", "progress": None}
        if _is(frame, _MOVE):
            return {"stage": "moving", "progress": None}
    return None


def state() -> dict:
    """Whether the next generation loads a checkpoint first, and what loading is doing now."""
    from modules import sd_models

    data = sd_models.model_data
    parameters = data.forge_loading_parameters
    info = parameters.get("checkpoint_info") if isinstance(parameters, dict) else None
    checkpoint = getattr(info, "filename", None)
    # Forge's own test for whether a reload is due (forge_model_reload).
    pending = info is not None and data.forge_hash != str(parameters)
    step = None
    for stack in _stacks():
        step = _step(stack, checkpoint)
        if step:
            break
    return {
        "pending": pending,
        "checkpoint": os.path.basename(checkpoint) if checkpoint else None,
        **(step or {"stage": None, "progress": None}),
    }
