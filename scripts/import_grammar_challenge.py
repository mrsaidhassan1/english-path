"""
Import the Foundation Grammar Challenge sets (100 multiple-choice questions each) into English Path.

Reads, from  IATC English/Resources/A1/A1 Grammar/Grammar Practice/A1 Full Grammar Practice/
    Foundation_Grammar_Challenge_Set_N_100_Question_Answer_Key.docx   (the correct option is marked ☑)
    Foundation_Grammar_Challenge_Set_N_100_Question_Exam.docx         (the student paper; used as a cross-check)
and writes  src/data/generated/grammar-challenge.json

    python scripts/import_grammar_challenge.py          # sets listed in SETS below

The answer key is the source of truth: its quick-answer strip (a / b / c per number) must agree with the ☑ marks,
and the student exam must have the same questions and the same options in the same order. Anything that does not
agree stops the import, so a wrong key can never reach students.

Rules, as for the other imports: the teacher's personal name is never copied ("Prepared by ..." is not imported)
and questions that touch IATC "avoid" topics are refused.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import docx

sys.stdout.reconfigure(encoding="utf-8")

SETS = [1]  # Sets 2 and 3 exist in the same folder; add them here once their notes are written

APP = Path(__file__).resolve().parents[1]
FOLDER = APP.parents[1] / "IATC English" / "Resources" / "A1" / "A1 Grammar" / "Grammar Practice" / "A1 Full Grammar Practice"
OUT = APP / "src" / "data" / "generated" / "grammar-challenge.json"

AVOID = re.compile(
    r"\b(music|musician|musicians|song|songs|singing|singer|guitar|piano|birthday|birthdays|christmas|"
    r"dancing|dance|girlfriend|boyfriend|dating|alcohol|wine|beer|magic|witch|ghost|playing cards)\b",
    re.I,
)
MARKS = "☐☑☒"


def parts_of(path: Path):
    """[(part number, instruction, Arabic instruction, {question number: (stem, options, marked index or None)})]"""
    d = docx.Document(str(path))
    parts = []
    for t in d.tables:
        if len(t.columns) != 5:
            continue
        head = t.rows[0].cells[0].text.replace("\t", " ").strip()
        m = re.match(r"Part (\d+):\s*(.*?)\s*\((\d+)–(\d+)\)\s*(.*)", head, re.S)
        if not m:
            continue
        qs = {}
        for r in t.rows[2:]:
            c = [x.text.strip() for x in r.cells]
            n = int(c[0].rstrip("."))
            marked = [i for i, x in enumerate(c[2:5]) if x.startswith("☑")]
            options = [x.lstrip(MARKS).strip() for x in c[2:5]]
            if len(marked) > 1:
                raise SystemExit(f"{path.name} question {n}: more than one option is marked")
            qs[n] = (c[1], options, marked[0] if marked else None)
        parts.append((int(m[1]), m[2].strip(), m[5].strip(), qs))
    return d, parts


def focus_table(d):
    """'Exam at a Glance': {part number: (English focus, Arabic focus)}; a row like '4–5' covers both parts."""
    focus = {}
    for t in d.tables:
        if [c.text.strip() for c in t.rows[0].cells][:2] != ["Part", "Grammar focus"]:
            continue
        for r in t.rows[1:]:
            cells = [c.text.strip() for c in r.cells]
            m = re.fullmatch(r"(\d+)(?:[–-](\d+))?", cells[0])
            if not m:
                continue
            en, _, ar = cells[1].partition("|")
            for n in range(int(m[1]), int(m[2] or m[1]) + 1):
                focus[n] = (en.strip(), ar.strip())
    return focus


def build(set_no: int):
    key_path = FOLDER / f"Foundation_Grammar_Challenge_Set_{set_no}_100_Question_Answer_Key.docx"
    exam_path = FOLDER / f"Foundation_Grammar_Challenge_Set_{set_no}_100_Question_Exam.docx"
    kd, key_parts = parts_of(key_path)
    ed, exam_parts = parts_of(exam_path)

    # the quick-answer strip ("1: c  2: b ...") must agree with the marked options
    strip = {}
    for t in kd.tables:
        for r in t.rows:
            for c in r.cells:
                m = re.fullmatch(r"(\d+):\s*([abc])", c.text.strip())
                if m:
                    strip[int(m[1])] = "abc".index(m[2])
    key_q = {n: v for _, _, _, qs in key_parts for n, v in qs.items()}
    exam_q = {n: v for _, _, _, qs in exam_parts for n, v in qs.items()}
    if sorted(key_q) != list(range(1, 101)) or sorted(exam_q) != list(range(1, 101)) or sorted(strip) != list(range(1, 101)):
        raise SystemExit(f"Set {set_no}: expected questions 1-100 in the key, the exam and the answer strip")
    problems = []
    for n in range(1, 101):
        stem, options, marked = key_q[n]
        if marked is None:
            problems.append(f"Q{n}: no option is marked in the key")
        elif marked != strip[n]:
            problems.append(f"Q{n}: the key marks {'abc'[marked]} but its answer strip says {'abc'[strip[n]]}")
        if (stem, options) != (exam_q[n][0], exam_q[n][1]):
            problems.append(f"Q{n}: the exam and the key differ in the question or its options")
        if len(set(options)) != 3:
            problems.append(f"Q{n}: the options are not three different texts")
        if AVOID.search(stem + " " + " ".join(options)):
            problems.append(f"Q{n}: touches an avoid topic")
    if problems:
        raise SystemExit(f"Set {set_no}: not imported:\n  " + "\n  ".join(problems))

    focus = focus_table(ed)
    topic = ""
    for p in ed.paragraphs:
        if p.text.startswith("Topic:"):
            topic = p.text.split(":", 1)[1].strip()
    parts = []
    for n, instruction, instruction_ar, qs in key_parts:
        parts.append({
            "n": n,
            "focus": focus.get(n, ("", ""))[0],
            "focusAr": focus.get(n, ("", ""))[1],
            "instruction": instruction,
            "instructionAr": instruction_ar,
            "questions": [{"n": q, "q": stem, "options": opts, "answer": marked} for q, (stem, opts, marked) in qs.items()],
        })
    return {
        "id": f"set{set_no}", "set": set_no, "title": f"Grammar Challenge · Set {set_no}", "topic": topic, "parts": parts,
        "src": {"file": f"Resources/A1/A1 Grammar/Grammar Practice/A1 Full Grammar Practice/{key_path.name}",
                "label": f"Foundation Grammar Challenge Set {set_no} (100 questions, answer key checked against the exam)"},
    }


sets = [build(n) for n in SETS]
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"note": "Generated by scripts/import_grammar_challenge.py. Do not edit by hand.", "sets": sets}, ensure_ascii=False, indent=1), encoding="utf-8")
for s in sets:
    print(f"{s['title']} ({s['topic']}): {sum(len(p['questions']) for p in s['parts'])} questions in {len(s['parts'])} parts")
print("Wrote", OUT)
