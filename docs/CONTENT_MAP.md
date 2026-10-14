# Content map: IATC English A0–A1 resources → SH English Path

This map was built on 13 Oct 2026 from the IATC English folder. The full, searchable, item-by-item version (more than 2,000 rows, each with tags and a source reference) is in the app under **Teacher Dashboard → Content map**.

## 1. What was found and how it is used

| Resource (folder) | Format | Used in the app? | How |
|---|---|---|---|
| `tools/weekly-pack/content/week1–8.json` (the source of `A0 - A1 Weekly Materials/Week N/` word lists, decks and mocks) | JSON | ✅ Imported | 975 words (word, Arabic, part of speech, meaning, example) · 39 daily lessons (SMART objective, grammar rules, examples, practice) · readings with comprehension and True/False · opposites · plurals · 25-word writing tasks with frames and models · 7 Thursday mocks |
| `tools/weekly-pack/content/readings/week1–8.json` (source of the daily reading PDFs) | JSON | ✅ Imported | Second reading for each day (key words, comprehension, True/False, writing) |
| `tools/weekly-pack/content/topic-words/a1_topics.txt` (source of *A1 Vocabulary Topics*) | TXT | ✅ Imported | 29 topics × 10 words with Arabic and writing frames. "My Favourite Movie" was skipped as a caution topic |
| `tools/weekly-pack/content/oxford3000_A1.txt` (from *The Oxford 3000 by CEFR level*) | TXT | ✅ Imported | 899 A1 headwords: Oxford A1 tags on 624 app words, plus the Oxford list in Vocabulary |
| `tools/grammar-deck/content/grammar1–10.json` (source of `A1 Grammar/FND_68_A1_Grammar_N_*.pptx`) | JSON | ✅ Imported | Grammar explanations, tables, colour-coded examples, "Watch out" notes, practice items and boosters |
| `tools/skills-pack/content/w1–8.json` (source of the Conversations, Listening and Speaking PDFs) | JSON | ✅ Imported | 39 dialogues (unit conversations, dialogue building, role plays) · 39 listening scripts · 39 speaking tasks |
| `tools/listening-exam/content/w5d1–5.json` (source of `A1 Exam/A1 Listening Exam/Week 5`) | JSON | ✅ Imported | 5 timed A1 Listening exams (Parts 1–3) |
| `A1 Exam/A1 Speaking Exam/FND_68_A1_Speaking_Parts_1-2_Question_Bank.docx` | DOCX | ✅ Curated | 12 Speaking Part 1 questions with model answers and Arabic (`src/data/speaking.ts`) |
| `ELEM Progress Exam/` (Reading/Writing Progress 1–7, booklets) | DOCX/PDF | ↔ Format only | The ELEM format (R1 True/False, R2 opposites, R3 plurals, R4 choose the word, R5 past simple, 25-word writing) shapes the mocks. The questions themselves come from the weekly-pack mocks above |
| `A1 Exam/Exam Skills/*.pptx` | PPTX | ↔ Tips only | Exam tips used in the next-step advice |
| `A0 - A1 Books/` (Headway Beginner, English Unlimited scans) | PDF scans | ❌ Not used | Copyright. Headway only guided the order of topics |
| `A0-A1 Pictures/`, `A1 Grammar/Images/` | PNG | ❌ Not used | Classroom posters. The app uses emoji pictures so it stays light and works offline |

**Name and safety rules applied on import.** "Mr Said" became "Mr Adel" (15 places). Items with IATC "avoid" topics are skipped automatically, and the import report lists them.

## 2. Tags on every item

| Tag | How it is set |
|---|---|
| CEFR | Units 1–2 → A0 · Units 3–5 → A0–A1 · Units 6–8 → A1 · Oxford A1 words and exams → A1 |
| Topic / vocabulary theme | The IATC day theme or topic title |
| Grammar point | A key from `src/data/grammarKeys.ts` (be, possessive-adj, a-an, plurals, there-is, past-simple …) |
| Skill | vocabulary · grammar · reading · listening · speaking · writing |
| Unit | Week N → Unit N (words, daily lessons, reading handouts, mocks). Skills-pack items and topic lists map by theme keywords (`moduleForTheme`) |
| Status | lesson · revision · exam |
| Source | `src` = file + location + the classroom document (docx, pptx or pdf) |

