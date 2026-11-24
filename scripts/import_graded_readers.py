# Imports the A1 Graded Readers (Weeks 1-15) into src/data/generated/graded-readers.json for the Vocabulary page.
#   python scripts/import_graded_readers.py [path-to-A1_Graded_Readers_Stories_1-15.md]
# Student version only: Teacher Notes are dropped. The teacher's own name never appears in the app,
# so the class teacher in the stories becomes "Mr Adel" (same rule as import_iatc_content.py).
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SRC = os.path.join(HERE, "..", "..", "..", "EFL Instructor Agent", "Graded_Readers", "A1_Graded_Readers_Stories_1-15.md")
OUT = os.path.join(HERE, "..", "src", "data", "generated", "graded-readers.json")

SETTINGS = {1: "A first English class", 2: "Tourists at a famous tower in Riyadh", 3: "A charity walk in Abha",
            4: "A football match at the stadium", 5: "A restaurant in Jeddah", 6: "A busy week and a desert trip",
            7: "A train journey to Hail", 8: "A new flat and lost car keys", 9: "Eid with Grandfather",
            10: "A weekend in AlUla", 11: "A video call to Canada", 12: "Healthy shopping",
            13: "Volunteers at a winter shelter", 14: "Studying abroad", 15: "The English club play"}


def clean(t: str) -> str:
    t = re.sub(r"(\*\*Mr\*\*|Mr) (Hassan|Said)\b", r"\1 Adel", t)  # also "**Mr** Hassan" (only "Mr" bold)
    return t.replace("’", "'").strip()


def items(body: str, pattern: str):
    return [m.groups() for m in (re.match(pattern, l) for l in body.split("\n")) if m]


def main(src: str):
    md = open(src, encoding="utf-8").read()
    readers = []
    for chunk in re.split(r"\n(?=# Week \d+:)", md):
        m = re.match(r"# Week (\d+): (.+)", chunk)
        if not m:
            continue
        week = int(m.group(1))
        sec = {}
        for part in re.split(r"\n## ", chunk)[1:]:
            name, _, body = part.partition("\n")
            sec[name.strip()] = body.replace("\n---", "").strip("\n")
        focus = re.search(r"\*\*Vocabulary focus:\*\* (.+)", chunk).group(1)
        story = []
        for line in sec["Story"].split("\n"):
            line = clean(line)
            if not line:
                continue
            d = re.match(r"^\*\*([^*]+):\*\*\s*(.*)$", line)  # "**Saad:** Hello!" (Weeks 1-5 script style)
            story.append({"speaker": d.group(1), "text": d.group(2)} if d else {"text": line})
        vocab = []
        for l in sec["Vocabulary Check"].split("\n"):
            cells = [clean(c) for c in l.strip().strip("|").split("|")]
            if len(cells) == 4 and cells[0] != "Word or phrase" and not set(cells[0]) <= set("-: "):
                vocab.append({"word": cells[0], "ar": cells[1], "meaning": cells[2], "example": cells[3]})
        readers.append({
            "week": week,
            "title": clean(m.group(2)),
            "setting": SETTINGS[week],
            "focus": [clean(x) for x in re.split(r",\s(?![^()]*\))", focus)],
            "story": story,
            "check": [clean(q) for (q,) in items(sec["Check Your Understanding"], r"^\d+\.\s(.+)$")],
            "talk": [clean(q) for (q,) in items(sec["Talk About It"], r"^\d+\.\s(.+)$")],
            "vocab": vocab,
            "more": [{"word": clean(w), "meaning": clean(x)} for w, x in items(sec["More Words from This Week"], r"^- \*\*(.+?)\*\* – (.+)$")],
        })
    assert len(readers) == 15, len(readers)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(readers, f, ensure_ascii=False, indent=1)
    print(f"wrote {OUT}: {len(readers)} readers")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC)
