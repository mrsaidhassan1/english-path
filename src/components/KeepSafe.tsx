// Keeping a learner's progress safe on his phone. Some browsers forget a website's saved data
// (private mode, the browsers inside Instagram / TikTok / Snapchat, Safari after 7 days unused), and the
// learner then starts at 0. These pieces show his restore code, warn in those browsers, and suggest
// adding the app to the home screen (which keeps its data).
import { useState } from 'react';
import { Copy, KeyRound, Share, X } from 'lucide-react';
import { useApp } from '../store';
import { onlineEnabled } from '../lib/online';
import { Ar, Button } from './ui';

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent);
/** The browser inside another app (Instagram, TikTok, Snapchat, Facebook …): it often forgets saved data. */
export const inAppBrowser = () => /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|BytedanceWebview|Snapchat|Line\/|Twitter|LinkedInApp|Pinterest/i.test(ua());
const isIos = () => /iPhone|iPad|iPod/i.test(ua());
const standalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
const canStore = () => { try { localStorage.setItem('ep-test', '1'); localStorage.removeItem('ep-test'); return true; } catch { return false; } };
const TIP_KEY = 'sh-english-path/home-screen-tip';

/** Ask the browser to keep this app's data (Chrome and Edge usually agree; Safari keeps it for home-screen apps). */
export function askToKeepData() {
  try { void navigator.storage?.persist?.(); } catch { /* not available */ }
}

/** A warning on every page when the browser is unlikely to keep the learner's progress. */
export function BrowserWarning() {
  const { toast } = useApp();
  const inApp = inAppBrowser();
  const noStore = !canStore();
  if (!inApp && !noStore) return null;
  return (
    <div className="bg-coral-700 px-4 py-3 text-white" role="alert">
      <p className="font-bold">{inApp ? 'Open English Path in Safari or Chrome.' : 'This browser cannot save your progress (private mode?).'}</p>
      <p className="text-sm">{inApp ? 'This browser (inside another app) may forget your progress. Tap ••• and choose “Open in browser”, or copy the link.' : 'Use Safari or Chrome in normal (not private) mode.'}</p>
      <p dir="rtl" lang="ar" className="font-arabic text-sm">{inApp ? 'افتح التطبيق في سفاري أو كروم حتى لا يضيع تقدمك.' : 'استخدم سفاري أو كروم في الوضع العادي (غير الخاص).'}</p>
      {inApp && (
        <Button size="sm" variant="soft" className="mt-2" onClick={() => navigator.clipboard?.writeText(window.location.href.split('#')[0]).then(() => toast('Link copied. Paste it in Safari or Chrome.', 'good'), () => undefined)}>
          <Copy size={16} /> Copy the link
        </Button>
      )}
    </div>
  );
}

/** The learner's restore code: needed if a phone forgets him. Shown until he says he has saved it (or always, with `always`). */
export function RestoreCodeCard({ always = false }: { always?: boolean }) {
  const { me, updateStudent } = useApp();
  if (!onlineEnabled || !me?.restoreCode || (!always && me.restoreCodeSaved)) return null;
  return (
    <div className="rounded-3xl border-2 border-sun bg-sun-50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <KeyRound className="text-sun-700" />
        <div className="flex-1">
          <p className="font-bold text-navy">Your restore code</p>
          <p className="text-sm text-navy-500">If the app ever starts at 0, join again with the same name and type this code to get your work back.</p>
          <Ar className="text-sm">إذا بدأ التطبيق من الصفر، انضم بنفس الاسم واكتب هذا الرمز لاسترجاع عملك.</Ar>
        </div>
        <span className="rounded-2xl bg-white px-4 py-2 font-mono text-3xl font-bold tracking-[0.3em] text-navy" aria-label={`Restore code ${me.restoreCode.split('').join(' ')}`}>{me.restoreCode}</span>
      </div>
      {!always && (
        <Button size="sm" variant="soft" className="mt-3" onClick={() => updateStudent((s) => { s.restoreCodeSaved = true; })}>I have written it down (or taken a screenshot)</Button>
      )}
    </div>
  );
}

/** iPhone / iPad in Safari: adding the app to the home screen keeps its data. Shown once until closed. */
export function HomeScreenTip() {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(TIP_KEY) === 'done'; } catch { return true; } });
  if (hidden || !isIos() || standalone() || inAppBrowser()) return null;
  const close = () => { try { localStorage.setItem(TIP_KEY, 'done'); } catch { /* ignore */ } setHidden(true); };
  return (
    <div className="relative rounded-3xl bg-sky-50 p-4 pr-12">
      <button type="button" onClick={close} className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-xl text-navy-400 hover:bg-sky-100" aria-label="Close tip"><X size={18} /></button>
      <p className="font-bold text-navy">Keep your progress safe: add English Path to your home screen</p>
      <p className="mt-1 text-navy">Tap <Share size={16} className="inline" aria-label="Share" /> (Share) at the bottom of Safari, then <b>Add to Home Screen</b>. Open the app from its icon.</p>
      <Ar>اضغط زر المشاركة في سفاري ثم «إضافة إلى الشاشة الرئيسية»، وافتح التطبيق من الأيقونة.</Ar>
    </div>
  );
}
