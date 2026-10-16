"""Forgelight: serves the built interface at /forgelight inside Forge.

Read-only by design. It serves files from this extension's page/ folder and
reports status; it never generates images or touches models, samplers,
precision or memory management. Image generation goes through Forge's own
/sdapi/v1 API, called by the interface.
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse

from modules import script_callbacks

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "page"
BASE = "/forgelight"

NOT_BUILT = """<!doctype html><meta charset="utf-8"><title>Forgelight</title>
<body style="font:16px system-ui,sans-serif;max-width:36rem;margin:15vh auto;padding:0 20px">
<h1 style="font-size:1.4rem">Forgelight isn't built yet</h1>
<p>The interface files are missing from this extension's <code>page</code> folder.
Run <code>npm run build</code> in its <code>web</code> folder, then reload this page.</p>
</body>"""


def _version() -> str:
    try:
        return json.loads((ROOT / "web" / "package.json").read_text(encoding="utf-8"))["version"]
    except (OSError, ValueError, KeyError):
        return "unknown"


def _page_file(relative: str) -> Path:
    """Resolves a file inside page/, refusing anything that escapes it."""
    target = (PAGE / relative).resolve()
    if not target.is_relative_to(PAGE.resolve()) or not target.is_file():
        raise HTTPException(status_code=404)
    return target


def on_app_started(_demo, app: FastAPI) -> None:
    @app.get(BASE, include_in_schema=False)
    def forgelight_redirect():
        return RedirectResponse(f"{BASE}/")

    @app.get(f"{BASE}/", include_in_schema=False)
    def forgelight_index():
        index = PAGE / "index.html"
        if not index.is_file():
            return HTMLResponse(NOT_BUILT, status_code=503)
        return FileResponse(index, headers={"Cache-Control": "no-cache"})

    @app.get(f"{BASE}/api/status")
    def forgelight_status():
        from modules.shared_cmd_options import cmd_opts

        return {
            "name": "forgelight",
            "version": _version(),
            "built": (PAGE / "index.html").is_file(),
            "api_enabled": bool(cmd_opts.api),
        }

    @app.get(f"{BASE}/{{path:path}}", include_in_schema=False)
    def forgelight_file(path: str):
        file = _page_file(path)
        # Built assets carry a content hash in their name, so they can be cached for good.
        immutable = file.parent.name == "assets"
        headers = {"Cache-Control": "public, max-age=31536000, immutable" if immutable else "no-cache"}
        return FileResponse(file, headers=headers)


script_callbacks.on_app_started(on_app_started)
