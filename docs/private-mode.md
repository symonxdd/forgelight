# Private mode

Private mode keeps images unreadable on disk. Every new image is encrypted the moment Forge hands it over, saving needs no password, and only a password, a PIN or a recovery key shows the images again.

| Part | Method |
|---|---|
| Images | AES-256-GCM, a new random key per image |
| Locking each image key | ECDH on the P-256 curve, with HKDF |
| Password | scrypt |
| PIN | A key inside the TPM 2.0 security chip |
| Recovery key | 160 random bits, through HKDF |
| Library | Windows CNG (Cryptography API: Next Generation), built into Windows |

Nothing extra is installed: the cryptography comes from Windows itself, called from Forge's own Python.

## The idea

Private mode uses **hybrid encryption**, the scheme behind OpenPGP and age. Each image gets its own random symmetric key, which is fast and encrypts the pixels. That small key is then locked with the vault's **public key**, which is stored openly, so saving never needs a secret. Reading needs the matching **private key**, which is kept on disk only in encrypted form, once per way to unlock.

## Using it

1. Click **Private** beside the image count. The first click opens a short setup.
2. Choose a password of at least 8 characters.
3. Save the recovery key. It is shown only this once.
4. Optionally add a PIN of 4 to 12 digits (on computers with a TPM security chip).

While private mode is on, a lock shows on the Generate button and new images go straight into the vault. **Start in private mode**, in Settings under Privacy, turns it on at every start.

Unlocked private images show in the Library among the others, marked with a lock; the All, Favorites and Private switch can show them alone. **Lock** in the top bar locks them again. **Make private** and **Make public**, in the Library's selection bar and image view, move existing images in and out of the vault.

## 1. Saving a private image

