"""
Import IATC English A0-A1 resources into the A1 English WebApp.

Reads the structured JSON/TXT sources that drive the FND 68 Word, PDF and
PowerPoint materials (tools/*/content) and writes one app content file:

    src/data/generated/iatc-content.json

Every imported item keeps a `src` reference (source file + location + the
classroom document it appears in) so the teacher can find and edit the
original. Run again after editing the sources:

    python scripts/import_iatc_content.py

Rules applied on import
- The teacher's personal name is never copied into the app ("Mr Said" -> "Mr Adel").
- Items that touch IATC "AVOID" topics (music, birthdays, dating, etc.) are skipped
  and listed in the import report.
- Nothing from published coursebooks is imported: only Said's own materials.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parents[1]  # .../IATC English
TOOLS = ROOT / "tools"
WEEKS = ROOT / "FND68" / "CLass FND 68" / "A0 - A1 Resources" / "A0 - A1 Weekly Materials"
OUT = APP / "src" / "data" / "generated" / "iatc-content.json"

AVOID = re.compile(
    r"\b(music|musician|musicians|song|songs|singing|singer|guitar|piano|birthday|birthdays|christmas|"
    r"dancing|dance|girlfriend|boyfriend|dating|alcohol|wine|beer|magic|witch|ghost|playing cards)\b",
    re.I,
)
report = {"skipped": [], "nameReplacements": 0}


def clean(value):
    """Recursively strip the teacher's personal name from any text."""
    if isinstance(value, str):
        new, n = re.subn(r"\bMr\.? Said\b", "Mr Adel", value)
        new, m = re.subn(r"Said Hassan( — EFL Instructor at IATC Riyadh)?", "", new)
        new = new.replace("سعيد حسن", "")
        report["nameReplacements"] += n + m
        return new
    if isinstance(value, list):
        return [clean(v) for v in value]
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    return value


def is_safe(item, label: str) -> bool:
    text = json.dumps(item, ensure_ascii=False)
    hit = AVOID.search(text)
    if hit:
        report["skipped"].append({"item": label, "reason": f"avoid-topic word: '{hit.group(0)}'"})
        return False
    return True


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8-sig"))  # some files are saved with a BOM


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def week_doc(week: int, pattern: str) -> str | None:
    folder = WEEKS / f"Week {week}"
    hits = sorted(folder.glob(pattern)) if folder.exists() else []
    return rel(hits[0]) if hits else None


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# ---------------------------------------------------------------- Oxford 3000 A1
ox_path = TOOLS / "weekly-pack/content/oxford3000_A1.txt"
oxford = []
for line in ox_path.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or re.fullmatch(r"\d+ /", line) or line.endswith("."):
        continue
    oxford.append(line)
ox_set = set()
for w in oxford:
    for part in re.split(r",\s*", w):
        ox_set.add(part.lower())


def in_oxford(word: str) -> bool:
    w = re.sub(r"[?!.]", "", word.lower()).strip()
    if w in ox_set:
        return True
    parts = [p for p in re.split(r"[\s/]+", w) if p]
    return bool(parts) and all(p in ox_set for p in parts)


