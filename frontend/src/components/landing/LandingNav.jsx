import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="marketing-nav-wrapper pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-5 sm:pt-6">
      <nav
        className={`marketing-nav marketing-nav--floating pointer-events-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-full border border-white/10 bg-[rgba(11,14,20,0.72)] px-2.5 py-2 pl-4 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl transition-all duration-300 sm:gap-4 sm:pl-5 sm:pr-2.5 md:py-2.5${
          isScrolled ? " is-scrolled" : ""
        }`}
      >
        <Link
          to="/"
          className="marketing-logo public-header-logo shrink-0 pr-2"
          aria-label="DtailBase home"
        >
          <span className="text-white">Dtail</span>
          <span className="bg-linear-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">base</span>
          <span className="marketing-logo-dot text-blue-500 font-black">.</span>
        </Link>

        <div className="marketing-nav-links hidden items-center gap-1 md:flex">
          <Link to="/products" className="marketing-nav-link">Product</Link>
          <Link to="/plans" className="marketing-nav-link">Pricing</Link>
          <Link to="/about" className="marketing-nav-link">About</Link>
          <Link to="/contact" className="marketing-nav-link">Contact</Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/login"
            className="marketing-signin hidden items-center px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white sm:inline-flex"
          >
            Sign In
          </Link>
          <a
            href="#try-now"
            className="marketing-cta inline-flex items-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-[0_0_28px_rgba(37,99,235,0.45)] md:px-6"
          >
            Start Free
          </a>
        </div>
      </nav>
    </div>
  );
}

export default LandingNav;