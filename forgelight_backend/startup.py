"""Startup conveniences: open Forgelight when Forge starts, and a desktop shortcut.

Both only act when the user switches them on in Forgelight's settings.
"""

from __future__ import annotations

import os
import re
import subprocess
import threading
import webbrowser
from pathlib import Path

from . import store
from .store import DATA, ROOT

PREFS_FILE = "preferences.json"
LAUNCHER = DATA / "start-forgelight.bat"
ICON = ROOT / "assets" / "forgelight.ico"
SHORTCUT_NAME = "Forgelight.lnk"


def preferences() -> dict:
    return store.read(PREFS_FILE, {"open_on_start": False, "previous_auto_launch": "Local"})


def _port() -> int:
    from modules.shared_cmd_options import cmd_opts

    return int(cmd_opts.port or 7860)


def forgelight_url(demo=None) -> str:
    base = getattr(demo, "local_url", None) or f"http://127.0.0.1:{_port()}/"
    # Gradio reports 0.0.0.0 when Forge listens on all interfaces; the browser needs a real address.
    return base.replace("0.0.0.0", "127.0.0.1").rstrip("/") + "/forgelight/"


def set_open_on_start(enabled: bool) -> dict:
    """Swaps Forge's own "open browser on startup" for Forgelight's, and back."""
    from modules import shared
    from modules.sysinfo import set_config

    prefs = preferences()
    if enabled and not prefs.get("open_on_start"):
        current = shared.opts.auto_launch_browser
        prefs["previous_auto_launch"] = current if current != "Disable" else prefs.get("previous_auto_launch", "Local")
        set_config({"auto_launch_browser": "Disable"})
    elif not enabled and prefs.get("open_on_start"):
        set_config({"auto_launch_browser": prefs.get("previous_auto_launch", "Local")})
    prefs["open_on_start"] = enabled
    store.write(PREFS_FILE, prefs)
    return prefs


def open_browser_once(demo) -> None:
    """Opens Forgelight after Forge has started, once per Forge run (not on "Reload UI")."""
    from modules import shared

    if not preferences().get("open_on_start") or getattr(shared, "_forgelight_opened", False):
        return
    shared._forgelight_opened = True
    threading.Timer(1.0, webbrowser.open, [forgelight_url(demo)]).start()


def _forge_paths() -> tuple[Path, Path | None]:
    """The webui folder, and the one-click package folder above it when there is one."""
    from modules import paths_internal

    webui = Path(paths_internal.script_path)
    package = webui.parent if (webui.parent / "environment.bat").is_file() else None
    return webui, package


def _user_args(webui: Path) -> str:
    """The user's own launch options from webui-user.bat, plus --api, which Forgelight needs."""
    try:
        text = (webui / "webui-user.bat").read_text(encoding="utf-8", errors="replace")
    except OSError:
        text = ""
    found = re.findall(r"^\s*set\s+COMMANDLINE_ARGS=(.*)$", text, flags=re.IGNORECASE | re.MULTILINE)
    args = found[-1].strip() if found else ""
    args = args.replace("%COMMANDLINE_ARGS%", "").strip()
    return args if re.search(r"(^|\s)--api(\s|$)", args) else f"{args} --api".strip()


def write_launcher() -> Path:
    webui, package = _forge_paths()
    url = f"http://127.0.0.1:{_port()}/forgelight/"
    lines = [
        "@echo off",
        "title Forgelight",
        "rem Created by Forgelight. Starts Forge with its API switched on;",
        "rem Forgelight opens in the browser once Forge is ready.",
        f'curl.exe -s -o NUL -m 2 "{url}api/status" && (start "" "{url}" & exit /b)',
    ]
    if package:
        lines.append(f'call "{package / "environment.bat"}"')
    lines += [f'cd /d "{webui}"', f"set COMMANDLINE_ARGS={_user_args(webui)}", "call webui.bat", ""]
    DATA.mkdir(exist_ok=True)
    LAUNCHER.write_text("\r\n".join(lines), encoding="utf-8")
    return LAUNCHER


def _powershell(script: str, env: dict[str, str]) -> str:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
        env={**os.environ, **env},
        capture_output=True,
        text=True,
        timeout=30,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "PowerShell failed")
    return result.stdout.strip()


def desktop_shortcut_path() -> Path | None:
    if os.name != "nt":
        return None
    desktop = _powershell("[Environment]::GetFolderPath('Desktop')", {})
    return Path(desktop) / SHORTCUT_NAME if desktop else None


def create_desktop_shortcut() -> Path:
    """Writes the launcher and a desktop shortcut to it. Also turns on opening Forgelight at start."""
    if os.name != "nt":
        raise RuntimeError("Desktop shortcuts are only supported on Windows.")
    launcher = write_launcher()
    webui, _ = _forge_paths()
    script = (
        "$shell = New-Object -ComObject WScript.Shell;"
        "$path = Join-Path ([Environment]::GetFolderPath('Desktop')) $env:FL_NAME;"
        "$link = $shell.CreateShortcut($path);"
        "$link.TargetPath = $env:FL_TARGET;"
        "$link.WorkingDirectory = $env:FL_WORKDIR;"
        "$link.Description = 'Start Forge and open Forgelight';"
        "if ($env:FL_ICON) { $link.IconLocation = $env:FL_ICON };"
        "$link.Save();"
        "Write-Output $path"
    )
    env = {
        "FL_NAME": SHORTCUT_NAME,
        "FL_TARGET": str(launcher),
        "FL_WORKDIR": str(webui),
        "FL_ICON": str(ICON) if ICON.is_file() else "",
    }
    path = Path(_powershell(script, env))
    set_open_on_start(True)
    return path
