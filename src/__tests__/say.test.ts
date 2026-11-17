import { describe, expect, it } from 'vitest';
import { filledSentence, speakable } from '../lib/speech';

describe('reading exercises aloud', () => {
  it('fills the gap and tidies the sentence', () => {
    expect(filledSentence("___ name's Omar.", 'My')).toBe("My name's Omar.");
    expect(filledSentence('one student → two ___', 'students')).toBe('one student, two students');
    expect(filledSentence('I ___ (visit) my aunt.', 'visited')).toBe('I visited my aunt.');
    expect(filledSentence("This is Omar's car. 's = ___", 'possessive')).toBe("This is Omar's car.");
  });
  it('reads English, not Arabic or punctuation', () => {
    expect(speakable('weekend')).toBe(true);
    expect(speakable('زار')).toBe(false);
    expect(speakable('.')).toBe(false);
    expect(speakable(null)).toBe(false);
  });
});
