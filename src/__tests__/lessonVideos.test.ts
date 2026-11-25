import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LESSON_VIDEOS } from '../data/lessonVideos';
import { MODULES } from '../data/modules';

describe('lesson videos', () => {
  const dir = new URL('../../public/video/', import.meta.url);
  it('every listed video has its mp4, captions and poster', () => {
    for (const id of Object.keys(LESSON_VIDEOS)) {
      for (const ext of ['mp4', 'vtt', 'jpg']) expect(existsSync(new URL(`${id}.${ext}`, dir)), `${id}.${ext}`).toBe(true);
      expect(readFileSync(new URL(`${id}.vtt`, dir), 'utf8').startsWith('WEBVTT')).toBe(true);
    }
  });
  it('every listed video belongs to a real lesson', () => {
    const ids = new Set(MODULES.flatMap((m) => m.lessons.map((l) => l.id)));
    for (const id of Object.keys(LESSON_VIDEOS)) expect(ids.has(id), id).toBe(true);
  });
});