# ---------------------------------------------------------------- vocabulary + daily lessons
vocab: dict[str, dict] = {}
days = []
mocks = []
units = []
# Week 1's deck has four days (Mon–Thu) but five readings (Sun–Thu): reading k uses deck day W1_DECK[k].
W1_DECK = [0, 1, 1, 2, 3]
# Every week that has both a deck file and a reading file becomes a unit (Week N = Unit N).
UNIT_WEEKS = [w for w in range(1, 40) if (TOOLS / f"weekly-pack/content/week{w}.json").exists() and (TOOLS / f"weekly-pack/content/readings/week{w}.json").exists()]
for week in UNIT_WEEKS:
    p = TOOLS / f"weekly-pack/content/week{week}.json"
    wk = clean(load(p))
    rd_path = TOOLS / f"weekly-pack/content/readings/week{week}.json"
    readings = clean(load(rd_path))["days"] if rd_path.exists() else []
    words_doc = week_doc(week, "FND_68_Week_*_Words.docx")
    deck_days = []
    for i, d in enumerate(wk["days"]):
        day_id = f"w{week}d{i + 1}"
        word_ids = []
        for j, row in enumerate(d.get("words", [])):
            word, ar, pos, meaning, example = (row + [""] * 5)[:5]
            entry = {"word": word, "ar": ar, "pos": pos, "meaning": meaning, "example": example}
            if not is_safe(entry, f"word '{word}' (week {week} {d['day']})"):
                continue
            wid = slug(word)
            if wid in vocab:
                word_ids.append(wid)
                continue
            vocab[wid] = {
                "id": wid,
                **entry,
                "topic": d["theme"],
                "week": week,
                "day": day_id,
                "oxfordA1": in_oxford(word),
                "src": {
                    "file": rel(p),
                    "at": f"days[{i}].words[{j}]",
                    "doc": words_doc,
                    "label": f"Week {week} word list · {d['day']}: {d['theme']}",
                },
            }
            word_ids.append(wid)
        alt = next((r for r in readings if r.get("day") == d["day"]), None)
        lesson = {
            "id": day_id,
            "week": week,
            "day": d["day"],
            "theme": d["theme"],
            "grammarTitle": d.get("grammarTitle", ""),
            "smart": d.get("smart", ""),
            "words": word_ids,
            "grammar": d.get("grammar"),
            "reading": {"title": d.get("readingTitle", ""), "text": d.get("reading", ""), "comp": d.get("comp", []), "tf": d.get("tf", [])},
            "opp": d.get("opp", []),
            "plur": d.get("plur", []),
            "writing": {**(d.get("writing") or {}), "title": d.get("writingTitle", "")},
            "speaking": d.get("speaking", []),
            "dictation": d.get("dictation"),
            "src": {"file": rel(p), "at": f"days[{i}]", "doc": week_doc(week, "FND_68_Week_*_A1_Lesson_Slides.pptx"),
                    "label": f"Week {week} · {d['day']} lesson: {d['theme']}"},
        }
        if alt and is_safe(alt.get("reading", ""), f"reading '{alt.get('readingTitle')}' (week {week})"):
            lesson["reading2"] = {
                "title": alt.get("readingTitle", ""),
                "text": alt.get("reading", ""),
                "keywords": alt.get("keywords", []),
                "comp": alt.get("comp", []),
                "tf": alt.get("tf", []),
                "writing": alt.get("writing"),
                "src": {"file": rel(rd_path), "at": f"days[{readings.index(alt)}]",
                        "doc": week_doc(week, f"FND68_Week{week}_Reading_{readings.index(alt) + 1}_*.pdf"),
                        "label": f"Week {week} reading {readings.index(alt) + 1}: {alt.get('readingTitle', '')}"},
            }
        if not is_safe(lesson["reading"], f"reading '{lesson['reading']['title']}' (week {week})"):
            lesson["reading"] = None
        days.append(lesson)
        deck_days.append(lesson)
    # ---- Unit N = Week N (New Headway Beginner Unit N): one lesson per reading day, Sunday–Thursday
    unit_days = []
    for k, r in enumerate(readings):
        di = W1_DECK[k] if week == 1 else min(k, len(deck_days) - 1)
        dd = deck_days[di]
        words = dd["words"]
        if week == 1 and di == 1:  # Monday and Tuesday share one deck day: split its words
            half = (len(words) + 1) // 2
            words = words[:half] if k == 1 else words[half:]
        if not is_safe({kk: r.get(kk) for kk in ("reading", "comp", "tf", "writing")}, f"reading '{r.get('readingTitle')}' (week {week})"):
            continue
        rsrc = {"file": rel(rd_path), "at": f"days[{k}]",
                "doc": week_doc(week, f"FND68_Week{week}_Reading_{k + 1}_*.pdf"),
                "label": f"Week {week} reading {k + 1} ({r['day']}): {r.get('readingTitle', '')}"}
        unit_days.append({
            "id": f"u{week}d{k + 1}",
            "day": r["day"],
            "theme": r.get("theme", dd["theme"]),
            "deckDay": dd["id"],
            "grammarTitle": dd["grammarTitle"],
            "smart": dd["smart"],
            "words": words,
            # the shared deck day's grammar is taught once (Monday)
            "grammar": None if (week == 1 and k == 2) else dd["grammar"],
            "reading": {"title": r.get("readingTitle", ""), "text": r.get("reading", ""), "keywords": r.get("keywords", []),
                        "comp": r.get("comp", []), "tf": r.get("tf", []), "src": rsrc},
            "opp": r.get("opp", []) or dd["opp"],
            "plur": r.get("plur", []) or dd["plur"],
            "writing": {**(r.get("writing") or {}), "title": r.get("writingTitle", "")},
            "speaking": dd["speaking"],
            "src": dd["src"],
        })
    units.append({
        "n": week, "week": week, "collegeWeek": wk.get("collegeWeek"), "dates": wk.get("dates", ""),
        "focus": re.sub(r"^Headway Beginner Unit \d+:\s*", "", wk.get("focus", "")),
        "headwayUnit": week,
        "review": wk.get("review", []),
        "days": unit_days,
        "src": {"file": rel(rd_path), "at": "", "doc": f"FND68/CLass FND 68/A0 - A1 Resources/A0 - A1 Weekly Materials/Week {week}/",
                "label": f"A0 – A1 Weekly Materials · Week {week} (New Headway Beginner Unit {week})"},
    })
    m = wk.get("mock")
    if m and is_safe(m, f"mock week {week}"):
        mocks.append({
            "id": f"mock-w{week}",
            "week": week,
            "title": m.get("title", f"Week {week} mock"),
            "p1intro": m.get("p1intro", ""),
            "email": m.get("email", []),
            "p1": m.get("p1", []), "p2": m.get("p2", []), "p3": m.get("p3", []),
            "p4": m.get("p4", []), "p5": m.get("p5", []),
            "writing": m.get("writing"),
            "src": {"file": rel(p), "at": "mock",
                    "doc": week_doc(week, "FND_68_Week_*_Teacher_Version.docx"),
                    "label": f"Week {week} {m.get('shortTag', 'mock')} (teacher version has the key)"},
        })

