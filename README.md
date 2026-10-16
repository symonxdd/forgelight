<img src="assets/forgelight.png" alt="" width="88" height="88">

# Forgelight

A clean, minimal interface for [Stable Diffusion WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge), built around a large image viewer.

Forgelight runs inside Forge as an extension and opens at `http://127.0.0.1:7860/forgelight`. It generates every image through Forge's own API, so results, speed and memory use are the same as in the classic page, which stays available alongside it.

> **Status:** early development. Not ready for everyday use yet.

## Goals

- A large image viewer with live preview, zoom, fullscreen and quick browsing.
- The settings you actually use up front, everything else folded away.
- Your full image history, with "use these settings again".
- Light and dark themes and a choice of clean sans-serif fonts.
- Nothing leaves your computer: no internet requests, no telemetry.

## Requirements

- Original Stable Diffusion WebUI Forge, started with the `--api` flag.

## Installation

Not yet available. Once released, it will be installable from Forge's **Extensions → Install from URL** tab.

## Development

See [docs/architecture.md](docs/architecture.md).
