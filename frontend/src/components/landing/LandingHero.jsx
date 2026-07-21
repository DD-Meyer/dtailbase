import React from "react";
import { ArrowRight, Sparkles, Terminal, Calendar, ShieldCheck, Smartphone } from "lucide-react";
import SignupForm from "./SignupForm";

/*
 * Landing hero – centered, generous whitespace, decorative animated
 * "feature chips" that float on wide screens and animate on hover.
 */
function LandingHero(props) {
  return (
    <section className="marketing-hero relative overflow-hidden px-6 pb-24 pt-36 md:px-10 md:pb-32 md:pt-40 lg:px-14 lg:pb-40 lg:pt-48">
      {/* Vibrant halo behind hero */}
      <div className="pointer-events-none absolute left-1/2 top-[30%] -z-10 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_30%_40%,rgba(37,99,235,0.35),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(139,92,246,0.28),transparent_60%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.22),transparent_60%)] blur-[110px]" />

      {/* Floating decorative chips – anchored inside a max-width wrapper so
          they don't fly to the viewport edges on ultra-wide screens.
          Hidden on mobile so the copy breathes. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-[1] mx-auto hidden h-full w-full max-w-7xl px-6 md:px-10 lg:block lg:px-14">
        <div className="hero-float hero-float--tl group pointer-events-auto absolute left-0 top-[24%] flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#12161f]/70 px-4 py-3 shadow-lg backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_18px_50px_-20px_rgba(37,99,235,0.55)]">
          <span className="hero-float-icon flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
            <Calendar className="h-4 w-4" />
          </span>
          <div className="text-left">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Bookings</div>
            <div className="text-xs font-semibold text-white">12 slots · today</div>
          </div>
        </div>

        <div className="hero-float hero-float--tr group pointer-events-auto absolute right-0 top-[20%] flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#12161f]/70 px-4 py-3 shadow-lg backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-[0_18px_50px_-20px_rgba(16,185,129,0.55)]">
          <span className="hero-float-icon flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-110">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="text-left">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Waivers</div>
            <div className="text-xs font-semibold text-white">100% signed</div>
          </div>
        </div>

        <div className="hero-float hero-float--bl group pointer-events-auto absolute bottom-[22%] left-0 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#12161f]/70 px-4 py-3 shadow-lg backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-[0_18px_50px_-20px_rgba(139,92,246,0.55)]">
          <span className="hero-float-icon flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="text-left">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Mobile</div>
            <div className="text-xs font-semibold text-white">Field ready</div>
          </div>
        </div>

        <div className="hero-float hero-float--br group pointer-events-auto absolute bottom-[26%] right-0 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#12161f]/70 px-4 py-3 shadow-lg backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-rose-500/40 hover:shadow-[0_18px_50px_-20px_rgba(244,63,94,0.55)]">
          <span className="hero-float-icon flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300 transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-110">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="text-left">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Revenue</div>
            <div className="text-xs font-semibold text-white">↑ 25% MoM</div>
          </div>
        </div>
      </div>

      {/* Centered copy column */}
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="ds-sparkle marketing-badge mb-8 mx-auto">
          <span>DtailBase OS</span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1 text-white/90">
            Beta Access Live <ArrowRight className="h-3 w-3" />
          </span>
        </div>

        <h1 className="mb-7 text-5xl font-extrabold leading-[1.02] tracking-tight text-white md:text-6xl xl:text-7xl">
          <span className="block">Build and Scale Your</span>
          <span className="block highlight-vivid">
            Auto Detailing Business
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
          The all-in-one management suite for professional detailers. Automate bookings,
          capture digital indemnity waivers, and streamline job cards in one place.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#try-now"
            className="ds-btn ds-btn-glow group flex w-full items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold sm:w-auto"
          >
            <Sparkles className="h-4 w-4 transition group-hover:rotate-12" />
            <span>Try Now</span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </a>
          <a
            href="#demo"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-8 py-3.5 text-base font-medium text-zinc-200 backdrop-blur-sm transition hover:border-blue-500/40 hover:bg-zinc-900 sm:w-auto"
          >
            <Terminal className="h-4 w-4 text-blue-400" />
            <span>Explore Interactive Demo</span>
          </a>
        </div>

        {/* Trust row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> No credit card</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> 60-second setup</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Cancel anytime</span>
        </div>
      </div>

      {/* Signup form – centered, compact, breathing room around it */}
      <div className="relative z-10 mx-auto mt-20 w-full max-w-xl md:mt-24">
        <SignupForm {...props} />
      </div>

      {/* Demo panel – further down with generous margin */}
      <div id="demo" className="marketing-demo-frame relative z-10 mx-auto mt-24 w-full max-w-6xl rounded-2xl border border-zinc-800 bg-[#12161f]/70 p-2 shadow-2xl backdrop-blur-xl md:mt-32">
        <div className="marketing-demo-panel overflow-hidden rounded-lg border border-zinc-800/80 bg-[#0b0e14]">
          <div className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 font-mono text-xs text-zinc-500">
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full border border-red-500/40 bg-red-500/20" />
              <span className="h-3 w-3 rounded-full border border-yellow-500/40 bg-yellow-500/20" />
              <span className="h-3 w-3 rounded-full border border-green-500/40 bg-green-500/20" />
              <span className="ml-2 text-zinc-400">app.dtailbase.com/dashboard</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>SYSTEM ONLINE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 font-mono text-sm sm:gap-5 md:grid-cols-3 md:gap-6 md:p-6">
            <div className="marketing-demo-stat rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-4 transition hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-[0_12px_40px_-20px_rgba(37,99,235,0.6)]">
              <div className="mb-1 text-xs text-zinc-500">TODAY&apos;S BOOKINGS</div>
              <div className="mb-2 text-2xl font-bold text-white">8 Active Jobs</div>
              <div className="text-xs text-blue-400">↑ +25% vs last week</div>
            </div>
            <div className="marketing-demo-stat rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-4 transition hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-[0_12px_40px_-20px_rgba(139,92,246,0.6)]">
              <div className="mb-1 text-xs text-zinc-500">INDEMNITY SIGNATURES</div>
              <div className="mb-2 text-2xl font-bold text-white">100% Signed</div>
              <div className="text-xs text-violet-300">0 Pending Waivers</div>
            </div>
            <div className="marketing-demo-stat rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-[0_12px_40px_-20px_rgba(16,185,129,0.6)]">
              <div className="mb-1 text-xs text-zinc-500">REVENUE (EST)</div>
              <div className="mb-2 text-2xl font-bold text-emerald-400">R14,850.00</div>
              <div className="text-xs text-zinc-400">Average ticket: R1,850</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingHero;
