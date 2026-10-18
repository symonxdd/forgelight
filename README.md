<img src="assets/forgelight.png" alt="" width="88" height="88">

# Forgelight

A clean, minimal interface for [Stable Diffusion WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge).

Forgelight runs inside Forge as an extension and is reachable at `http://127.0.0.1:7860/forgelight`. Every image is made by Forge itself, exactly as in its classic page, which stays available alongside it.

> **Status:** early, and ready for everyday use.

## Features

- A friendlier face for the [Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) engine
- A Library of all generated images, whether made in Forgelight or in Forge's classic page
- Settings remembered for each checkpoint
- Light, dark and pure black themes
- No telemetry, no tracking

And more.

## Requirements and good to know

### Requirements

- [Stable Diffusion WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge)
- Forge's API switched on

> [!TIP]
> The API is how Forgelight asks Forge for images. The easiest way to switch it on: create Forgelight's desktop shortcut (settings menu → **Desktop shortcut**) and start Forge with it from then on.
>
> Or by hand: open `<Forge installation>\webui\webui-user.bat` in a text editor, change `set COMMANDLINE_ARGS=` to `set COMMANDLINE_ARGS=--api`, save, and start Forge the usual way, for example with `run.bat` in the Forge installation folder.

### Nice to know

- [Civitai](https://civitai.com) has thousands of free checkpoints, LoRAs and more. Checkpoints go in `<Forge installation>\webui\models\Stable-diffusion`, LoRAs in `<Forge installation>\webui\models\Lora`.
- Most checkpoints on Civitai list recommended settings. They make a good starting point.
- A LoRA only works with checkpoints from the model family it was made for: SD 1.5, SDXL or Flux. Pony and Illustrious both belong to the SDXL family, though a LoRA works best with checkpoints of its own kind.
- Settings copied from an image on Civitai can be pasted into the prompt box; click **Apply all**.
- The same seed with the same settings makes the same image again.
- The first image after switching checkpoints is slower while the model loads. An SSD helps.
- 6 GB of graphics memory is enough for SDXL-based models.

## Installation

Forgelight is installed from its `release` branch, which holds the ready-to-run version.

1. **From Forge (easiest):** open **Extensions → Install from URL**, paste `https://github.com/symonxdd/forgelight`, type `release` under **Specific branch name** and click **Install**.
2. **With Git:** inside `<Forge installation>\webui\extensions`, run `git clone -b release https://github.com/symonxdd/forgelight`.
3. **As a ZIP:** on this page, switch the branch menu to **release**, click **Code → Download ZIP** and unzip it into `<Forge installation>\webui\extensions`.

Then restart Forge: close its black console window and start Forge again the usual way. Forgelight is now at `http://127.0.0.1:7860/forgelight`.

## Development

See [docs/architecture.md](docs/architecture.md).
