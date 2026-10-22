"""Tests for moving Library images into the vault and back, in a throwaway output folder."""

from __future__ import annotations

import io
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if os.name == "nt":
    from PIL import Image
    from PIL.PngImagePlugin import PngInfo

    from forgelight_backend import library, private, vault as vault_module
    from forgelight_backend.vault import Vault

SETTINGS = "a quiet lake\nNegative prompt: blurry\nSteps: 20, Sampler: Euler a, Seed: 1234, Size: 64x96"


def write_png(path: Path, settings: str) -> None:
    info = PngInfo()
    info.add_text("parameters", settings)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (64, 96), (40, 90, 140)).save(path, "PNG", pnginfo=info)


@unittest.skipUnless(os.name == "nt", "the vault uses Windows cryptography")
class LibraryPrivacyTest(unittest.TestCase):
    def setUp(self) -> None:
        self.folder = tempfile.TemporaryDirectory()
        base = Path(self.folder.name)
        self.outputs = base / "txt2img-images"
        self.thumbs = base / "thumbs"
        self.files: dict[str, object] = {}
        vault_module.SCRYPT, self.real_scrypt = {"n": 2**10, "r": 8, "p": 1}, vault_module.SCRYPT
        self.vault = Vault(base / "vault", {})
        self.vault.create("correct horse")
        patches = [
            mock.patch.object(library, "roots", lambda: {"txt2img": self.outputs}),
            mock.patch.object(library, "THUMBS", self.thumbs),
            mock.patch.object(library.store, "read", lambda name, default: self.files.get(name, default)),
            mock.patch.object(library.store, "write", lambda name, value: self.files.__setitem__(name, value)),
            mock.patch.object(library, "_index", None),
            mock.patch.object(library, "_scan", None),
            mock.patch.object(private, "vault", self.vault),
            mock.patch.dict(private._state, {"on": True, "jobs": {}, "metas": {}}),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

    def tearDown(self) -> None:
        vault_module.SCRYPT = self.real_scrypt
        self.folder.cleanup()

    def test_round_trip_keeps_file_date_settings_and_star(self) -> None:
        original = self.outputs / "2026-10-17" / "00007-1234.png"
        write_png(original, SETTINGS)
        stamp = time.mktime((2026, 10, 17, 21, 5, 0, 0, 0, -1))
        os.utime(original, (stamp, stamp))
        library.thumbnail("txt2img/2026-10-17/00007-1234.png")
        library.set_favorite("txt2img/2026-10-17/00007-1234.png", True)

        result = library.make_private(["txt2img/2026-10-17/00007-1234.png"])
        self.assertEqual(result, {"moved": 1, "failed": 0})
        self.assertFalse(original.exists())
        self.assertEqual(list(self.thumbs.iterdir()), [])
        [private_id] = [i for i in library.favorites() if i.startswith("private/")]
        meta = private.meta(private_id)
        self.assertEqual((meta["infotext"], meta["seed"], meta["kind"]), (SETTINGS, 1234, "txt2img"))
        self.assertEqual(meta["created"], stamp)

        result = library.make_public([private_id])
        self.assertEqual(result, {"moved": 1, "failed": 0})
        self.assertEqual(self.vault.ids(), [])
        back = self.outputs / "2026-10-17" / "00000-1234.png"
        self.assertTrue(back.is_file())
        self.assertEqual(back.stat().st_mtime, stamp)
        with Image.open(back) as image:
            self.assertEqual(image.info.get("parameters"), SETTINGS)
        self.assertEqual(library.favorites(), {"txt2img/2026-10-17/00000-1234.png"})

    def test_making_public_adds_missing_settings_and_never_overwrites(self) -> None:
        bare = io.BytesIO()
        Image.new("RGB", (8, 8), (1, 2, 3)).save(bare, "PNG")
        item = private.PREFIX + private.store(bare.getvalue(), "Steps: 1, Seed: 5", 5, "txt2img", 0.0)
        day = self.outputs / time.strftime("%Y-%m-%d", time.localtime(0))
        write_png(day / "00000-5.png", "someone else's")

        library.make_public([item])
        self.assertTrue((day / "00000-5.png").is_file())
        with Image.open(day / "00000-5.png") as image:
            self.assertEqual(image.info.get("parameters"), "someone else's")
        with Image.open(day / "00001-5.png") as image:
            self.assertEqual(image.info.get("parameters"), "Steps: 1, Seed: 5")

    def test_making_public_needs_the_vault_unlocked(self) -> None:
        item = private.PREFIX + private.store(self._png(), "", None)
        self.vault.lock()
        self.assertEqual(library.make_public([item]), {"moved": 0, "failed": 1})
        self.assertEqual(len(self.vault.ids()), 1)

    def test_making_private_works_while_locked_and_skips_unknown_ids(self) -> None:
        write_png(self.outputs / "2026-10-18" / "00001-9.png", "Seed: 9")
        self.vault.lock()
        result = library.make_private(["txt2img/2026-10-18/00001-9.png", "txt2img/../../secret.png", "private/x"])
        self.assertEqual(result, {"moved": 1, "failed": 2})

    @staticmethod
    def _png() -> bytes:
        out = io.BytesIO()
        Image.new("RGB", (4, 4)).save(out, "PNG")
        return out.getvalue()


if __name__ == "__main__":
    unittest.main()
