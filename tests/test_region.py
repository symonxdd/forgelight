"""Tests for reading Windows' regional format."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if os.name == "nt":
    from forgelight_backend import region


@unittest.skipUnless(os.name == "nt", "the extension runs on Windows")
class RegionTest(unittest.TestCase):
    def test_reads_this_computer(self) -> None:
        found = region.regional_format()
        self.assertEqual(set(found), {"locale", "decimal", "group", "hour12"})
        self.assertRegex(found["locale"], r"^[a-z]{2,3}(-|$)")
        self.assertTrue(found["decimal"])
        self.assertNotEqual(found["decimal"], found["group"])
        self.assertIsInstance(found["hour12"], bool)

    def test_falls_back_to_us(self) -> None:
        with mock.patch.object(region.ctypes, "WinDLL", side_effect=OSError("no kernel32")):
            self.assertEqual(region.regional_format(), region.US)


if __name__ == "__main__":
    unittest.main()
