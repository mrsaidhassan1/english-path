import { onlineEnabled, teacherSignOut } from '../lib/online';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Route, BookOpen, Layers, Mic, Dumbbell, RefreshCcw, ClipboardCheck, BarChart3, LayoutDashboard, Presentation, MoreHorizontal, LogOut, Languages, X,
} from 'lucide-react';
import { useSyncState } from '../hooks/useOnlineSync';
import { Cloud, CloudOff, RefreshCw, UserRound } from 'lucide-react';
import { ViewAsStudentBanner, useViewAsStudent } from './StaffPreview';
import { useApp } from '../store';
import { Logo, LogoMark } from './Logo';
import { Avatar } from './Avatar';
import { ErrorBoundary } from './ErrorBoundary';

export const NAV = [
  { to: '/', label: 'Home', ar: 'الرئيسية', icon: Home, end: true },
  { to: '/learning', label: 'My Learning', ar: 'تعلّمي', icon: Route },
  { to: '/lessons', label: 'Lessons', ar: 'الدروس', icon: BookOpen },
  { to: '/vocabulary', label: 'Vocabulary', ar: 'المفردات', icon: Layers },
  { to: '/speaking', label: 'Speaking', ar: 'التحدث', icon: Mic },
  { to: '/practice', label: 'Practice', ar: 'التدريب', icon: Dumbbell },
  { to: '/review', label: 'Review', ar: 'المراجعة', icon: RefreshCcw },
  { to: '/exams', label: 'Exams', ar: 'الاختبارات', icon: ClipboardCheck },
  { to: '/progress', label: 'My Progress', ar: 'تقدّمي', icon: BarChart3 },
  { to: '/teacher', label: 'Teacher Dashboard', ar: 'لوحة المعلم', icon: LayoutDashboard, teacher: true },
  { to: '/classroom', label: 'Classroom Mode', ar: 'وضع الفصل', icon: Presentation, teacher: true },
];