# ---------------------------------------------------------------- topic words (A1 Vocabulary Topics)
topics = []
tp = TOOLS / "weekly-pack/content/topic-words/a1_topics.txt"
current = None
for n, line in enumerate(tp.read_text(encoding="utf-8").splitlines(), 1):
    if line.startswith("# ") or not line.strip():
        continue
    if line.startswith("## "):
        title, ar, frame = (line[3:].split("|") + ["", ""])[:3]
        if AVOID.search(title) or title in ("My Favourite Movie",):
            report["skipped"].append({"item": f"topic '{title}'", "reason": "avoid / caution topic"})
            current = None
            continue
        current = {"id": slug(title), "title": title, "ar": ar, "frame": frame, "words": []}
        topics.append(current)
        continue
    if current is None:
        continue
    word, ar, pos, meaning, example = (line.split("|") + [""] * 5)[:5]
    entry = clean({"word": word, "ar": ar, "pos": pos, "meaning": meaning, "example": example})
    if not is_safe(entry, f"topic word '{word}'"):
        continue
    wid = slug(word)
    if wid not in vocab:
        vocab[wid] = {"id": wid, **entry, "topic": current["title"], "week": None, "day": None,
                      "oxfordA1": in_oxford(word),
                      "src": {"file": rel(tp), "at": f"line {n}",
                              "doc": "FND68/CLass FND 68/A0 - A1 Resources/A1 Vocabulay/A1 Vocabulary Topics/FND_68_A1_Vocabulary_Topics_Words.docx",
                              "label": f"A1 Vocabulary Topics · {current['title']}"}}
    current["words"].append(wid)

# ---------------------------------------------------------------- grammar decks
grammar = []
for n in range(1, 21):
    p = TOOLS / f"grammar-deck/content/grammar{n}.json"
    if not p.exists():
        continue
    g = clean(load(p))
    grammar.append({
        "id": f"g{n}", "num": n, "title": g.get("title"), "sub": g.get("sub"), "ar": g.get("arabic"),
        "smart": g.get("smart"), "objectives": g.get("objectives", []), "warmup": g.get("warmup", []),
        "table": g.get("table"), "overviewTitle": g.get("overviewTitle"), "overview": g.get("overview", []),
        "rules": g.get("rules", []), "watch": g.get("watch"), "watchNote": g.get("watchNote"),
        # Question sections hold [question, answer] pairs; keep them as one line "Q — A".
        "sections": [{**{k: s.get(k) for k in ("tag", "title", "formula", "glosses")},
                      "items": [i if isinstance(i, str) else " — ".join(i) for i in s.get("items", [])]}
                     for s in g.get("sections", [])],
        "practice": g.get("practice", []), "practiceTarget": g.get("practiceTarget"), "exit": g.get("exit"),
        "src": {"file": rel(p), "at": "", "doc": f"FND68/CLass FND 68/A0 - A1 Resources/A1 Grammar/{g.get('file', '')}",
                "label": f"A1 Grammar {n}: {g.get('title')}"},
    })

