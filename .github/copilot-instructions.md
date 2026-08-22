# DtailBase — Copilot Instructions

## Available skill: ui-ux-pro-max

A searchable local UI/UX design-intelligence database is installed in this repository at:

- Skill root: `.github/skills/ui-ux-pro-max/.github/skills/ui-ux-pro-max/`
- Main SKILL.md: `.github/skills/ui-ux-pro-max/.github/skills/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/SKILL.md`
- Search script: `.github/skills/ui-ux-pro-max/.github/skills/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/scripts/search.py`
- Pro rules: `.github/skills/ui-ux-pro-max/.github/skills/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/references/pro-rules.md`
- Quick reference: `.github/skills/ui-ux-pro-max/.github/skills/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/references/quick-reference.md`

The clone is intentionally left doubly-nested (not flattened).

### When to invoke

Use the skill for any task that touches **how something looks, feels, moves, or is interacted with**: new pages, refactoring UI components, choosing colors/typography/spacing/layout, accessibility review, animation, responsive behavior, data-viz, or perceived-quality QA.

Skip it for pure backend logic, API design, migrations, infrastructure, or non-visual scripts.

### Coverage

84 styles · 192 color palettes · 74 font pairings · 192 product-type reasoning rules · 98 UX guidelines · 104 icon entries · 16 GSAP motion presets · 25 chart types across 22 stacks (React, Next, Vue, Nuxt, Svelte, Astro, SwiftUI, RN, Flutter, HTML/Tailwind, shadcn, Three.js, Angular, Laravel, JavaFX, WPF, WinUI, Avalonia, Uno, UWP).

### Priority framework (SKILL.md §Rule Categories)

1. Accessibility (CRITICAL) · 2. Touch & Interaction (CRITICAL) · 3. Performance · 4. Style Selection · 5. Layout & Responsive · 6. Typography & Color · 7. Animation · 8. Forms & Feedback · 9. Navigation · 10. Charts & Data.

Consult `references/quick-reference.md` for full rule text on demand; consult `references/pro-rules.md` for the pre-delivery checklist before shipping app UI.

### Invocation

Run from the repo root (`C:\Work\Netic Technologies\App Development\General Apps\DtailBase`). Ignore `${CLAUDE_PLUGIN_ROOT}` in SKILL.md — that variable is not set in VS Code / Copilot; use the workspace-relative path below.

**Step 1 — Full design system (start here for any new page/section):**

```powershell
python ".github\skills\ui-ux-pro-max\.github\skills\ui-ux-pro-max\.claude\skills\ui-ux-pro-max\scripts\search.py" "<product_type> <industry> <keywords>" --design-system -p "DtailBase" --stack react
```

Add persistence to save `design-system/dtailbase/MASTER.md` at the repo root:

```powershell
python ".github\skills\ui-ux-pro-max\.github\skills\ui-ux-pro-max\.claude\skills\ui-ux-pro-max\scripts\search.py" "<query>" --design-system --persist -p "DtailBase" --output-dir "C:\Work\Netic Technologies\App Development\General Apps\DtailBase" --stack react
```

Never overwrite an existing `MASTER.md` without `--force`; read it first.

**Step 2 — Optional dials** (any combination):

- `--variance 1-10` — 1-3 minimal · 4-7 balanced · 8-10 bold/asymmetric
- `--motion 1-10` — 1-3 subtle · 4-7 standard scroll/stagger · 8-10 complex GSAP choreography
- `--density 1-10` — 1-3 spacious marketing · 4-7 standard · 8-10 dashboard-dense

**Step 3 — Deep-dive a single dimension** (`--domain`):

`style` · `color` · `typography` · `google-fonts` · `product` · `ux` · `landing` · `icons` · `gsap` · `chart` · `react` · `web`

Example:
```powershell
python ".github\skills\ui-ux-pro-max\.github\skills\ui-ux-pro-max\.claude\skills\ui-ux-pro-max\scripts\search.py" "scroll reveal stagger" --domain gsap -n 5
```

**Step 4 — Stack-specific guidance** (`--stack`):

For this repo always use `--stack react` (Vite + React 18 + Tailwind CSS 4). For public marketing pages that are HTML-only you may also try `--stack html-tailwind` or `--stack shadcn`.

### Output formats

- Default: ASCII (terminal)
- `-f markdown` — documentation-ready
- `--json` — machine-readable dict + persistence status

### Rules for the agent

1. Never fabricate results. If a search returns 0 rows, retry with broader keywords once; if still empty, fall back to the priority table above and tell the user the recommendation is from built-in defaults, not a DB match.
2. For every new landing/marketing/dashboard page, run Step 1 first, then supplement with targeted `--domain` searches before writing code.
3. Before delivering any app UI, run through `references/pro-rules.md` §Pre-Delivery Checklist.
4. Use SVG icons (lucide-react is already installed), never emoji, for UI icons.
5. Honour `prefers-reduced-motion` on every animation added.

## Project stack (auto-detect hints for the skill)

- **Frontend:** Vite 7 + React 18 + Tailwind CSS 4 (`@tailwindcss/postcss`), react-router-dom v6, lucide-react icons.
- **Backend:** Django 5 + DRF + SimpleJWT + PayPal subscriptions.
- **Deployment:** GitHub → Hostinger VPS (OpenLiteSpeed).
- **Analytics:** Google Tag Manager `GTM-KRFGN295` via SPA-safe pushes in `frontend/src/utils/gtm.js`.

## Marketing styling entrypoint

`frontend/src/styles/MarketingSite.css` is the single source of truth for landing / products / plans / about / contact / feature-set pages. It defines the `--marketing-*` design tokens and imports `PublicLayout.css`. When adding new public pages, extend those tokens rather than adding ad-hoc CSS.
