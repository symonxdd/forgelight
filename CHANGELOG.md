# Changelog

## Unreleased

### 🌱 New

- **Existing images can now be enhanced or upscaled.** An Upscale button in the image view attaches the image to an Upscale card on the Generate screen. Enhance enlarges it and redraws it lightly at the larger size, the same as Hires fix but for an image that already exists, using that image's prompt and settings. Upscale only enlarges it within seconds, without redrawing, and saves it in Forge's extras folder with the original's settings. Both results appear in the Library.
- Added favorites to the Library: a star on each image and in the image view (also the S key), and a Favorites filter. Stars are kept by Forgelight itself, so clearing the browser's data does not remove them.
- A running generation now survives a page reload: the progress picks up where it was, and the finished images appear as usual. The Session strip also stays until the tab is closed.

### 🩹 Fixed

- The tooltips of the buttons below an image opened from the Library were hidden behind the image; they now show.

## 1.1.0 (2026-10-19)

### 🌿 Improved

- **The prompt and the negative prompt moved into cards of their own, side by side.** Clicking into a prompt no longer shifts the screen: a card opens only when its text does not fit, gliding out over the image while everything else stays in place. The starting image, LoRAs, checkpoint and Generate share a card below them, the cards use more of the width on large screens, and the layout mirrors when the prompt is placed above the image.

## 1.0.0 (2026-10-18)

### 🌱 New

- **Generate screen.** The image sits front and center, with the prompt card beneath it and Size, Sampling and Hires fix in a slim column beside it. Long prompts stay compact until clicked.
- **LoRAs.** A picker with strengths, trigger words and details from Civitai, shown as chips in the prompt card.
- **Image to image.** A starting image can be attached with a button, by dropping it onto the screen or by pasting it, with a Strength slider beside it.
- **Library.** Every image Forge has saved, grouped by day, with search, a checkpoint filter, an All, SFW and NSFW switch, blurred previews and deletion to the Recycle Bin.
- **Image viewer.** Zoom, fullscreen, generation details and "Use these settings".
- **Settings per checkpoint.** Size, Sampling and Hires fix are remembered for each checkpoint.
- **Guide.** Short explanations of models, settings and prompting, on its own screen and behind the info icons.
- **Themes.** Light and dark, a pure black OLED mode, and a choice of fonts.
- **Starting and stopping.** A desktop shortcut starts Forge and opens Forgelight; the settings menu can shut Forge down.
