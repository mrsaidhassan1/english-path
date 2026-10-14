// Teacher Dashboard → Classes: create, import, switch, share join codes, export and delete classes.
import { useRef, useState } from 'react';
import { Plus, Upload, Download, Copy, RefreshCw, Trash2, Check, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { useApp } from '../store';
import { exportClassFile, importClassFile, isClassFile, makeCode, newClass, parseCsvClass, studentsIn } from '../lib/classes';
import { Avatar } from '../components/Avatar';
import { Button, Card, Pill } from '../components/ui';
import { canDownload } from '../lib/env';
import { ask } from '../components/Confirm';

export function ClassesPanel() {
  const { data, update, replaceAll, toast, cls } = useApp();
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('A0 → A1');
  const [term, setTerm] = useState('');
  const [csvName, setCsvName] = useState('');
  const [drag, setDrag] = useState(false);

  const create = () => {
    if (!name.trim()) return;
    if (data.classes.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) return toast('A class with this name already exists.', 'warn');
    const c = newClass(name, level, term || undefined);
    update((d) => { d.classes.push(c); d.activeClassId = c.id; });
    toast(`${c.name} created. Join code: ${c.code}`, 'good');
    setName('');
  };

  const importFile = async (f: File) => {
    try {
      const text = await f.text();
      let parsed: unknown;
      if (/\.csv$|\.txt$/i.test(f.name)) {
        const className = csvName.trim() || f.name.replace(/\.(csv|txt)$/i, '');
        parsed = parseCsvClass(text, className);
      } else parsed = JSON.parse(text);
      if (!isClassFile(parsed)) throw new Error('This is not a class file. Use a .class.json file or a CSV of names.');
      const next = structuredClone(data);
      const result = importClassFile(next, parsed);
      replaceAll(next);
      toast(`${parsed.class.name}: ${result.added} added, ${result.updated} updated${result.photos ? `, ${result.photos} photos` : ''}${result.photosKept ? ` (${result.photosKept} existing photos kept)` : ''}.`, 'good');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read the file.', 'warn');
    }
  };

  const exportFile = (id: string) => {
    const f = exportClassFile(data, id);
    const blob = new Blob([JSON.stringify(f, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${f.class.name.replace(/\s+/g, '')}.class.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const input = 'mt-1 block min-h-[48px] w-full rounded-2xl border-2 border-navy-100 bg-white px-3 text-navy';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.classes.map((c) => {
          const st = studentsIn(data, c.id);
          const active = c.id === cls?.id;
          return (
            <Card key={c.id} className={active ? 'ring-4 ring-coral/40' : ''}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <input aria-label="Class name" value={c.name} onChange={(e) => update((d) => { const x = d.classes.find((y) => y.id === c.id); if (x) x.name = e.target.value; })}
                    className="w-full rounded-lg px-1 text-2xl font-bold text-navy outline-none hover:bg-navy-50 focus:bg-navy-50" />
                  <div className="px-1 text-sm text-navy-500">{c.level}{c.term ? ` · ${c.term}` : ''} · {st.length} learners</div>
                </div>
                {active ? <Pill tone="coral"><Check size={14} /> In use</Pill> : <Button size="sm" variant="soft" onClick={() => update((d) => { d.activeClassId = c.id; })}>Use</Button>}
              </div>
              <div className="mt-3 flex -space-x-2">{st.slice(0, 8).map((s) => <Avatar key={s.id} student={s} size={34} className="ring-2 ring-white" />)}</div>
              <div className="mt-4 rounded-2xl bg-navy-50 p-3">
                <div className="text-xs font-bold uppercase tracking-wide text-navy-400">Join code</div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-2xl font-bold tracking-wider text-navy">{c.code}</span>
                  <button className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white" aria-label="Copy join code" onClick={async () => { try { await navigator.clipboard.writeText(c.code); toast('Code copied.', 'good'); } catch { toast(c.code, 'info'); } }}><Copy size={18} /></button>
                  <button className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white" aria-label="New join code" onClick={() => update((d) => { const x = d.classes.find((y) => y.id === c.id); if (x) x.code = makeCode(x.name); })}><RefreshCw size={18} /></button>
                </div>
                <label className="mt-1 flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-navy">
                  <input type="checkbox" className="h-5 w-5" checked={c.allowJoin} onChange={(e) => update((d) => { const x = d.classes.find((y) => y.id === c.id); if (x) x.allowJoin = e.target.checked; })} />
                  {c.allowJoin ? <><Unlock size={15} /> Learners can join with this code</> : <><Lock size={15} /> Closed: only you can add learners</>}
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {canDownload && <Button size="sm" variant="outline" onClick={() => exportFile(c.id)}><Download size={16} /> Export class file</Button>}
                <Button size="sm" variant="ghost" className="text-coral-700" onClick={async () => {
                  if (!(await ask(`Delete ${c.name} and its ${st.length} learners and their results from this device?`, 'Delete class', true))) return;
                  update((d) => {
                    const gone = new Set(d.students.filter((s) => s.classId === c.id).map((s) => s.id));
                    d.students = d.students.filter((s) => !gone.has(s.id));
                    d.writing = d.writing.filter((w) => !gone.has(w.studentId));
                    d.assignments = d.assignments.filter((a) => a.classId !== c.id);
                    d.classes = d.classes.filter((x) => x.id !== c.id);
                    if (d.activeClassId === c.id) d.activeClassId = d.classes[0]?.id ?? '';
                  });
                }}><Trash2 size={16} /> Delete</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-navy">Import a class file</h2>
          <p className="text-navy-500">Use a <b>.class.json</b> file (for FND 68: <code>Web App/class-files/FND68.class.json</code>) or a CSV with names, IDs and levels. Learners are matched by Student ID, so importing again updates them without duplicates or lost progress.</p>
          <label className="mt-3 block"><span className="text-sm font-semibold text-navy">Class name for a CSV file (optional)</span>
            <input value={csvName} onChange={(e) => setCsvName(e.target.value)} placeholder="e.g. FND 69" className={input} />
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) importFile(f); }}
            className={`mt-3 flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed p-6 text-center ${drag ? 'border-coral bg-coral-50' : 'border-navy-200 bg-navy-50/40'}`}>
            <Upload className="text-navy-400" size={32} />
            <p className="text-navy">Drop the file here, or</p>
            <Button onClick={() => file.current?.click()}><Upload size={18} /> Choose file</Button>
            <input ref={file} type="file" accept=".json,.csv,.txt,application/json,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
          </div>
          <p className="mt-3 flex gap-2 text-sm text-navy-500"><ShieldAlert size={18} className="shrink-0 text-coral-700" /> Student names and IDs stay on this device. Don’t upload class files to the internet.</p>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-navy">Create a new class</h2>
          <p className="text-navy-500">Add another class, then add pupils or share its join code so learners can join themselves.</p>
          <label className="mt-3 block"><span className="text-sm font-semibold text-navy">Class name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FND 69" className={input} />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-sm font-semibold text-navy">Level</span>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={input}><option>A0 → A1</option><option>A1</option><option>A1 → A2</option></select>
            </label>
            <label className="block"><span className="text-sm font-semibold text-navy">Term (optional)</span>
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="2026-27 S1" className={input} />
            </label>
          </div>
          <Button className="mt-4" size="lg" onClick={create} disabled={!name.trim()}><Plus size={20} /> Create class</Button>
        </Card>
      </div>
    </div>
  );
}
