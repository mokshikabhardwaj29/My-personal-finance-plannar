import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Calculator, PiggyBank, WalletCards, ChevronLeft, ChevronRight, Save, Sparkles } from 'lucide-react';
import { AppSettings, Transaction } from '../types';
import { formatRupee } from '../utils/format';

export interface NotePayPlanner {
  allowance: number;
  savingsGoal: number;
  savedAmount: number;
  dailyPlan: number;
  note: string;
  entries?: Array<{ id: string; date: string; amount: number; category: string; note: string }>;
}

type View = 'planner' | 'calendar' | 'interest';

interface Props {
  settings: AppSettings;
  transactions: Transaction[];
  onSavePlanner: (planner: NotePayPlanner) => Promise<void>;
  initialView?: 'planner' | 'calendar' | 'interest';
  role: 'owner' | 'parent' | 'child';
}

const DEFAULT_PLANNER: NotePayPlanner = { allowance: 500, savingsGoal: 2000, savedAmount: 0, dailyPlan: 100, note: '' };
const money = (value: number) => formatRupee(Number.isFinite(value) ? value : 0);
const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const NotePayPlannerPage: React.FC<Props> = ({ settings, transactions, onSavePlanner, initialView = 'planner', role }) => {
  const [view, setView] = useState<View>(initialView);
  useEffect(() => setView(initialView), [initialView]);
  const [planner, setPlanner] = useState<NotePayPlanner>({ ...DEFAULT_PLANNER, ...(settings.notePayPlanner || {}) });
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [principal, setPrincipal] = useState(1000);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(2);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCategory, setEntryCategory] = useState('Snack');
  const [entryNote, setEntryNote] = useState('');

  const expenses = useMemo(() => transactions.filter((t) => t.type === 'expense'), [transactions]);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const calendarItems = useMemo(() => [
    ...expenses.map((tx) => ({ id: tx.id, date: tx.date, amount: Number(tx.amount || 0), category: tx.category, label: tx.merchant || 'Expense', source: 'transaction' as const })),
    ...(planner.entries || []).map((entry) => ({ id: entry.id, date: entry.date, amount: Number(entry.amount || 0), category: entry.category, label: entry.note || entry.category, source: 'pocket' as const })),
  ], [expenses, planner.entries]);
  const actualByDate = useMemo(() => {
    const totals: Record<string, number> = {};
    calendarItems.forEach((item) => { totals[item.date] = (totals[item.date] || 0) + item.amount; });
    return totals;
  }, [calendarItems]);
  const actualThisMonth = Object.entries(actualByDate).filter(([date]) => date.startsWith(monthKey)).reduce((sum, [, value]) => sum + value, 0);
  const actualToday = actualByDate[todayIso()] || 0;
  const simpleInterest = (Math.max(0, principal) * Math.max(0, rate) * Math.max(0, years)) / 100;
  const amount = Math.max(0, principal) + simpleInterest;
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const selectedItems = calendarItems.filter((item) => item.date === selectedDate);
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.amount, 0);

  const addPocketExpense = async () => {
    const amountValue = Number(entryAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0 || amountValue > 1000000) return;
    const nextPlanner = {
      ...planner,
      entries: [...(planner.entries || []), { id: `pocket_${Date.now()}`, date: selectedDate, amount: amountValue, category: entryCategory, note: entryNote.trim().slice(0, 100) }].slice(-500),
    };
    await onSavePlanner(nextPlanner);
    setPlanner(nextPlanner);
    setEntryAmount('');
    setEntryNote('');
    setSavedMessage('Expense saved to your pocket-money calendar.');
  };

  const savePlanner = async () => {
    setSaving(true);
    setSavedMessage('');
    try {
      await onSavePlanner(planner);
      setSavedMessage('Saved to your family account.');
    } catch {
      setSavedMessage('Could not save yet. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const statusForDay = (date: string) => {
    const total = actualByDate[date] || 0;
    if (total === 0) return 'bg-slate-100 text-slate-500';
    if (total <= planner.dailyPlan * 0.7) return 'bg-emerald-100 text-emerald-800';
    if (total <= planner.dailyPlan) return 'bg-amber-100 text-amber-900';
    return 'bg-rose-100 text-rose-800';
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#eadfce] bg-gradient-to-br from-[#fff9ed] via-white to-[#eef9f2] p-6 md:p-8 shadow-sm">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-200/30 blur-2xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-violet-700"><Sparkles size={14} /> MONEY SKILLS, ONE STEP AT A TIME</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Your money, your choices.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Plan your pocket money, understand everyday spending, and learn how savings can grow. No scores for spending less—just useful habits.</p>
          </div>
          <div className="rounded-2xl border border-white bg-white/80 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">Spending recorded this month</p>
            <p className="text-2xl font-black text-slate-900">{money(actualThisMonth)}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([
          { id: 'planner', label: 'Pocket planner', detail: 'Plan allowance & goals', Icon: WalletCards },
          { id: 'calendar', label: 'Spending calendar', detail: 'See your month at a glance', Icon: CalendarDays },
          { id: 'interest', label: 'Simple interest lab', detail: 'Try the maths yourself', Icon: Calculator },
        ] as const).map(({ id, label, detail, Icon }) => (
          <button key={id} onClick={() => setView(id)} className={`rounded-2xl border p-4 text-left transition ${view === id ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 bg-white hover:border-violet-200'}`}>
            <Icon className="mb-3 text-violet-700" size={22} />
            <span className="block font-bold text-slate-900">{label}</span>
            <span className="mt-1 block text-xs text-slate-500">{detail}</span>
          </button>
        ))}
      </div>

      {view === 'planner' && (
        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><PiggyBank size={23} /></div><div><h2 className="text-xl font-black">Pocket-money plan</h2><p className="text-sm text-slate-500">Change the numbers to match your real-life plan.</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ['Monthly pocket money (₹)', 'allowance'],
                ['Savings goal (₹)', 'savingsGoal'],
                ['Already saved (₹)', 'savedAmount'],
                ['Daily spending plan (₹)', 'dailyPlan'],
              ] as const).map(([label, key]) => (
                <label key={key} className="block text-sm font-semibold text-slate-700">{label}
                  <input type="number" min="0" value={planner[key]} onChange={(e) => setPlanner((p) => ({ ...p, [key]: Math.max(0, Number(e.target.value) || 0) }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">What are you saving for?
              <input value={planner.note} onChange={(e) => setPlanner((p) => ({ ...p, note: e.target.value }))} maxLength={100} placeholder="e.g. a book, art supplies, or a board game" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </label>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={savePlanner} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 font-bold text-white transition hover:bg-violet-800 disabled:opacity-60"><Save size={17} />{saving ? 'Saving…' : 'Save my plan'}</button>
              <span aria-live="polite" className="text-sm text-slate-500">{savedMessage}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-slate-900 p-6 text-white">
              <p className="text-sm font-semibold text-slate-300">A plan to start with</p>
              <p className="mt-2 text-3xl font-black">{money(planner.allowance)}</p>
              <div className="mt-5 space-y-4">
                <div><div className="mb-1 flex justify-between text-sm"><span>Save (20%)</span><strong>{money(planner.allowance * .2)}</strong></div><div className="h-2 rounded-full bg-white/15"><div className="h-2 rounded-full bg-emerald-300" style={{ width: '20%' }} /></div></div>
                <div><div className="mb-1 flex justify-between text-sm"><span>Spend (60%)</span><strong>{money(planner.allowance * .6)}</strong></div><div className="h-2 rounded-full bg-white/15"><div className="h-2 rounded-full bg-amber-300" style={{ width: '60%' }} /></div></div>
                <div><div className="mb-1 flex justify-between text-sm"><span>Share or flexible (20%)</span><strong>{money(planner.allowance * .2)}</strong></div><div className="h-2 rounded-full bg-white/15"><div className="h-2 rounded-full bg-sky-300" style={{ width: '20%' }} /></div></div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-300">This is a learning example, not a rule. You and your family can choose a split that works for you.</p>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
              <p className="text-sm font-bold text-emerald-900">Your savings progress</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{money(planner.savedAmount)} <span className="text-sm font-semibold text-slate-500">of {money(planner.savingsGoal)}</span></p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${planner.savingsGoal > 0 ? Math.min(100, planner.savedAmount / planner.savingsGoal * 100) : 0}%` }} /></div>
              <p className="mt-2 text-xs text-slate-600">{planner.note ? `Saving for: ${planner.note}` : 'Choose a goal that matters to you.'}</p>
            </div>
          </div>
        </section>
      )}

      {view === 'calendar' && (
        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div><h2 className="text-xl font-black">Spending calendar</h2><p className="text-sm text-slate-500">Colours compare recorded spending with your daily plan.</p></div>
              <div className="flex gap-1"><button aria-label="Previous month" onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="rounded-lg border p-2 hover:bg-slate-50"><ChevronLeft size={18} /></button><button aria-label="Next month" onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="rounded-lg border p-2 hover:bg-slate-50"><ChevronRight size={18} /></button></div>
            </div>
            <h3 className="mb-3 text-center font-bold">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">{Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} />)}{Array.from({ length: daysInMonth }, (_, i) => { const day = i + 1; const date = `${monthKey}-${String(day).padStart(2, '0')}`; const total = actualByDate[date] || 0; return <button key={date} onClick={() => setSelectedDate(date)} aria-pressed={selectedDate === date} title={`${date}: ${money(total)} spent`} className={`min-h-12 rounded-xl p-1 text-sm font-bold transition hover:ring-2 hover:ring-violet-300 ${statusForDay(date)} ${selectedDate === date ? 'ring-2 ring-violet-500' : ''}`}><span>{day}</span>{total > 0 && <span className="mt-1 block truncate text-[9px] font-semibold">{money(total)}</span>}</button>; })}</div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded bg-slate-200" />No recorded spending</span><span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded bg-emerald-200" />Within plan</span><span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded bg-amber-200" />Approaching limit</span><span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded bg-rose-200" />Above plan</span></div>
          </div>
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Selected day</p><h3 className="mt-1 text-xl font-black">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</h3><p className="mt-2 text-3xl font-black text-slate-900">{money(selectedTotal)}</p><p className="text-sm text-slate-500">Recorded expenses</p>
            <div className="mt-5 space-y-3">{selectedItems.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No expenses recorded for this date. That does not mean you did anything wrong—this calendar only shows saved transactions.</p> : selectedItems.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><p className="font-semibold text-slate-800">{item.label}</p><p className="text-xs text-slate-500">{item.category}{item.source === 'pocket' ? ' · Pocket entry' : ''}</p></div><strong className="text-sm">{money(item.amount)}</strong></div>)}</div>
            {role === 'child' && <form className="mt-6 border-t border-slate-100 pt-5" onSubmit={(event) => { event.preventDefault(); void addPocketExpense(); }}>
              <h4 className="font-bold text-slate-900">Add a pocket-money expense</h4>
              <p className="mt-1 text-xs leading-5 text-slate-500">Only your own pocket-money entries are saved here. Your family’s main transaction history stays unchanged.</p>
              <label className="mt-3 block text-sm font-semibold text-slate-700">Amount (₹)<input required type="number" min="1" max="1000000" step="0.01" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <label className="mt-3 block text-sm font-semibold text-slate-700">Category<select value={entryCategory} onChange={(e) => setEntryCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option>Snack</option><option>Stationery</option><option>Transport</option><option>Fun</option><option>Gift</option><option>Other</option></select></label>
              <label className="mt-3 block text-sm font-semibold text-slate-700">What was it for?<input maxLength={100} value={entryNote} onChange={(e) => setEntryNote(e.target.value)} placeholder="Optional note" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <button type="submit" className="mt-3 w-full rounded-xl bg-violet-700 px-4 py-3 font-bold text-white hover:bg-violet-800">Save expense</button>
              <p aria-live="polite" className="mt-2 text-xs text-slate-500">{savedMessage}</p>
            </form>}
          </aside>
        </section>
      )}

      {view === 'interest' && (
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-800"><Calculator size={23} /></div><div><h2 className="text-xl font-black">Simple interest lab</h2><p className="text-sm text-slate-500">Change one number and see what happens.</p></div></div>
            {([['Starting savings (Principal ₹)', principal, setPrincipal, 100000],['Interest rate per year (%)', rate, setRate, 100],['Time (years)', years, setYears, 50]] as const).map(([label, value, setter, max]) => <label key={label} className="mb-5 block text-sm font-semibold text-slate-700">{label}<div className="mt-2 flex items-center gap-3"><input type="range" min="0" max={max} step={label.startsWith('Time') ? .5 : 1} value={value} onChange={(e) => setter(Number(e.target.value))} className="w-full accent-violet-700" /><span className="w-20 rounded-lg bg-slate-100 px-2 py-2 text-right tabular-nums">{value}</span></div></label>)}
            <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">Simple interest is calculated only on the starting amount—not on interest already earned.</p>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-violet-800 to-indigo-900 p-6 text-white md:p-8">
            <p className="text-sm font-bold text-violet-200">The formula</p><p className="my-3 text-2xl font-black">SI = (P × R × T) ÷ 100</p><p className="text-sm text-violet-100">P = starting amount, R = yearly rate, T = time in years.</p>
            <div className="my-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-violet-200">Interest earned</p><p className="mt-1 text-2xl font-black">{money(simpleInterest)}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-violet-200">Total amount</p><p className="mt-1 text-2xl font-black">{money(amount)}</p></div></div>
            <p className="text-sm leading-6 text-violet-100">Example: ₹1,000 at 5% for 2 years earns ₹100 simple interest, for a total of ₹1,100. Real savings products can use different rules, fees, and rates—this is a learning calculator.</p>
          </div>
        </section>
      )}
    </div>
  );
};
