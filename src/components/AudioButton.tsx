import { useEffect, useState } from 'react';
import { Volume2, Turtle } from 'lucide-react';
import { speak, stopSpeaking, ttsSupported } from '../lib/speech';
import { useApp } from '../store';

/** Play text with the browser voice. `slow` uses a slower rate. */
export function AudioButton({ text, slow = false, size = 'md', label, className = '' }: { text: string; slow?: boolean; size?: 'sm' | 'md' | 'lg'; label?: string; className?: string }) {
  const { data } = useApp();
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => { if (playing) stopSpeaking(); }, [playing]);
  if (!ttsSupported()) return null;
  const dim = { sm: 'h-11 w-11', md: 'h-12 w-12', lg: 'h-16 w-16' }[size];
  const Icon = slow ? Turtle : Volume2;
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        setPlaying(true);
        await speak(text, { rate: slow ? 0.6 : data.settings.speechRate });
        setPlaying(false);
      }}
      className={`grid ${dim} shrink-0 place-items-center rounded-full transition ${playing ? 'bg-coral text-white animate-wiggle' : slow ? 'bg-sky-100 text-sky-800 hover:bg-sky-200' : 'bg-navy text-white hover:bg-navy-500'} ${className}`}
      aria-label={label ?? `${slow ? 'Play slowly' : 'Play'}: ${text}`}
      title={slow ? 'Slow' : 'Listen'}
    >
      <Icon size={size === 'lg' ? 30 : 22} />
    </button>
  );
}
