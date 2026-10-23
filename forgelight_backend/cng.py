"""AES-256-GCM and ECDH P-256 through Windows' built-in cryptography (CNG, bcrypt.dll).

Forge's Python ships no encryption library and the extension adds no pip packages,
so the private-mode vault calls the operating system's own implementation instead.
Only what the vault needs is wrapped; everything here works on bytes.
"""

from __future__ import annotations

import ctypes
import os
from ctypes import wintypes

GCM_NONCE = 12
GCM_TAG = 16
AES_KEY = 32
EC_PUBLIC_BLOB = 72  # BCRYPT_ECCKEY_BLOB header (8) + X (32) + Y (32)
EC_PRIVATE_BLOB = 104  # header (8) + X + Y + d (32 each)

_ECDH_PUBLIC_MAGIC = 0x314B4345  # "ECK1"
_ECDH_PRIVATE_MAGIC = 0x324B4345  # "ECK2"
_STATUS_AUTH_TAG_MISMATCH = 0xC000A002


class CryptoError(Exception):
    pass


class AuthenticationError(CryptoError):
    """The data or its key is wrong: a changed file, or a wrong password."""


class _AuthInfo(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.ULONG),
        ("dwInfoVersion", wintypes.ULONG),
        ("pbNonce", ctypes.c_void_p),
        ("cbNonce", wintypes.ULONG),
        ("pbAuthData", ctypes.c_void_p),
        ("cbAuthData", wintypes.ULONG),
        ("pbTag", ctypes.c_void_p),
        ("cbTag", wintypes.ULONG),
        ("pbMacContext", ctypes.c_void_p),
        ("cbMacContext", wintypes.ULONG),
        ("cbAAD", wintypes.ULONG),
        ("cbData", ctypes.c_ulonglong),
        ("dwFlags", wintypes.ULONG),
    ]


_bcrypt = ctypes.WinDLL("bcrypt") if os.name == "nt" else None
_providers: dict[str, ctypes.c_void_p] = {}


def _check(status: int) -> None:
    status &= 0xFFFFFFFF
    if status == _STATUS_AUTH_TAG_MISMATCH:
        raise AuthenticationError("The data could not be verified.")
    if status != 0:
        raise CryptoError(f"Windows cryptography failed ({status:#010x}).")


def _provider(name: str) -> ctypes.c_void_p:
    if _bcrypt is None:
        raise CryptoError("Private mode needs Windows.")
    if name not in _providers:
        handle = ctypes.c_void_p()
        _check(_bcrypt.BCryptOpenAlgorithmProvider(ctypes.byref(handle), name, None, 0))
        if name == "AES":
            mode = "ChainingModeGCM"
            buffer = ctypes.create_unicode_buffer(mode)
            _check(_bcrypt.BCryptSetProperty(handle, "ChainingMode", buffer, ctypes.sizeof(buffer), 0))
        _providers[name] = handle
    return _providers[name]


def _aes(fn_name: str, key: bytes, nonce: bytes, data: bytes, tag: bytes | None, aad: bytes) -> tuple[bytes, bytes]:
    if len(key) != AES_KEY or len(nonce) != GCM_NONCE:
        raise CryptoError("Wrong key or nonce size.")
    handle = ctypes.c_void_p()
    _check(_bcrypt.BCryptGenerateSymmetricKey(_provider("AES"), ctypes.byref(handle), None, 0, key, len(key), 0))
    try:
        nonce_buf = ctypes.create_string_buffer(nonce, len(nonce))
        tag_buf = ctypes.create_string_buffer(tag or b"", GCM_TAG)
        aad_buf = ctypes.create_string_buffer(aad, max(1, len(aad)))
        info = _AuthInfo(cbSize=ctypes.sizeof(_AuthInfo), dwInfoVersion=1)
        info.pbNonce, info.cbNonce = ctypes.addressof(nonce_buf), len(nonce)
        info.pbTag, info.cbTag = ctypes.addressof(tag_buf), GCM_TAG
        if aad:
            info.pbAuthData, info.cbAuthData = ctypes.addressof(aad_buf), len(aad)
        out = ctypes.create_string_buffer(max(1, len(data)))
        written = wintypes.ULONG()
        fn = getattr(_bcrypt, fn_name)
        _check(fn(handle, data, len(data), ctypes.byref(info), None, 0, out, len(data), ctypes.byref(written), 0))
        return out.raw[: written.value], tag_buf.raw
    finally:
        _bcrypt.BCryptDestroyKey(handle)


