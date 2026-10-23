"""Tests for the folders Settings lists, with Forge's settings faked."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if os.name == "nt":
    from forgelight_backend import library, newmodels

BASE = Path("C:/Forge/webui")
MODELS = {"checkpoint": BASE / "models/Stable-diffusion", "lora": BASE / "models/Lora"}


@unittest.skipUnless(os.name == "nt", "the extension runs on Windows")
class FoldersTest(unittest.TestCase):
    def folders(self, roots: dict[str, Path]) -> dict[str, Path]:
        with mock.patch.object(library, "roots", lambda: roots), mock.patch.object(newmodels, "targets", lambda: MODELS):
            return library.folders()

    def test_forge_defaults(self) -> None:
        found = self.folders({
            "txt2img": BASE / "outputs/txt2img-images",
            "img2img": BASE / "outputs/img2img-images",
            "extras": BASE / "outputs/extras-images",
        })
        self.assertEqual(found["outputs"], BASE / "outputs")
        self.assertEqual(found["upscaled"], BASE / "outputs/extras-images")
        self.assertEqual(found["checkpoints"], MODELS["checkpoint"])
        self.assertEqual(found["loras"], MODELS["lora"])
        self.assertEqual(found["data"].name, "data")

    def test_one_folder_for_everything(self) -> None:
        found = self.folders({"outputs": Path("D:/Pictures/AI")})
        self.assertEqual(found["outputs"], Path("D:/Pictures/AI"))
        self.assertEqual(found["upscaled"], Path("D:/Pictures/AI"))

    def test_output_folders_on_different_drives(self) -> None:
        found = self.folders({"txt2img": Path("D:/txt2img"), "extras": Path("E:/extras")})
        self.assertEqual(found["outputs"], Path("D:/txt2img"))
        self.assertEqual(found["upscaled"], Path("E:/extras"))

    def test_open_refuses_unknown_keys(self) -> None:
        with mock.patch.object(library, "folders", lambda: {"data": Path("C:/nowhere/at/all")}):
            for key in ("data", "C:\\Windows", "../.."):
                with self.assertRaises(FileNotFoundError):
                    library.open_folder(key)


if __name__ == "__main__":
    unittest.main()
