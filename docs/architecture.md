# Architecture

## Overview

Forgelight has two parts in one repository. The repository root is a Forge extension, so Forge can install it from a URL.

| Part | Folder | Role |
|---|---|---|
| Interface | `web/` (source), `page/` (built) | React + TypeScript single-page app. Everything the user sees. |
| Extension | `scripts/` | Python, loaded by Forge at startup. Serves `page/` at `/forgelight` and adds a few endpoints under `/forgelight/api/`. |

```
Chrome  →  127.0.0.1:7860/forgelight      the interface, served by the extension
           ├─ /sdapi/v1/...                Forge's own API: generate, progress, models, settings
           ├─ /internal/progress           Forge's progress + live preview endpoint
           └─ /forgelight/api/...          the extension: status, history, image files, thumbnails, loading
                         ↓
              Forge generates exactly as from its classic page
```

The interface and Forge share one address, so the browser allows the interface to call Forge's API without any CORS configuration, and Forge stays reachable from this computer only.

## Rules the design follows

- **Generation is Forge's job.** The interface only sends requests to Forge's official API. The extension never touches models, samplers, precision or memory management.
- **Explicit requests.** Every generation request lists its settings explicitly. Forge's `infotext` shortcut crashes in original Forge and is not used.
- **Almost no outside network.** Fonts and assets are bundled, and there is no telemetry. The interface talks to `127.0.0.1` only. The extension has two outside destinations: Civitai's API, which it asks once per model for its name, base model and trigger words, sending only a file fingerprint (or, as a last resort, the file name); and GitHub, for updates (below).
- **Reading Forge, never changing it.** Forge reports no progress while it loads a checkpoint. The extension's `loading` endpoint looks at the call stack of Forge's generating thread to name the current step, and while the file is read, counts the tensors already in memory against the file's header. It wraps or patches nothing.
- **Light on the graphics card.** Chrome uses the graphics card to draw pages, and Forge uses the same card, with its limited memory, to make images. Flashy visual effects in the interface would take some of that memory away from Forge, so Forgelight keeps its visuals simple and its image grids use small thumbnails.

## Updates

`forgelight_backend/updates.py`. Nothing is downloaded or installed unless the user clicks **Update**.

- **Check:** with **Check daily** on (Settings, Updates), the extension reads the list of releases from `api.github.com` at most once a day while the page is open; **Check now** on the Updates and About pages checks at once. Only version numbers, dates, notes and download sizes are read. A newer release shows a dot on the settings icon and a line in the gear menu; **Skip this version** hides it until a newer one appears.
- **Update:** depends on how Forgelight was installed. A git install (the `release` branch) fetches that branch and resets to it, exactly as Forge's Extensions tab does. A ZIP install downloads the release's ZIP, checks its size and SHA256 checksum against GitHub's listing, unpacks it and swaps the files, putting the old ones back if anything fails. A developer copy (the repository, with `web/`) never updates itself.
- **Addresses:** `api.github.com`, `github.com`, and GitHub's file servers `release-assets.githubusercontent.com` and `objects.githubusercontent.com`, where release downloads are forwarded. Forwards are followed by hand and any other address is refused. Requests carry a generic User-Agent and nothing else.
- **After an update:** `data/` is never touched. The extension's code reloads on the next request, so a page reload finishes the update, unless the update changed `scripts/forgelight.py` or `reloader.py`, which Forge reads only at startup; the dialog then asks for a Forge restart.

## Interface stack

| Concern | Choice | Why |
|---|---|---|
| Framework | React + TypeScript (strict) | Mature ecosystem for the hard parts: accessible controls, resizable panels, virtualized grids |
| Build | Vite | Fast builds; its dev server forwards API calls to Forge, so development needs no CORS either |
| Styling | Tailwind CSS with CSS variables | One set of color tokens per theme keeps light and dark consistent |
| Controls | Radix UI primitives | Keyboard, focus and screen-reader behavior for menus, sliders and dialogs, with no built-in look |
| Layout | react-resizable-panels | Draggable, collapsible panels |
| Server data | TanStack Query | Caching and refreshing data from Forge |
| UI state | Zustand | Small store for settings and view state |
| Fonts | Fontsource packages | Bundled locally; no requests to font services |
| API types | openapi-typescript | Types generated from Forge's `/openapi.json` |

## Development

- `web/` has its own `package.json`. `npm run dev` starts Vite at `http://localhost:5173`, forwarding `/sdapi`, `/internal` and `/forgelight/api` to Forge at `127.0.0.1:7860`.
- `npm run build` writes the finished interface to `page/` at the repository root, which the extension serves. `page/` is not tracked on `main`: each commit there is source only.
- Releases: see [releasing.md](releasing.md). Pushes to `main` only run the checks; a version tag builds and publishes.
- Forge must be started with `--api`.
