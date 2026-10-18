"""Starting and stopping Forge: open Forgelight on start, the desktop shortcut, Stop Forge.

Each acts only when the user switches it on or clicks it in Forgelight's settings.
"""

from __future__ import annotations

import functools
import os
import re
import subprocess
import threading
import time
import webbrowser
from pathlib import Path

from . import store
from .store import DATA, ROOT, version

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


# Kept across live reloads (reloading reuses this module's globals), so changes stay serialized.
_open_on_start_lock = globals().get("_open_on_start_lock") or threading.Lock()


def set_open_on_start(enabled: bool) -> dict:
    """Swaps Forge's own "open browser on startup" for Forgelight's, and back.

    One change at a time: quick repeated clicks arrive as separate requests, and
    interleaving them could leave Forgelight's switch and Forge's setting disagreeing."""
    from modules import shared
    from modules.sysinfo import set_config

    with _open_on_start_lock:
        prefs = preferences()
        if enabled and not prefs.get("open_on_start"):
            current = shared.opts.auto_launch_browser
            prefs["previous_auto_launch"] = (
                current if current != "Disable" else prefs.get("previous_auto_launch", "Local")
            )
            set_config({"auto_launch_browser": "Disable"})
        elif not enabled and prefs.get("open_on_start"):
            set_config({"auto_launch_browser": prefs.get("previous_auto_launch", "Local")})
        prefs["open_on_start"] = enabled
        store.write(PREFS_FILE, prefs)
        return prefs


LAUNCH_ENV = "FORGELIGHT_LAUNCH"


def started_from_shortcut() -> bool:
    return os.environ.get(LAUNCH_ENV) == "1"


def redirect_forge_browser_launch() -> None:
    """For a Forge run started by the Forgelight shortcut only: when Forge opens its
    classic page in the browser at startup, open Forgelight instead. No setting changes.
    Must run before Forge launches its web server, so it is called when the script loads."""
    if not started_from_shortcut() or getattr(webbrowser.open, "_forgelight", False):
        return
    original = webbrowser.open

    def open_forgelight(url, *args, **kwargs):
        if re.fullmatch(r"https?://[^/]+/?", str(url)):
            url = str(url).rstrip("/") + "/forgelight/"
        return original(url, *args, **kwargs)

    open_forgelight._forgelight = True
    webbrowser.open = open_forgelight


def announce_ready(demo) -> None:
    """Prints Forgelight's address once Forge is up, once per Forge run.

    Waits a moment so the line lands after Forge's own "Startup time" summary."""
    from modules import shared

    if getattr(shared, "_forgelight_announced", False):
        return
    shared._forgelight_announced = True
    threading.Timer(1.0, print, [f"\nForgelight is ready: {forgelight_url(demo)}\n"]).start()


def open_browser_once(demo) -> None:
    """Opens Forgelight after Forge has started, once per Forge run (not on "Reload UI").

    Happens when "Open Forgelight on start" is on, or when the shortcut started Forge
    while Forge's own browser opening is switched off (otherwise Forge opens it)."""
    from modules import shared

    # The loader calls only this once Forge is up, so the ready line starts here too.
    announce_ready(demo)
    if getattr(shared, "_forgelight_opened", False):
        return
    forge_opens_browser = shared.opts.auto_launch_browser != "Disable"
    wanted = preferences().get("open_on_start") or (started_from_shortcut() and not forge_opens_browser)
    if not wanted:
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


ESC = "\x1b"
VIOLET = (139, 92, 246)
INDIGO = (99, 102, 241)


def _gradient(text: str, start: tuple[int, ...], end: tuple[int, ...]) -> str:
    """Bold text colored letter by letter from one color to another (24-bit console colors)."""
    steps = max(len(text) - 1, 1)
    letters = []
    for i, letter in enumerate(text):
        r, g, b = (round(a + (z - a) * i / steps) for a, z in zip(start, end))
        letters.append(f"{ESC}[38;2;{r};{g};{b}m{letter}")
    return f"{ESC}[1m{''.join(letters)}{ESC}[0m"


