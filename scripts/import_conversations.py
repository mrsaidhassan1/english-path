"""
Builds src/data/generated/conversations.json from the A1 "Week N Conversations" PDFs (5 per unit, Units 1-14).
    python -I scripts/import_conversations.py
Each page = one conversation: title, theme, setting, people and the spoken lines. The word "Week" is never written
to the output (the app says Unit).
"""
import json
import os
import re
import sys

import pymupdf

sys.stdout.reconfigure(encoding="utf-8")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.normpath(os.path.join(APP, "..", "..", "IATC English", "Resources", "A1", "A1 Weekly Materials"))
OUT = os.path.join(APP, "src", "data", "generated", "conversations.json")


def clean(s):
    return re.sub(r"\s+", " ", s.replace("\u200f", "")).strip()


def parse_page(text, unit):
    lines = [l.strip() for l in text.split("\n")]
    lines = [l for l in lines if l]
    lesson = None
    for i, l in enumerate(lines):
        if re.fullmatch(r"Lesson [1-5]", l) and i > len(lines) - 4:
            lesson = int(l.split()[1])
    assert lesson, f"no lesson number, unit {unit}"
    i = 1  # skip "WEEK N • CONVERSATION"
    title = lines[i]; i += 1
    # theme (may wrap onto the next line) up to "Where:"
    theme = []
    while not lines[i].startswith("Where:"):
        theme.append(lines[i]); i += 1
    theme = clean(" ".join(theme))
    raw = lines[i]
    i += 1
    while i < len(lines) and ("•" in lines[i] or raw.rstrip().endswith(("•", "People:"))):  # the People list can wrap onto the next line
        raw += " " + lines[i]
        i += 1
    m = re.match(r"Where:\s*(.*?)\s+People:\s*(.*)", clean(raw))
    assert m, (unit, lesson, raw)
    where, people = m.group(1), [clean(p) for p in m.group(2).split("•") if clean(p)]
    turns = []
    while i < len(lines) and lines[i] != "Practise":
        if lines[i] in people:
            turns.append({"speaker": lines[i], "text": []})
        else:
            assert turns, (unit, lesson, lines[i])
            turns[-1]["text"].append(lines[i])
        i += 1
    for t in turns:
        t["text"] = clean(" ".join(t["text"]))
    theme_parts = {k: clean(v) for k, v in re.findall(r"(Theme|Reading|Grammar):\s*(.*?)(?=\s+[•]\s+(?:Reading|Grammar):|$)", theme.replace("Theme:", "Theme:", 1))}
    topic = re.sub(r"^Theme:\s*", "", theme.split("•  Reading:")[0].split(" • Reading:")[0]).strip()
    return {
        "unit": unit, "lesson": lesson, "title": clean(title),
        "where": where, "people": people, "lines": turns,
    }


def main():
    out = []
    for u in range(1, 15):
        pdf = os.path.join(ROOT, f"Week {u}", f"Week_{u}_Conversations_A1.pdf")
        doc = pymupdf.open(pdf)
        assert len(doc) == 5, (u, len(doc))
        for p in doc:
            out.append(parse_page(p.get_text(), u))
    out.sort(key=lambda c: (c["unit"], c["lesson"]))
    blob = json.dumps(out, ensure_ascii=False, indent=1)
    for m in re.finditer(r"\bweeks?\b", blob, re.I):
        print("WEEK FOUND:", blob[max(0, m.start() - 70):m.end() + 30].replace("\n", " "))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(blob)
    n = sum(len(c["lines"]) for c in out)
    print(f"{len(out)} conversations, {n} lines")
    for c in out:
        print(f'U{c["unit"]} L{c["lesson"]}: {c["title"]} | {len(c["lines"])} lines | {", ".join(c["people"])}')


main()
