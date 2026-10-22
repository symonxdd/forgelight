"""Tests for private generations: Forge's reply is replaced by a stand-in, nothing runs on the GPU."""

from __future__ import annotations

import base64
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if os.name == "nt":
    from PIL import Image

    from forgelight_backend import private, vault as vault_module
    from forgelight_backend.vault import Vault, VaultError


def png(width: int, height: int, color: tuple[int, int, int]) -> str:
    out = io.BytesIO()
    Image.new("RGB", (width, height), color).save(out, "PNG")
    return base64.b64encode(out.getvalue()).decode("ascii")


class FakeResponse:
    def __init__(self, status: int, body: dict) -> None:
        self.status_code, self._body = status, body

    def json(self) -> dict:
        return self._body


@unittest.skipUnless(os.name == "nt", "the vault uses Windows cryptography")
class PrivateTest(unittest.TestCase):
    def setUp(self) -> None:
        self.folder = tempfile.TemporaryDirectory()
        vault_module.SCRYPT, self.real_scrypt = {"n": 2**10, "r": 8, "p": 1}, vault_module.SCRYPT
        self.vault = Vault(Path(self.folder.name) / "vault", {})
        self.vault.create("correct horse")
        self.vault.lock()
        patches = [
            mock.patch.object(private, "vault", self.vault),
            mock.patch.object(private, "_forge_url", lambda path: f"http://forge{path}"),
            mock.patch.dict(private._state, {"on": True, "jobs": {}}),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

    def tearDown(self) -> None:
        vault_module.SCRYPT = self.real_scrypt
        self.folder.cleanup()

    def run_job(self, reply: FakeResponse, kind: str = "txt2img") -> tuple[dict, dict]:
        sent = {}

        def fake_post(url: str, json: dict, timeout: object) -> FakeResponse:
            sent.update(url=url, body=json)
            return reply

        with mock.patch.object(private.requests, "post", fake_post):
            private._state["jobs"]["task(1)"] = {"status": "running", "at": 0}
            private._run(kind, {"force_task_id": "task(1)", "save_images": False}, "task(1)")
        return sent, private.result("task(1)")

    def test_saves_encrypted_and_hands_the_reply_out_once(self) -> None:
        grid, first, second = png(64, 32, (0, 0, 0)), png(832, 1216, (255, 0, 0)), png(832, 1216, (0, 0, 255))
        info = {"index_of_first_image": 1, "all_seeds": [11, 12], "infotexts": ["grid", "first", "second"]}
        sent, job = self.run_job(FakeResponse(200, {"images": [grid, first, second], "info": json.dumps(info)}))

        self.assertEqual(sent["url"], "http://forge/sdapi/v1/txt2img")
        self.assertFalse(sent["body"]["save_images"])
        self.assertEqual(job["status"], "done")
        self.assertEqual(len(job["images"]), 3)
        self.assertEqual(private.result("task(1)"), {"status": "unknown"})

        # The grid is not kept; both images are, and they open only once unlocked.
        ids = self.vault.ids()
        self.assertEqual(len(ids), 2)
        with self.assertRaises(VaultError):
            self.vault.meta(ids[0])
        self.vault.unlock(password="correct horse")
        metas = sorted((self.vault.meta(i)[0] for i in ids), key=lambda m: m["seed"])
        self.assertEqual([(m["seed"], m["infotext"], m["width"], m["height"]) for m in metas],
                         [(11, "first", 832, 1216), (12, "second", 832, 1216)])
        thumb = self.vault.meta(ids[0])[1]
        with Image.open(io.BytesIO(thumb)) as image:
            self.assertEqual(image.format, "WEBP")
            self.assertLessEqual(image.width, private.THUMB_WIDTH)

    def test_forge_errors_are_reported(self) -> None:
        _, job = self.run_job(FakeResponse(500, {"detail": "CUDA out of memory"}))
        self.assertEqual(job, {"status": "error", "message": "CUDA out of memory"})
        self.assertEqual(self.vault.ids(), [])

    def test_generate_forces_no_saving_and_checks_input(self) -> None:
        with self.assertRaises(VaultError):
            private.generate("extras", {"force_task_id": "task(2)"})
        with self.assertRaises(VaultError):
            private.generate("txt2img", {"prompt": "no task id"})
        with mock.patch.object(private.threading, "Thread") as thread:
            private.generate("img2img", {"force_task_id": "task(3)", "save_images": True})
        kind, body, task = thread.call_args.kwargs["args"]
        self.assertEqual((kind, task, body["save_images"]), ("img2img", "task(3)", False))
        self.assertEqual(private.result("task(3)"), {"status": "running"})

    def test_switching_to_public_locks(self) -> None:
        self.vault.unlock(password="correct horse")
        private.set_on(False)
        self.assertFalse(self.vault.is_unlocked())
        self.assertEqual(private.status(), {"setUp": True, "on": False, "unlocked": False})


if __name__ == "__main__":
    unittest.main()
