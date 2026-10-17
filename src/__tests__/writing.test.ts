// A1 writing rubric (Content · Organisation · Language, /15) and the app's first check.
import { describe, expect, it } from 'vitest';
import { CRITERIA, marksTotal, WRITING_MAX } from '../data/writingRubric';
import { a1Errors, analyseWriting, estimateWriting, grammarIssues, unknownWords, writingChecklist } from '../data/writingCheck';
import { headwayWritingGuide } from '../data/headwayWriting';
import { EXAMS, examTotal } from '../data/exams';
import { IATC } from '../data/content';

const jobs = { prompt: 'Write about 25 words about jobs in your family.', bullets: ['your father’s job', 'your brother’s job', 'your job in the future'] };

describe('A1 writing rubric', () => {
  it('has three criteria with bands 0–5, total 15', () => {
    expect(CRITERIA.map((c) => c.key)).toEqual(['content', 'organisation', 'language']);
    CRITERIA.forEach((c) => expect(Object.keys(c.bands).map(Number).sort()).toEqual([0, 1, 2, 3, 4, 5]));
    expect(WRITING_MAX).toBe(15);
  });

  it('marks exam writing out of 15', () => {
    const mock = EXAMS.find((e) => e.kind === 'mock' && e.sections.some((s) => s.kind === 'write'))!;
    const reading = mock.sections.filter((s) => s.kind !== 'write').reduce((t, s) => t + s.items.length, 0);
    expect(examTotal(mock)).toBe(reading + 15);
  });
});

describe('the app’s first check', () => {
  it('gives a strong, connected answer a high mark and says why', () => {
    const a = analyseWriting('My father is a pilot, so he flies to many cities. My brother is a teacher at a school in Riyadh, and he likes his job. In the future, I want to be an engineer because I like aircraft.', jobs);
    expect(marksTotal(a.marks)).toBeGreaterThanOrEqual(13);
    expect(a.bullets.every((b) => b.covered)).toBe(true);
    expect(a.reasons.content.join(' ')).toMatch(/all 3 points/);
  });

});

// The weekly task for a unit, found by its title.
const unitTask = (unit: number, title: RegExp) => {
  const d = IATC.units.find((u) => u.headwayUnit === unit)!.days.find((x) => title.test(x.writing.title))!;
  return { ...d.writing, bullets: d.writing.bullets ?? [] };
};
const org = (a: { reasons: { organisation: string[] } }) => a.reasons.organisation.join(' ');

