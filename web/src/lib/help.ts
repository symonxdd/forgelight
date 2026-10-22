/**
 * Explanations shown in info tooltips. Written calmly and impersonally (no "you"),
 * plain words first, abbreviations spelled out at the start.
 */
export const HELP = {
  checkpoint:
    "The main model file that turns the prompt into an image. Each checkpoint has its own style and strengths. A newly picked checkpoint loads at the next generation, which then takes longer.",
  prompt:
    "A description of the image to create: subject, style, lighting, details. Words near the start carry the most weight. A word or phrase can be strengthened with (word:1.2) or weakened with (word:0.8).",
  negativePrompt:
    "What the image should avoid, such as blurry, extra fingers or watermark. It steers every step away from these.",
  loras:
    "Small add-on files that teach a checkpoint a character, style or concept. Several can be combined. Each one only works with checkpoints of the same model type, such as SDXL.",
  loraStrength:
    "How strongly the LoRA shapes the image. 1 is its full designed effect; lower values blend it in more gently, higher values exaggerate it. Most LoRAs work best between 0.6 and 1.",
  triggerWords:
    "Words this LoRA was trained together with, taken from its Civitai page. An added LoRA always has an effect, but for characters and concepts it often stays weak or partial unless its trigger words are in the prompt. Style LoRAs usually need none. Click a word to add it to the prompt.",
  size: "The width and height of the image in pixels. SDXL-based checkpoints are trained around one megapixel (1024 × 1024), so these presets keep the total close to that for the best results.",
  sampling:
    "How the image is made: the checkpoint starts from pure random noise and removes a little of it at every step until a picture appears. These settings choose the method, the number of steps and how closely the prompt is followed.",
  sampler:
    "The method used to remove noise at each step. Samplers reach slightly different results and suit different step counts. DPM++ 2M is a dependable all-around choice.",
  scheduleType:
    "How the noise removal is spread across the steps. Karras removes more early on and refines gently at the end, which often looks cleaner at lower step counts.",
  steps:
    "How many times the starting noise is refined into the image. More steps add detail up to a point, after which they mostly add time. 20 to 30 suits most SDXL checkpoints.",
  cfgScale:
    "CFG stands for Classifier-Free Guidance. It sets how strictly the image follows the prompt. Higher values follow it more literally but can look harsh or oversaturated; lower values allow more freedom. Most SDXL checkpoints work well between 3 and 7.",
  seed: "The number that sets the starting noise. The same seed with the same settings recreates the same image. An empty field picks a new random seed every time.",
  batchCount: "How many images to make in a row. Each one uses the next seed, so every image is different.",
  livePreview:
    "How often the quick, low-detail look at the image is refreshed while it is being made. Every step shows the image sharpening, at no noticeable cost. This is Forge's own setting, so the classic page uses it too.",
  hiresFix:
    "Draws the image first at the normal size, then enlarges it and draws over it again for sharper detail. Gives cleaner faces, hair and textures, but each image takes longer.",
  hiresScale:
    "How much larger the final image is than the size set above. 1.5× is a common choice; larger needs more time and graphics memory.",
  hiresUpscaler:
    "The method that enlarges the image before it is drawn over again. R-ESRGAN 4x+ suits most images, R-ESRGAN 4x+ Anime6B suits anime and illustration. Latent upscalers enlarge inside the model and need a higher Detail to look sharp.",
  addStartImage:
    "Makes a new version of an existing image, guided by the prompt. An image can also be dropped onto the Generate screen, or pasted with Ctrl+V anywhere on it.",
  img2imgStrength:
    "How much the new image may differ from the starting image (called denoising strength in Forge). Low values keep the picture and change details; high values keep only the rough layout and colors. 0.4 to 0.6 suits most changes.",
  upscaleMethod:
    "Enhance enlarges the image and then redraws it lightly at the larger size, for sharper, finer detail. It is the same as Hires fix, applied to an image that already exists, and uses that image's prompt and settings. Upscale only enlarges the image with the upscaler in a few seconds, without redrawing it: sharper than plain stretching, but without new detail.",
  upscaleBy:
    "How much larger the result is than the image. Larger takes more time; for Enhance it also needs more graphics memory.",
  upscaleUpscaler:
    "The method that enlarges the image. R-ESRGAN 4x+ suits most images, R-ESRGAN 4x+ Anime6B suits anime and illustration.",
  enhanceDetail:
    "How much the redraw may change the enlarged image (called denoising strength in Forge). Low keeps it close to the original; high adds more detail but can alter faces, hands or the composition. 0.3 to 0.5 suits most images.",
  hiresDenoise:
    "How much the second pass may change the image (called denoising strength in Forge). Low keeps it close to the original; high adds more detail but can alter faces, hands or the composition. 0.3 to 0.5 suits most images.",
  checkpointMemory:
    "Each checkpoint keeps its own Size, Sampling and Hires fix settings. Switching to a checkpoint brings back what you last used with it. Prompt and LoRAs stay as they are.",
  libraryContent:
    "All, SFW and NSFW choose which images show; the blur hides previews until pointed at. Both use a guess from words in each image's prompt, such as nude or nsfw, so a few images may be sorted wrongly.",
  libraryBlur:
    "Blurs previews in the Library until you point at them. Likely NSFW is a guess from words in each image's prompt, so it can miss some.",
  panelSections:
    "Controls which sections of the Generate screen are visible: LoRAs in the prompt card, and Size, Sampling and Hires fix in the left column.",
  oled: "Pure black instead of dark gray. On OLED screens black pixels are switched off, which gives deeper contrast and uses less power.",
  font: "The typeface used throughout Forgelight.",
  openOnStart:
    "When Forge starts, it opens Forgelight in the browser instead of the classic Forge page. Turning this off restores Forge's own behavior.",
  desktopShortcut:
    "A Forgelight icon on the desktop. Double-clicking it starts Forge with its API switched on and opens Forgelight. If Forge is already running, it just opens Forgelight.",
  stopForge:
    "Shuts Forge down, the same as pressing Ctrl+C in its window. When the desktop shortcut started Forge, its window closes too. Starting again works with the desktop shortcut.",
  updateCheck:
    "Once a day, asks GitHub whether a newer version of Forgelight exists, and shows a dot on the settings icon when one does. Only version numbers and release notes are read. Nothing is downloaded or installed until Update is clicked.",
  developerCopy:
    "This Forgelight runs from the folder where it is being developed, so it never checks for updates or updates itself.",
  civitaiSite:
    "Which address Civitai links open on. Both show the same models and pages; civitai.red also shows mature preview images.",
  civitai:
    "Details looked up on Civitai once per model, using only the file name, file size and a short fingerprint of the file. Saved on this computer afterwards.",
  findNewModels:
    "Looks in Downloads and on the Desktop for checkpoints and LoRAs that Forge doesn't have yet, and offers to move them in.",
  foundModels: "Checkpoints and LoRAs in Downloads or on the Desktop that Forge doesn't have yet.",
  privateMode:
    "New images are saved encrypted in Forgelight's vault instead of as normal files in Forge's outputs folder.",
  recommended:
    "Settings from the example images this checkpoint's creator shared on Civitai. Nothing changes until Apply is clicked.",
} as const;

