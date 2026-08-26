# -*- coding: utf-8 -*-
"""
Merges scripts/i18n-batch.json into lib/i18n/messages.ts.

The batch file is {key: [hungarian, english]}. Keys already present are skipped, so the
script can be re-run without duplicating anything.
"""
import io
import json

batch = json.load(io.open("scripts/i18n-batch.json", encoding="utf-8"))
path = "lib/i18n/messages.ts"
source = io.open(path, encoding="utf-8").read()

added = 0
hu_lines = []
en_lines = []
for key, (hu, en) in batch.items():
    if '"%s":' % key in source:
        continue
    hu_lines.append('    %s: %s,\n' % (json.dumps(key), json.dumps(hu, ensure_ascii=False)))
    en_lines.append('    %s: %s,\n' % (json.dumps(key), json.dumps(en, ensure_ascii=False)))
    added += 1

if added:
    hu_anchor = '    "scenarios.title": "Alternatívák",'
    en_anchor = '    "scenarios.title": "Alternatives",'
    source = source.replace(hu_anchor, "".join(hu_lines) + "\n" + hu_anchor, 1)
    source = source.replace(en_anchor, "".join(en_lines) + "\n" + en_anchor, 1)
    io.open(path, "w", encoding="utf-8").write(source)

print("added:", added)
