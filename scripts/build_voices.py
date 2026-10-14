"""
Record natural voices for the app's speaking parts with the Kokoro voices that OpenVox installed
on this PC (offline, no internet). Run with OpenVox's Python:

    npx vite-node scripts/audio-requests.ts
    "%LOCALAPPDATA%\\OpenVox - Local Voice AI\\py\\c\\python.exe" scripts/build_voices.py

Reads   scripts/out/audio-requests.json
Writes  public/audio/<id>.mp3                     (one short clip per line)
        src/data/generated/audio-manifest.json    (line key → clip, used by the player)
Clips are cached, so re-running only records new or changed lines.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import warnings

OV = os.path.join(os.environ["LOCALAPPDATA"], "OpenVox - Local Voice AI")
os.environ["HF_HOME"] = os.path.join(OV, "models")
os.environ["HF_HUB_CACHE"] = os.path.join(OV, "models", "hub")
os.environ["HF_HUB_OFFLINE"] = "1"
warnings.filterwarnings("ignore")
import numpy as np  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = r"C:\Program Files\OpenVox - Local Voice AI\resources\ffmpeg\ffmpeg.exe"
REQS = os.path.join(APP, "scripts", "out", "audio-requests.json")
OUT_DIR = os.path.join(APP, "public", "audio")
CACHE = os.path.join(APP, "scripts", "out", "voice-cache")
MANIFEST = os.path.join(APP, "src", "data", "generated", "audio-manifest.json")
SR = 24000

# ------------------------------------------------------------------ casting
# Teachers, officers and shop staff: the deeper voice. Students: two lighter voices, never the same
# voice for two people in one dialogue when it can be avoided.
ADULT = re.compile(r"^(mr\.?|mrs|teacher|officer|man|pharmacist|waiter|cashier|assistant|examiner|receptionist|guard|driver|father|dad|uncle|captain|coordinator)\b", re.I)
FEMALE = {"sara", "noura", "fatima", "yuki", "mother", "mum", "aisha", "maryam"}
STUDENT_VOICES = ["am_michael", "am_puck", "am_fenrir"]
SPEED = {"dialogue": 0.92, "model": 0.88, "teacher": 0.9, "listening": 0.86, "word": 0.85, "example": 0.9, "reading": 0.86, "talk": 0.86}
BUNDLE_GAP = 0.6  # seconds of silence between words in a bundle (the player stops inside it)


def cast_dialogue(cast):
    voices, used = {}, set()
    for who in cast:
        if who.lower() in FEMALE:
            voices[who] = "af_bella"
        elif ADULT.match(who):
            voices[who] = "am_fenrir"
            used.add("am_fenrir")
    for who in cast:
        if who in voices:
            continue
        free = [v for v in STUDENT_VOICES if v not in used] or STUDENT_VOICES[:2]
        voices[who] = free[0]
        used.add(free[0])
    return voices


def voice_for(r):
    if r.get("voice"):  # fixed casting (the listening exams use the same voices as the class MP3s)
        return r["voice"]
    if r["kind"] == "dialogue":
        return cast_dialogue(r.get("cast") or [r["speaker"]])[r["speaker"]]
    return {"teacher": "am_fenrir", "model": "am_michael", "listening": "am_michael", "word": "am_michael", "example": "am_michael", "reading": "am_michael", "talk": "am_michael"}[r["kind"]]


# ------------------------------------------------------------------ text the voice reads
LETTER = {"A": "ay", "B": "bee", "C": "see", "D": "dee", "E": "ee", "F": "eff", "G": "jee", "H": "aitch", "I": "eye",
          "J": "jay", "K": "kay", "L": "el", "M": "em", "N": "en", "O": "oh", "P": "pee", "Q": "queue", "R": "ar",
          "S": "ess", "T": "tee", "U": "you", "V": "vee", "W": "double-you", "X": "ex", "Y": "why", "Z": "zed"}
DIGIT = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]


def spoken(text):
    t = text
    names = lambda m: ", ".join(LETTER[c] for c in re.findall(r"[A-Z]", m.group(0)))
    # spelled with hyphens: "B-A-D-E-R", "A - L - Q - A ..."
    t = re.sub(r"(?<![A-Za-z])[A-Z](?:\s*-\s*[A-Z])+(?![A-Za-z])", names, t)
    # spelled with dots: "F. A. H. A. D."
    t = re.sub(r"(?<![A-Za-z])[A-Z](?:\.\s?[A-Z])+\.?(?![A-Za-z])", lambda m: names(m) + ".", t)
    # alphabet lists: "A, B, C, D"
    t = re.sub(r"(?<![A-Za-z])[A-Z](?:,\s?[A-Z])+(?![A-Za-z])", names, t)
    # abbreviations read as letters
    t = re.sub(r"\b(IATC|FND|ID|IT|RSAF|TV|DVD|UK|USA|US)\b", lambda m: " ".join(LETTER[c] for c in m.group(1)), t)
    # words people say differently from how they are written
    for a, b in ((r"\ba\.m\.", "ay em"), (r"\bp\.m\.", "pee em"), (r"\bOK\b", "okay"), (r"\bMr\.?(?=\s|$)", "Mister"),
                 (r"\bMrs\.?(?=\s|$)", "Missus"), (r"\bMs\.?(?=\s|$)", "Miz"), (r"\bDr\.?(?=\s|$)", "Doctor"), (r"\be\.g\.", "for example")):
        t = re.sub(a, b, t)
    # phone numbers: "055 318 4270" → digit by digit
    t = re.sub(r"\b0\d{2}(?:[ -]\d{3,4}){1,3}\b",
               lambda m: ", ".join(" ".join(DIGIT[int(c)] for c in g) for g in re.split(r"[ -]", m.group(0))), t)
    # a lone letter asked about in a listening task
    if re.fullmatch(r"[A-Z]\.?", t.strip()):
        t = LETTER[t.strip()[0]]
    return t


# ------------------------------------------------------------------ synthesis
_pipes = {}


def pipe(lang):
    if lang not in _pipes:
        from kokoro import KPipeline
        _pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    return _pipes[lang]


def trim(a, thr=0.004):
    idx = np.where(np.abs(a) > thr)[0]
    return a if len(idx) == 0 else a[max(0, idx[0] - 240): min(len(a), idx[-1] + 720)]


def synth(text, voice, speed):
    key = hashlib.sha1(f"{voice}|{speed}|{text}".encode("utf-8")).hexdigest()[:20]
    f = os.path.join(CACHE, key + ".npy")
    if os.path.exists(f):
        return np.load(f)
    lang = "b" if voice.startswith("b") else "a"
    parts = [np.asarray(r.audio, dtype=np.float32) for r in pipe(lang)(text, voice=voice, speed=speed) if r.audio is not None]
    a = trim(np.concatenate(parts))
    peak = float(np.max(np.abs(a))) or 1.0
    a = (a / peak * 0.89).astype(np.float32)  # even loudness, about -1 dBFS
    np.save(f, a)
    return a


def to_mp3(a, path):
    pad = np.zeros(int(SR * 0.08), dtype=np.float32)
    pcm = (np.concatenate([pad, a, pad]) * 32767).astype("<i2").tobytes()
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-codec:a", "libmp3lame", "-b:a", "48k", path], input=pcm, check=True)


def main():
    reqs = json.load(open(REQS, encoding="utf-8"))
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)
    manifest, made, voices = {}, 0, {}
    singles = [r for r in reqs if not r.get("bundle")]
    bundles = {}
    for r in reqs:
        if r.get("bundle"):
            bundles.setdefault(r["bundle"], []).append(r)

    # one file per line (dialogues and speaking)
    for i, r in enumerate(singles, 1):
        voice, speed, say = voice_for(r), SPEED[r["kind"]], spoken(r["text"])
        name = hashlib.sha1(f"{voice}|{speed}|{say}".encode("utf-8")).hexdigest()[:16] + ".mp3"
        path = os.path.join(OUT_DIR, name)
        if not os.path.exists(path):
            to_mp3(synth(say, voice, speed), path)
            made += 1
        manifest[r["key"]] = name
        voices[voice] = voices.get(voice, 0) + 1
        if i % 100 == 0:
            print(f"  lines {i}/{len(singles)}")

    # vocabulary bundles: many short clips in one file; the manifest stores "file#start-end" in seconds
    for bi, (b, items) in enumerate(sorted(bundles.items()), 1):
        parts = [(r, voice_for(r), SPEED[r["kind"]], spoken(r["text"])) for r in items]
        sig = "|".join(f"{v}:{sp}:{say}" for _, v, sp, say in parts)
        name = f"vb-{b}-" + hashlib.sha1(sig.encode("utf-8")).hexdigest()[:10] + ".mp3"
        path = os.path.join(OUT_DIR, name)
        gap = np.zeros(int(SR * BUNDLE_GAP), dtype=np.float32)
        lead = np.zeros(int(SR * 0.25), dtype=np.float32)
        chunks, t, spans = [lead], len(lead) / SR, []
        for r, v, sp, say in parts:
            a = synth(say, v, sp)
            spans.append((r["key"], t, t + len(a) / SR))
            chunks += [a, gap]
            t += (len(a) + len(gap)) / SR
            voices[v] = voices.get(v, 0) + 1
        if not os.path.exists(path):
            pcm = (np.concatenate(chunks) * 32767).astype("<i2").tobytes()
            subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                            "-codec:a", "libmp3lame", "-b:a", "48k", path], input=pcm, check=True)
            made += 1
        for key, a0, a1 in spans:
            manifest[key] = f"{name}#{a0:.3f}-{a1:.3f}"
        print(f"  bundle {bi}/{len(bundles)} {b}: {len(parts)} clips", flush=True)

    # remove files no longer used
    keep = {v.split("#")[0] for v in manifest.values()}
    for f in os.listdir(OUT_DIR):
        if f.endswith(".mp3") and f not in keep:
            os.remove(os.path.join(OUT_DIR, f))
    json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    size = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in keep)
    print(f"{len(manifest)} lines in {len(keep)} files · {made} files written · {size / 1e6:.1f} MB · voices {voices}")


if __name__ == "__main__":
    main()
