"""Update notices and updates, from Forgelight's releases on GitHub.

Nothing is downloaded or installed on its own. The daily check, when switched on,
only reads the list of releases (version numbers, notes, download sizes) from
api.github.com. The new version is downloaded and installed only when the user
clicks Update, from github.com, which forwards ZIP downloads to GitHub's file
servers. Requests carry a generic User-Agent and nothing about the user, their
settings, prompts or images. Any other address, even one GitHub forwards to, is
refused.

How an update is installed depends on how Forgelight was installed:
- git (Forge's "Install from URL" or git clone of the release branch): fetches the
  release branch and resets to it, exactly as Forge's own Extensions tab does;
- ZIP: downloads the release's ZIP, checks its size and SHA256 checksum, unpacks
  it, then swaps the files, putting the old ones back if anything goes wrong;
- developer copy (the repository with its source): never updated here.
Either way the data/ folder (favorites, preferences, caches) is left alone.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
import threading
import time
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urljoin, urlparse

import requests

from . import store
from .store import DATA, ROOT, built_version, source_version, version_in

REPOSITORY = "symonxdd/forgelight"
BRANCH = "release"
RELEASES_API = f"https://api.github.com/repos/{REPOSITORY}/releases"
ALLOWED_HOSTS = {"api.github.com", "github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"}
USER_AGENT = "Forgelight (Forge extension)"
TIMEOUT = 15
STATE_FILE = "updates.json"
CHECK_EVERY = 24 * 3600
RETRY_ERRORS_AFTER = 6 * 3600
MAX_ZIP_BYTES = 50 * 1024 * 1024
STAGING = DATA / "update"
# Everything a release consists of; nothing else in the extension folder is ever touched.
MANAGED = ("scripts", "forgelight_backend", "page", "assets", "README.md", "CHANGELOG.md", "LICENSE", ".gitignore")
# Forge reads these only when it starts, so a change to them needs a Forge restart.
RESTART_FILES = ("scripts/forgelight.py", "forgelight_backend/reloader.py")

# Kept across live reloads (reloading reuses this module's globals).
_state_lock = globals().get("_state_lock") or threading.Lock()
_check_lock = globals().get("_check_lock") or threading.Lock()
_install_lock = globals().get("_install_lock") or threading.Lock()


class UpdateError(Exception):
    """A failed check or update, with a message for the user and an HTTP status."""

    def __init__(self, message: str, status: int = 500) -> None:
        super().__init__(message)
        self.status = status


class _Stranded(Exception):
    """The swap failed halfway and the old files could not be put back."""


def parse_version(text: str | None) -> tuple[int, int, int] | None:
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", (text or "").strip())
    return (int(match[1]), int(match[2]), int(match[3])) if match else None


def is_newer(candidate: str, installed: str | None) -> bool:
    new, old = parse_version(candidate), parse_version(installed)
    return new is not None and (old is None or new > old)


def install_kind() -> str:
    """How this copy was installed: "git", "zip" or "developer" (the repository with its source)."""
    if (ROOT / "web").is_dir():
        return "developer"
    git_dir = ROOT / ".git"
    if git_dir.is_dir():
        try:
            head = (git_dir / "HEAD").read_text(encoding="utf-8").strip()
        except OSError:
            return "developer"
        return "git" if head == f"ref: refs/heads/{BRANCH}" else "developer"
    return "developer" if git_dir.exists() else "zip"


def _installed(kind: str) -> str | None:
    return source_version() if kind == "developer" else built_version()


def _saved() -> dict:
    saved = store.read(STATE_FILE, {})
    defaults = {"auto": True, "checkedAt": None, "failedAt": None, "error": None, "skipped": None, "releases": []}
    return {**defaults, **(saved if isinstance(saved, dict) else {})}


def _change(**fields: Any) -> dict:
    with _state_lock:
        saved = {**_saved(), **fields}
        store.write(STATE_FILE, saved)
        return saved


def _due(saved: dict, now: float) -> bool:
    if saved["failedAt"] and now - saved["failedAt"] < RETRY_ERRORS_AFTER:
        return False
    return not saved["checkedAt"] or now - saved["checkedAt"] >= CHECK_EVERY


def state(check_if_due: bool = False) -> dict:
    """What the interface shows. Starts the daily check in the background when it is due."""
    kind = install_kind()
    saved = _saved()
    if check_if_due and kind != "developer" and saved["auto"] and _due(saved, time.time()):
        _start_check()
    installed = _installed(kind)
    newer = [
        {key: release.get(key) for key in ("version", "date", "notes", "url")}
        for release in saved["releases"]
        if isinstance(release, dict) and is_newer(release.get("version", ""), installed)
    ]
    failed_last = bool(saved["failedAt"]) and saved["failedAt"] > (saved["checkedAt"] or 0)
    return {
        "kind": kind,
        "installed": installed,
        "built": built_version(),
        "auto": bool(saved["auto"]),
        "checking": _check_lock.locked(),
        "checkedAt": saved["checkedAt"],
        "error": saved["error"] if failed_last else None,
        "skipped": saved["skipped"],
        "releases": newer,
    }


def set_auto(enabled: bool) -> dict:
    _change(auto=enabled)
    return state()


def skip(version: str | None) -> dict:
    """Hides the notice for this version until a newer one appears; None shows it again."""
    _change(skipped=version)
    return state()


def _get(url: str, *, accept: str = "*/*", stream: bool = False, **kwargs: Any) -> requests.Response:
    """GET that follows GitHub's forwards by hand, refusing any address outside the closed list."""
    for _ in range(5):
        parts = urlparse(url)
        if parts.scheme != "https" or parts.hostname not in ALLOWED_HOSTS:
            raise UpdateError("GitHub forwarded the request to an unexpected address, so it was stopped.")
        response = requests.get(
            url,
            headers={"User-Agent": USER_AGENT, "Accept": accept},
            timeout=TIMEOUT,
            stream=stream,
            allow_redirects=False,
            **kwargs,
        )
        if response.is_redirect:
            url = urljoin(url, response.headers["location"])
            kwargs.pop("params", None)
            response.close()
            continue
        response.raise_for_status()
        return response
    raise UpdateError("GitHub forwarded the request too many times, so it was stopped.")


