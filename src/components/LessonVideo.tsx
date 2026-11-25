// The animated lesson video, shown at the start of a day lesson. Captions are on by default.
import { Film } from 'lucide-react';
import { lessonVideo } from '../data/lessonVideos';
import { Ar } from './ui';

export function LessonVideo({ lessonId }: { lessonId: string }) {
  const v = lessonVideo(lessonId);
  if (!v) return null;
  const base = `${import.meta.env.BASE_URL}video/${v.id}`;
  return (
    <section className="mb-5 overflow-hidden rounded-3xl bg-navy shadow-card" aria-label="Lesson video">
      <div className="flex items-center gap-2 px-4 py-3 text-white">
        <Film size={20} aria-hidden />
        <b className="text-lg">Watch the lesson video</b>
        <span className="ml-auto text-sm text-navy-200">{v.minutes} min</span>
      </div>
      <video className="aspect-video w-full bg-black" controls playsInline preload="metadata" poster={`${base}.jpg`}>
        <source src={`${base}.mp4`} type="video/mp4" />
        <track kind="captions" srcLang="en" label="English" src={`${base}.vtt`} default />
        Your browser cannot play this video.
      </video>
      <p className="px-4 py-2 text-sm text-navy-200">Watch first, then do the activities. Turn captions on or off with the CC button.
        <Ar className="!text-navy-200">شاهد الفيديو أولاً ثم أكمل الأنشطة.</Ar></p>
    </section>
  );
}