![Forge makes the image in memory, Forgelight encrypts it with a random key K, locks K with the public key, and only the encrypted files reach the disk](private-mode/saving-light.svg#gh-light-mode-only)
![Forge makes the image in memory, Forgelight encrypts it with a random key K, locks K with the public key, and only the encrypted files reach the disk](private-mode/saving-dark.svg#gh-dark-mode-only)

**K** is the image's own key: random, 256 bits, used for this one image only. Forgelight passes the generation request to Forge's API with `save_images: false`, receives the image in memory, and writes only two encrypted files with random names: the image itself, and a second file with its settings (prompt, seed and the rest) and the thumbnail the Library grid shows, so the grid never has to decrypt full-size images. There is never an unencrypted copy on disk, so Windows has nothing to make a thumbnail from.

To lock K, Forgelight makes a fresh one-time key pair, combines it with the vault's public key (ECDH) and derives a wrapping key from the result (HKDF). The one-time public key is stored beside the locked K; its private half is thrown away.

## 2. Unlocking: three key slots

![A password through scrypt, a PIN through the TPM chip, or a recovery key through HKDF each opens its own key slot, and any slot gives back the private key, which stays in memory](private-mode/unlocking-light.svg#gh-light-mode-only)
![A password through scrypt, a PIN through the TPM chip, or a recovery key through HKDF each opens its own key slot, and any slot gives back the private key, which stays in memory](private-mode/unlocking-dark.svg#gh-dark-mode-only)

Each slot holds the same private key, encrypted under a different secret, the way LUKS disk encryption works. Any one slot is enough. Changing the password or the PIN, or making a new recovery key, replaces only that slot, so the images never need to be encrypted again. While private images are locked, such a change is confirmed with one of the three ways in. The private key it opens is used for that change only, so private images stay locked.

- **Password:** required, set up first. scrypt makes checking it slow and memory-hungry on purpose, so guessing it on graphics cards stays expensive.
- **PIN:** optional, and works on this computer only. The key that opens its slot lives inside the TPM chip and only opens with the PIN. The chip counts wrong PINs and enforces growing pauses in hardware, so a short PIN is safe.
- **Recovery key:** a long random code shown once at setup, for when the password is forgotten. **Change** under Password accepts the recovery key or the PIN instead of the current password, so a forgotten password can be replaced. A new recovery key, made in Settings under Privacy, makes the old one stop working.

The private key stays in memory only, until **Lock**, switching private mode off, or Forge stopping. Reloading the page keeps it unlocked.

## 3. Viewing a private image

![The vault file is read from disk, its key K is unlocked with the private key, the image is decrypted and shown in the browser from memory](private-mode/viewing-light.svg#gh-light-mode-only)
![The vault file is read from disk, its key K is unlocked with the private key, the image is decrypted and shown in the browser from memory](private-mode/viewing-dark.svg#gh-dark-mode-only)

The private key unlocks K, and K decrypts the image. A changed or damaged file fails the GCM tag check and is refused instead of shown. Images are sent with `Cache-Control: no-store`, so Chrome keeps no copy in its cache.

## What lives where

| On disk | Only in memory | Never stored |
|---|---|---|
| The public key, in the open | The private key, while unlocked | The password and the PIN |
| Three key slots, each encrypted | A decrypted image, while on screen | Any image key K in readable form |
| Encrypted images, thumbnails and settings | A new image, until it is encrypted | The private key in readable form |

Anyone with the disk can see how many private images there are, their sizes and their dates, but not what they show.

The vault lives in `data/vault/` inside the extension folder: `vault.json` (the public key and the key slots) and, per image, `<random id>.flv` and `<random id>.meta.flv`.

## What it protects against

**Protected:**

- Someone browsing the disk in File Explorer
- Photos, Windows search and new thumbnails
- A copy of the vault taken to another computer
- Guessing the PIN, thanks to the TPM's pauses
- Changed files, which are refused

**Not protected:**

- Someone at the computer while private images are unlocked
- Spyware already running on the computer
- Images made in the classic Forge page, until they are made private in the Library
- Old Windows thumbnails of images that were once normal files, until cleared with **Clear** under Windows thumbnails in Settings
- Memory Windows wrote to its page file on disk, such as an image on screen. That file is not encrypted unless drive encryption (BitLocker) is on. Private mode works without it; Settings shows its state under **Drive encryption**.

## Moving images in and out

- **Make private** encrypts the selected images into the vault, then deletes the originals for good. They skip the Recycle Bin, which would keep readable copies.
- **Make public** writes each image back as a new file in Forge's outputs folder for its kind and date, numbered like Forge does, never replacing a file.
- Both keep the image's date, settings and favorite star, and both ask for confirmation first.

## Measured speed

| Step | Time |
|---|---|
| Encrypt and save one image (1.6 MB) | about 6 ms |
| Read and decrypt one image | about 8 ms |
| Unlock with the password (scrypt) | about 0.3 s |
| Lock, or switch private mode on or off | instant |

Measured on a mid-range laptop with Forge's Python, using random data the size of a generated PNG. Encryption does not use the graphics card.

## If every way in is lost

As long as the password, the recovery key or the PIN on the same computer still works, the images open. Once none does, the files stay on disk but read as random bytes. Recovering them would mean searching 2²⁵⁶ possible keys, which no computer can do. There is no backdoor and no reset.

## Glossary

| Term | Meaning |
|---|---|
| Symmetric | One key both locks and unlocks. Fast. AES is symmetric. |
| Asymmetric | A key pair: the public key locks, only the private key unlocks. |
| Hybrid encryption | Symmetric for the data, asymmetric for the small data key. |
| AES-256-GCM | The standard cipher in BitLocker, TLS and password managers. GCM adds a tag that detects any change. |
| ECDH P-256 | Elliptic-curve Diffie-Hellman: derives a shared key from two key pairs, as in TLS. |
| scrypt | Turns a password into a key slowly and with lots of memory, so guessing stays expensive. |
| HKDF | Derives a key from a secret that is already long and random. |
| TPM 2.0 | A security chip in most current PCs. Keys made inside it never leave it. |
| Key slot | One encrypted copy of the private key per way to unlock, an idea from LUKS. |
| BitLocker | Windows' full drive encryption, called Device encryption on some editions. |
