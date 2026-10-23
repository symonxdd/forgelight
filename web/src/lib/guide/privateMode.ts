import { LockKeyhole } from "lucide-react";
import type { GuideChapter } from "./types";

export const privateMode: GuideChapter = {
  id: "private-mode",
  title: "Private mode",
  icon: LockKeyhole,
  intro: "Keeping images encrypted on disk, so that only their owner can see them again.",
  topics: [
    {
      id: "overview",
      title: "What private mode does",
      summary:
        "While private mode is on, every new image is encrypted the moment Forge hands it over. It never exists as a normal file, so File Explorer, Photos and Windows search have nothing to show.",
      points: [
        "Saving needs no password, so images can be made while private images are locked.",
        "Seeing them again needs the password, the PIN or the recovery key.",
        "The settings of each image, prompt included, are encrypted along with it.",
        "Images made in the classic Forge page are normal files. The Library can make them private.",
      ],
      forgelight:
        "The Private switch beside the image count turns it on, and a lock appears on the Generate button. Start in private mode, in Settings under Privacy, turns it on at every start.",
      related: ["private-mode/setting-up", "private-mode/protected"],
      keywords: ["private", "privacy", "hide", "hidden", "secret", "encrypted", "encryption", "vault", "nsfw"],
    },
    {
      id: "setting-up",
      title: "Setting it up",
      summary: "The first click on Private opens a short setup. It is needed only once.",
      steps: [
        "Choose a password of at least 8 characters.",
        "Save the recovery key: copy it or write it down, and keep it apart from the computer. It is shown only this once.",
        "Optionally add a PIN of 4 to 12 digits for quicker unlocking. This step appears only on computers with a TPM security chip.",
        "Private mode is now on, and new images go straight into the vault.",
      ],
      related: ["private-mode/unlocking", "private-mode/lost-keys"],
      keywords: ["setup", "set up", "password", "recovery key", "pin", "first time"],
    },
    {
      id: "saving",
      title: "How an image is saved",
      summary:
        "Each image gets its own random key, called K, which encrypts it. K is then locked with the vault's public key, which is why saving never asks for a password.",
      diagram: "private-saving",
      points: [
        "Forge is asked not to save the image, so Forgelight receives it in memory only.",
        "Two encrypted files with random names reach the disk: the image itself, and a second file with its settings and the thumbnail the Library shows.",
        "A public key can only lock, never unlock. Unlocking needs the matching private key, which is stored only in encrypted form.",
        "Encrypting an image takes a few thousandths of a second and does not use the graphics card.",
      ],
      folder: "webui\\extensions\\forgelight\\data\\vault",
      related: ["private-mode/unlocking", "private-mode/technical"],
      keywords: ["encrypt", "key", "public key", "file", "save", "disk"],
    },
    {
      id: "unlocking",
      title: "Three ways to unlock",
      summary:
        "The private key is stored three times, each copy encrypted under a different secret. Any one of them opens the vault.",
      diagram: "private-unlocking",
      table: {
        head: ["Way", "Good to know"],
        rows: [
          ["Password", "Required. Checking it is slow on purpose, so guessing takes very long."],
          [
            "PIN",
            "Optional, and works on this computer only. The TPM security chip pauses tries after too many wrong PINs, so a short PIN is safe.",
          ],
          [
            "Recovery key",
            "Shown once at setup. Opens the vault when the password is forgotten, and can set a new password.",
          ],
        ],
      },
      points: [
        "Changing the password, the PIN or the recovery key replaces only its own copy. It is instant, and the images stay as they are.",
        "While private images are locked, these changes are confirmed with the password, the PIN or the recovery key, and private images stay locked afterwards.",
        "A forgotten password is replaced with Change under Password, using the recovery key or the PIN instead of the current password.",
        "A forgotten PIN is no problem: the password or the recovery key still opens the vault, and Change under PIN sets a new PIN with the password.",
        "A new recovery key makes the old one stop working.",
      ],
      forgelight: "In Settings under Privacy: Add PIN, Change for the password, and New key for the recovery key.",
      related: ["private-mode/lost-keys", "private-mode/viewing"],
      keywords: ["unlock", "password", "pin", "recovery key", "tpm", "slot", "forgot", "change"],
    },
    {
      id: "viewing",
      title: "Viewing and locking",
      summary:
        "Once unlocked, private images show in the Library among the others, marked with a lock. They are decrypted in memory only, each time they are shown.",
      diagram: "private-viewing",
      points: [
        "A changed or damaged file fails a check and is refused instead of shown.",
        "The browser is told not to keep a copy in its cache.",
        "Images stay unlocked until Lock in the top bar, switching private mode off, or Forge stopping. Reloading the page keeps them unlocked.",
        "While locked, the Library shows how many private images are hidden.",
        "The top bar always shows Locked or Unlocked, and while unlocked the browser tab says so too, with a dot on its icon.",
      ],
      forgelight: "In the Library, the All, Favorites and Private switch can show private images only.",
      related: ["private-mode/moving"],
      keywords: ["view", "library", "lock", "locked", "unlocked", "show", "cache"],
    },
    {
      id: "moving",
      title: "Moving images in and out",
      summary: "Existing images can be made private, and private images made public again, in the Library.",
      points: [
        "Make private encrypts the images into the vault, then deletes the originals for good. They skip the Recycle Bin, which would keep readable copies.",
        "Make public writes each image back as a new file in Forge's outputs folder, under its kind and date.",
        "Both ways keep the image's date, its settings and its favorite star, and both ask for confirmation first.",
      ],
      forgelight:
        "Select images in the Library and use Make private or Make public in the selection bar, or the same button in the image view.",
      related: ["private-mode/traces"],
      keywords: ["make private", "make public", "move", "existing images", "classic page", "delete"],
    },
    {
      id: "protected",
      title: "What it protects against",
      summary: "Private mode keeps images unreadable for anyone who only has the files.",
      points: [
        "Someone browsing the disk in File Explorer.",
        "Photos, Windows search and new thumbnails, which find nothing to show.",
        "A copy of the vault taken to another computer.",
        "Guessing the PIN, thanks to the security chip's pauses.",
        "Changed files, which are refused.",
      ],
      related: ["private-mode/not-protected"],
      keywords: ["safe", "security", "protect", "threat"],
    },
    {
      id: "not-protected",
      title: "What it does not protect against",
      summary: "Private mode does not hide images from someone using the computer while they are unlocked.",
      points: [
        "Someone at the computer while private images are unlocked. Lock first when stepping away.",
        "Spyware already running on the computer.",
        "Images made in the classic Forge page, until they are made private in the Library.",
        "Traces Windows kept from before, such as old thumbnails.",
      ],
      related: ["private-mode/traces"],
      keywords: ["risk", "limits", "unsafe", "spyware", "classic"],
    },
    {
      id: "traces",
      title: "Traces Windows may keep",
      summary:
        "Windows itself can hold on to pieces of images that were once normal files or shown on screen. Two rows in Settings under Privacy help with that.",
      points: [
        "Windows thumbnails: File Explorer keeps small previews of images it has shown. Clear removes them, including those of images that are private now. Private images never get one.",
        "Windows can copy memory, such as an image on screen, into its page file on the system drive. That file is not encrypted.",
        "Drive encryption (BitLocker) encrypts the whole system drive, page file included. Private mode works without it, and the Drive encryption row shows whether it is on.",
        "When BitLocker is turned on, Windows shows a recovery key of its own. Keep it somewhere safe.",
      ],
      keywords: ["thumbnails", "thumbcache", "bitlocker", "drive encryption", "page file", "pagefile", "swap"],
    },
    {
      id: "lost-keys",
      title: "If every way in is lost",
      summary: "Then the private images are gone for good. There is no backdoor and no reset.",
      points: [
        "As long as the password, the recovery key or the PIN still works, the images open.",
        "Without any of them, the files stay on disk but read as random bytes. Trying every possible key would take longer than the age of the universe.",
        "Keeping the recovery key apart from the computer, for example on paper, guards against this.",
      ],
      related: ["private-mode/unlocking"],
      keywords: ["lost", "forgot", "forgotten", "reset", "backdoor", "recover"],
    },
    {
      id: "technical",
      title: "The encryption in detail",
      summary:
        "Standard, well-tested methods, all from Windows' own cryptography library (CNG, Cryptography API: Next Generation), so nothing extra is installed.",
      table: {
        head: ["Part", "Method"],
        rows: [
          ["Images", "AES-256-GCM, with a new random key for every image"],
          ["Locking each key", "ECDH on the P-256 curve with HKDF: hybrid encryption, as in OpenPGP and age"],
          ["Password", "scrypt, slow and memory-hungry on purpose"],
          ["PIN", "A key inside the TPM 2.0 security chip that only opens with the PIN"],
          ["Recovery key", "160 random bits, through HKDF"],
          ["Key slots", "One encrypted copy of the private key per way to unlock, as in LUKS disk encryption"],
        ],
      },
      keywords: ["aes", "gcm", "ecdh", "p-256", "scrypt", "hkdf", "tpm", "cng", "cryptography", "algorithm", "luks"],
    },
  ],
};
