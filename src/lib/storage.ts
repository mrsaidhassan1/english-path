// Persistence layer. Today it is localStorage on this device.
// To add accounts and cloud storage later, implement DataStore with an API
// (e.g. fetch('/api/class')) and pass it to <AppProvider store={...}>.
import type { AppData } from '../types';
import { demoData, ensureBuiltInClass, startData } from './demo';
import { migrate } from './classes';

export interface DataStore {
  load(): AppData;
  save(data: AppData): { ok: true } | { ok: false; error: string };
  reset(data: AppData): void;
}

const KEY = 'sh-a1-english-webapp/v1';

function isAppData(x: unknown): x is AppData {
  const v = (x as AppData | null)?.version as number | undefined;
  return !!x && typeof x === 'object' && (v === 1 || v === 2) && Array.isArray((x as AppData).students);
}

export const localStore: DataStore = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isAppData(parsed)) {
          const base = demoData();
          const d = ensureBuiltInClass(migrate(parsed as unknown as Record<string, unknown>));
          return { ...d, settings: { ...base.settings, ...d.settings }, session: d.session ?? base.session };
        }
      }
    } catch {
      /* storage blocked or corrupt → start fresh */
    }
    return startData();
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error && e.name === 'QuotaExceededError' ? 'Storage is full. Remove some photos and try again.' : 'Could not save on this device.' };
    }
  },
  reset(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  },
};

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 1);
}

export function importJson(text: string): AppData {
  const parsed = JSON.parse(text);
  if (!isAppData(parsed)) throw new Error('This is not an English Path backup file.');
  return migrate(parsed as unknown as Record<string, unknown>);
}
