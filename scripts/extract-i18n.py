# -*- coding: utf-8 -*-
"""
Lists Hungarian strings in a file that the dictionary does not know yet.

Writes JSON rather than printing, because the console here is cp1250 and dies on the
first emoji it meets - and this codebase has emoji in its log messages.
"""
import io
import json
import re
import sys

known = set(json.load(io.open("scripts/i18n-map.json", encoding="utf-8")).keys())

# Text nodes and quoted literals. Deliberately loose: a human reads the output and
# decides what is a label, so over-collecting costs nothing.
PATTERN = re.compile(r'>\s*([^<>{}"\n]{3,70}?)\s*<|"([^"\n]{3,70})"')

# Placeholders carry Hungarian examples and addresses; translating them is a content
# decision about the market, not a string swap.
SKIP_PREFIX = ("http", "/", "#", "pl.", "Pl.", "Pl:", "pl:")

result = {}
for path in sys.argv[1:]:
    try:
        source = io.open(path, encoding="utf-8").read()
    except OSError:
        continue
    found = set()
    for match in PATTERN.finditer(source):
        value = (match.group(1) or match.group(2) or "").strip()
        if not value or value in known:
            continue
        if value.startswith(SKIP_PREFIX):
            continue
        # Non-ASCII stands in for "Hungarian": accent classes get mangled in transit.
        if any(ord(ch) > 127 for ch in value):
            found.add(value)
    if found:
        result[path] = sorted(found)

io.open("scripts/i18n-todo.json", "w", encoding="utf-8").write(
    json.dumps(result, ensure_ascii=False, indent=1)
)
print("files:", len(result), "strings:", sum(len(v) for v in result.values()))
