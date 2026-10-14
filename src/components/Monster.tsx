// Friendly monster avatars. Every seed always gives the same monster.
// Original designs: soft shapes, big eyes, no sharp teeth, brand-friendly colours.
import { useId } from 'react';
import { mulberry32 } from '../lib/rng';

const PALETTES = [
  { body: '#FF6B6B', belly: '#FFD6D6', dark: '#C8322F' }, // coral
  { body: '#4FCBE0', belly: '#DDF6FA', dark: '#176F80' }, // sky
  { body: '#5B67C2', belly: '#DCE0F3', dark: '#2D387A' }, // navy-light
  { body: '#34C38F', belly: '#D4F3E5', dark: '#126845' }, // mint
  { body: '#FFC14D', belly: '#FFF0C7', dark: '#9A6400' }, // sun
  { body: '#A78BFA', belly: '#EDE7FE', dark: '#5B3FC4' }, // lavender
  { body: '#FF9F7A', belly: '#FFE3D6', dark: '#B34E26' }, // peach
  { body: '#2BB3A3', belly: '#D2F3EF', dark: '#11645B' }, // teal
];

interface Shape { d: string; top: number; left: number; right: number; eyeY: number; bottom: number }
const SHAPES: Shape[] = [
  { d: 'M50 26a32 32 0 1 1 0 64a32 32 0 1 1 0-64z', top: 26, left: 18, right: 82, eyeY: 52, bottom: 90 }, // round
  { d: 'M50 21c16 0 27 15 27 36s-11 34-27 34-27-13-27-34 11-36 27-36z', top: 21, left: 23, right: 77, eyeY: 47, bottom: 91 }, // egg
  { d: 'M44 33h12c16 0 28 12 28 28v1c0 16-12 28-28 28H44c-16 0-28-12-28-28v-1c0-16 12-28 28-28z', top: 33, left: 16, right: 84, eyeY: 55, bottom: 90 }, // wide bean
  { d: 'M38 25h24c10 0 18 8 18 18v29c0 10-8 18-18 18H38c-10 0-18-8-18-18V43c0-10 8-18 18-18z', top: 25, left: 20, right: 80, eyeY: 50, bottom: 90 }, // soft square
  { d: 'M50 22c14 0 22 14 25 32 4 22-6 37-25 37S21 76 25 54c3-18 11-32 25-32z', top: 22, left: 24, right: 76, eyeY: 50, bottom: 91 }, // pear
  { d: 'M24 88V52c0-12 7-20 15-21 3-7 7-10 11-10s8 3 11 10c8 1 15 9 15 21v36c0 2-2 3-4 3H28c-2 0-4-1-4-3z', top: 21, left: 24, right: 76, eyeY: 52, bottom: 91 }, // bumpy top
];

export interface MonsterTraits {
  palette: number; shape: number; eyes: 1 | 2 | 3; pupil: number; mouth: number; horns: number; ears: number; hair: number;
  pattern: number; belly: boolean; cheeks: boolean; accessory: number; arms: boolean;
}

export function monsterTraits(seed: number): MonsterTraits {
  const r = mulberry32(seed);
  const pickN = (n: number) => Math.floor(r() * n);
  const accessory = r() < 0.55 ? 1 + pickN(5) : 0;
  const cap = accessory === 2;
  return {
    palette: pickN(PALETTES.length),
    shape: pickN(SHAPES.length),
    eyes: ([1, 2, 2, 2, 3] as const)[pickN(5)],
    pupil: pickN(3),
    mouth: pickN(4),
    horns: cap ? 0 : r() < 0.5 ? 1 + pickN(3) : 0,
    ears: r() < 0.55 ? 1 + pickN(3) : 0,
    hair: cap ? 0 : r() < 0.35 ? 1 + pickN(2) : 0,
    pattern: pickN(3),
    belly: r() < 0.6,
    cheeks: r() < 0.65,
    accessory,
    arms: r() < 0.6,
  };
}

