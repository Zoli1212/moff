# -*- coding: utf-8 -*-
"""
Replaces known Hungarian strings in a component with t("key") calls.

Three contexts, three replacements, because JSX treats them differently:
  foo="Text"   ->  foo={t("key")}      attributes need braces
  >Text<       ->  >{t("key")}<        text nodes need braces
  "Text"       ->  t("key")            plain literals do not

Run scripts/audit-i18n.py afterwards. Some Hungarian strings are data - they parse
AI-written text - and replacing those compiles cleanly while breaking the feature.
"""
import io
import json
import re
import sys

path = sys.argv[1]
mapping = json.load(io.open("scripts/i18n-map.json", encoding="utf-8"))
source = io.open(path, encoding="utf-8").read()

# Longest first, so "Tételek pontosítása" is not partly eaten by "Tételek".
pairs = sorted(mapping.items(), key=lambda kv: -len(kv[0]))
counts = {"attr": 0, "jsx": 0, "literal": 0}

for text, key in pairs:
    source, n = re.subn(
        r'(\b[a-zA-Z-]+)="' + re.escape(text) + r'"',
        lambda m: '%s={t("%s")}' % (m.group(1), key),
        source,
    )
    counts["attr"] += n

for text, key in pairs:
    source, n = re.subn(
        r">(\s*)" + re.escape(text) + r"(\s*)<",
        lambda m: ">" + m.group(1) + '{t("%s")}' % key + m.group(2) + "<",
        source,
    )
    counts["jsx"] += n

for text, key in pairs:
    literal = '"%s"' % text
    if literal in source:
        counts["literal"] += source.count(literal)
        source = source.replace(literal, 't("%s")' % key)

io.open(path, "w", encoding="utf-8").write(source)
print(path.split("/")[-1], counts, "total:", sum(counts.values()))
