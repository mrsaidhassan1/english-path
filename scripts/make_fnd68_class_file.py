"""
Build the FND 68 class file for A1 English WebApp from the knowledge base.

Reads   knowledge-base/06-fnd68-class-profile.md
          - "Roster and Exam 1 results" table  → names, IDs, levels, Exam 1 skills
          - "Mixed-ability groups" table       → group, role, partners
Writes  Web App/class-files/FND68.class.json   (CONFIDENTIAL, local only — never inside the app folder)

    python scripts/make_fnd68_class_file.py

Students whose name is struck through (~~name~~) have left the class and are skipped.
This script holds no student data itself.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
APP = Path(__file__).resolve().parents[1]
ROOT = APP.parents[1]
KB = ROOT / "knowledge-base" / "06-fnd68-class-profile.md"
OUT = APP.parent / "class-files" / "FND68.class.json"

text = KB.read_text(encoding="utf-8")
cells = lambda line: [c.strip() for c in line.strip().strip("|").split("|")]

# ------------------------------------------------------------------ roster + Exam 1
students: dict[int, dict] = {}
for line in text.splitlines():
    if not re.match(r"\|\s*\d+\s*\|", line):
        continue
    c = cells(line)
    if len(c) < 10 or not re.fullmatch(r"\d{6}", c[2]):
        continue
    no, name, sid = int(c[0]), c[1], c[2]
    if name.startswith("~~"):
        continue  # moved to another class
    r, w, l, s = (x.replace("*", "") for x in c[3:7])
    reported, lvl = c[7].replace("*", ""), c[9]
    first, *rest = name.split()
    st = {"firstName": first, "lastName": " ".join(rest) or None, "iatcId": sid, "rosterNo": no, "level": "A1" if lvl == "A1" else "A0"}
    if all(x.isdigit() for x in (r, w, l, s)):
        R, W, L, S = map(int, (r, w, l, s))
        st["exams"] = [{
            "examId": "elem-progress-1", "title": "ELEM Progress Exam 1", "date": "2026-09-17",
            "reported": f"Reported score {reported} ({lvl})",
            "bySkill": {"reading": {"score": R, "total": 25}, "writing": {"score": W, "total": 15},
                        "listening": {"score": L, "total": 20}, "speaking": {"score": S, "total": 25}},
            "score": R + W + L + S, "total": 85, "minutes": 0,
        }]
    students[no] = st

# ------------------------------------------------------------------ groups (final table)
sec = text[text.index("## Mixed-ability groups"):]
sec = sec[: sec.index("\n## ", 5)]
nums = lambda s: [int(x) for x in re.findall(r"\((\d+)", s)]
for line in sec.splitlines():
    m = re.match(r"\|\s*(G\d)\b", line)
    if not m:
        continue
    c = cells(line)
    group = m.group(1)
    for col, role in ((1, "Leader"), (2, "Assistant"), (3, "Middle"), (4, "Support")):
        for no in nums(c[col]):
            if no in students:
                students[no]["group"] = group
                students[no]["groupRole"] = role + (" (provisional)" if "provisional" in c[col] and f"({no}, provisional" in c[col] else "")
    partners: dict[int, set[int]] = {}
    notes: dict[int, str] = {}
    for part in [p.strip() for p in c[5].split(",")]:
        if "↔" in part:
            a, b = (int(x) for x in re.findall(r"\d+", part)[:2])
            partners.setdefault(a, set()).add(b)
            partners.setdefault(b, set()).add(a)
        elif "joins" in part:
            who, *others = (int(x) for x in re.findall(r"\d+", part))
            for o in others:
                partners.setdefault(who, set()).add(o)
                partners.setdefault(o, set()).add(who)
        elif "helps all" in part:
            who = int(re.findall(r"\d+", part)[0])
            notes[who] = "Helps all pairs in the group"
    for no, ps in partners.items():
        if no in students:
            students[no]["partnerNos"] = sorted(ps)
    for no, note in notes.items():
        if no in students:
            students[no]["pairNote"] = note

# ------------------------------------------------------------------ photos (optional)
# Files named "<First> <Surname>.<ext>" in the class's Students Pictures folder.
# Crops for non-headshot photos live in class-files/photo-crops.json (local).
PHOTOS = ROOT / "FND68" / "CLass FND 68" / "FND 68 Reports" / "Weekly Students Reports" / "Students Pictures"
CROPS = APP.parent / "class-files" / "photo-crops.json"
photo_report = {"matched": [], "unmatched": []}
if PHOTOS.exists():
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Photos found but Pillow is not installed: python -m pip install pillow")
    import base64
    import io

    crops = json.loads(CROPS.read_text(encoding="utf-8")) if CROPS.exists() else {}
    by_name = {f"{s['firstName']} {s['lastName'] or ''}".strip().lower(): s for s in students.values()}
    for f in sorted(PHOTOS.iterdir()):
        if f.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        st = by_name.get(f.stem.strip().lower())
        if not st:
            photo_report["unmatched"].append(f.name)
            continue
        im = Image.open(f)
        if im.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", im.size, "white")
            im = im.convert("RGBA")
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert("RGB")
        if f.name in crops:
            left, top, size = crops[f.name]
        else:  # headshot: square, slightly above centre
            size = min(im.size)
            left, top = (im.width - size) // 2, int((im.height - size) * 0.3)
        im = im.crop((left, top, left + size, top + size)).resize((256, 256), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=82, optimize=True)
        st["photo"] = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
        photo_report["matched"].append(st["rosterNo"])

missing = [no for no, s in students.items() if "group" not in s]
if missing:
    sys.exit(f"Students without a group in the final table: {missing}")

out = {
    "format": "sh-a1-class",
    "version": 1,
    "class": {"name": "FND 68", "level": "A0 → A1", "term": "2026-27 S1"},
    "students": [students[k] for k in sorted(students)],
    "notes": [
        "CONFIDENTIAL: local only. Do not publish or upload.",
        "Built from knowledge-base/06-fnd68-class-profile.md (roster + final mixed-ability groups, 13 Oct 2026).",
        "Students who moved to another class are excluded. Students with no Exam 1 marks have no exam record.",
    ],
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
by_group: dict[str, list[str]] = {}
for s in out["students"]:
    by_group.setdefault(s["group"], []).append(f"#{s['rosterNo']} {s['groupRole']}")
print(f"Wrote {OUT.relative_to(ROOT)}: {len(out['students'])} students")
for g in sorted(by_group):
    print(" ", g, "·", ", ".join(by_group[g]))
print(f"Photos: {len(photo_report['matched'])} added (roster #{', #'.join(map(str, sorted(photo_report['matched'])))})")
if photo_report["unmatched"]:
    print("Photos with no matching student name (skipped):", ", ".join(photo_report["unmatched"]))
