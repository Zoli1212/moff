# -*- coding: utf-8 -*-
"""
Adds `const { t } = useLocale();` to every component in a file that calls t().

Files often hold more than one component - a page plus the modal it renders - and each
needs the hook in its own body. Wiring only the first one leaves the others failing to
compile, which is the good outcome; the bad one is a helper at module scope, where t()
can never work and the string has to go back to a literal instead.

Bodies are matched by brace balance rather than by regex alone, so a component is only
given the hook when the t() call is genuinely inside it.
"""
import io
import re
import sys

DECL = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:function\s+([A-Z]\w*)\s*\(|"
    r"const\s+([A-Z]\w*)[^=\n]*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)",
    re.M,
)


def body_range(source, start, skip_params=True):
    """
    Span of the component body.

    For a `function Foo({ a, b }: Props)` the parameter list has to be balanced past
    first, otherwise the destructuring brace is mistaken for the body. For an arrow
    component the match already consumed the parameters and ended at `=>`, so looking for
    another parenthesis finds one inside the body and lands the hook in the wrong place.
    """
    paren_at = source.find("(", start) if skip_params else -1
    if paren_at != -1:
        depth = 0
        for index in range(paren_at, len(source)):
            if source[index] == "(":
                depth += 1
            elif source[index] == ")":
                depth -= 1
                if depth == 0:
                    start = index
                    break

    open_at = source.find("{", start)
    if open_at == -1:
        return None
    depth = 0
    for index in range(open_at, len(source)):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return open_at, index
    return None


for path in sys.argv[1:]:
    try:
        source = io.open(path, encoding="utf-8").read()
    except OSError:
        continue
    if 't("' not in source:
        continue

    if "useLocale" not in source:
        first_import = re.search(r"^import .*?;\n", source, re.M)
        if not first_import:
            print("skip (no imports):", path)
            continue
        source = (
            source[: first_import.end()]
            + 'import { useLocale } from "@/components/i18n/LocaleProvider";\n'
            + source[first_import.end() :]
        )

    # Late to early, so an earlier insert never shifts a later offset.
    wired = []
    for match in reversed(list(DECL.finditer(source))):
        name = match.group(1) or match.group(2)
        # An arrow match ends at '=>', so its parameters are already behind us.
        is_arrow = source[match.start():match.end()].rstrip().endswith("=>")
        span = body_range(source, match.end() - 1, skip_params=not is_arrow)
        if not span:
            continue
        open_at, close_at = span
        body = source[open_at:close_at]
        # Any destructuring that already pulls t counts - the existing line is often
        # `const { t, money } = useLocale();`, and matching the exact one-name form
        # produced a duplicate declaration.
        if 't("' not in body or re.search(r"const\s*\{[^}]*t[^}]*\}\s*=\s*useLocale\(\)", body):
            continue
        source = (
            source[: open_at + 1]
            + "\n  const { t } = useLocale();\n"
            + source[open_at + 1 :]
        )
        wired.append(name)

    io.open(path, "w", encoding="utf-8").write(source)
    if wired:
        print("wired:", path.split("/")[-1], "->", ", ".join(reversed(wired)))
