"""Tests for the private-mode vault. Windows only (it uses Windows' own cryptography).

Run from the repository root with Forge's Python:
    C:\\Forge\\webui_forge_cu121_torch231\\system\\python\\python.exe -m unittest discover -s tests
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if os.name == "nt":
    from forgelight_backend import vault as vault_module
    from forgelight_backend.vault import Vault, VaultError, format_recovery, hkdf, parse_recovery

# Fast password stretching for tests only; the real setting is checked separately.
FAST_SCRYPT = {"n": 2**10, "r": 8, "p": 1}


@unittest.skipUnless(os.name == "nt", "the vault uses Windows cryptography")
class VaultTest(unittest.TestCase):
    def setUp(self) -> None:
        self.folder = tempfile.TemporaryDirectory()
        self.root = Path(self.folder.name) / "vault"
        self.real_scrypt, vault_module.SCRYPT = vault_module.SCRYPT, FAST_SCRYPT
        self.vault = Vault(self.root, {})
        self.recovery = self.vault.create("correct horse")

    def tearDown(self) -> None:
        vault_module.SCRYPT = self.real_scrypt
        self.folder.cleanup()

    def fresh(self) -> "Vault":
        """The same folder as Forge would see it after a restart: nothing in memory."""
        return Vault(self.root, {})

    def test_round_trip(self) -> None:
        item = self.vault.add(b"\x89PNG pixels", {"infotext": "Steps: 20", "width": 832}, b"thumb")
        self.assertEqual(self.vault.image(item), b"\x89PNG pixels")
        self.assertEqual(self.vault.meta(item), ({"infotext": "Steps: 20", "width": 832}, b"thumb"))
        self.assertEqual(self.vault.ids(), [item])

    def test_saving_works_while_locked(self) -> None:
        locked = self.fresh()
        self.assertFalse(locked.is_unlocked())
        item = locked.add(b"secret", {}, b"")
        with self.assertRaises(VaultError) as raised:
            locked.image(item)
        self.assertEqual(raised.exception.status, 423)
        locked.unlock(password="correct horse")
        self.assertEqual(locked.image(item), b"secret")

    def test_nothing_readable_on_disk(self) -> None:
        self.vault.add(b"VISIBLE-PIXELS", {"infotext": "VISIBLE-PROMPT"}, b"VISIBLE-THUMB")
        for path in self.root.rglob("*"):
            if path.is_file():
                data = path.read_bytes()
                for marker in (b"VISIBLE-PIXELS", b"VISIBLE-PROMPT", b"VISIBLE-THUMB", b"correct horse"):
                    self.assertNotIn(marker, data, path.name)

    def test_wrong_password_and_code(self) -> None:
        with self.assertRaises(VaultError) as raised:
            self.fresh().unlock(password="wrong horse")
        self.assertEqual(raised.exception.status, 403)
        with self.assertRaises(VaultError):
            self.fresh().unlock(recovery=format_recovery(os.urandom(20)))

    def test_recovery_code_unlocks_and_forgives_typing(self) -> None:
        item = self.vault.add(b"secret", {}, b"")
        sloppy = self.recovery.lower().replace("-", " ").replace("o", "0")
        other = self.fresh()
        other.unlock(recovery=sloppy)
        self.assertEqual(other.image(item), b"secret")

    def test_change_password_keeps_images(self) -> None:
        item = self.vault.add(b"secret", {}, b"")
        self.vault.change_password("new password")
        with self.assertRaises(VaultError):
            self.fresh().unlock(password="correct horse")
        other = self.fresh()
        other.unlock(password="new password")
        self.assertEqual(other.image(item), b"secret")

    def test_new_recovery_code_retires_the_old_one(self) -> None:
        new_code = self.vault.new_recovery_code()
        with self.assertRaises(VaultError):
            self.fresh().unlock(recovery=self.recovery)
        self.fresh().unlock(recovery=new_code)

    def test_lock_forgets_the_key(self) -> None:
        item = self.vault.add(b"secret", {}, b"")
        self.vault.lock()
        with self.assertRaises(VaultError):
            self.vault.image(item)

    def test_tampering_is_refused(self) -> None:
        item = self.vault.add(b"secret", {}, b"")
        path = self.root / "items" / f"{item}.flv"
        data = bytearray(path.read_bytes())
        data[-1] ^= 1
        path.write_bytes(bytes(data))
        with self.assertRaises(VaultError):
            self.vault.image(item)

    def test_swapped_files_are_refused(self) -> None:
        first = self.vault.add(b"first", {}, b"")
        second = self.vault.add(b"second", {}, b"")
        items = self.root / "items"
        (items / f"{first}.flv").write_bytes((items / f"{second}.flv").read_bytes())
        with self.assertRaises(VaultError):
            self.vault.image(first)

    def test_bad_ids_are_refused(self) -> None:
        for bad in ("../vault", "x" * 32, ""):
            with self.assertRaises(VaultError):
                self.vault.image(bad)

    def test_remove(self) -> None:
        item = self.vault.add(b"secret", {}, b"")
        self.vault.remove(item)
        self.assertEqual(self.vault.ids(), [])
        self.assertEqual(list((self.root / "items").iterdir()), [])

    def test_create_only_once_and_needs_a_real_password(self) -> None:
        with self.assertRaises(VaultError):
            self.vault.create("another one")
        with self.assertRaises(VaultError):
            Vault(Path(self.folder.name) / "other", {}).create("short")

    def test_header_holds_no_secrets(self) -> None:
        header = json.loads((self.root / "vault.json").read_text(encoding="utf-8"))
        self.assertEqual({s["kind"] for s in header["slots"]}, {"password", "recovery"})
        self.assertNotIn("private", json.dumps(header).lower().replace("publickey", ""))


@unittest.skipUnless(os.name == "nt", "the vault uses Windows cryptography")
class HelpersTest(unittest.TestCase):
    def test_hkdf_matches_rfc5869(self) -> None:
        # RFC 5869, test case 1.
        okm = hkdf(bytes.fromhex("0b" * 22), bytes.fromhex("000102030405060708090a0b0c"),
                   bytes.fromhex("f0f1f2f3f4f5f6f7f8f9"), 42)
        expected = "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865"
        self.assertEqual(okm.hex(), expected)

    def test_recovery_code_round_trip(self) -> None:
        secret = os.urandom(20)
        code = format_recovery(secret)
        self.assertRegex(code, r"^([A-Z2-7]{4}-){7}[A-Z2-7]{4}$")
        self.assertEqual(parse_recovery(code), secret)

    def test_real_password_stretching_setting(self) -> None:
        self.assertEqual(vault_module.SCRYPT, {"n": 2**17, "r": 8, "p": 1})


if __name__ == "__main__":
    unittest.main()