def _release(item: Any) -> dict | None:
    if not isinstance(item, dict) or item.get("draft") or item.get("prerelease"):
        return None
    version = str(item.get("tag_name", "")).removeprefix("v")
    if not parse_version(version):
        return None
    assets = item.get("assets") or []
    asset = next((a for a in assets if isinstance(a, dict) and a.get("name") == f"forgelight-{version}.zip"), None)
    digest = str((asset or {}).get("digest") or "")
    return {
        "version": version,
        "date": str(item.get("published_at") or "")[:10] or None,
        "notes": str(item.get("body") or "")[:20_000],
        "url": item.get("html_url"),
        "zip": asset
        and {
            "url": asset.get("browser_download_url"),
            "size": asset.get("size"),
            "sha256": digest.removeprefix("sha256:") if digest.startswith("sha256:") else None,
        },
    }


def _fetch_releases() -> list[dict]:
    response = _get(RELEASES_API, accept="application/vnd.github+json", params={"per_page": 30})
    items = response.json()
    if not isinstance(items, list):
        raise ValueError("GitHub sent an unexpected reply.")
    releases = [found for found in map(_release, items) if found]
    return sorted(releases, key=lambda r: parse_version(r["version"]), reverse=True)


def _friendly(error: Exception) -> str:
    if isinstance(error, UpdateError):
        return str(error)
    status = getattr(getattr(error, "response", None), "status_code", None)
    if status in (403, 429):
        return "GitHub asked to wait a while before checking again."
    if isinstance(error, requests.RequestException):
        return "GitHub couldn't be reached. Check the internet connection and try again."
    return "GitHub sent an unexpected reply."


def check() -> None:
    """Reads the list of releases from GitHub. Only one check runs at a time."""
    if not _check_lock.acquire(blocking=False):
        with _check_lock:  # Another check is running: wait for its answer instead.
            return
    try:
        try:
            releases = _fetch_releases()
        except (requests.RequestException, ValueError, UpdateError) as error:
            _change(failedAt=int(time.time()), error=_friendly(error))
            return
        _change(releases=releases, checkedAt=int(time.time()), failedAt=None, error=None)
    finally:
        _check_lock.release()


def _start_check() -> None:
    if not _check_lock.locked():
        threading.Thread(target=check, name="forgelight-updates", daemon=True).start()


def check_now() -> dict:
    """The "Check now" button: checks right away, whatever the daily switch says."""
    if install_kind() == "developer":
        raise UpdateError("A developer copy runs from the project folder and is never updated from here.", 409)
    check()
    return state()


def _generating() -> bool:
    # Forge has this loaded; looking it up instead of importing never starts Forge's machinery.
    shared = sys.modules.get("modules.shared")
    return bool(shared and shared.state.job_count)


def _restart_files() -> list[str | None]:
    digests = []
    for name in RESTART_FILES:
        try:
            digests.append(hashlib.sha256((ROOT / name).read_bytes()).hexdigest())
        except OSError:
            digests.append(None)
    return digests


def _is_github(url: str) -> bool:
    if url.startswith("git@github.com:"):
        return True
    return urlparse(url).hostname == "github.com"


def _install_git(version: str) -> None:
    """The same steps as Forge's Extensions tab: fetch the release branch and reset to it."""
    from git import GitCommandError  # GitPython, which Forge ships and uses for its own updates
    from modules.gitpython_hack import Repo

    try:
        repo = Repo(ROOT)
        remote = repo.remote()
        if not any(_is_github(url) for url in remote.urls):
            raise UpdateError("This copy wasn't installed from GitHub, so it can't be updated from here.")
        repo.git.fetch(remote.name, BRANCH)
        target = f"{remote.name}/{BRANCH}"
        fetched = json.loads(repo.git.show(f"{target}:page/version.json")).get("version")
        if (parse_version(fetched) or (0, 0, 0)) < (parse_version(version) or (0, 0, 0)):
            raise UpdateError(f"GitHub's release branch doesn't hold {version} yet. Try again in a few minutes.")
        repo.git.reset(target, hard=True)
    except GitCommandError as error:
        detail = (error.stderr or "").strip() or str(error)
        raise UpdateError(f"Git couldn't update Forgelight: {detail}") from error
    except (ValueError, OSError) as error:
        raise UpdateError(f"Git couldn't update Forgelight: {error}") from error


