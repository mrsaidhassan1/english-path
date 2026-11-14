# -*- coding: utf-8 -*-
"""Import the A1 Vocabulary Quizzes (Sets 1-14) into src/data/generated/vocab-quizzes.json.

Source: IATC English/Resources/A1/A1 Vocabulay/A1 Vocabulary Quizzes/
    _source/gen/set_NN.json            the structured content the Word quizzes were built from (every set except 10)
    _source/content_set10.py, lessons_set10.py   Set 10 (hand-written)
    A1_Vocab_Set_NN/Teacher/*.docx     the finished quizzes; used here to cross-check every answer

Each set has five Lesson quizzes (35 questions, target 28) and a Review quiz (40 questions, target 30).
Set 15 (the extra A1 words) is not a unit and is not imported.

    python scripts/import_vocab_quizzes.py
"""
import importlib
import json
import re
import sys
from pathlib import Path

import docx
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding="utf-8")

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parents[1] / "IATC English" / "Resources" / "A1" / "A1 Vocabulay" / "A1 Vocabulary Quizzes"
SRC = ROOT / "_source"
OUT = APP / "src" / "data" / "generated" / "vocab-quizzes.json"
SETS = list(range(1, 15))

AVOID = re.compile(
    r"\b(music|musician|musicians|song|songs|singing|singer|guitar|piano|birthday|birthdays|christmas|"
    r"dancing|dance|girlfriend|boyfriend|dating|alcohol|wine|beer|magic|witch|ghost|playing cards)\b",
    re.I,
)

LESSON_TARGET = 28  # of 35, as printed on the Word quizzes
REVIEW_TARGET = 30  # of 40


def blank(s: str) -> str:
    """Every blank becomes exactly one ___ (the gap-fill screen splits the sentence on it)."""
    return re.sub(r"_{3,}", "___", s)


def ri(code: str) -> str:
    return "Regular verb: add -ed or -d." if code == "R" else "Irregular verb: the past form is different."


# ---------------------------------------------------------------- sections
def sec(sid, kind, title, title_ar, prompt, prompt_ar, **body):
    return {"id": sid, "type": kind, "title": title, "titleAr": title_ar, "prompt": prompt, "promptAr": prompt_ar, **body}


def match(sid, items, options):
    arabic = dict(options)
    return sec(sid, "match", "Match the words", "صِل الكلمات", "Match each word with its Arabic meaning.", "صِل كل كلمة بمعناها العربي.",
               pairs=[[w, arabic[letter]] for w, letter in items])


def choose_meaning(sid, rows):
    return sec(sid, "mcq", "Choose the correct word", "اختر الكلمة الصحيحة", "Read the meaning. Choose the correct word.", "اقرأ المعنى واختر الكلمة الصحيحة.",
               items=[{"q": m, "options": o, "answer": c} for m, o, c in rows])


def choose_sentence(sid, rows):
    return sec(sid, "mcq", "Choose the word for the sentence", "اختر الكلمة المناسبة للجملة", "Choose the correct word for the sentence.", "اختر الكلمة المناسبة للجملة.",
               items=[{"q": blank(s), "options": o, "answer": c} for s, o, c in rows])


def letters(sid, rows):
    return sec(sid, "gap", "Put the letters in order", "رتّب الحروف", "Put the letters in order. Type the word.", "رتّب الحروف واكتب الكلمة.",
               items=[{"text": f"{mix}   →   ___", "answer": w, "hint": ar} for mix, w, ar in rows])


def complete(sid, bank, rows, hint_first=False):
    items = []
    for s, a in rows:
        it = {"text": blank(s), "answer": a, "options": bank}
        if hint_first:
            it["text"] += f"   ({a[0]}…)"
        items.append(it)
    return sec(sid, "gap", "Complete the sentences", "أكمل الجمل", "Choose the word from the box to complete each sentence.", "اختر الكلمة المناسبة من الصندوق لإكمال كل جملة.", items=items)


def opposites(sid, rows):
    return sec(sid, "gap", "Opposites", "المتضادات", "Type the opposite.", "اكتب الضد.",
               items=[{"text": f"{a}   ↔   ___", "answer": b, "explain": f"{a} ↔ {b}   ({ar})"} for a, b, ar in rows])


def plurals(sid, rows):
    return sec(sid, "gap", "Plurals", "الجمع", "Type the plural.", "اكتب صيغة الجمع.",
               items=[{"text": f"one {a}   →   two ___", "answer": b, "hint": ar, "explain": f"Rule: {rule}"} for a, b, rule, ar in rows])


def past(sid, rows, box=None):
    items = []
    for base, p, code, ar in rows:
        it = {"text": f"{base}   →   ___   (past)", "answer": p, "hint": ar, "explain": ri(code)}
        if box:
            it["options"] = box
        items.append(it)
    prompt = "Choose the past form from the box." if box else "Type the past form."
    return sec(sid, "gap", "Past verbs", "الأفعال في الماضي", prompt, "اختر صيغة الماضي من الصندوق." if box else "اكتب صيغة الماضي.", items=items)


def dictation(sid, rows):
    return sec(sid, "gap", "Dictation", "الإملاء", "Listen. Type the word you hear.", "استمع واكتب الكلمة.",
               items=[{"text": "I hear:   ___", "answer": w, "say": w, "explain": s} for w, s in rows])


def arabic_to_english(sid, rows):
    return sec(sid, "gap", "Write the English word", "اكتب الكلمة بالإنجليزية", "Read the Arabic. Type the English word.", "اقرأ الكلمة العربية واكتبها بالإنجليزية.",
               items=[{"text": "___", "answer": en, "hint": ar} for ar, en in rows])


