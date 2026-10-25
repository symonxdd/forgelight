"""Windows' regional format, so the page writes numbers and dates the way the rest of Windows does.

Read from Settings > Time & language > Language & region > Regional format, including
any separators the user changed there. Read-only.
"""

from __future__ import annotations

import ctypes

_LOCALE_NAME_MAX_LENGTH = 85
_LOCALE_SDECIMAL = 0x0E
_LOCALE_STHOUSAND = 0x0F
_LOCALE_SSHORTTIME = 0x79

US = {"locale": "en-US", "decimal": ".", "group": ",", "hour12": True}


def _info(kernel32: ctypes.WinDLL, kind: int) -> str:
    buffer = ctypes.create_unicode_buffer(80)
    # A null locale name means the user's own format, with their changes.
    if not kernel32.GetLocaleInfoEx(None, kind, buffer, len(buffer)):
        raise OSError(ctypes.get_last_error())
    return buffer.value


def regional_format() -> dict:
    """The locale name, the decimal and thousands separators, and whether times use AM/PM."""
    try:
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        name = ctypes.create_unicode_buffer(_LOCALE_NAME_MAX_LENGTH)
        if not kernel32.GetUserDefaultLocaleName(name, _LOCALE_NAME_MAX_LENGTH):
            raise OSError(ctypes.get_last_error())
        return {
            "locale": name.value,
            "decimal": _info(kernel32, _LOCALE_SDECIMAL),
            "group": _info(kernel32, _LOCALE_STHOUSAND),
            # "HH:mm" is a 24-hour clock, "h:mm tt" a 12-hour one.
            "hour12": "h" in _info(kernel32, _LOCALE_SSHORTTIME),
        }
    except (AttributeError, OSError):
        return dict(US)