function NavItem({ item, onClick }: { item: (typeof NAV)[number]; onClick?: () => void }) {
  const { data } = useApp();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex min-h-[48px] items-center gap-3 rounded-2xl px-4 font-semibold transition ${isActive ? 'bg-white text-navy shadow-card' : 'text-navy-100 hover:bg-white/10 hover:text-white'}`
      }
    >
      <Icon size={21} aria-hidden="true" />
      <span className="flex-1">{item.label}</span>
      {data.settings.arabic && <span className="font-arabic text-xs opacity-70" lang="ar">{item.ar}</span>}
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { data, update, me, isTeacher, cls, students } = useApp();
  const [more, setMore] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const items = NAV.filter((n) => !n.teacher || isTeacher);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  const mobileMain = items.filter((n) => ['/', '/learning', '/lessons', '/vocabulary'].includes(n.to));
  const viewAs = useViewAsStudent();
  const signOut = () => {
    // a teacher on the online version also leaves their staff sign-in
    if (onlineEnabled && data.session.role === 'teacher') teacherSignOut().catch(() => undefined);
    update((d) => { d.session = { role: null, studentId: null }; });
    nav('/');
  };

  return (
    <div className="min-h-screen bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-navy px-4 py-5 lg:flex">
        <div className="mb-6 px-2"><Logo size={44} white /></div>
        <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Main">
          {items.map((n) => <NavItem key={n.to} item={n} />)}
        </nav>
        <div className="mt-4 rounded-2xl bg-white/10 p-3 text-sm text-navy-100">
          {isTeacher && data.classes.length > 1 ? (
            <label className="block">
              <span className="text-xs uppercase tracking-wide">Class</span>
              <select value={cls?.id ?? ''} onChange={(e) => update((d) => { d.activeClassId = e.target.value; })}
                className="mt-1 block min-h-[44px] w-full rounded-xl bg-white px-2 font-semibold text-navy" aria-label="Choose class">
                {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ) : (
            <div className="font-semibold text-white">{cls?.name ?? 'No class yet'}</div>
          )}
          <div className="mt-1">{students.length} learners · {cls?.level ?? 'A0–A1'}</div>
        </div>
      </aside>

      <div className="lg:pl-72">
      <ViewAsStudentBanner />
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-navy-100/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <div className="min-w-0 lg:hidden"><Logo size={30} /></div>
          <div className="flex-1" />
          {me && <SyncChip />}
          <button
            onClick={() => update((d) => { d.settings.arabic = !d.settings.arabic; })}
            aria-pressed={data.settings.arabic}
            aria-label="Arabic help"
            className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-3 font-semibold transition ${data.settings.arabic ? 'bg-sky-100 text-sky-900' : 'bg-navy-50 text-navy'}`}
            title="Arabic support for instructions and key words"
          >
            <Languages size={20} /> <span className="hidden sm:inline">Arabic help</span> <span className="hidden font-arabic min-[400px]:inline" lang="ar">عربي</span>
          </button>
          {me ? (
            <NavLink to="/progress" className="flex min-h-[44px] items-center gap-2 rounded-2xl px-2 hover:bg-navy-50">
              <Avatar student={me} size={36} />
              <span className="hidden font-bold text-navy sm:inline">{me.firstName}</span>
            </NavLink>
          ) : isTeacher ? (
            <>
              <button onClick={() => viewAs(true)} className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-navy-50 px-3 font-semibold text-navy hover:bg-navy-100" title="See the app as a student sees it">
                <UserRound size={20} /> <span className="hidden md:inline">View as student</span>
              </button>
              <span className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-navy px-3 font-bold text-white"><LogoMark size={24} white /> {data.session.staff?.role === 'admin' ? 'Admin' : data.session.staff?.role === 'observer' ? 'Observer' : 'Teacher'}</span>
            </>
          ) : null}
          <button onClick={signOut} className="grid h-11 w-11 place-items-center rounded-2xl text-navy hover:bg-navy-50" aria-label="Switch user / sign out" title="Switch user">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 pb-28 pt-6 lg:pb-12" key={loc.pathname}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-navy-100 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
        {mobileMain.map((n) => {
          const Icon = n.icon;
          return (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs font-semibold ${isActive ? 'text-coral-700' : 'text-navy-400'}`}>
              <Icon size={22} aria-hidden="true" />
              {n.label.replace('My ', '')}
            </NavLink>
          );
        })}
        <button onClick={() => setMore(true)} className="flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs font-semibold text-navy-400" aria-haspopup="dialog">
          <MoreHorizontal size={22} /> More
        </button>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 bg-navy-900/50 lg:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-0 animate-rise rounded-t-3xl bg-navy p-4 pb-8" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="More pages">
            <div className="mb-3 flex items-center justify-between">
              <Logo size={32} white />
              <button onClick={() => setMore(false)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label="Close"><X /></button>
            </div>
            <div className="space-y-1">{items.filter((n) => !mobileMain.includes(n)).map((n) => <NavItem key={n.to} item={n} onClick={() => setMore(false)} />)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Online saving status for the signed-in learner (only when the online class store is set up). */
function SyncChip() {
  const s = useSyncState();
  if (s.kind === 'off' || s.kind === 'idle') return null;
  const look = {
    saving: { icon: <RefreshCw size={16} className="animate-spin" />, text: 'Saving…', cls: 'bg-navy-50 text-navy' },
    saved: { icon: <Cloud size={16} />, text: 'Saved online', cls: 'bg-mint-50 text-mint-700' },
    offline: { icon: <CloudOff size={16} />, text: 'Saved on this phone', cls: 'bg-sun-50 text-sun-700' },
    other: { icon: <CloudOff size={16} />, text: 'Saved on this phone', cls: 'bg-sun-50 text-sun-700' },
    error: { icon: <CloudOff size={16} />, text: 'Not sent', cls: 'bg-coral-50 text-coral-700' },
  }[s.kind];
  return (
    <span className={`flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${look.cls}`} title={s.message ?? look.text} role="status">
      {look.icon}<span className="hidden sm:inline">{look.text}</span>
    </span>
  );
}