def odd_one_out(sid, rows):
    items = []
    for words, odd, group in rows:
        others = group if group.endswith("s") else group + "s"
        items.append({"q": "Which word is a different type?", "options": words, "answer": odd, "explain": f"The other three words are {others}."})
    return sec(sid, "mcq", "Odd one out", "الكلمة المختلفة", "Choose the word of a different type.", "اختر الكلمة المختلفة في النوع.", items=items)


def lesson_sections(L: dict) -> list:
    out = [match("A", L["A"]["items"], L["A"]["options"]), choose_meaning("B", L["B"])]
    C = L["C"]
    rows = C["items"] if isinstance(C, dict) else C
    is_letters = (C.get("kind") == "letters") if isinstance(C, dict) else isinstance(rows[0][1], str)
    out.append(letters("C", rows) if is_letters else choose_sentence("C", rows))
    out.append(complete("D", L["D"]["bank"], L["D"]["items"]))
    out.append(opposites("E", L["E"]))
    out.append(plurals("F", L["F"]))
    out.append(past("G", L["G"], L.get("G_box") if L.get("G_mode") == "box" else None))
    return out


def review_sections(RV: dict) -> list:
    out = [dictation("A", RV["A"]["items"]), arabic_to_english("B", RV["B"]), choose_sentence("C", RV["C"]), odd_one_out("D", RV["D"]),
           complete("E", RV["E"]["bank"], RV["E"]["items"], hint_first=True), opposites("F", RV["F"]), plurals("G", RV["G"])]
    H = RV["H"]
    out.append(past("H", H["items"], H["box"] if H["mode"] == "box" else None))
    return out


def count(sections: list) -> int:
    return sum(len(s["pairs"]) if s["type"] == "match" else len(s["items"]) for s in sections)


# ---------------------------------------------------------------- source
def load_set(n: int) -> dict:
    if n == 10:
        sys.path.insert(0, str(SRC))
        c = importlib.import_module("content_set10")
        les = importlib.import_module("lessons_set10")
        return {"SET": c.SET, "LESSONS": les.LESSONS, "REVIEW": c.REVIEW}
    return json.loads((SRC / "gen" / f"set_{n:02d}.json").read_text(encoding="utf-8"))


def text_of(path: Path) -> str:
    d = docx.Document(str(path))
    return " ".join(t.text or "" for t in d.element.body.iter(qn("w:t")))


def strings(sections: list):
    for s in sections:
        if s["type"] == "match":
            for w, ar in s["pairs"]:
                yield w
                yield ar
            continue
        for it in s["items"]:
            if "answer" in it and isinstance(it["answer"], str):
                yield it["answer"]
            elif "options" in it:
                yield it["options"][it["answer"]]


def main():
    sets, problems = [], []
    for n in SETS:
        d = load_set(n)
        S = d["SET"]
        quizzes = []
        for L in d["LESSONS"]:
            secs = lesson_sections(L)
            quizzes.append({"id": f"s{n:02d}-l{L['n']}", "kind": "lesson", "n": L["n"], "title": L["title"], "titleAr": L["title_ar"],
                            "words": [w for w in L["targets"]], "total": count(secs), "target": LESSON_TARGET, "sections": secs})
        secs = review_sections(d["REVIEW"])
        quizzes.append({"id": f"s{n:02d}-review", "kind": "review", "n": 0, "title": f"Set {n} Review", "titleAr": f"مراجعة المجموعة {n}",
                        "words": [], "total": count(secs), "target": REVIEW_TARGET, "sections": secs})
        sets.append({"n": n, "unit": re.sub(r"^Headway Beginner ", "", S["unit"]), "unitAr": S["unit_ar"], "quizzes": quizzes})

        # structure
        for q in quizzes:
            want = 35 if q["kind"] == "lesson" else 40
            if q["total"] != want:
                problems.append(f"Set {n} {q['id']}: {q['total']} questions, expected {want}")
            blob = json.dumps(q, ensure_ascii=False)
            for m in AVOID.finditer(blob):
                problems.append(f"Set {n} {q['id']}: avoid-topic word “{m.group(0)}”")
            for s in q["sections"]:
                for it in (s.get("items") or []):
                    if "options" in it and isinstance(it.get("answer"), int):
                        if not (0 <= it["answer"] < len(it["options"])) or len(set(it["options"])) != len(it["options"]):
                            problems.append(f"Set {n} {q['id']} {s['id']}: bad options {it}")
                    elif "options" in it and it["answer"] not in it["options"]:
                        problems.append(f"Set {n} {q['id']} {s['id']}: answer not in box {it['answer']}")
                    if s["type"] == "gap" and it["text"].count("___") != 1:
                        problems.append(f"Set {n} {q['id']} {s['id']}: blanks in {it['text']!r}")

            # cross-check against the finished Teacher Word file
            name = f"A1_Vocab_Set_{n:02d}_" + (f"Lesson_{q['n']}" if q["kind"] == "lesson" else "Review") + "_Quiz_Teacher.docx"
            path = ROOT / f"A1_Vocab_Set_{n:02d}" / "Teacher" / name
            if not path.exists():
                problems.append(f"Set {n} {q['id']}: no Teacher file {name}")
                continue
            doc = text_of(path).lower()
            doc = re.sub(r"\s+", " ", doc)
            missing = [w for w in strings(q["sections"]) if re.sub(r"\s+", " ", w.lower()) not in doc]
            if missing:
                problems.append(f"Set {n} {q['id']}: not in the Word file: {missing[:6]}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"sets": sets}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    nq = sum(len(s["quizzes"]) for s in sets)
    print(f"{len(sets)} sets, {nq} quizzes, {sum(q['total'] for s in sets for q in s['quizzes'])} questions -> {OUT}")
    print("PROBLEMS:" if problems else "No problems.")
    for p in problems:
        print("  ", p)


if __name__ == "__main__":
    main()