export function Monster({ seed, size = 64, title }: { seed: number; size?: number; title?: string }) {
  const uid = useId().replace(/:/g, '');
  const t = monsterTraits(seed);
  const p = PALETTES[t.palette];
  const s = SHAPES[t.shape];
  const clip = `mc-${uid}`;
  const cx = 50;

  const eyeXs = t.eyes === 1 ? [cx] : t.eyes === 2 ? [cx - 11, cx + 11] : [cx - 15, cx, cx + 15];
  const eyeR = t.eyes === 1 ? 12 : t.eyes === 2 ? 8.5 : 6.5;
  const mouthY = s.eyeY + (t.eyes === 1 ? 20 : 17);

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title ?? 'Monster avatar'} style={{ display: 'block' }}>
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={clip}><path d={s.d} /></clipPath>
      </defs>

      {/* ears (behind body) */}
      {t.ears === 1 && (<g fill={p.body}><circle cx={s.left + 6} cy={s.top + 10} r="9" /><circle cx={s.right - 6} cy={s.top + 10} r="9" /><circle cx={s.left + 6} cy={s.top + 10} r="4.5" fill={p.belly} /><circle cx={s.right - 6} cy={s.top + 10} r="4.5" fill={p.belly} /></g>)}
      {t.ears === 2 && (<g fill={p.body} stroke={p.dark} strokeWidth="0" ><path d={`M${s.left + 2} ${s.top + 18} L${s.left - 4} ${s.top - 4} L${s.left + 16} ${s.top + 8} Z`} strokeLinejoin="round" /><path d={`M${s.right - 2} ${s.top + 18} L${s.right + 4} ${s.top - 4} L${s.right - 16} ${s.top + 8} Z`} /></g>)}
      {t.ears === 3 && (<g fill={p.dark} opacity="0.85"><ellipse cx={s.left + 1} cy={s.top + 22} rx="6" ry="12" transform={`rotate(20 ${s.left + 1} ${s.top + 22})`} /><ellipse cx={s.right - 1} cy={s.top + 22} rx="6" ry="12" transform={`rotate(-20 ${s.right - 1} ${s.top + 22})`} /></g>)}

      {/* horns */}
      {t.horns === 1 && (<g fill="#FFF3D1" stroke={p.dark} strokeWidth="1.5" strokeLinejoin="round"><path d={`M${cx - 15} ${s.top + 6} L${cx - 19} ${s.top - 10} L${cx - 8} ${s.top + 3} Z`} /><path d={`M${cx + 15} ${s.top + 6} L${cx + 19} ${s.top - 10} L${cx + 8} ${s.top + 3} Z`} /></g>)}
      {t.horns === 2 && (<g fill="none" stroke={p.dark} strokeWidth="3.5" strokeLinecap="round"><path d={`M${cx - 10} ${s.top + 3} q-6 -10 -1 -14 q4 -2 5 3`} /><path d={`M${cx + 10} ${s.top + 3} q6 -10 1 -14 q-4 -2 -5 3`} /></g>)}
      {t.horns === 3 && (<g><line x1={cx} y1={s.top + 2} x2={cx} y2={s.top - 11} stroke={p.dark} strokeWidth="2.5" strokeLinecap="round" /><circle cx={cx} cy={s.top - 13} r="4.5" fill="#FF5151" /></g>)}

      {/* arms */}
      {t.arms && (<g fill={p.body}><ellipse cx={s.left + 1} cy={s.bottom - 26} rx="5" ry="10" transform={`rotate(25 ${s.left + 1} ${s.bottom - 26})`} /><ellipse cx={s.right - 1} cy={s.bottom - 28} rx="5" ry="10" transform={`rotate(-35 ${s.right - 1} ${s.bottom - 28})`} /></g>)}

      {/* feet */}
      <g fill={p.dark}><ellipse cx={cx - 13} cy={s.bottom} rx="8" ry="4.5" /><ellipse cx={cx + 13} cy={s.bottom} rx="8" ry="4.5" /></g>

      {/* body */}
      <path d={s.d} fill={p.body} />
      <g clipPath={`url(#${clip})`}>
        {t.belly && <ellipse cx={cx} cy={s.bottom - 8} rx="20" ry="17" fill={p.belly} />}
        {t.pattern === 1 && (<g fill={p.dark} opacity="0.22"><circle cx={s.left + 8} cy={s.eyeY + 10} r="4" /><circle cx={s.right - 9} cy={s.eyeY + 4} r="3" /><circle cx={s.right - 12} cy={s.bottom - 14} r="5" /><circle cx={s.left + 12} cy={s.bottom - 10} r="3" /></g>)}
        {t.pattern === 2 && (<g stroke={p.dark} strokeWidth="5" opacity="0.18" fill="none"><path d={`M0 ${s.top + 12} q50 -10 100 0`} /><path d={`M0 ${s.bottom - 22} q50 -8 100 0`} /><path d={`M0 ${s.bottom - 8} q50 -8 100 0`} /></g>)}
      </g>

      {/* hair */}
      {t.hair === 1 && (<g fill="none" stroke={p.dark} strokeWidth="3" strokeLinecap="round"><path d={`M${cx - 4} ${s.top + 2} q-2 -9 -8 -10`} /><path d={`M${cx} ${s.top + 1} q0 -10 0 -12`} /><path d={`M${cx + 4} ${s.top + 2} q2 -9 8 -10`} /></g>)}
      {t.hair === 2 && (<path d={`M${cx - 16} ${s.top + 7} l5 -9 l5 6 l6 -9 l6 9 l5 -6 l5 9 q-16 -5 -32 0z`} fill={p.dark} opacity="0.9" />)}

      {/* eyes */}
      {eyeXs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={s.eyeY} r={eyeR} fill="#fff" stroke={p.dark} strokeWidth="1.2" />
          <circle cx={x + (t.pupil === 1 ? 1.5 : t.pupil === 2 ? -1 : 0)} cy={s.eyeY + (t.pupil === 2 ? 1.5 : 1)} r={eyeR * 0.5} fill="#161E54" />
          <circle cx={x + eyeR * 0.22} cy={s.eyeY - eyeR * 0.2} r={eyeR * 0.18} fill="#fff" />
        </g>
      ))}

      {/* cheeks */}
      {t.cheeks && (<g fill="#FF8FA3" opacity="0.55"><ellipse cx={cx - 20} cy={mouthY - 3} rx="4.5" ry="3" /><ellipse cx={cx + 20} cy={mouthY - 3} rx="4.5" ry="3" /></g>)}

      {/* mouth: smile / open smile / one-tooth grin / small o */}
      {t.mouth === 0 && <path d={`M${cx - 9} ${mouthY - 2} q9 9 18 0`} fill="none" stroke="#161E54" strokeWidth="2.5" strokeLinecap="round" />}
      {t.mouth === 1 && (<g><path d={`M${cx - 10} ${mouthY - 3} q10 14 20 0 z`} fill="#161E54" /><path d={`M${cx - 5} ${mouthY + 3} q5 -4 10 0 q-5 3 -10 0`} fill="#FF8FA3" /></g>)}
      {t.mouth === 2 && (<g><path d={`M${cx - 11} ${mouthY - 3} q11 11 22 0 z`} fill="#161E54" /><rect x={cx - 3} y={mouthY - 3} width="6" height="4.5" rx="1" fill="#fff" /></g>)}
      {t.mouth === 3 && <ellipse cx={cx} cy={mouthY} rx="4" ry="4.5" fill="#161E54" />}

      {/* accessories: headset / cap / glasses / bow tie / star badge */}
      {t.accessory === 1 && (<g><path d={`M${s.left + 4} ${s.eyeY - 2} Q50 ${s.top - 16} ${s.right - 4} ${s.eyeY - 2}`} fill="none" stroke="#161E54" strokeWidth="3.5" /><rect x={s.left - 3} y={s.eyeY - 7} width="9" height="14" rx="4" fill="#161E54" /><rect x={s.right - 6} y={s.eyeY - 7} width="9" height="14" rx="4" fill="#161E54" /><path d={`M${s.left + 2} ${s.eyeY + 6} q4 14 18 14`} fill="none" stroke="#161E54" strokeWidth="2" /><circle cx={s.left + 21} cy={s.eyeY + 20} r="2.5" fill="#88E0EF" /></g>)}
      {t.accessory === 2 && (<g><path d={`M${cx - 20} ${s.top + 8} q20 -22 40 0 z`} fill="#161E54" /><rect x={cx - 2} y={s.top + 4} width="30" height="5" rx="2.5" fill="#FF5151" /><circle cx={cx} cy={s.top - 3} r="2.5" fill="#FF5151" /></g>)}
      {t.accessory === 3 && (<g fill="none" stroke="#161E54" strokeWidth="2">{eyeXs.map((x, i) => <circle key={i} cx={x} cy={s.eyeY} r={eyeR + 2.5} />)}{eyeXs.length > 1 && <line x1={eyeXs[0] + eyeR + 2.5} y1={s.eyeY} x2={eyeXs[1] - eyeR - 2.5} y2={s.eyeY} />}</g>)}
      {t.accessory === 4 && (<g fill="#FF5151"><path d={`M${cx} ${s.bottom - 14} l-9 -5 v10 z`} /><path d={`M${cx} ${s.bottom - 14} l9 -5 v10 z`} /><circle cx={cx} cy={s.bottom - 14} r="2.5" fill="#C8322F" /></g>)}
      {t.accessory === 5 && (<path d={`M${cx + 14} ${s.bottom - 22} l2.4 4.8 5.3 .8 -3.8 3.7 .9 5.3 -4.8 -2.5 -4.8 2.5 .9 -5.3 -3.8 -3.7 5.3 -.8z`} fill="#FFC14D" stroke="#9A6400" strokeWidth="0.8" />)}
    </svg>
  );
}