# ---------------------------------------------------------------- dialogues, listening, speaking (skills pack)
dialogues, listening, speaking = [], [], []
for week in UNIT_WEEKS:
    p = TOOLS / f"skills-pack/content/w{week}.json"
    if not p.exists():
        continue
    s = clean(load(p))
    for i, d in enumerate(s["days"]):
        base = f"s{week}d{i + 1}"
        conv = d.get("conv")
        if conv and is_safe(conv, f"dialogue '{conv.get('title')}' (week {week})"):
            dialogues.append({"id": f"dlg-{base}", "week": week, "theme": d.get("theme"), "grammar": d.get("grammar"),
                              "title": conv["title"], "setting": conv.get("setting", ""), "lines": conv["lines"],
                              "src": {"file": rel(p), "at": f"days[{i}].conv",
                                      "doc": week_doc(week, "FND_68_Week_*_Conversations_A1.pdf"),
                                      "label": f"Week {week} conversation: {conv['title']}"}})
        ls = d.get("listen")
        if ls and is_safe(ls, f"listening '{ls.get('title')}' (week {week})"):
            listening.append({"id": f"lst-{base}", "week": week, "theme": d.get("theme"), **{k: ls.get(k) for k in
                              ("title", "type", "script", "mc", "notesTitle", "notes", "tip")},
                              "src": {"file": rel(p), "at": f"days[{i}].listen",
                                      "doc": week_doc(week, "FND_68_Week_*_Listening_A1_Teacher_Version.pdf"),
                                      "label": f"Week {week} listening: {ls['title']}"}})
        sp = d.get("speak")
        if sp and "p1" in sp:
            # Headway-aligned packs (Oct 2026): p1 = [question, Arabic, model answer], p2 = information-exchange cards
            p2 = (sp.get("p2") or [{}])[0]
            sp = {"p1": sp.get("p1", []), "p2": sp.get("p2", []),
                  "talk": {"topic": p2.get("topic") or d.get("theme", ""), "bullets": p2.get("prompts", [])},
                  "lang": [[q, ar] for q, ar, *_ in sp.get("p1", [])], "warm": [], "task": {"type": "p1", "title": d.get("theme", "")}}
        if sp and is_safe(sp, f"speaking (week {week} {d.get('theme')})"):
            speaking.append({"id": f"spk-{base}", "week": week, "theme": d.get("theme"), **sp,
                             "src": {"file": rel(p), "at": f"days[{i}].speak",
                                     "doc": week_doc(week, "FND_68_Week_*_Speaking_A1.pdf"),
                                     "label": f"Week {week} speaking: {d.get('theme')}"}})

# ---------------------------------------------------------------- listening practice exams
listening_exams = []
for p in sorted((TOOLS / "listening-exam/content").glob("w*d*.json")):
    e = clean(load(p))
    if not is_safe({k: e.get(k) for k in ("p1", "p2", "p3")}, f"listening exam {p.name}"):
        continue
    listening_exams.append({"id": f"lx-{p.stem}", "week": e.get("week"), "day": e.get("day"), "theme": e.get("theme"),
                            "grammar": e.get("grammar"), "cast": e.get("cast", {}), "p1": e.get("p1"), "p2": e.get("p2"), "p3": e.get("p3"),
                            "src": {"file": rel(p), "at": "",
                                    "doc": f"FND68/CLass FND 68/A0 - A1 Resources/A1 Exam/A1 Listening Exam/Week {e.get('week')}/",
                                    "label": f"A1 Listening Practice Exam · Week {e.get('week')} {e.get('day')}: {e.get('theme')}"}})

out = {
    "generatedAt": date.today().isoformat(),
    "note": "Generated by scripts/import_iatc_content.py from the IATC English tools/*/content sources. Do not edit by hand.",
    "counts": {},
    "vocab": list(vocab.values()),
    "oxfordA1": oxford,
    "topics": topics,
    "days": days,
    "units": units,
    "grammar": grammar,
    "dialogues": dialogues,
    "listening": listening,
    "speaking": speaking,
    "mocks": mocks,
    "listeningExams": listening_exams,
    "report": report,
}
out["counts"] = {k: len(v) for k, v in out.items() if isinstance(v, list)}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("Wrote", OUT.relative_to(APP))
print(json.dumps(out["counts"], indent=1))
print("Teacher-name replacements:", report["nameReplacements"])
print("Skipped items:", len(report["skipped"]))
for s in report["skipped"]:
    print("  -", s["item"], "→", s["reason"])
