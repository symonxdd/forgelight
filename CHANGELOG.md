# Changelog

## Unreleased

## 1.4.0 (2026-10-24)

### 🌱 New

- **Added private mode, a locked vault for images.** While the Private button beside Generate is on, new images are encrypted the moment Forge returns them and never land on the disk as normal pictures. Saving needs no password; showing them again needs the password, an optional PIN kept by the computer's security chip, or the recovery key shown once at setup. While unlocked, private images appear in the Library with a lock, and existing images can be made private, or public again, from there. The top bar always shows whether the vault is locked, and the browser tab reads "Forgelight · Unlocked" while it is open. Settings, under Privacy, holds the PIN, password and recovery key, Start in private mode, a way to clear Windows' thumbnails and the drive encryption state. A Guide chapter explains how it all works.
- Added a Recommended card above Size with the settings the checkpoint's creator used for the example images on Civitai, applied with one click and undone from the notice. Creator's notes opens the creator's full description, with the lines about settings highlighted. LoRAs show the strength their creator used.
- Checkpoints and LoRAs in Downloads or on the Desktop now show up as new models, with Move to Forge to move them into the right folder.
- Added a Folders page that lists where checkpoints, LoRAs, outputs, upscaled images and Forgelight's data are kept, each opening in File Explorer, plus folder buttons in the checkpoint and LoRA lists.
- The image view on the Generate screen can be cleared, with a button or Escape.

### 🩹 Fixed

- The screen tabs and the Upscale method switch no longer nudge their neighbors when a choice is selected.

### 🌿 Improved

- Moved the settings into a Settings window with one page per topic. The gear menu keeps the everyday items: About, OLED black, Classic Forge and Stop Forge.
- Notices now appear as small cards in the top right corner on every screen, titled Done, Heads up or Didn't work.
- Reorganized the Library toolbar: one All, Favorites and Private switch, the checkpoint, content and blur choices in a Filters menu, and a search box that grows with its text.
- Small dialogs sit slightly higher on the screen.

## 1.3.1 (2026-10-20)

### 🌿 Improved

- **Reorganized the settings menu into cards.** Its settings now sit in four groups (Appearance, Generating, Startup and Updates), with plain titles instead of capitals and divider lines. Checkpoint memory, live preview and Civitai links share the Generating card.
- Replaced the four Sections switches with a single dropdown under Appearance. It sums up what is shown, and its list switches several sections in one go.

## 1.3.0 (2026-10-20)

### 🌱 New

- **Added update notices and updates from within Forgelight.** Once a day, Forgelight reads the list of releases from GitHub and, when a newer version exists, shows a dot on the settings icon and a line in the settings menu. The update dialog lists what changed, with Skip this version, Later and Update. Nothing is downloaded or installed until Update is clicked, and favorites and preferences stay as they are. It works for installs from Forge's Extensions tab, with git and from the ZIP. The daily check can be switched off under Updates in the settings menu, and Check now in About checks at any time. Earlier versions cannot update themselves, so this version is installed the usual way once.

### 🩹 Fixed

- The desktop shortcut's window showed the version as "unknown" in installed copies; it now shows the real version.

## 1.2.0 (2026-10-20)

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
