# -*- coding: utf-8 -*-
"""
Builds a Hungarian-string -> message-key map out of lib/i18n/messages.ts.

Reading the map back from the dictionary rather than keeping a separate list means the
two can never drift: every key it offers is one that actually exists.
"""
import io
import json
import re

src = io.open("lib/i18n/messages.ts", encoding="utf-8").read()
hu_block = src.split("  hu: {", 1)[1].split("\n  },", 1)[0]

# Non-ASCII is a good enough proxy for "this is the Hungarian text": accent lists get
# mangled by every layer between here and the file.
entry = re.compile(r'"([A-Za-z][\w.]*)":\s*\n?\s*"((?:[^"\\]|\\.)*)"')

mapping = {}
for match in entry.finditer(hu_block):
    key, value = match.group(1), match.group(2)
    if len(value) > 3 and any(ord(ch) > 127 for ch in value):
        mapping.setdefault(value, key)

io.open("scripts/i18n-map.json", "w", encoding="utf-8").write(
    json.dumps(mapping, ensure_ascii=False, indent=1)
)
print("keys:", len(mapping))
