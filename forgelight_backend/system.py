"""What Settings > System and the top bar meter show: graphics card, memory, storage and usage.

Read-only. The graphics card is read through NVML, the Nvidia driver's own library (the
one nvidia-smi uses), memory through Windows, and the kind of computer from the case type
in the firmware's SMBIOS table. While Forge generates, a small thread samples VRAM a few
times a second, so each image's peak can be shown. Nothing here changes Forge or how it
generates.
"""

from __future__ import annotations

import ctypes
import platform
import re
import shutil
import sys
import threading
import time
from ctypes import wintypes
from pathlib import Path

from . import library, private, store
from .vault import vault

# Survives reloads (see reloader.py); entries added later are filled in with setdefault.
_state: dict = globals().get("_state", {})
_state.setdefault("nvml", None)
_state.setdefault("computer", None)
_state.setdefault("samples", [])
_state.setdefault("sampler", None)
_lock = threading.Lock()

LORA_EXTENSIONS = {".safetensors", ".pt", ".ckpt"}
# SMBIOS case types of a portable computer: portable, laptop, notebook, hand held,
# sub notebook, tablet, convertible, detachable. Makers pick among them freely.
PORTABLE_CASES = {8, 9, 10, 11, 14, 30, 31, 32}
# Samples older than this are dropped; no single generation takes longer.
KEEP_SAMPLES = 30 * 60


class _NvmlMemory(ctypes.Structure):
    _fields_ = [("total", ctypes.c_ulonglong), ("free", ctypes.c_ulonglong), ("used", ctypes.c_ulonglong)]


class _NvmlUtilization(ctypes.Structure):
    _fields_ = [("gpu", ctypes.c_uint), ("memory", ctypes.c_uint)]


class _MemoryStatus(ctypes.Structure):
    _fields_ = [
        ("dwLength", wintypes.DWORD),
        ("dwMemoryLoad", wintypes.DWORD),
        ("ullTotalPhys", ctypes.c_ulonglong),
        ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong),
        ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong),
        ("ullAvailVirtual", ctypes.c_ulonglong),
        ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
    ]


class _PowerStatus(ctypes.Structure):
    _fields_ = [
        ("ACLineStatus", ctypes.c_byte),
        ("BatteryFlag", ctypes.c_ubyte),
        ("BatteryLifePercent", ctypes.c_byte),
        ("SystemStatusFlag", ctypes.c_byte),
        ("BatteryLifeTime", wintypes.DWORD),
        ("BatteryFullLifeTime", wintypes.DWORD),
    ]


def _nvml() -> tuple[ctypes.WinDLL, ctypes.c_void_p] | None:
    """The driver's NVML library and the first graphics card, or None without an Nvidia driver."""
    if _state["nvml"] is None:
        _state["nvml"] = False
        for path in ("nvml.dll", r"C:\Program Files\NVIDIA Corporation\NVSMI\nvml.dll"):
            try:
                dll = ctypes.WinDLL(path)
            except OSError:
                continue
            handle = ctypes.c_void_p()
            if dll.nvmlInit_v2() == 0 and dll.nvmlDeviceGetHandleByIndex_v2(0, ctypes.byref(handle)) == 0:
                _state["nvml"] = (dll, handle)
            break
    return _state["nvml"] or None


def _vram() -> tuple[int, int] | None:
    """(used, total) bytes on the graphics card, counting every program using it."""
    nvml = _nvml()
    if not nvml:
        return None
    memory = _NvmlMemory()
    if nvml[0].nvmlDeviceGetMemoryInfo(nvml[1], ctypes.byref(memory)) != 0:
        return None
    return memory.used, memory.total


def _gpu_activity() -> dict | None:
    nvml = _nvml()
    if not nvml:
        return None
    dll, handle = nvml
    temperature = ctypes.c_uint()
    utilization = _NvmlUtilization()
    if dll.nvmlDeviceGetTemperature(handle, 0, ctypes.byref(temperature)) != 0:
        return None
    if dll.nvmlDeviceGetUtilizationRates(handle, ctypes.byref(utilization)) != 0:
        return None
    return {"temperature": temperature.value, "load": utilization.gpu}


def _gpu_name() -> str | None:
    nvml = _nvml()
    if not nvml:
        return None
    name = ctypes.create_string_buffer(96)
    if nvml[0].nvmlDeviceGetName(nvml[1], name, len(name)) != 0:
        return None
    return name.value.decode("utf-8", "replace")


def _ram() -> tuple[int, int]:
    """(used, total) bytes of the computer's memory."""
    status = _MemoryStatus(dwLength=ctypes.sizeof(_MemoryStatus))
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))
    return status.ullTotalPhys - status.ullAvailPhys, status.ullTotalPhys


def _case_type() -> int | None:
    """The case type the maker wrote into the firmware, if any."""
    kernel32 = ctypes.windll.kernel32
    signature = int.from_bytes(b"RSMB", "big")
    size = kernel32.GetSystemFirmwareTable(signature, 0, None, 0)
    if not size:
        return None
    buffer = ctypes.create_string_buffer(size)
    if kernel32.GetSystemFirmwareTable(signature, 0, buffer, size) != size:
        return None
    return _case_type_in(buffer.raw[8:])  # after the header: calling method, version, length


def _case_type_in(data: bytes) -> int | None:
    """Walks the SMBIOS structures to the enclosure (type 3); its fifth byte is the case type."""
    position = 0
    while position + 4 <= len(data):
        kind, length = data[position], data[position + 1]
        if kind == 127 or length < 4:
            break
        if kind == 3 and length > 5:
            return data[position + 5] & 0x7F
        # Each structure is followed by its strings, ending in two zero bytes.
        end = data.find(b"\0\0", position + length)
        if end == -1:
            break
        position = end + 2
    return None


