// Student photo or monster avatar. If a photo cannot load, the student's initials show instead.
import { useState } from 'react';
import type { Student } from '../types';
import { Monster } from './Monster';

export const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

export function Avatar({ student, size = 56, ring = false, className = '' }: { student: Pick<Student, 'firstName' | 'avatar'>; size?: number; ring?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  const a = student.avatar;
  const box = `relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${ring ? 'ring-4 ring-white shadow-card' : ''} ${className}`;
  if (a.kind === 'photo' && !broken) {
    return (
      <span className={`${box} bg-navy-50`} style={{ width: size, height: size }}>
        <img src={a.dataUrl} alt={`${student.firstName}'s photo`} className="h-full w-full object-cover" onError={() => setBroken(true)} />
      </span>
    );
  }
  if (a.kind === 'photo') {
    return (
      <span className={`${box} bg-navy font-bold text-white`} style={{ width: size, height: size, fontSize: size * 0.38 }} role="img" aria-label={student.firstName}>
        {initials(student.firstName)}
      </span>
    );
  }
  return (
    <span className={`${box} bg-gradient-to-b from-sky-50 to-navy-50`} style={{ width: size, height: size }}>
      <Monster seed={a.seed} size={size * 0.92} title={`${student.firstName}'s monster avatar`} />
    </span>
  );
}
