import { BookA } from "lucide-react";
import { GLOSSARY, type GlossaryTerm } from "../../lib/guide";
import { useGuide } from "../../stores/guide";

function byLetter(terms: GlossaryTerm[]): [string, GlossaryTerm[]][] {
  const groups = new Map<string, GlossaryTerm[]>();
  for (const term of terms) {
    const letter = term.term.charAt(0).toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), term]);
  }
  return [...groups];
}

/** Every term A to Z with a one-line meaning; a term opens the topic that explains it. */
export function GlossaryView() {
  const open = useGuide((s) => s.open);
  return (
    <article className="flex flex-col gap-4">
      <header className="mb-2 flex items-start gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-accent">
          <BookA className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-fg-strong">Glossary</h1>
          <p className="text-[14px] text-muted">Every term in short. Each one links to its full explanation.</p>
        </div>
      </header>
      <div className="rounded-xl border border-line bg-surface px-5 py-2">
        {byLetter(GLOSSARY).map(([letter, terms]) => (
          <section key={letter} aria-label={letter} className="flex gap-4 border-b border-line py-3 last:border-b-0">
            <h2 className="w-5 shrink-0 pt-1 text-[13px] font-semibold text-faint">{letter}</h2>
            <dl className="flex min-w-0 flex-1 flex-col">
              {terms.map((term) => (
                <div key={term.term} className="grid grid-cols-[11rem_1fr] items-baseline gap-3 py-1">
                  <dt>
                    <button
                      type="button"
                      onClick={() => open(term.topic)}
                      className="text-left text-[13.5px] font-medium text-fg-strong underline decoration-line-strong underline-offset-4 hover:decoration-fg-strong"
                    >
                      {term.term}
                    </button>
                  </dt>
                  <dd className="text-[13.5px] text-muted">{term.meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </article>
  );
}
