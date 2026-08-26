# -*- coding: utf-8 -*-
"""
Adds the useLocale import and the `const { t } = useLocale();` line to components that
now call t() but do not have it in scope.

Only touches components that already reference t(", so it cannot pull the hook into a
file that does not need it. Skips anything where t is used outside a component body -
those are module-level helpers parsing text, and they need the literal string back, not
a hook.
"""
import io
import re
import sys

COMPONENT = re.compile(
    r"^(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w*)\s*\([^)]*\)\s*(?::[^{]+)?\{",
    re.M,
)

for path in sys.argv[1:]:
    try:
        source = io.open(path, encoding="utf-8").read()
    except OSError:
        continue

    if 't("' not in source or "useLocale" in source:
        continue

    match = COMPONENT.search(source)
    if not match:
        print("skip (no component found):", path)
        continue

    first_import = re.search(r"^import .*?;\n", source, re.M)
    if not first_import:
        print("skip (no imports):", path)
        continue

    source = (
        source[: first_import.end()]
        + 'import { useLocale } from "@/components/i18n/LocaleProvider";\n'
        + source[first_import.end() :]
    )

    match = COMPONENT.search(source)
    source = (
        source[: match.end()] + "\n  const { t } = useLocale();\n" + source[match.end() :]
    )

    io.open(path, "w", encoding="utf-8").write(source)
    print("wired:", path.split("/")[-1], "->", match.group(1))
