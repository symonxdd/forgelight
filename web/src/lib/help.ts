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
  sampler:
    "The method used to remove noise at each step. Samplers reach slightly different results and suit different step counts. DPM++ 2M is a dependable all-round choice.",
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
  libraryBlur:
    "Blurs previews in the Library until you point at them. Likely NSFW is a guess from words in each image's prompt, so it can miss some.",
  panelSections:
    "Hide the sections you rarely change to keep the panel tidy. Hidden sections still apply their settings to every image.",
  oled: "Pure black instead of dark gray. On OLED screens black pixels are switched off, which gives deeper contrast and uses less power.",
  font: "The typeface used throughout Forgelight.",
  openOnStart:
    "When Forge starts, it opens Forgelight in the browser instead of the classic Forge page. Turning this off restores Forge's own behavior.",
  desktopShortcut:
    "A Forgelight icon on the desktop. Double-clicking it starts Forge with its API switched on and opens Forgelight. If Forge is already running, it just opens Forgelight.",
  civitaiSite:
    "Which address Civitai links open on. Both show the same models and pages; civitai.red also shows mature preview images.",
  civitai:
    "Details looked up on Civitai once per model, using only the file name, file size and a short fingerprint of the file. Saved on this computer afterwards.",
} as const;
