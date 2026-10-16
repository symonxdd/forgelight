"""Forgelight: serves the built interface at /forgelight inside Forge.

It never generates images or touches models, samplers, precision or memory
management; image generation goes through Forge's own /sdapi/v1 API, called by
the interface. This entry script stays small and stable: it serves the page
files and forwards /forgelight/api/ requests to forgelight_backend, which
reloads itself when changed, so updating it needs no Forge restart.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from starlette.concurrency import run_in_threadpool

from modules import script_callbacks

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "page"
BASE = "/forgelight"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import forgelight_backend.api  # noqa: E402,F401  (loads the whole backend)
from forgelight_backend import reloader, startup  # noqa: E402

# Scripts load before Forge starts its web server, in time to catch its browser opening.
startup.redirect_forge_browser_launch()

NOT_BUILT = """<!doctype html><meta charset="utf-8"><title>Forgelight</title>
<body style="font:16px system-ui,sans-serif;max-width:36rem;margin:15vh auto;padding:0 20px">
<h1 style="font-size:1.4rem">Forgelight isn't built yet</h1>
<p>The interface files are missing from this extension's <code>page</code> folder.
Run <code>npm run build</code> in its <code>web</code> folder, then reload this page.</p>
</body>"""


def _page_file(relative: str) -> Path:
    """Resolves a file inside page/, refusing anything that escapes it."""
    target = (PAGE / relative).resolve()
    if not target.is_relative_to(PAGE.resolve()) or not target.is_file():
        raise HTTPException(status_code=404)
    return target


def on_app_started(demo, app: FastAPI) -> None:
    @app.get(BASE, include_in_schema=False)
    def forgelight_redirect():
        return RedirectResponse(f"{BASE}/")

    @app.get(f"{BASE}/", include_in_schema=False)
    def forgelight_index():
        index = PAGE / "index.html"
        if not index.is_file():
            return HTMLResponse(NOT_BUILT, status_code=503)
        return FileResponse(index, headers={"Cache-Control": "no-cache"})

    @app.api_route(f"{BASE}/api/{{path:path}}", methods=["GET", "POST"])
    async def forgelight_api(path: str, request: Request):
        body = None
        if request.method == "POST":
            try:
                body = json.loads(await request.body() or b"{}")
            except ValueError as error:
                raise HTTPException(status_code=400, detail="Send JSON.") from error
        reloader.maybe_reload()
        api = sys.modules["forgelight_backend.api"]
        return await run_in_threadpool(api.handle, request.method, path, request, body)

    @app.get(f"{BASE}/{{path:path}}", include_in_schema=False)
    def forgelight_file(path: str):
        file = _page_file(path)
        # Built assets carry a content hash in their name, so they can be cached for good.
        immutable = file.parent.name == "assets"
        headers = {"Cache-Control": "public, max-age=31536000, immutable" if immutable else "no-cache"}
        return FileResponse(file, headers=headers)

    startup.open_browser_once(demo)


script_callbacks.on_app_started(on_app_started)