def seal(key: bytes, data: bytes, aad: bytes = b"") -> bytes:
    """AES-256-GCM: a fresh random nonce, then the ciphertext and its 16-byte tag."""
    nonce = os.urandom(GCM_NONCE)
    ciphertext, tag = _aes("BCryptEncrypt", key, nonce, data, None, aad)
    return nonce + ciphertext + tag


def open_sealed(key: bytes, sealed: bytes, aad: bytes = b"") -> bytes:
    """Reverses seal(); raises AuthenticationError when anything was changed or the key is wrong."""
    if len(sealed) < GCM_NONCE + GCM_TAG:
        raise AuthenticationError("The data is too short.")
    nonce, ciphertext, tag = sealed[:GCM_NONCE], sealed[GCM_NONCE:-GCM_TAG], sealed[-GCM_TAG:]
    plaintext, _ = _aes("BCryptDecrypt", key, nonce, ciphertext, tag, aad)
    return plaintext


def _export(handle: ctypes.c_void_p, blob_type: str) -> bytes:
    size = wintypes.ULONG()
    _check(_bcrypt.BCryptExportKey(handle, None, blob_type, None, 0, ctypes.byref(size), 0))
    out = ctypes.create_string_buffer(size.value)
    _check(_bcrypt.BCryptExportKey(handle, None, blob_type, out, size.value, ctypes.byref(size), 0))
    return out.raw[: size.value]


def ec_generate() -> tuple[bytes, bytes]:
    """A new P-256 key pair as (public blob, private blob), in Windows' own blob format."""
    handle = ctypes.c_void_p()
    _check(_bcrypt.BCryptGenerateKeyPair(_provider("ECDH_P256"), ctypes.byref(handle), 256, 0))
    try:
        _check(_bcrypt.BCryptFinalizeKeyPair(handle, 0))
        return _export(handle, "ECCPUBLICBLOB"), _export(handle, "ECCPRIVATEBLOB")
    finally:
        _bcrypt.BCryptDestroyKey(handle)


def _import(blob: bytes, blob_type: str) -> ctypes.c_void_p:
    handle = ctypes.c_void_p()
    provider = _provider("ECDH_P256")
    _check(_bcrypt.BCryptImportKeyPair(provider, None, blob_type, ctypes.byref(handle), blob, len(blob), 0))
    return handle


def ec_shared_secret(private_blob: bytes, public_blob: bytes) -> bytes:
    """ECDH: the 32-byte shared secret (the X coordinate, big-endian as in SEC 1)."""
    if len(private_blob) != EC_PRIVATE_BLOB or len(public_blob) != EC_PUBLIC_BLOB:
        raise CryptoError("Wrong key size.")
    private, public = _import(private_blob, "ECCPRIVATEBLOB"), _import(public_blob, "ECCPUBLICBLOB")
    secret = ctypes.c_void_p()
    try:
        _check(_bcrypt.BCryptSecretAgreement(private, public, ctypes.byref(secret), 0))
        size = wintypes.ULONG()
        _check(_bcrypt.BCryptDeriveKey(secret, "TRUNCATE", None, None, 0, ctypes.byref(size), 0))
        out = ctypes.create_string_buffer(size.value)
        _check(_bcrypt.BCryptDeriveKey(secret, "TRUNCATE", None, out, size.value, ctypes.byref(size), 0))
        # CNG hands the raw secret back little-endian.
        return out.raw[: size.value][::-1]
    finally:
        if secret.value:
            _bcrypt.BCryptDestroySecret(secret)
        _bcrypt.BCryptDestroyKey(private)
        _bcrypt.BCryptDestroyKey(public)


# ---- PIN keys in the TPM (NCrypt, Microsoft Platform Crypto Provider) ------------------------
#
# A 2048-bit RSA key made inside the laptop's TPM security chip, usable only with its PIN. The
# chip itself counts wrong PINs and pauses tries after too many, so a short PIN can't be guessed.
# Encrypting needs no PIN; decrypting does. Every call is silent: Windows never shows a prompt.

TPM_PROVIDER = "Microsoft Platform Crypto Provider"
_SILENT = 0x40
_OVERWRITE = 0x80
_PAD_OAEP = 0x4
_NTE_PERM = 0x80090010  # A wrong PIN.
_NTE_BAD_KEYSET = 0x80090016  # No such key.
_TPM_LOCKOUT = (0x80280921, 0x80280803)  # TPM_20_E_LOCKOUT, TPM_E_DEFEND_LOCK_RUNNING


