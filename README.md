# SH English Path · A1 Learning Hub

*Learn. Practise. Speak with confidence.*

A friendly, responsive English-learning web app for A0–A1 learners. It covers self-study, teacher-led lessons, personalised revision, vocabulary, grammar, speaking, exam practice and classroom participation.

Built with **React 18 + TypeScript + Tailwind CSS + Lucide icons**. It runs fully in the browser and stores data in **localStorage** on the device, so no server or account is needed.

---

## 1. Quick start

You need **Node.js 18 or newer** (Node 24 LTS is installed on this PC).

```bash
cd "Web App/sh-a1-english-webapp"
npm install
npm run dev
```

Open <http://localhost:5173>. Pick a learner card, or press **I'm the teacher**.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run build` | Production build in `dist/` for any static host (Netlify, GitHub Pages, SharePoint, a school web server) |
| `npm run build:single` | Builds **one file**, `dist-single/index.html`, that opens with a double-click. No server is needed, so it works from a USB stick or a shared drive. |
| `npm run preview` | Serves the `dist/` build locally |
| `npm test` | Logic, classes and content-integrity tests (26 tests) |
| `npm run import-content` | Re-imports the IATC resources (see section 5) |

**Fonts.** The app uses Calibri on Windows, Carlito (a free Calibri-compatible font) from Google Fonts elsewhere, and Noto Sans Arabic for Arabic. If the device is offline, it falls back to the system fonts.

---

## 2. First use (teacher): load FND 68 and add other classes

1. Open the app and choose **I'm the teacher**.
2. Go to **Teacher Dashboard → Classes → Import a class file** and choose `Web App/class-files/FND68.class.json`. This adds FND 68 with all 26 current students, their Student IDs, roster numbers, groups and Progress Exam 1 skill scores. The scores feed the dashboard and each learner's recommendations from day one.
3. The app also has a **Demo Class** of made-up learners. Remove it with **Settings → Remove demo class** when you're ready.
4. Optional: set a **Teacher PIN** so students on a shared device can't open the teacher area. This is a local convenience only, not real security.
5. Use **Settings → Download backup** to move everything to another device, or **Classes → Export class file** to move one class.

**Classes.** One device can hold any number of classes. The teacher switches class from the sidebar (or the dashboard header on a phone); the roster, overview, assignments, writing to mark and Classroom Mode all show the chosen class only.

- **Add another class:** Classes → Create a new class, then add pupils by name, or import a CSV (`class-files/class-template.csv`: first name, surname, Student ID, level, group).
- **Learners join themselves:** every class has a **join code** (shown on the Classes tab and the dashboard). On the sign-in screen, learners tap **New here? Join with a class code**, type the code and their name, and start. Untick "Learners can join with this code" to close a class, or press ↻ for a new code.
- **Move a learner:** open the learner's report and change **Class**. Their progress moves with them.
- **Re-importing is safe:** learners are matched by Student ID, so importing an updated class file updates names, levels and groups and adds new students without duplicates or lost progress.
- **Names:** the app shows first names, and adds the surname automatically when two learners in a class share a first name (for example the three Abdulaziz in FND 68).

Learners sign in by choosing their class and tapping their own card. On a projector, start **Classroom Mode** from the dashboard.

---

## 3. What is in the app