/**
 * Side notes shown under an explanation in smaller print: where a name comes from and
 * how to say it, spelled with everyday words rather than phonetic symbols.
 */
export const HELP_NOTES = {
  findNewModels: "Only those two places, not the folders inside them. Nothing moves until Move to Forge is clicked.",
  foundModels: "Only those two places are checked, not the folders inside them. Switched off in settings.",
  recommended:
    "The most common sampler and size, with typical steps and CFG scale. Hires fix gets its values but stays off, so images are tried at the base size first.",
  panelSections: "Hidden or not, their settings are always applied.",
  addStartImage:
    "Works with PNG, JPEG, WebP, BMP and GIF (its first frame). TIFF, SVG and HEIC (iPhone photos) are not supported.",
  checkpoint:
    "Why the name: while a model is trained, its progress is saved at regular points, much like save points in a game. Each saved file is a checkpoint, a snapshot of everything the model has learned up to that moment. The file picked here is one of those snapshots.",
  sampling:
    "Why the name: one prompt could lead to countless different images. Each generation draws just one of them, and drawing one example out of many possible ones is what statistics calls taking a sample.",
  sampler:
    'Euler is named after the mathematician Leonhard Euler and is said like "oiler". DPM stands for Diffusion Probabilistic Model; DPM++ is said "D P M plus plus".',
  hiresFix:
    'Why the name: "hires" is short for high resolution and is said "high res", like the start of "high resolution", not like the word "hires". The "fix" comes from early models, which went wrong when asked for a large image directly, often drawing two heads or repeated bodies. Drawing small first and enlarging afterwards fixed that.',
  loras:
    'LoRA stands for Low-Rank Adaptation: a small set of changes laid over a checkpoint (the adaptation), stored in a slimmed-down form (low rank) instead of as a full copy of the model. Said like the name "Laura"; LoRAs like "Lauras".',
} as const;