class WrongPinError(AuthenticationError):
    """The PIN was wrong."""


class PinLockedError(CryptoError):
    """The TPM pauses PIN tries after too many wrong ones."""


class _OaepInfo(ctypes.Structure):
    _fields_ = [("pszAlgId", wintypes.LPCWSTR), ("pbLabel", ctypes.c_void_p), ("cbLabel", wintypes.ULONG)]


_ncrypt = ctypes.WinDLL("ncrypt") if os.name == "nt" else None


def _tpm_check(status: int) -> None:
    status &= 0xFFFFFFFF
    if status == _NTE_PERM:
        raise WrongPinError("Wrong PIN.")
    if status in _TPM_LOCKOUT:
        raise PinLockedError("Too many wrong PINs, so the security chip pauses PIN tries for a while.")
    if status != 0:
        raise CryptoError(f"The security chip refused ({status:#010x}).")


def _tpm_provider() -> ctypes.c_void_p:
    if _ncrypt is None:
        raise CryptoError("A PIN needs Windows.")
    handle = ctypes.c_void_p()
    _tpm_check(_ncrypt.NCryptOpenStorageProvider(ctypes.byref(handle), TPM_PROVIDER, 0))
    return handle


def _tpm_set(handle: ctypes.c_void_p, name: str, value: bytes) -> None:
    buffer = ctypes.create_string_buffer(value, len(value))
    _tpm_check(_ncrypt.NCryptSetProperty(handle, name, buffer, len(value), _SILENT))


def _pin(pin: str) -> bytes:
    return (pin + "\0").encode("utf-16-le")


def tpm_available() -> bool:
    try:
        _ncrypt.NCryptFreeObject(_tpm_provider())
        return True
    except (CryptoError, AttributeError, OSError):
        return False


def tpm_create(name: str, pin: str) -> None:
    """Makes a decrypt-only key in the TPM, replacing one with the same name."""
    provider, key = _tpm_provider(), ctypes.c_void_p()
    try:
        _tpm_check(_ncrypt.NCryptCreatePersistedKey(provider, ctypes.byref(key), "RSA", name, 0, _OVERWRITE))
        _tpm_set(key, "Length", (2048).to_bytes(4, "little"))
        _tpm_set(key, "Key Usage", (1).to_bytes(4, "little"))  # NCRYPT_ALLOW_DECRYPT_FLAG
        _tpm_set(key, "SmartCardPin", _pin(pin))
        _tpm_check(_ncrypt.NCryptFinalizeKey(key, _SILENT))
    finally:
        if key.value:
            _ncrypt.NCryptFreeObject(key)
        _ncrypt.NCryptFreeObject(provider)


def _tpm_crypt(name: str, data: bytes, pin: str | None) -> bytes:
    provider, key = _tpm_provider(), ctypes.c_void_p()
    try:
        _tpm_check(_ncrypt.NCryptOpenKey(provider, ctypes.byref(key), name, 0, _SILENT))
        if pin is not None:
            _tpm_set(key, "SmartCardPin", _pin(pin))
        info = _OaepInfo("SHA256", None, 0)
        out = ctypes.create_string_buffer(512)
        size = wintypes.DWORD()
        fn = _ncrypt.NCryptDecrypt if pin is not None else _ncrypt.NCryptEncrypt
        _tpm_check(fn(key, data, len(data), ctypes.byref(info), out, 512, ctypes.byref(size), _PAD_OAEP | _SILENT))
        return out.raw[: size.value]
    finally:
        if key.value:
            _ncrypt.NCryptFreeObject(key)
        _ncrypt.NCryptFreeObject(provider)


def tpm_encrypt(name: str, data: bytes) -> bytes:
    return _tpm_crypt(name, data, None)


def tpm_decrypt(name: str, pin: str, data: bytes) -> bytes:
    return _tpm_crypt(name, data, pin)


def tpm_delete(name: str) -> None:
    """Removes the key; a key that is already gone counts as removed."""
    provider, key = _tpm_provider(), ctypes.c_void_p()
    try:
        status = _ncrypt.NCryptOpenKey(provider, ctypes.byref(key), name, 0, _SILENT) & 0xFFFFFFFF
        if status == _NTE_BAD_KEYSET:
            return
        _tpm_check(status)
        _tpm_check(_ncrypt.NCryptDeleteKey(key, 0))
        key.value = None  # Deleting frees the handle.
    finally:
        if key.value:
            _ncrypt.NCryptFreeObject(key)
        _ncrypt.NCryptFreeObject(provider)
