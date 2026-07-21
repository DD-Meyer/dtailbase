import React from "react";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";

function SignupForm({ emailCapture, setEmailCapture, signupError, isAuthenticated, isCreatingAccount, canStartSignup, onSubmit }) {
  return (
    <div className="relative">
      {/* Soft aura behind the form */}
      <div className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.35),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.28),transparent_60%)] blur-2xl" />

      <div id="try-now" className="marketing-signup-card rounded-2xl border border-zinc-800 bg-[#12161f]/70 p-7 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-emerald-300">
            <Zap className="h-3 w-3" />
            <span>Free · 60-second setup</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white md:text-3xl">
            Start with your <span className="highlight-brand">email</span>
          </h2>
          <p className="text-sm leading-6 text-zinc-400 md:text-base">
            Enter your business email and continue the setup in a clean, no-reload flow.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 text-xs text-zinc-300">
          <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-blue-200">Fast setup</span>
          <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-violet-200">No credit card</span>
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">Guided onboarding</span>
        </div>

        {signupError && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {signupError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Business Email</label>
            <input
              type="email"
              value={emailCapture.email}
              onChange={(e) => setEmailCapture((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@studio.com"
              className="w-full rounded-xl border border-zinc-700 bg-[#0b0e14] px-4 py-3 text-sm text-zinc-100 outline-none ring-blue-500 transition focus:border-blue-500 focus:ring-1"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!canStartSignup || isCreatingAccount || isAuthenticated}
            className="ds-btn ds-btn-glow group mt-1 flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{isCreatingAccount ? "Creating Account..." : "Continue Setup"}</span>
            {!isCreatingAccount && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />}
          </button>
        </form>

        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default SignupForm;