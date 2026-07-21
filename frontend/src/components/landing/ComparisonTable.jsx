import React from "react";
import { CheckCircle2, Cog, Shield, Smartphone } from "lucide-react";

// Match each Feature Set to a distinct accent for a Supabase-style spectrum.
const SET_META = [
  { icon: Cog, ring: "hover:border-blue-500/45", accent: "text-blue-400", chip: "bg-blue-500/12 border-blue-500/30 text-blue-300", glow: "from-blue-500/20" },
  { icon: Shield, ring: "hover:border-emerald-500/45", accent: "text-emerald-400", chip: "bg-emerald-500/12 border-emerald-500/30 text-emerald-300", glow: "from-emerald-500/20" },
  { icon: Smartphone, ring: "hover:border-violet-500/45", accent: "text-violet-400", chip: "bg-violet-500/12 border-violet-500/30 text-violet-300", glow: "from-violet-500/20" },
];

function FeatureSetsSection({ featureSets }) {
  return (
    <section id="feature-sets" className="marketing-compare relative mx-auto w-full max-w-7xl px-6 py-20 md:px-10 md:py-24 lg:px-14 lg:py-28">
      <div className="ds-divider mb-14 opacity-70 md:mb-16" aria-hidden="true" />

      <div className="mx-auto mb-12 max-w-3xl text-center md:mb-14">
        <h2 className="ds-gradient-text mb-3 text-xs font-mono uppercase tracking-widest">
          Feature Sets
        </h2>
        <p className="text-3xl font-bold tracking-tight text-white md:text-5xl">
          A cleaner breakdown of <span className="highlight-vivid">what powers the platform.</span>
        </p>
        <p className="mt-4 text-base leading-7 text-zinc-400 md:text-lg">
          Every part of DtailBase is organized around real studio work: operations, legal protection, and mobile execution.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {featureSets.map((set, i) => {
          const meta = SET_META[i % SET_META.length];
          const Icon = meta.icon;
          return (
            <article
              key={set.title}
              className={`marketing-compare-shell marketing-feature-card relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#12161f]/60 p-6 backdrop-blur-xl transition duration-300 md:p-7 lg:p-8 ${meta.ring}`}
            >
              <div className={`pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br ${meta.glow} via-transparent to-transparent blur-3xl`} />

              <div className="relative">
                <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-widest ${meta.chip}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>Module 0{i + 1}</span>
                </div>
                <h3 className="text-2xl font-semibold text-white">{set.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400 md:text-base">{set.description}</p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                  {set.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${meta.accent}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default FeatureSetsSection;