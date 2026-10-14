// Audio for the app.
// 1) Natural recorded voices (Kokoro, recorded offline with OpenVox) for the speaking parts:
//    public/audio/*.mp3, looked up in src/data/generated/audio-manifest.json.
// 2) The browser's own voice (Web Speech API) for any line that has no recording yet.
import manifest from '../data/generated/audio-manifest.json';
import { audioKey } from './audioKey';
import { stripMarkup } from './text';

const CLIPS = manifest as Record<string, string>;
const BY_TEXT = new Map<string, string>();
for (const [key, file] of Object.entries(CLIPS)) {
  const text = key.slice(key.indexOf('|') + 1);
  if (!BY_TEXT.has(text) || key.startsWith('|')) BY_TEXT.set(text, file);
}
const BASE = `${import.meta.env.BASE_URL}audio/`;
const RECORDED_SPEED = 0.9; // the app's "normal" rate; recordings are already at a natural pace

export const browserTts = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
export const hasRecordings = Object.keys(CLIPS).length > 0;
/** Can the app play any audio at all here? */
export const ttsSupported = () => hasRecordings || browserTts();

/** Recording for a line: this speaker's voice, or the same words in another voice. */
export function clipFor(text: string, speaker = ''): string | null {
  const k = audioKey(text, speaker);
  return CLIPS[k.id] ?? BY_TEXT.get(k.text.toLowerCase()) ?? null;
}

// ------------------------------------------------------------------ browser voice
let voices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  if (!browserTts()) return;
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const score = (v: SpeechSynthesisVoice) => (v.lang === 'en-GB' ? 0 : v.lang === 'en-US' ? 1 : 2) + (v.localService ? 0 : 0.5);
  voices = all.sort((a, b) => score(a) - score(b));
}
if (browserTts()) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

function utter(text: string, o: SpeakOpts): Promise<void> {
  if (!browserTts()) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(stripMarkup(text));
    u.lang = 'en-GB';
    u.rate = o.rate ?? 0.9;
    u.pitch = o.pitch ?? 1;
    if (voices.length) u.voice = voices[(o.voice ?? 0) % voices.length];
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

// ------------------------------------------------------------------ recordings
let current: { audio: HTMLAudioElement; done: () => void } | null = null;

/**
 * Play a recording. `clip` is "file.mp3" or, for vocabulary bundles, "file.mp3#start-end" (seconds).
 * Resolves true when it played to the end (or was stopped), false if it could not play.
 */
function playClip(clip: string, rate: number): Promise<boolean> {
  return new Promise((resolve) => {
    const [file, range] = clip.split('#');
    const [start, end] = range ? range.split('-').map(Number) : [0, Infinity];
    const audio = new Audio(BASE + file);
    audio.preload = 'auto';
    audio.playbackRate = Math.max(0.5, Math.min(1.5, rate / RECORDED_SPEED));
    (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    let settled = false;
    let poll = 0;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearInterval(poll);
      if (Number.isFinite(end)) audio.pause();
      if (current?.audio === audio) current = null;
      resolve(ok);
    };
    current = { audio, done: () => finish(true) };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    const go = () => {
      if (start > 0) audio.currentTime = start;
      audio.play().catch(() => finish(false));
      // a bundle keeps playing into the next word, so stop at this word's end
      if (Number.isFinite(end)) poll = window.setInterval(() => audio.currentTime >= end + 0.05 && finish(true), 25);
    };
    if (start > 0 && audio.readyState < 1) audio.addEventListener('loadedmetadata', go, { once: true });
    else go();
  });
}

// ------------------------------------------------------------------ public API
let token = 0;

export function stopSpeaking() {
  token++;
  if (current) {
    current.audio.pause();
    current.done();
  }
  if (browserTts()) window.speechSynthesis.cancel();
}

export interface SpeakOpts { rate?: number; voice?: number; pitch?: number; speaker?: string }

async function sayOne(text: string, o: SpeakOpts) {
  const file = clipFor(text, o.speaker);
  if (file && (await playClip(file, o.rate ?? 0.9))) return;
  await utter(text, o); // no recording, or it failed to load: use the browser voice
}

/** Speak one text. Resolves when finished (or cancelled). */
export async function speak(text: string, o: SpeakOpts = {}): Promise<void> {
  stopSpeaking();
  await sayOne(text, o);
}

/** Speak dialogue lines one by one; onLine(i) fires before each line (−1 at the end). */
export async function speakLines(
  lines: { speaker: string; text: string }[],
  o: SpeakOpts & { onLine?: (i: number) => void; gapMs?: number; from?: number } = {},
): Promise<boolean> {
  if (!ttsSupported()) return false;
  stopSpeaking();
  const my = ++token;
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  for (let i = o.from ?? 0; i < lines.length; i++) {
    if (my !== token) return false;
    o.onLine?.(i);
    const idx = speakers.indexOf(lines[i].speaker);
    await sayOne(lines[i].text, { rate: o.rate, voice: idx, pitch: idx % 2 ? 0.9 : 1.05, speaker: lines[i].speaker });
    if (my !== token) return false;
    await new Promise((r) => setTimeout(r, o.gapMs ?? 350));
  }
  o.onLine?.(-1);
  return true;
}