def _banner() -> list[str]:
    """Lines that greet the user in the shortcut's window before Forge prints anything."""
    gray, reset = f"{ESC}[90m", f"{ESC}[0m"
    keep_open = "Keep this window open while using Forgelight; closing it stops Forge."
    lines = [
        "",
        f"{_gradient('Forgelight', VIOLET, INDIGO)} {version()}",
        f"{gray}Started from the Forgelight desktop shortcut.{reset}",
        "",
        "Starting Forge. A cold start takes about a minute.",
        "Forgelight opens in the browser by itself when Forge is ready.",
        keep_open,
        # A solid line in the console's line-drawing characters ("q" draws a horizontal stroke).
        f"{gray}{ESC}(0{'q' * len(keep_open)}{ESC}(B{reset}",
        "",
    ]
    return [f"echo   {line}" if line else "echo." for line in lines]


def _launcher_text() -> str:
    webui, package = _forge_paths()
    url = f"http://127.0.0.1:{_port()}/forgelight/"
    lines = [
        "@echo off",
        "title Forgelight",
        "rem Created by Forgelight. Starts Forge with its API switched on;",
        "rem Forgelight opens in the browser once Forge is ready.",
        f'curl.exe -s -o NUL -m 2 "{url}api/status" && (start "" "{url}" & exit /b)',
        *_banner(),
    ]
    if package:
        lines.append(f'call "{package / "environment.bat"}"')
    lines += [
        f'cd /d "{webui}"',
        f"set COMMANDLINE_ARGS={_user_args(webui)}",
        f"set {LAUNCH_ENV}=1",
        "rem Forge's closing pause gets no input, so the window closes when Forgelight",
        "rem stops Forge (exit code 0). After errors or Ctrl+C it stays open to read.",
        "call webui.bat < nul",
        "if %errorlevel% neq 0 (echo. & echo Forge stopped. Press any key to close this window. & pause >nul)",
        "",
    ]
    return "\r\n".join(lines)


def write_launcher() -> Path:
    DATA.mkdir(exist_ok=True)
    LAUNCHER.write_bytes(_launcher_text().encode("utf-8"))
    return LAUNCHER


def refresh_launcher() -> None:
    """Brings an existing launcher up to date (banner, version, launch options).

    The desktop shortcut only points at this file, so it picks up the changes without
    being recreated. Writes nothing unless the user created the shortcut before."""
    if LAUNCHER.is_file() and LAUNCHER.read_bytes() != _launcher_text().encode("utf-8"):
        write_launcher()


def stop_forge() -> None:
    """Ends Forge the way its own /sdapi/v1/server-kill route does (that route needs a launch
    option). A running generation is canceled first and given time to wind down, and the
    reply reaches the page before Forge exits. Exit code 0 lets the launcher close its window."""
    from modules import restart, shared

    def stop():
        shared.state.interrupt()
        deadline = time.monotonic() + 15
        while shared.state.job_count != 0 and time.monotonic() < deadline:
            time.sleep(0.1)
        print("\n[Forgelight] Stopping Forge, as asked from the Forgelight page.")
        restart.stop_program()

    threading.Timer(0.5, stop).start()


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


@functools.lru_cache(maxsize=1)
def _desktop_folder() -> str:
    # Asked once per run: starting PowerShell takes a noticeable moment.
    return _powershell("[Environment]::GetFolderPath('Desktop')", {})


def desktop_shortcut_path() -> Path | None:
    if os.name != "nt":
        return None
    desktop = _desktop_folder()
    return Path(desktop) / SHORTCUT_NAME if desktop else None


def create_desktop_shortcut() -> Path:
    """Writes the launcher and a desktop shortcut to it. Changes no settings."""
    if os.name != "nt":
        raise RuntimeError("Desktop shortcuts are only supported on Windows.")
    launcher = write_launcher()
    webui, _ = _forge_paths()
    script = (
        "$shell = New-Object -ComObject WScript.Shell;"
        "$path = Join-Path ([Environment]::GetFolderPath('Desktop')) $env:FL_NAME;"
        "$link = $shell.CreateShortcut($path);"
        # cmd.exe runs the launcher itself, so the shortcut works even where another
        # program (such as a text editor) has taken over double-clicking .bat files.
        "$link.TargetPath = $env:ComSpec;"
        "$link.Arguments = '/c \"' + $env:FL_TARGET + '\"';"
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
    return Path(_powershell(script, env))


# Runs when Forge starts (and on live reloads), keeping the shortcut's launcher current.
try:
    refresh_launcher()
except (ImportError, OSError):
    pass  # Outside Forge, or the file is locked: the existing launcher still works.
