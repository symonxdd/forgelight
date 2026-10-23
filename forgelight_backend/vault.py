"""Private mode's vault: images stored so that only the owner can see them again.

Hybrid encryption, as in OpenPGP or age. The vault has one P-256 key pair. Its public
key is stored openly, so images can be added while the vault is locked. Each image
gets a random 256-bit key K that encrypts it with AES-256-GCM; K is wrapped with a key
derived (ECDH + HKDF) from a fresh ephemeral key pair and the vault's public key.

The private key is stored only in encrypted form, once per way to unlock ("key
slots", as in LUKS): a password through scrypt, a recovery code through HKDF, and
optionally a PIN, through a key inside the laptop's TPM chip that only opens with it.
Unlocking keeps the private key in memory only, until Lock or until Forge stops.

On disk, in data/vault/: vault.json (public key and slots) and, per image, two files
with random names: <id>.flv (the image) and <id>.meta.flv (settings and thumbnail).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import struct
import threading
import time
import unicodedata
from pathlib import Path
from typing import Any

from . import cng, store

FORMAT = 1
MAGIC = b"FLV1"
HEADER_FILE = "vault.json"
SCRYPT = {"n": 2**17, "r": 8, "p": 1}
SCRYPT_MAXMEM = 256 * 1024 * 1024
RECOVERY_BYTES = 20
PIN_DIGITS = (4, 12)
ITEM_ID_BYTES = 16
# Ephemeral public key, then K sealed under the wrapping key (nonce + 32 bytes + tag).
WRAPPED_K = cng.GCM_NONCE + cng.AES_KEY + cng.GCM_TAG
ITEM_HEADER = len(MAGIC) + cng.EC_PUBLIC_BLOB + WRAPPED_K


class VaultError(Exception):
    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def _unb64(text: str) -> bytes:
    return base64.b64decode(text.encode("ascii"), validate=True)


def hkdf(secret: bytes, salt: bytes, info: bytes, length: int = 32) -> bytes:
    """HKDF-SHA256 (RFC 5869)."""
    prk = hmac.new(salt, secret, hashlib.sha256).digest()
    out, block, counter = b"", b"", 1
    while len(out) < length:
        block = hmac.new(prk, block + info + bytes([counter]), hashlib.sha256).digest()
        out, counter = out + block, counter + 1
    return out[:length]


def _wrap_key(shared_secret: bytes, ephemeral_public: bytes) -> bytes:
    """The key that wraps an image's K, from the ECDH secret between the ephemeral and vault keys."""
    return hkdf(shared_secret, ephemeral_public, b"forgelight vault item")


def _password_key(password: str, salt: bytes, params: dict) -> bytes:
    data = unicodedata.normalize("NFC", password).encode("utf-8")
    n, r, p = int(params["n"]), int(params["r"]), int(params["p"])
    return hashlib.scrypt(data, salt=salt, n=n, r=r, p=p, maxmem=SCRYPT_MAXMEM, dklen=32)


def check_pin(pin: str) -> None:
    low, high = PIN_DIGITS
    if not (pin.isascii() and pin.isdigit() and low <= len(pin) <= high):
        raise VaultError(f"A PIN is {low} to {high} digits.")


def format_recovery(secret: bytes) -> str:
    """"ABCD-EFGH-…": base32 in groups of four, easy to write down."""
    text = base64.b32encode(secret).decode("ascii").rstrip("=")
    return "-".join(text[i : i + 4] for i in range(0, len(text), 4))


def parse_recovery(code: str) -> bytes:
    """Reads a written-down code back, forgiving spaces, dashes, case and look-alike digits."""
    text = "".join(code.split()).replace("-", "").upper().translate(str.maketrans("018", "OIB"))
    try:
        return base64.b32decode(text + "=" * (-len(text) % 8))
    except ValueError as error:
        raise VaultError("That recovery code isn't valid.") from error