def _has_battery() -> bool:
    status = _PowerStatus()
    if not ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(status)):
        return False
    return status.BatteryFlag not in (128, 255)  # no battery, unknown


def _forge_commit() -> str | None:
    """Forge's commit, read from its git folder without running git."""
    from modules.paths_internal import script_path

    git = Path(script_path) / ".git"
    try:
        head = (git / "HEAD").read_text(encoding="utf-8").strip()
        if head.startswith("ref: "):
            ref = head[5:]
            if (git / ref).is_file():
                head = (git / ref).read_text(encoding="utf-8").strip()
            else:
                lines = (git / "packed-refs").read_text(encoding="utf-8").splitlines()
                head = next((line.split()[0] for line in lines if line.endswith(f" {ref}")), "")
    except OSError:
        return None
    return head[:7] if re.fullmatch(r"[0-9a-f]{40}", head) else None


def _versions() -> dict:
    import torch

    build = sys.getwindowsversion().build
    return {
        "forge": _forge_commit(),
        "forgelight": store.version(),
        "python": platform.python_version(),
        "torch": torch.__version__.split("+")[0],
        "cuda": torch.version.cuda,
        "windows": "Windows 11" if build >= 22000 else "Windows 10",
    }


def _computer() -> dict:
    """What doesn't change while Forge runs, read once."""
    if _state["computer"] is None:
        vram = _vram()
        case = _case_type()
        _state["computer"] = {
            "gpu": _gpu_name(),
            "vramTotal": vram[1] if vram else None,
            "ramTotal": _ram()[1],
            "portable": case in PORTABLE_CASES if case is not None else _has_battery(),
            "versions": _versions(),
        }
    return _state["computer"]


def _folder_bytes(folder: Path, extensions: set[str] | None = None) -> int:
    total = 0
    if folder.is_dir():
        for path in folder.rglob("*"):
            if (extensions is None or path.suffix.lower() in extensions) and path.is_file():
                total += path.stat().st_size
    return total


def _storage(images: list[dict]) -> dict:
    from modules import sd_models, shared

    roots = [root for root in library.roots().values() if root.is_dir()]
    drive = (roots[0] if roots else Path.cwd()).drive or "C:"
    disk = shutil.disk_usage(drive + "\\")
    checkpoints = sum(
        Path(info.filename).stat().st_size
        for info in list(sd_models.checkpoints_list.values())
        if Path(info.filename).is_file()
    )
    return {
        "drive": drive,
        "free": disk.free,
        "total": disk.total,
        "images": sum(image["bytes"] for image in images),
        "models": checkpoints + _folder_bytes(Path(shared.cmd_opts.lora_dir), LORA_EXTENSIONS),
        "vault": _folder_bytes(vault.root / "items") if vault.exists() else 0,
    }


def _usage(images: list[dict]) -> dict:
    # Private images count fully only while the vault is unlocked; locked, only their number is known.
    unlocked = private.library_items()
    hidden = private.hidden_count()
    everything = images + unlocked
    midnight = time.mktime(time.localtime()[:3] + (0, 0, 0, 0, 0, -1))
    models: dict[str, int] = {}
    for image in everything:
        if name := library.model_of(image["infotext"]):
            models[name] = models.get(name, 0) + 1
    top = max(models.items(), key=lambda item: item[1], default=None)
    return {
        "total": len(everything) + hidden,
        "today": sum(1 for image in everything if image["mtime"] >= midnight),
        "topModel": {"name": top[0], "count": top[1]} if top else None,
    }


def overview() -> dict:
    """Everything Settings > System shows, apart from the live values."""
    _ensure_sampler()
    images = library.scan()
    return {**_computer(), "storage": _storage(images), "usage": _usage(images)}


def live() -> dict:
    """Memory in use, the card's temperature and load: asked every few seconds while shown."""
    _ensure_sampler()
    vram = _vram()
    ram = _ram()
    return {
        "vram": {"used": vram[0], "total": vram[1]} if vram else None,
        "ram": {"used": ram[0], "total": ram[1]},
        "gpu": _gpu_activity(),
    }


def peak(since: float) -> dict:
    """The most VRAM in use since a moment (seconds since 1970), while Forge was generating."""
    with _lock:
        used = [value for moment, value in _state["samples"] if moment >= since]
    vram = _vram()
    return {"peak": max(used, default=None), "total": vram[1] if vram else None}


def _generating() -> bool:
    from modules.shared import state

    return bool(state.job)


def _sample() -> float:
    """One sample while Forge generates. Returns how long to wait before the next."""
    if not _generating():
        return 0.5
    vram = _vram()
    now = time.time()
    with _lock:
        samples = _state["samples"]
        if vram:
            samples.append((now, vram[0]))
        while samples and samples[0][0] < now - KEEP_SAMPLES:
            samples.pop(0)
    return 0.2


def _sample_forever() -> None:
    while True:
        try:
            # Through the module, so a reload's newer code is used.
            delay = sys.modules[__name__]._sample()
        except Exception:  # noqa: BLE001  (sampling must never stop for good)
            delay = 1.0
        time.sleep(delay)


def _ensure_sampler() -> None:
    thread = _state["sampler"]
    if thread is None or not thread.is_alive():
        thread = threading.Thread(target=_sample_forever, name="forgelight-vram", daemon=True)
        thread.start()
        _state["sampler"] = thread
