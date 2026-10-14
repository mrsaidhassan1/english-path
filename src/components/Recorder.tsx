// Record → Replay with the microphone. Clear fallback when recording is not supported.
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play } from 'lucide-react';
import { recordingSupported, startRecording, type Recording } from '../lib/recorder';
import { Button } from './ui';

export function Recorder({ onRecorded, label = 'Record', keep = false }: { onRecorded?: (url: string) => void; label?: string; keep?: boolean }) {
  const [state, setState] = useState<'idle' | 'rec' | 'done' | 'error'>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const rec = useRef<Recording | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (state !== 'rec') return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);
  useEffect(() => () => { rec.current?.cancel(); if (url && !keep) URL.revokeObjectURL(url); }, [url, keep]);

  if (!recordingSupported()) {
    return (
      <p className="rounded-xl bg-sky-50 px-4 py-3 text-navy" role="note">
        🎙️ Recording is not available here. Say it aloud to your partner or teacher instead — that is great practice too!
      </p>
    );
  }

  const start = async () => {
    try {
      rec.current = await startRecording();
      setSecs(0);
      setState('rec');
    } catch {
      setState('error');
    }
  };
  const stop = async () => {
    if (!rec.current) return;
    const u = await rec.current.stop();
    rec.current = null;
    if (url && !keep) URL.revokeObjectURL(url);
    setUrl(u);
    setState('done');
    onRecorded?.(u);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === 'rec' ? (
        <Button variant="accent" size="lg" onClick={stop}><Square size={20} /> Stop ({secs}s)</Button>
      ) : (
        <Button variant="accent" size="lg" onClick={start}><Mic size={22} /> {state === 'done' ? 'Record again' : label}</Button>
      )}
      {state === 'rec' && <span className="flex items-center gap-2 font-semibold text-coral-700"><span className="h-3 w-3 animate-pulse rounded-full bg-coral" /> Recording…</span>}
      {url && state === 'done' && (
        <>
          <Button variant="success" size="lg" onClick={() => audio.current?.play()}><Play size={20} /> Replay me</Button>
          <audio ref={audio} src={url} className="hidden" />
        </>
      )}
      {state === 'error' && <p className="w-full text-coral-800">The microphone is blocked. Allow the microphone in your browser, or practise aloud with a partner.</p>}
    </div>
  );
}