def _download(zip_info: dict, target: Path) -> None:
    expected_size = zip_info.get("size")
    digest = hashlib.sha256()
    size = 0
    with _get(str(zip_info.get("url")), stream=True) as response, open(target, "wb") as file:
        for chunk in response.iter_content(64 * 1024):
            size += len(chunk)
            if size > MAX_ZIP_BYTES:
                raise UpdateError("The download is much larger than a Forgelight release, so it was stopped.")
            digest.update(chunk)
            file.write(chunk)
    if size != expected_size:
        raise UpdateError("The download is incomplete. Nothing was changed; try again.")
    if zip_info.get("sha256") and digest.hexdigest() != zip_info["sha256"]:
        raise UpdateError("The download doesn't match GitHub's checksum. Nothing was changed; try again.")


def _unpack(archive: Path, folder: Path, version: str) -> Path:
    unexpected = UpdateError("The download has unexpected contents. Nothing was changed.")
    try:
        with zipfile.ZipFile(archive) as bundle:
            for name in bundle.namelist():
                parts = PurePosixPath(name).parts
                if not parts or parts[0] != "forgelight" or ".." in parts or name.startswith("/") or ":" in name:
                    raise unexpected
            bundle.extractall(folder)
    except zipfile.BadZipFile as error:
        raise UpdateError("The download is damaged. Nothing was changed; try again.") from error
    copy = folder / "forgelight"
    for required in ("scripts/forgelight.py", "forgelight_backend/api.py", "page/index.html"):
        if not (copy / required).is_file():
            raise unexpected
    if version_in(copy / "page" / "version.json") != version:
        raise unexpected
    return copy


def _move(source: Path, target: Path) -> None:
    # Windows refuses to move a file while a request is reading it; that takes a moment at most.
    for attempt in range(40):
        try:
            source.replace(target)
            return
        except PermissionError:
            if attempt == 39:
                raise
            time.sleep(0.05)


def _swap(copy: Path, backup: Path) -> None:
    """Moves the old files aside and the new ones in. On any failure, puts the old ones back."""
    backup.mkdir()
    moved_out: list[str] = []
    moved_in: list[str] = []
    try:
        for name in MANAGED:
            if (ROOT / name).exists():
                _move(ROOT / name, backup / name)
                moved_out.append(name)
        for name in MANAGED:
            if (copy / name).exists():
                _move(copy / name, ROOT / name)
                moved_in.append(name)
    except OSError as error:
        try:
            for name in moved_in:
                _move(ROOT / name, copy / name)
            for name in moved_out:
                _move(backup / name, ROOT / name)
        except OSError:
            raise _Stranded() from error
        reason = error.strerror or str(error)
        raise UpdateError(f"Windows didn't allow replacing Forgelight's files ({reason}). Nothing was changed.") from error


def _install_zip(release: dict) -> None:
    zip_info = release.get("zip")
    if not zip_info or not zip_info.get("url"):
        raise UpdateError("This release has no ZIP download. Download it from its release page instead.")
    shutil.rmtree(STAGING, ignore_errors=True)
    STAGING.mkdir(parents=True)
    keep = False
    try:
        archive = STAGING / "forgelight.zip"
        _download(zip_info, archive)
        copy = _unpack(archive, STAGING / "new", release["version"])
        _swap(copy, STAGING / "previous")
    except _Stranded as error:
        keep = True
        raise UpdateError(
            "The update stopped halfway and the old files couldn't be put back; they are in "
            "data\\update\\previous. The ZIP from the release page restores Forgelight."
        ) from error
    except requests.RequestException as error:
        raise UpdateError(_friendly(error)) from error
    finally:
        if not keep:
            shutil.rmtree(STAGING, ignore_errors=True)


def install(version: str) -> dict:
    """Downloads and installs a newer version. Only ever called when the user clicks Update."""
    kind = install_kind()
    if kind == "developer":
        raise UpdateError("A developer copy runs from the project folder and is never updated from here.", 409)
    if _generating():
        raise UpdateError("An image is being made. Update once it is done.", 409)
    release = next((r for r in _saved()["releases"] if isinstance(r, dict) and r.get("version") == version), None)
    if not release or not is_newer(version, built_version()):
        raise UpdateError("That version isn't available. Check for updates again.", 409)
    if not _install_lock.acquire(blocking=False):
        raise UpdateError("An update is already being installed.", 409)
    try:
        before = _restart_files()
        if kind == "git":
            _install_git(version)
        else:
            _install_zip(release)
        print(f"[Forgelight] Updated to {built_version()}, as asked from the Forgelight page.")
        return {"version": built_version(), "restartNeeded": _restart_files() != before}
    finally:
        _install_lock.release()
