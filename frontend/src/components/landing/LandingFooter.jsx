import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

function LandingFooter() {
  return (
    <footer className="marketing-footer relative border-t border-zinc-800/80 bg-[#080b10] px-6 py-12 text-xs text-zinc-500">
      {/* Animated gradient hairline at the top */}
      <div className="ds-divider pointer-events-none absolute inset-x-0 top-0" aria-hidden="true" />

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-blue-500/30 via-violet-500/30 to-emerald-500/30">
            <Sparkles className="h-3 w-3 text-blue-300" />
          </div>
          <span className="text-sm font-bold text-white">DtailBase</span>
          <span>© {new Date().getFullYear()} Netic Technologies. All rights reserved.</span>
        </div>
        <div className="flex space-x-6">
          <Link to="/legal" className="transition hover:text-zinc-300">Privacy Policy</Link>
          <Link to="/legal" className="transition hover:text-zinc-300">Terms of Service</Link>
          <Link to="/contact" className="transition hover:text-zinc-300">Contact</Link>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;