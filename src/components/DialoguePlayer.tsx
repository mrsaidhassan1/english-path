// Dialogue with audio: normal / slow / repeat, line highlighting, transcript always visible.
import { useEffect, useState } from 'react';
import { Pause, Play, Repeat, Turtle } from 'lucide-react';
import type { Dialogue } from '../types';
import { speakLines, stopSpeaking, ttsSupported } from '../lib/speech';
import { Markup } from './Markup';
import { Button } from './ui';
import { useApp } from '../store';

export function DialoguePlayer({ dialogue, large = false, highlightRole, onFinished }: { dialogue: Dialogue; large?: boolean; highlightRole?: string; onFinished?: () => void }) {
  const { data, isTeacher } = useApp();
  const [line, setLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [lastRate, setLastRate] = useState(data.settings.speechRate);
  useEffect(() => () => stopSpeaking(), []);

  const play = async (rate: number, from = 0) => {
    setLastRate(rate);
    setPlaying(true);
    const ok = await speakLines(dialogue.lines.map(([speaker, text]) => ({ speaker, text })), { rate, onLine: setLine, from });
    setPlaying(false);
    if (ok) onFinished?.();
  };
  const stop = () => {
    stopSpeaking();
    setPlaying(false);
    setLine(-1);
  };

  return (
    <div>
      {dialogue.setting && <p className="mb-3 rounded-xl bg-sun-50 px-4 py-2 text-navy">📍 {dialogue.setting}</p>}
      {ttsSupported() ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {playing ? (
            <Button variant="accent" onClick={stop}><Pause size={20} /> Stop</Button>
          ) : (
            <Button onClick={() => play(data.settings.speechRate)}><Play size={20} /> Play</Button>
          )}
          <Button variant="soft" disabled={playing} onClick={() => play(0.6)}><Turtle size={20} /> Slow</Button>
          <Button variant="outline" disabled={playing} onClick={() => play(lastRate)}><Repeat size={20} /> Repeat</Button>
        </div>
      ) : (
        <p className="mb-4 rounded-xl bg-coral-50 px-4 py-3 font-semibold text-coral-800" role="note">
          🔇 Audio is not available in this browser. Read the transcript with your teacher or partner.
        </p>
      )}
      <ol className="space-y-2" aria-label="Transcript">
        {dialogue.lines.map(([who, text], k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => {
                if (playing || !ttsSupported()) return;
                setLine(k);
                speakLines([{ speaker: who, text }], { rate: lastRate }).then(() => setLine(-1));
              }}
              className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition ${line === k ? 'bg-sun-100 ring-2 ring-sun' : 'hover:bg-navy-50'} ${highlightRole && who === highlightRole ? 'border-l-4 border-coral' : ''}`}
              aria-current={line === k}
            >
              <span className={`mt-0.5 shrink-0 rounded-full px-3 py-1 text-sm font-bold ${k % 2 ? 'bg-coral-50 text-coral-700' : 'bg-navy-50 text-navy'}`}>{who}</span>
              <span className={`${large ? 'text-2xl sm:text-3xl' : 'text-lg'} leading-snug text-navy`}><Markup text={text} /></span>
            </button>
          </li>
        ))}
      </ol>
      {isTeacher && dialogue.src && <p className="mt-3 text-xs text-navy-300">Source: {dialogue.src.label}</p>}
    </div>
  );
}
