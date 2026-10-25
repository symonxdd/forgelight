"""Tests for what Settings > System reads, with the graphics card and firmware faked."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if os.name == "nt":
    from forgelight_backend import system


def structure(kind: int, body: bytes, strings: bytes = b"") -> bytes:
    """One SMBIOS structure: type, length, handle, the rest of the formatted area, then its strings."""
    formatted = bytes([kind, 4 + len(body), 0, 0]) + body
    return formatted + (strings + b"\0" if strings else b"\0\0")


@unittest.skipUnless(os.name == "nt", "the extension runs on Windows")
class CaseTypeTest(unittest.TestCase):
    def test_finds_the_enclosure_after_other_structures(self) -> None:
        bios = structure(0, b"\x01\x02", b"Maker\0Version\0")
        enclosure = structure(3, b"\x01\x0a\x02", b"Maker\0")  # manufacturer, case type 10 (Notebook)
        end = structure(127, b"")
        self.assertEqual(system._case_type_in(bios + enclosure + end), 10)

    def test_masks_the_lock_bit(self) -> None:
        self.assertEqual(system._case_type_in(structure(3, b"\x00\x83")), 3)

    def test_none_without_an_enclosure(self) -> None:
        self.assertIsNone(system._case_type_in(structure(0, b"\x01") + structure(127, b"")))
        self.assertIsNone(system._case_type_in(b""))


@unittest.skipUnless(os.name == "nt", "the extension runs on Windows")
class PeakTest(unittest.TestCase):
    def test_peak_since_a_moment(self) -> None:
        samples = [(100.0, 3), (101.0, 5), (102.0, 4)]
        with mock.patch.dict(system._state, {"samples": samples}), mock.patch.object(system, "_vram", return_value=(4, 6)):
            self.assertEqual(system.peak(100.5), {"peak": 5, "total": 6})
            self.assertEqual(system.peak(103.0), {"peak": None, "total": 6})

    def test_samples_only_while_generating(self) -> None:
        samples: list = []
        with mock.patch.dict(system._state, {"samples": samples}), mock.patch.object(system, "_vram", return_value=(4, 6)):
            with mock.patch.object(system, "_generating", return_value=False):
                self.assertEqual(system._sample(), 0.5)
            self.assertEqual(samples, [])
            with mock.patch.object(system, "_generating", return_value=True):
                self.assertEqual(system._sample(), 0.2)
            self.assertEqual(len(samples), 1)
            self.assertEqual(samples[0][1], 4)


if __name__ == "__main__":
    unittest.main()