## 3. Units and their sources (Unit N = Week N)

Every unit is built from the **A0 – A1 Weekly Materials, Week N** (aligned to New Headway Beginner Unit N):
`tools/weekly-pack/content/readings/weekN.json` (the reading handouts, Sun–Thu) + `tools/weekly-pack/content/weekN.json` (the lesson slides' words, grammar and goals).

| Unit | Week | Day lessons (reading handouts) | Conversation | Listening |
|---|---|---|---|---|
| 1 Hello! | 1 | Hello! I'm Fahad · How Are You Today? · From Good Morning to Good Night · What's in My Bag? · My IATC ID Card | *First Day in Class* (W1) | *A New Student* (W1) |
| 2 Your World | 2 | Teachers from Many Countries · Look at These Photos · In the Maths Room · Brothers at the Kingdom Tower · On Holiday in Riyadh | *Where Are You From?* (W2) | *Three Students, Three Cities* (W2) |
| 3 All About You | 3 | Jobs at the Airport · My Student Form · A Charity Walk in Abha · Excuse Me! Where's the Station? · The Quiz Winner | *A New Student Card* (original) | *Jobs Day at College* (W4) |
| 4 Family and Friends | 4 | Our Family Tree · Adel's Family · My Best Friend, Omar · The IATC Football Team · A Phone Call to the Student Office | *A Photo of My Family* (W2) | *A Family Photo* (W1) |
| 5 The Way I Live | 5 | Food and Sport in Saudi Arabia · The Twins · Joseph, the Waiter · A College of Many Countries · How Much Is It? | *Shopping for the Family* (W3) | *At the Information Desk* (W2) |
| 6 Every Day | 6 | My Week at IATC · My Schoolday · Talal's Lifestyle · A Busy Friday · Captain Saleh's Day | *Early or Late?* (W5) | *A Pilot's Routine* (W5) |
| 7 My Favourites | 7 | A Postcard from Abha · Can I Try It On? · Nasser's Shopping List · A Return Ticket to Dammam · Our New Neighbours | *At the Clothes Shop* (W3) | *A Sale at City Clothes* (W3) |
| 8 Where I Live | 8 | Our New Apartment · Where's My Laptop? · Riyadh, My Home Town · Is There a Bank Near Here? · Out of Town: The Four Seasons | *Is There a Pharmacy Near Here?* (W3) | *A Flat for Your Family* (W3) |

The Conversations / Listening packs were written before the Headway realignment, so their week order differs. Each unit uses the present-tense conversation and listening that best match its topic. Week 1's deck has four days for five readings, so Sunday uses Monday's deck day and Monday/Tuesday share the Tuesday deck day (words split in two).

Reviews come after Units 2, 4, 6 and 8. They are built from those units' checks and words.

## 4. Exams

| Exam | Source | Format |
|---|---|---|
| Starting Point Check | Unit 1–3 checks + the Week 1 Monday reading | Grammar, vocabulary, listening and reading (20 min) |
| Week 1, 2, 4, 5, 6, 7 and 8 mocks | `weekly-pack/content/weekN.json › mock` | ELEM Reading Parts 1–5 (25) + Writing (5), 45 min |
| Listening: Places in Riyadh, Daily Routine, Sport & Health, A Special Day, Emails & Exam Skills | `listening-exam/content/w5d1–5.json` | Part 1 dialogues (MC), Part 2 gap-fill, Part 3 True/False; each recording plays twice |
| Speaking Part 1 | Speaking question bank | 8 questions: record, full sentence, one more idea |

## 5. Original content written for the app

Original role plays show as "Original app dialogue" in the in-app content map. The rest is listed here. The *A New Student Card* dialogue (Unit 3). Role plays: *At the College Café*, *What Time Is It?*, *What Do You Do in Your Free Time?*. Grammar notes: can/can't, present continuous, this/that/these/those. All of it uses Saudi, IATC and aviation contexts, and follows IATC QF 05.
