"""Guards for Forgelight's endpoints that change something.

Forge listens on 127.0.0.1, but any website open in the browser can still send
requests there. Browsers always label such requests with their Origin, so
requests from another origin are refused, and changes must be sent as JSON,
which browsers cannot send cross-site without permission.
"""

from __future__ import annotations

from urllib.parse import urlparse

from fastapi import HTTPException, Request


def require_own_page(request: Request) -> None:
    """For reads of private data such as images: other websites may not even embed them.

    Browsers mark every request with Sec-Fetch-Site; typing the address in counts as "none".
    """
    site = request.headers.get("sec-fetch-site")
    if site and site not in ("same-origin", "none"):
        raise HTTPException(status_code=403, detail="Requests must come from the Forgelight page.")


def require_same_origin(request: Request) -> None:
    source = request.headers.get("origin") or request.headers.get("referer")
    if source and urlparse(source).netloc != request.headers.get("host"):
        raise HTTPException(status_code=403, detail="Requests must come from the Forgelight page.")
    if not request.headers.get("content-type", "").startswith("application/json"):
        raise HTTPException(status_code=415, detail="Send JSON.")
