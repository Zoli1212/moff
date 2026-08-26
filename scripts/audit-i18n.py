# -*- coding: utf-8 -*-
"""
Flags translated strings that are being used as data rather than as labels.

Some Hungarian text in this codebase is parsed, not displayed: "Kérdés:" and
"Tisztázandó kérdések" are searched for inside AI-written descriptions to pull out the
questions. Turning those into t("...") compiles perfectly and silently stops the
feature working, which is the worst kind of breakage.

Anything this prints must be reverted to the literal string.
"""
import io
import re
import sys

SUSPICIOUS = re.compile(
    r"(startsWith|endsWith|includes|indexOf|lastIndexOf|split|match|replace|"
    r"===|!==|==|!=)\s*\(?\s*t\(\""
)

failures = 0
for path in sys.argv[1:]:
    try:
        source = io.open(path, encoding="utf-8").read()
    except OSError:
        continue
    for number, line in enumerate(source.splitlines(), start=1):
        if SUSPICIOUS.search(line):
            print("%s:%d  %s" % (path, number, line.strip()[:110]))
            failures += 1

print("clean" if not failures else "SUSPECT LINES: %d" % failures)
sys.exit(1 if failures else 0)