describe('writing judged against its Headway unit', () => {
  it('matches every weekly task to its own unit, and other tasks to none (general feedback)', () => {
    for (const u of IATC.units) for (const d of u.days) {
      const a = analyseWriting(d.writing.model, d.writing);
      expect(a.unit).toBe(u.headwayUnit);
      expect(org(a)).toContain(`Headway Unit ${u.headwayUnit} (`);
    }
    const general = analyseWriting('I am a student. I live in Riyadh.', jobs);
    expect(general.unit).toBeUndefined();
    expect(org(general)).toContain('General A1 check');
    expect(org(general)).not.toContain('Headway Unit');
  });

  it('takes the studied linking words from the book: and (Unit 1), but (3), also (4), then (6), because (7), so (8)', () => {
    expect(headwayWritingGuide(1)!.linkers).toEqual(['and']);
    expect(headwayWritingGuide(3)!.linkers).toEqual(['and', 'but']);
    expect(headwayWritingGuide(7)!.linkers).toEqual(['and', 'but', 'also', 'then', 'because']);
    expect(headwayWritingGuide(14)!.linkers).toContain('so');
    expect(headwayWritingGuide(undefined)).toBeUndefined();
    expect(headwayWritingGuide(15)).toBeUndefined();
  });

  it('does not ask for linking words a unit has not studied', () => {
    const task = unitTask(1, /This Is Me/);
    const a = analyseWriting('My name is Majed. My college is IATC and my class is FND 68. My teacher is Mr Adel.', task);
    expect(a.marks.organisation).toBeGreaterThanOrEqual(4); // "and" is all Unit 1 has met
    expect(a.comment).not.toMatch(/because|so\b/);
    const b = analyseWriting('My name is Majed. My college is IATC. My class is FND 68. My teacher is Mr Adel.', task);
    expect(org(b)).toMatch(/short, separate sentences are fine/);
    expect(b.marks.organisation).toBeGreaterThanOrEqual(3);
  });

  it('accepts a clear text in a sensible order without linking words, and says which studied ones could help', () => {
    const task = unitTask(9, /Favourite Month/);
    const a = analyseWriting(task.model, task);
    expect(a.marks.organisation).toBeGreaterThanOrEqual(3);
    expect(org(a)).toMatch(/clear, on the task and in a sensible order/);
  });

  it('checks what he / she / it / they refer to, instead of counting them', () => {
    const task = unitTask(4, /Best Friend/);
    const ok = analyseWriting('My best friend is Yousef. He is from Jeddah. He is very funny, and his hair is black. His eyes are brown.', task);
    expect(ok.references.clear.map((r) => `${r.word}→${r.to}`)).toContain('He→Yousef');
    expect(ok.references.unclear).toEqual([]);

    const wrong = analyseWriting('My brother is 20 years old. She is a student at IATC and she likes football.', unitTask(4, /My Family/));
    expect(wrong.references.unclear[0].why).toMatch(/she.*man or a boy/i);
    expect(wrong.tips.map((t) => t.en).join(' ')).toMatch(/he/);

    const which = analyseWriting('My father and my brother work in Riyadh. He is a pilot. I am a student.', unitTask(4, /Jobs in My Family/));
    expect(which.references.unclear[0].why).toMatch(/could mean my father or my brother/);

    // places are things, not people: "the Green Mountain", "King Fahd Hospital"
    const places = analyseWriting('I am in Abha with my brother. My favourite place is the Green Mountain. He likes it too.', unitTask(7, /Postcard/));
    expect(places.references.clear.map((r) => `${r.word}→${r.to}`)).toEqual(expect.arrayContaining(['He→my brother', 'it→the Green Mountain']));
    const hospital = analyseWriting('My father works at King Fahd Hospital. He is a doctor.', unitTask(4, /Jobs in My Family/));
    expect(hospital.references.clear[0].to).toBe('my father');

    const nothing = analyseWriting('It is very big and new. I like the buildings. The weather is hot.', unitTask(2, /Fantastic City/));
    expect(nothing.references.unclear.map((r) => r.word)).toContain('It');
    expect(analyseWriting('It is hot in summer. I go to the beach with my friends.', unitTask(8, /Season/)).references.unclear).toEqual([]);
  });

  it('expects a greeting and an ending in a postcard (Unit 7, p. 53)', () => {
    const task = unitTask(7, /Postcard/);
    const good = analyseWriting('Dear Saleh, I am in Abha with my family. The weather is cool and rainy, but it is lovely. My favourite place is the Green Mountain. See you soon, Nawaf', task);
    expect(good.genre).toBe('message');
    expect(org(good)).toMatch(/Postcard format: a greeting and an ending/);
    const bare = analyseWriting('I am in Abha with my family. The weather is cool and rainy, but it is lovely. My favourite place is the Green Mountain.', task);
    expect(org(bare)).toMatch(/A postcard needs a greeting .* and an ending/);
    expect(bare.marks.organisation).toBeLessThan(good.marks.organisation);
  });

  it('notices a description of a place that jumps back and forth (Unit 8, p. 62)', () => {
    const task = unitTask(8, /Home Town/);
    const mixed = analyseWriting('Abha is a city in the south. The weather is cool. There are many parks and a big market. The weather is rainy in summer.', task);
    expect(mixed.genre).toBe('place');
    expect(org(mixed)).toMatch(/jump back to “the weather”.*group the information by place/);
    const grouped = analyseWriting('Abha is a city in the south. There are many parks and a big market. The weather is cool, and it is rainy in summer.', task);
    expect(org(grouped)).not.toMatch(/jump back/);
    expect(grouped.marks.organisation).toBeGreaterThan(mixed.marks.organisation);
  });

  it('checks a daily routine is in time order (Unit 6)', () => {
    const task = unitTask(6, /^My Day$/);
    const back = analyseWriting('I get home at 4 o\'clock. I get up at 6 in the morning and I have eggs for breakfast. Then I go to IATC.', task);
    expect(org(back)).toMatch(/times are not in order/);
    const good = analyseWriting('I get up at 6 in the morning and I have eggs for breakfast. Then I go to IATC. I get home at 4 o\'clock.', task);
    expect(org(good)).toMatch(/time order/);
    expect(good.marks.organisation).toBeGreaterThan(back.marks.organisation);
  });

  it('finds mistakes with each unit’s language, from that unit on', () => {
    const fix = (t: string, unit: number) => grammarIssues(t, unit).find((i) => i.unit !== undefined)?.fix;
    expect(fix('I amn\'t a doctor.', 3)).toBe("I'm not");
    expect(fix('She is no married.', 3)).toBe('is not married');
    expect(fix('My father is pilot.', 3)).toBe('My father is a pilot');
    expect(fix('My father name is Saad.', 4)).toBe("My father's name");
    expect(fix('I have a car German.', 5)).toBe('German car');
    expect(fix('He goes always to the mosque.', 6)).toBe('always goes');
    expect(fix('There is two parks.', 8)).toBe('There are two');
    expect(fix('I born in 2006.', 9)).toBe('I was born');
    expect(fix('I didn\'t went to college.', 10)).toBe("didn't go");
    expect(fix('I can to swim.', 11)).toBe('can swim');
    expect(fix('I\'d like go to Abha.', 12)).toBe("I'd like to go");
    expect(fix('I am going to studying English.', 14)).toBe('going to study');
    expect(grammarIssues('I going to study English.', 14)[0].fix).toBe('I am going'); // one report, from the general rule
    // not before the unit that teaches it
    expect(grammarIssues('I didn\'t went to college.', 4).some((i) => i.unit !== undefined)).toBe(false);
    // and the book's correct sentences are not flagged
    expect(grammarIssues('They aren\'t from Italy. She isn\'t married. There is no water. Where are they from?', 14).filter((i) => i.unit)).toEqual([]);
  });

  it('reports the unit’s target language without requiring it', () => {
    const task = unitTask(4, /My Family/);
    const used = analyseWriting('My father has a shop in Riyadh. My mother\'s name is Noura. My grandparents live in Hail, and their house is big.', task);
    expect(used.targetUsed).toEqual(expect.arrayContaining(['has / have', 'our / their']));
    expect(used.reasons.language.join(' ')).toMatch(/Uses this unit's language/);
    const not = analyseWriting('I love my family. We are happy. We live in Riyadh near the park.', task);
    expect(not.reasons.language.join(' ')).toMatch(/not used here; that is fine/);
  });

  it('builds the student checklist from the unit and the kind of writing', () => {
    const postcard = writingChecklist(unitTask(7, /Postcard/));
    expect(postcard.map((c) => c.area)).toEqual(expect.arrayContaining(['Content', 'Organisation', 'Language']));
    expect(postcard.find((c) => c.area === 'Organisation')!.en).toMatch(/greeting .* ending/);
    expect(postcard.some((c) => /and, but, because/.test(c.en))).toBe(true);
    const unit1 = writingChecklist(unitTask(1, /This Is Me/));
    expect(unit1.some((c) => /but|because/.test(c.en))).toBe(false);
    expect(unit1.some((c) => /Unit 1/.test(c.en))).toBe(true);
    const general = writingChecklist(jobs);
    expect(general.some((c) => /Unit \d/.test(c.en))).toBe(false);
  });

  it('gives a short, unconnected answer with errors a low mark, with corrections', () => {
    const a = analyseWriting('father teacher. he go school. i like', jobs);
    expect(marksTotal(a.marks)).toBeLessThanOrEqual(6);
    expect(a.marks.language).toBeLessThanOrEqual(2);
    expect(a.issues.find((i) => i.text.toLowerCase() === 'he go')?.fix).toBe('he goes');
  });

  it('names the point that is missing', () => {
    const a = analyseWriting('My father is a doctor at King Fahd Hospital. He works every day, and he is very busy. My brother is a police officer in Riyadh.', jobs);
    expect(a.bullets.map((b) => b.covered)).toEqual([true, true, false]);
    expect(a.marks.content).toBe(3);
    expect(a.tips[0].en).toMatch(/your job in the future/);
  });

  it('notices writing about something else', () => {
    const a = analyseWriting('I like football and basketball. I play with my friends at the park every weekend. We have a good team and we win many matches.', jobs);
    expect(a.offTopic).toBe(true);
    expect(a.marks.content).toBeLessThanOrEqual(1);
  });

  it('notices the past in a task about plans', () => {
    const a = analyseWriting('Last summer I went to Abha with my family. We stayed in a hotel and we visited the mountains. It was cool and green.',
      { prompt: 'Write about 25 words about your plans for the holiday.', bullets: ['where you are going to go', 'who you are going to go with', 'what you are going to do'] });
    expect(a.timeMismatch).toBe('past-for-future');
  });

  it('gives nothing for an empty answer', () => {
    expect(marksTotal(estimateWriting('', jobs.bullets))).toBe(0);
  });

  it('finds common A1 errors, with a fix', () => {
    const fix = (t: string) => grammarIssues(t)[0]?.fix;
    expect(fix('I want to go because is sunny.')).toBe('because it is');
    expect(fix('Are you like football?')).toBe('Do you like');
    expect(fix('My first name are Turki.')).toMatch(/is$/);
    expect(fix('There are a big park near my house.')).toBe('There is a');
    expect(fix('We go the bus to college.')).toBe('go by bus');
    expect(fix('I have 19 years.')).toBe('am 19 years old');
    expect(fix('He is a engineer.')).toBe('an engineer');
    expect(a1Errors('He likes football. I am happy. The buildings in the centre are beautiful.')).toEqual([]);
  });

  it('checks spelling against the A1 word lists, but not names', () => {
    expect(unknownWords('I like footbal and my familly.')).toEqual(['footbal', 'familly']);
    expect(unknownWords('My brother lives in Riyadh and he studies English. Yesterday we went to Jeddah.')).toEqual([]);
  });

  it('scores every model answer in the weekly materials well', () => {
    const tasks = IATC.units.flatMap((u) => u.days.map((d) => ({ ...d.writing, bullets: d.writing.bullets ?? [] }))).filter((t) => t.model && t.prompt);
    expect(tasks.length).toBeGreaterThan(60);
    const totals = tasks.map((t) => marksTotal(analyseWriting(t.model, t).marks));
    expect(Math.min(...totals)).toBeGreaterThanOrEqual(10);
    expect(totals.reduce((a, b) => a + b, 0) / totals.length).toBeGreaterThanOrEqual(12.5);
  });
});
