// Animated lesson videos (720p, voiced and captioned) for the day lessons. Files live in public/video/<lesson id>.*
// To add one: put <id>.mp4, <id>.vtt (captions) and <id>.jpg (poster) in public/video and list the id here.
export interface LessonVideoInfo { id: string; minutes: number }

export const LESSON_VIDEOS: Record<string, LessonVideoInfo> = {
  'u1-d1': { id: 'u1-d1', minutes: 3 },
  'u1-d2': { id: 'u1-d2', minutes: 4 },
  'u1-d3': { id: 'u1-d3', minutes: 4 },
  'u1-d4': { id: 'u1-d4', minutes: 4 },
  'u1-d5': { id: 'u1-d5', minutes: 4 },
};

export const lessonVideo = (lessonId: string): LessonVideoInfo | undefined => LESSON_VIDEOS[lessonId];