| Area | Highlights |
|---|---|
| **Home** | Greeting, next best lesson, Daily 5 words, quick links |
| **My Learning** | "Welcome back, Abdullah!", today's message, recommendations with reasons, weekly goal, streak, teacher tasks, Practise again list, and **My Learning Path** (completed / current / recommended next / locked / revision) |
| **Lessons** | 8 units = Weeks 1–8 of the A0 – A1 Weekly Materials. Each unit has a lesson for every class day (Sunday–Thursday: new words → grammar → sentence building → the day's reading → opposites / plurals → writing), then Conversation & listening and Check yourself. Unit goals ("In this unit… I can …"), completion screen with score, words learned, progress and next lesson |
| **Activities** | Matching, multiple choice, drag & drop (with a tap alternative), picture choice, gap-fill, sentence ordering, dialogue building, error correction, reading, listen & repeat, speaking task, writing (25 words, 3 bullets, 5-point self-check) |
| **Vocabulary** | Flashcards with picture, audio (normal and slow), Arabic, meaning and example. New / Learning / Review / Mastered status, **I know this** and **Practise again**, search, unit filters, **Daily 5 challenge**, spaced-repetition review, weekly chart and the Oxford 3000 A1 list |
| **Speaking** | 8 role plays: meeting someone, introducing yourself, ordering food or a drink, family, asking the time, directions, hobbies, daily routine. Each follows **Listen → Repeat → Record → Replay**, with sentence highlighting and slow and normal audio. Also A1 Speaking Part 1 questions. Feedback is encouraging only, with no pronunciation scoring |
| **Practice** | Grammar gym, one booster per A1 Grammar deck (1–10), a "practice focus" built from the learner's mistakes, and writing practice on 29 A1 topics |
| **Review** | A review lesson after every two units |
| **Exams** | Starting Point Check (diagnostic), ELEM-format Reading & Writing mocks (Parts 1–5 + 25-word writing), A1 Listening papers (Parts 1–3, each recording plays twice), and Speaking Part 1. Exams are timed, show **results by skill** with next steps and an answer check, and give a certificate at 60% |
| **My Progress** | Profile, level, goal, interests, skills, vocabulary mastery, difficult words, speaking confidence, grammar progress, badges and certificates |
| **Teacher Dashboard** | Class overview, progress by skill and by unit (heat map), completion rates, common grammar errors (with **Assign booster**), difficult vocabulary, speaking participation, exam performance, recommendations for each student, **assignments**, **writing to mark** with the A1 writing rubric (Content, Organisation, Language: 0–5 each, /15; the app suggests a band for each, the teacher confirms), the **content map** with sources, settings and backups. Student reports can be printed or copied |
| **Classroom Mode** | Full-screen projector view. Teacher-paced or automatic mode, lesson and question timers, pause and resume, previous and next, reveal answer, correct and incorrect feedback, participation tracker, and the **STUDENT TO ANSWER** picker |

**Student to Answer.** The picker chooses at random from learners who have answered the least this session, and never picks the same learner twice in a row. For classes with groups (FND 68's G1–G5 from the class file) it also has a **Group** mode: it picks a whole group fairly (every group gets a turn before any group goes twice) and shows its members with their roles (⭐ Leader, 🤝 Assistant, Middle, 🌱 Support). **Pick one student from G4** chooses fairly inside that group, and **From: G1…G5** limits student picks to one group. A picked student's pair partner is shown so you can say “ask your partner”. Every **Correct** adds a **team point** to the group; the participation strip shows the class by group with team points, and the end screen shows the winning team. It shows who has already answered, lets you choose a learner manually, and suggests a question type based on that learner's weak area. You can mark the answer correct or "try again". Keyboard shortcuts in Classroom Mode: ← → change question, Space reveals the answer, S opens the picker, P pauses.

**Badges.** First Lesson, Vocabulary Star, Brave Speaker, Five-Day Streak, Unit Master.

---

## 4. Branding and privacy rules (built in)

- Only the **logo mark** (the SH emblem) is used: `src/assets/brand/sh-mark.png`, plus a white version for dark backgrounds. These are copies of `tools/brand/SH_mark_*.png`. The full logo with the personal name is **never** used.
- The visible name everywhere is **"SH English Path"**, with the subtitle **"A1 Learning Hub"** and the tagline **"Learn. Practise. Speak with confidence."** (all set in `src/components/Logo.tsx`). The teacher's personal name in English or Arabic does not appear anywhere. The importer replaces "Mr Said" in IATC texts with "Mr Adel", and a test checks that the name never appears.
- Colours come from the mark: navy `#161E54`, coral `#FF5151` (dark coral `#C8322F` for small text), cyan `#88E0EF`, with mint and sun as support colours.
- Certificates show the logo mark, "SH English Path", the learner's first name, the achievement and the date. The signature line says only "Teacher".
- **Privacy.** Learner names, photos and results stay in this browser's localStorage. Voice recordings are kept in memory only: they are never saved or uploaded. Photos are resized to 256 px before they are saved. Class files with real names and IDs live in `Web App/class-files/`, **outside** the app folder, so they are never built into `dist/` or `dist-single/`. Load them through the Classes tab on each device, and don't upload them to the internet.
- **Cultural sensitivity.** Content follows IATC QF 05. The importer skips any item that mentions an "avoid" topic, and a test checks the whole app for them.

---

## 5. Content from the IATC English resources

`scripts/import_iatc_content.py` reads the structured sources that already build the FND 68 Word, PDF and PowerPoint materials, and writes `src/data/generated/iatc-content.json`:

| Source (in `IATC English/tools/`) | Used for |
|---|---|
| `weekly-pack/content/week1–8.json` | 975 words with Arabic, meanings and examples · daily lessons, grammar rules and practice · readings · opposites · plurals · writing tasks · 7 Thursday mocks |
| `weekly-pack/content/readings/week1–8.json` | The official Week 1–8 reading handouts (Sun–Thu, aligned to New Headway Beginner Units 1–8): reading, key words, questions, True/False, opposites, plurals, writing task. These drive the units. |
| `weekly-pack/content/topic-words/a1_topics.txt` | 29 A1 vocabulary topics with writing frames (from *A1 Vocabulary Topics*) |
| `weekly-pack/content/oxford3000_A1.txt` | The Oxford 3000 A1 headwords (tags and list) |
| `grammar-deck/content/grammar1–10.json` | A1 Grammar 1–10 explanations, tables, examples and practice |
| `skills-pack/content/w1–8.json` | 39 conversations, 39 listening tasks, 39 speaking tasks |
| `listening-exam/content/w5d1–5.json` | A1 Listening practice exams |
| `A1 Exam/A1 Speaking Exam/…Question_Bank.docx` | Speaking Part 1 questions (curated into `src/data/speaking.ts`) |

Every imported item keeps a **source reference**: the file, the location inside it and the matching classroom document. Teachers see these in **Teacher Dashboard → Content map**, which also shows each item's CEFR level, topic, grammar point, vocabulary theme, skill, unit and lesson/revision/exam status, and on unit pages. See `docs/CONTENT_MAP.md` for the full map.

**Not imported.** Scanned coursebook PDFs (Headway, English Unlimited) are not used, for copyright reasons. Headway Beginner only guided the order of topics. Every explanation and activity is either original or comes from your own IATC materials.

To refresh after editing a source:

```bash
npm run import-content
```

---

## 6. Course structure: Units 1–8 = Weeks 1–8

The course follows the class: **Unit N = Week N** of `FND68/CLass FND 68/A0 - A1 Resources/A0 - A1 Weekly Materials/`, which is aligned to **New Headway Beginner Unit N**. Units are A0 (1–2), A0–A1 (3–5) and A1 (6–8).

| Unit | Week | Title | Focus |
|---|---|---|---|
| 1 | 1 | Hello! | I'm • my / your • a / an • plurals |
| 2 | 2 | Your World | he / she • his / her • Where … from? • numbers 11–30 |
| 3 | 3 | All About You | jobs • am / is / are: negatives and questions |
| 4 | 4 | Family and Friends | our / their • possessive 's • has / have |
| 5 | 5 | The Way I Live | Present Simple I / you / we / they • a / an • prices |
| 6 | 6 | Every Day | the time • Present Simple he / she • always / never |
| 7 | 7 | My Favourites | question words • this / that • Can I …? • me / him / them |
| 8 | 8 | Where I Live | There is / are • prepositions • some / any • directions |

Each unit has:

- **Five day lessons (Sunday–Thursday).** Each one uses that day's handout and deck: the day's words (cards, matching, pictures), the grammar box and practice from the lesson slides, sentence building, the reading with True/False and comprehension questions, opposites and plurals, and the 25-word writing task.
- **Conversation & listening.** A matching conversation and listening script from the Week 1–8 Conversations / Listening packs, listen-and-repeat, and a speaking task built from the day questions.
- **Check yourself.** Ten questions: grammar from the week, word meanings and listening.

After Units 2, 4, 6 and 8 there is a review.

Everything is generated from the weekly source files by `scripts/import_iatc_content.py` (the `units` block). `src/data/modules/units.ts` only holds each unit's title, Arabic goals and chosen conversation / listening. To add Week 9, add `week9.json` and `readings/week9.json` to the weekly pack, add Week 9 to the importer loop, add a `UNIT_CFG` entry and re-run `npm run import-content`. Week 1's deck has four days (Mon–Thu) for five readings (Sun–Thu), so the importer maps them with `W1_DECK`.

Grammar points are tracked with the keys in `src/data/grammarKeys.ts`. Each key links to an A1 Grammar deck, so repeated mistakes, for example with *am / is / are*, lead to a targeted booster.

**Pictures.** Vocabulary cards use emoji so the app stays light and works offline. To use a real picture, put `public/images/vocab/<word-id>.png` in place and add the id to `PHOTO_IDS` in `src/data/images.ts`.

---

## 7. Adding secure accounts and cloud storage later

All data goes through one interface, `DataStore` in `src/lib/storage.ts`, with `load()`, `save()` and `reset()`. Today it is `localStore` (localStorage). To move to the cloud:

1. Add an authentication provider (for example Microsoft Entra ID, Firebase Auth or Supabase Auth) and replace the card-tap sign-in in `src/pages/Welcome.tsx` with real sign-in.
2. Write an `apiStore` that loads and saves `AppData`, or better, each `Student` record, to your backend. Pass it in with `<AppProvider store={apiStore}>`.
3. Keep the teacher role on the server side. The local PIN is not security.
4. Store photos in private object storage rather than as data URLs.

The data model (`src/types.ts`) already separates students, assignments, writing submissions and settings, so it maps directly onto database tables.

---

## 8. Natural voices (OpenVox / Kokoro)

Almost everything the app says uses real recorded voices, made offline on this PC with the Kokoro voices that **OpenVox – Local Voice AI** installed:

- **Speaking:** every unit conversation and listening script, all 8 role plays, listen-and-repeat lines, model answers, useful phrases, Speaking Part 1 questions.
- **Vocabulary:** all ~1,075 words and their example sentences, plus the Oxford 3000 A1 headwords.
- **Grammar:** every example in the grammar panels, every sentence in the A1 Grammar decks (boosters), and the sentence-order answers.
- **Readings:** all 40 Week 1–8 reading texts (one per class day) and the exam reading texts (Reading Part 1 emails and the diagnostic). A teacher setting turns the exam Listen buttons off for real exam conditions.
- **Listening exams:** all 5 papers, each speaker in the same voice as the class MP3s (the exam's own cast).

Each person in a dialogue has their own voice (teachers, officers and shop staff a deeper voice; students two lighter voices). Spelled names (B-A-D-E-R), phone numbers, abbreviations (IATC, FND, TV) and words like "a.m.", "OK", "Mr" are rewritten so the voice reads them the way people say them. Short lines are packed into one MP3 per dialogue, activity or group of 30 words; the app plays just the part it needs.

To re-record after changing any of those texts:

```bash
npx vite-node scripts/audio-requests.ts
```
```bash
"%LOCALAPPDATA%\OpenVox - Local Voice AI\py\c\python.exe" scripts/build_voices.py
```

Clips are cached, so only new or changed lines are recorded. Files go to `public/audio/` and `src/data/generated/audio-manifest.json`. Anything without a recording still uses the browser voice. The single-file build puts the clips in `dist-single/audio/`: keep that folder next to `index.html`.

## 9. Browser support and fallbacks

- **Audio** uses the recorded voices above where they exist, otherwise the browser's built-in voices (Web Speech API), at normal and slow speed. If the browser has no speech support, the app says so and shows the transcript. Voice quality depends on the device. Chrome and Edge on Windows have good English voices.
- **Recording** uses the microphone (MediaRecorder). If it isn't supported or is blocked, learners see a clear note and practise aloud instead.
- **Accessibility:** touch targets of at least 44 px, keyboard navigation with visible focus, a skip link, ARIA labels, transcripts for all audio, a tap alternative to drag and drop, and reduced motion respected. The design is mobile-first and projector-friendly.

---

## 10. Folder structure

```
sh-a1-english-webapp/
├─ scripts/import_iatc_content.py   IATC → app content importer
├─ docs/CONTENT_MAP.md              Content map (sources → units)
├─ public/                          favicon, web manifest
├─ src/
│  ├─ assets/brand/                 logo mark only
│  ├─ data/
│  │  ├─ generated/iatc-content.json  imported IATC content (do not edit)
│  │  ├─ modules/                   units.ts (Units 1–8 = Weeks 1–8), builder helpers, reviews
│  │  ├─ content.ts  exams.ts  speaking.ts  images.ts  grammarKeys.ts  contentIndex.ts
│  ├─ lib/                          storage, speech, recorder, srs, recommend, learner, picker, demo, …
│  ├─ components/                   UI kit, Monster avatars, Avatar, Layout, Roster, StudentPicker,
│  │                                DialoguePlayer, Recorder, activities/*
│  ├─ pages/                        Home, MyLearning, Lessons, LessonPlayer, Vocabulary, Speaking,
│  │                                Practice (+Review), Exams, Progress (+Certificate), Teacher,
│  │                                StudentReport, Classroom, Welcome
│  ├─ store.tsx  App.tsx  types.ts
│  └─ __tests__/                    logic + content-integrity tests
```

## 11. Known limitations

- Sign-in is a local card tap, not real authentication. See section 7.
- Writing is marked with the A1 writing rubric (`FND68/CLass FND 68/A0 - A1 Resources/A1 Exam/A1 Writing Exam/A1 writing rubric.pdf`): Content, Organisation and Language, 0–5 each, /15 (`src/data/writingRubric.ts`). The app gives a first estimate from simple signals: the three bullet points and length, linking words and pronouns, sentences with a verb, capitals and full stops, common A1 errors, and words not in the A1 word lists. It cannot judge meaning or relevance, so exam writing stays provisional until the teacher saves a mark in **Teacher Dashboard → Writing**. That mark then replaces the provisional one in the exam result.
- In the code, units are still called `Module` (types, routes such as `/lessons/u3`, stored progress). Only the wording on screen says Unit.
- Emoji pictures can look slightly different on Windows, Android and iOS.
