// The logo MARK only (no personal name), shown with the app name.
import markUrl from '../assets/brand/sh-mark.png';
import markWhiteUrl from '../assets/brand/sh-mark-white.png';

export const APP_NAME = 'English Path';
export const APP_SUBTITLE = 'A1 Learning Hub';
export const APP_TAGLINE = 'Learn. Practise. Speak with confidence.';
export const APP_TAGLINE_AR = 'تعلّم. تدرّب. تحدّث بثقة.';

export function LogoMark({ size = 40, white = false, className = '' }: { size?: number; white?: boolean; className?: string }) {
  return (
    <img
      src={white ? markWhiteUrl : markUrl}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Logo mark + "English Path", with "A1 Learning Hub" underneath when there is room. */
export function Logo({ size = 40, white = false, stacked = false, subtitle = size >= 40 }: { size?: number; white?: boolean; stacked?: boolean; subtitle?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${stacked ? 'flex-col text-center' : ''}`} aria-label={`${APP_NAME}, ${APP_SUBTITLE}`}>
      <LogoMark size={size} white={white} />
      <span className="flex flex-col leading-tight">
        <span className={`font-bold tracking-tight ${white ? 'text-white' : 'text-navy'}`} style={{ fontSize: Math.max(15, size * 0.42) }}>
          English <span className={white ? 'text-sky' : 'text-coral-700'}>Path</span>
        </span>
        {subtitle && <span className={`text-xs font-semibold uppercase tracking-wider ${white ? 'text-navy-100' : 'text-navy-400'}`}>{APP_SUBTITLE}</span>}
      </span>
    </span>
  );
}