class Vault:
    """One vault folder. `state` keeps the unlocked private key between requests."""

    def __init__(self, root: Path, state: dict) -> None:
        self.root = root
        self._state = state
        self._lock = state.setdefault("lock", threading.Lock())

    # ---- header and slots -----------------------------------------------------------------

    def exists(self) -> bool:
        return (self.root / HEADER_FILE).is_file()

    def _header(self) -> dict:
        try:
            header = json.loads((self.root / HEADER_FILE).read_text(encoding="utf-8"))
        except FileNotFoundError as error:
            raise VaultError("Private mode isn't set up yet.", 409) from error
        except (OSError, ValueError) as error:
            raise VaultError("The vault's settings file can't be read.", 500) from error
        if header.get("format") != FORMAT:
            raise VaultError("This vault was made by a newer Forgelight.", 409)
        return header

    def _write_header(self, header: dict) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        self._write(self.root / HEADER_FILE, json.dumps(header, indent=2).encode("utf-8"))

    @staticmethod
    def _write(path: Path, data: bytes) -> None:
        temp = path.with_name(path.name + ".tmp")
        temp.write_bytes(data)
        os.replace(temp, path)

    @staticmethod
    def _password_slot(password: str, private_blob: bytes) -> dict:
        salt = os.urandom(16)
        key = _password_key(password, salt, SCRYPT)
        sealed = cng.seal(key, private_blob, b"slot:password")
        return {"kind": "password", "salt": _b64(salt), "scrypt": SCRYPT, "sealed": _b64(sealed)}

    @staticmethod
    def _recovery_slot(secret: bytes, private_blob: bytes) -> dict:
        salt = os.urandom(16)
        key = hkdf(secret, salt, b"forgelight vault recovery")
        return {"kind": "recovery", "salt": _b64(salt), "sealed": _b64(cng.seal(key, private_blob, b"slot:recovery"))}

    def create(self, password: str) -> str:
        """Sets the vault up with a password; returns the recovery code, shown to the user once."""
        if len(password) < 8:
            raise VaultError("The password needs at least 8 characters.")
        with self._lock:
            if self.exists():
                raise VaultError("Private mode is already set up.", 409)
            public_blob, private_blob = cng.ec_generate()
            recovery = os.urandom(RECOVERY_BYTES)
            self._write_header({
                "format": FORMAT,
                "created": int(time.time()),
                "publicKey": _b64(public_blob),
                "slots": [self._password_slot(password, private_blob), self._recovery_slot(recovery, private_blob)],
            })
            (self.root / "items").mkdir(exist_ok=True)
            self._state["private"] = private_blob
        return format_recovery(recovery)

    def unlock(self, password: str | None = None, recovery: str | None = None, pin: str | None = None) -> None:
        header = self._header()
        kind = "password" if password is not None else "pin" if pin is not None else "recovery"
        slot = next((s for s in header["slots"] if s.get("kind") == kind), None)
        if slot is None:
            raise VaultError("That way of unlocking isn't set up.")
        wrong = {"password": "Wrong password.", "pin": "Wrong PIN.", "recovery": "Wrong recovery key."}[kind]
        try:
            if kind == "password":
                key = _password_key(password or "", _unb64(slot["salt"]), slot["scrypt"])
            elif kind == "pin":
                key = cng.tpm_decrypt(slot["key"], pin or "", _unb64(slot["wrapped"]))
            else:
                key = hkdf(parse_recovery(recovery or ""), _unb64(slot["salt"]), b"forgelight vault recovery")
            private_blob = cng.open_sealed(key, _unb64(slot["sealed"]), f"slot:{kind}".encode())
        except cng.PinLockedError as error:
            raise VaultError(f"{error} Use the password instead.", 429) from error
        except cng.AuthenticationError as error:
            raise VaultError(wrong, 403) from error
        except cng.CryptoError as error:
            raise VaultError(f"The PIN couldn't be checked: {error} Use the password instead.", 500) from error
        with self._lock:
            self._state["private"] = private_blob

    def lock(self) -> None:
        with self._lock:
            self._state.pop("private", None)

    def is_unlocked(self) -> bool:
        return "private" in self._state

    def _private(self) -> bytes:
        private_blob = self._state.get("private")
        if private_blob is None:
            raise VaultError("Private images are locked.", 423)
        return private_blob

    def change_password(self, new_password: str) -> None:
        """Replaces the password slot. Needs the vault unlocked; images are not touched."""
        if len(new_password) < 8:
            raise VaultError("The password needs at least 8 characters.")
        with self._lock:
            header = self._header()
            slot = self._password_slot(new_password, self._private())
            header["slots"] = [s for s in header["slots"] if s.get("kind") != "password"] + [slot]
            self._write_header(header)

    def has_pin(self) -> bool:
        try:
            return any(s.get("kind") == "pin" for s in self._header()["slots"])
        except VaultError:
            return False

    def set_pin(self, pin: str) -> None:
        """Adds a PIN, or replaces it. Needs the vault unlocked; images are not touched."""
        check_pin(pin)
        with self._lock:
            private_blob = self._private()
            header = self._header()
            header.setdefault("id", secrets.token_hex(8))
            name = f"Forgelight vault {header['id']}"
            cng.tpm_create(name, pin)
            k = os.urandom(cng.AES_KEY)
            slot = {
                "kind": "pin",
                "key": name,
                "wrapped": _b64(cng.tpm_encrypt(name, k)),
                "sealed": _b64(cng.seal(k, private_blob, b"slot:pin")),
            }
            header["slots"] = [s for s in header["slots"] if s.get("kind") != "pin"] + [slot]
            self._write_header(header)

    def remove_pin(self) -> None:
        """Removes the PIN slot and its key in the TPM. Needs the vault unlocked."""
        with self._lock:
            self._private()
            header = self._header()
            for slot in [s for s in header["slots"] if s.get("kind") == "pin"]:
                cng.tpm_delete(slot["key"])
            header["slots"] = [s for s in header["slots"] if s.get("kind") != "pin"]
            self._write_header(header)

    def new_recovery_code(self) -> str:
        """Replaces the recovery slot, so an old written-down code stops working."""
        with self._lock:
            header = self._header()
            recovery = os.urandom(RECOVERY_BYTES)
            slot = self._recovery_slot(recovery, self._private())
            header["slots"] = [s for s in header["slots"] if s.get("kind") != "recovery"] + [slot]
            self._write_header(header)
        return format_recovery(recovery)

    # ---- items ---------------------------------------------------------------------------

    def _item_path(self, item_id: str, part: str) -> Path:
        if len(item_id) != ITEM_ID_BYTES * 2 or not all(c in "0123456789abcdef" for c in item_id):
            raise VaultError("That isn't a private image.", 404)
        return self.root / "items" / (f"{item_id}.flv" if part == "image" else f"{item_id}.meta.flv")

    def add(self, image: bytes, meta: dict[str, Any], thumbnail: bytes) -> str:
        """Encrypts one image with its settings and thumbnail. Works while locked."""
        public_blob = _unb64(self._header()["publicKey"])
        k = os.urandom(cng.AES_KEY)
        ephemeral_public, ephemeral_private = cng.ec_generate()
        wrap_key = _wrap_key(cng.ec_shared_secret(ephemeral_private, public_blob), ephemeral_public)
        header = MAGIC + ephemeral_public + cng.seal(wrap_key, k, MAGIC + ephemeral_public)
        item_id = secrets.token_hex(ITEM_ID_BYTES)
        meta_json = json.dumps(meta, ensure_ascii=False).encode("utf-8")
        meta_payload = struct.pack("<I", len(meta_json)) + meta_json + thumbnail
        folder = self.root / "items"
        folder.mkdir(parents=True, exist_ok=True)
        # The settings file is written last and is what ids() lists, so a listed image has both files.
        self._write(self._item_path(item_id, "image"), header + cng.seal(k, image, f"image:{item_id}".encode()))
        self._write(self._item_path(item_id, "meta"), header + cng.seal(k, meta_payload, f"meta:{item_id}".encode()))
        return item_id

    def _open(self, item_id: str, part: str) -> bytes:
        try:
            data = self._item_path(item_id, part).read_bytes()
        except FileNotFoundError as error:
            raise VaultError("That private image is gone.", 404) from error
        if len(data) < ITEM_HEADER or not data.startswith(MAGIC):
            raise VaultError("That private image is damaged.", 500)
        ephemeral_public = data[len(MAGIC) : len(MAGIC) + cng.EC_PUBLIC_BLOB]
        wrapped = data[len(MAGIC) + cng.EC_PUBLIC_BLOB : ITEM_HEADER]
        try:
            wrap_key = _wrap_key(cng.ec_shared_secret(self._private(), ephemeral_public), ephemeral_public)
            k = cng.open_sealed(wrap_key, wrapped, MAGIC + ephemeral_public)
            return cng.open_sealed(k, data[ITEM_HEADER:], f"{part}:{item_id}".encode())
        except cng.AuthenticationError as error:
            raise VaultError("That private image is damaged or was changed.", 500) from error

    def image(self, item_id: str) -> bytes:
        return self._open(item_id, "image")

    def meta(self, item_id: str) -> tuple[dict, bytes]:
        """The settings and thumbnail of one image."""
        payload = self._open(item_id, "meta")
        (length,) = struct.unpack("<I", payload[:4])
        return json.loads(payload[4 : 4 + length].decode("utf-8")), payload[4 + length :]

    def ids(self) -> list[str]:
        folder = self.root / "items"
        if not folder.is_dir():
            return []
        return sorted(p.name[: -len(".meta.flv")] for p in folder.glob("*.meta.flv"))

    def remove(self, item_id: str) -> None:
        for part in ("meta", "image"):
            self._item_path(item_id, part).unlink(missing_ok=True)


# Kept across live reloads (reloading reuses this module's globals), so saving a change to
# this package doesn't lock the vault. The unlocked key never leaves memory.
_state: dict = globals().get("_state") or {}
vault = Vault(store.DATA / "vault", _state)
