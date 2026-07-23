import type { FaqEntryRecord } from '../../lib/cms-types';
import { createSlug } from '../../lib/cms-validation';

export function FaqList({ entries }: { entries: FaqEntryRecord[] }) {
  if (!entries.length) return null;
  const ids = uniqueIds(entries);
  const categories = Array.from(new Set(entries.map((entry) => entry.category || 'General')));

  return (
    <section aria-labelledby="faq-answers-heading" className="mt-10">
      <h2 className="sr-only" id="faq-answers-heading">Questions and answers</h2>
      <div className="grid gap-9">
        {categories.map((category) => <section key={category}><h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-violet-300">{category}</h3><div className="grid gap-3">{entries.map((entry, index) => entry.category === category ? <details className="group scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.04] p-5 open:border-violet-400/30 open:bg-violet-500/[0.07]" id={ids[index]} key={entry.id}><summary className="cursor-pointer list-none pr-8 text-lg font-black text-white marker:hidden">{entry.question}<span aria-hidden="true" className="float-right text-violet-300 transition group-open:rotate-45">+</span></summary><p className="mt-4 max-w-3xl leading-7 text-slate-300">{entry.answer}</p><a className="mt-3 inline-flex text-xs font-bold text-slate-500 hover:text-violet-300" href={`#${ids[index]}`}>Link to this answer</a></details> : null)}</div></section>)}
      </div>
    </section>
  );
}

function uniqueIds(entries: FaqEntryRecord[]) {
  const used = new Map<string, number>();
  return entries.map((entry) => {
    const base = createSlug(entry.question) || 'question';
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  });
}
