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
           └─ /forgelight/api/...          the extension: status, history, image files, thumbnails
                         ↓
              Forge generates exactly as from its classic page
```

The interface and Forge share one address, so the browser allows the interface to call Forge's API without any CORS configuration, and Forge stays reachable from this computer only.

## Rules the design follows

- **Generation is Forge's job.** The interface only sends requests to Forge's official API. The extension never touches models, samplers, precision or memory management.
- **Explicit requests.** Every generation request lists its settings explicitly. Forge's `infotext` shortcut crashes in original Forge and is not used.
- **No outside network.** Fonts and assets are bundled. The interface talks to `127.0.0.1` only.
- **Light on the GPU.** No WebGL or heavy effects. The laptop's 6 GB of VRAM belongs to Forge.

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
- `npm run build` writes the finished interface to `page/` at the repository root, which the extension serves.
- Forge must be started with `--api`.
