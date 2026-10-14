# React + Vite

## Public marketing design

The public marketing pages opt into the photographic editorial theme with
`<PublicShell marketing>`. [MarketingSite.css](src/styles/MarketingSite.css)
owns the cream/ink/blue/lime palette, Manrope typography, DM Serif Display
accents, and sharp component tokens. Fonts use Google Fonts with `display=swap`
and local fallback families.

The landing composition follows the approved Figma Make proposal. Pricing,
support, and auth-aware links retain their existing application logic.
Login, registration, recovery, and the shared customer/payment layout also use
the editorial theme. Public reset selectors use `:where()` so component
styles can override defaults without depending on stylesheet import order.

Authentication uses compact 400px cards with shared styling in
[LoginPage.module.css](src/pages/public/LoginPage.module.css). Sign-in stays on
one screen; registration collects Account details, then Workspace details.
Continue validates the visible fields without creating an account, Back retains
values in memory, and only the final submit creates the workspace. Server field
errors return to the relevant step. If automatic login fails after creation,
the form offers sign-in instead of repeating registration. Existing Google
sign-in, password recovery, persistence and selected-plan redirects are retained.
Auth-page route guards and submit handlers share `getAuthDestination` so a
successful login cannot overwrite a selected paid plan with the Dashboard route.
No Clerk integration or additional identity providers are introduced.

### PayPal subscription flow

Checkout (`/payments?plan=PRO` or `ENTERPRISE`) and the existing PayPal return
route (`/payment-success`) share [PaymentFlowCard](src/components/PaymentFlowCard.jsx):
1. Review & subscribe, then 2. Verify & activate. Both use the focused neutral
checkout shell without public navigation/footer. Confirmed activation remains
on step two with Dashboard/Plans actions; pending approval never claims an active
plan and offers a manual Check again instead of another payment.
Scheduled downgrades retain their current-plan and target-plan distinction.
Signed-out returns preserve the subscription query through sign-in.

Confirmation requests are shared while in flight (including StrictMode replay),
do not rerun on company updates, and ignore stale results on navigation.
Company refresh failure is displayed separately from PayPal confirmation and
can be retried without confirming/paying again. Conversion tracking is deduplicated
per subscription in the tab session and only emitted for confirmed upgrades.
Payment QA must replace the Axios adapter in memory and restore it afterward;
service workers can bypass browser route interception. Do not make live purchases
or mutate real subscriptions for visual testing.

### Mobile team records

Team Management keeps its table on desktop and presents labelled member records
at 768px and below. Names and email addresses wrap, role/status badges remain visible,
and record actions wrap into touch-sized buttons. Inline editing uses labelled,
full-width fields on phones without changing account permissions or API payloads.

### Mobile signing

The Sign & start sheet uses a full-height mobile dialog with one vertical scroll
surface, no nested card margins, and numbered agreement/photo/signature sections.
Agreement text flows naturally rather than using a narrow nested scroll box.
Camera and photo-library inputs are separate; before-photo requirements, plan
limits, GPS verification and signing payload are unchanged. Photo processing
also holds the dialog busy to prevent premature submission/dismissal.
The white signature pad retains strokes when its width changes and is sized for
device pixel density. Other record/completion dialogs keep their existing layout.
Validation and submission errors remain visible and receive focus so they are
not missed below a long agreement. Signing QA uses an in-memory Axios adapter;
never submit a real signature or start a real job during visual testing.

The reference photographs are served locally from `public/landing/images`:

- `detailing-hero.jpg`: [Zac Nielson / Unsplash](https://images.unsplash.com/photo-1708805282706-f44730b7e527).
- `detailer-story.jpg`: [Unsplash](https://images.unsplash.com/photo-1622329821376-a19fd6002562).

Both are covered by the [Unsplash license](https://unsplash.com/license).
The hero is high priority; below-fold story photos are lazy-loaded. Workshop
cards are illustrative UI, not customer testimonials or live operational data.
Do not add ratings, customer logos, growth figures, or timed outcome claims
without verified evidence.

### Actual application screenshots

Landing and Products use lossless WebP captures from the authenticated local demo
workspace: `app-dashboard-desktop.webp` (1234 x 1319) and
`app-dashboard-mobile.webp` (390 x 844). Both show the real Home dashboard,
including the Figma-aligned greeting, booking counts and clearly labelled estimated value. The desktop capture also shows compact job actions. The calendar
and graph reflect four fictional appointments, not fabricated growth figures.
The original `app-bookings-desktop.webp` remains available as a record-list
capture from the earlier layout, and the refreshed `app-customers-mobile.webp`
(390 x 844) shows compact records in the phone feature section.
Captions identify the fictional data, and full-size links provide readable detail.
Screens up to 767px receive the phone asset rather than a squeezed desktop
screenshot, matching the application's mobile-navigation breakpoint.

The account contains four fictional customers and vehicles, two demo services,
and four non-overlapping appointments. Email addresses use the reserved `.example`
domain, phone numbers use the reserved North American 555-01xx range, and vehicle
registrations are explicitly prefixed `DEMO`. No real customer records, addresses,
payments, signatures, or inspection photos were used. Booking permissions,
Starter limits, and signing/photo prerequisites were not bypassed.

To refresh: sign into a clean approved demo workspace, verify every visible field
is publishable, capture the actual rendered app at desktop and phone sizes, and
inspect the image pixels for clipping or tiling before publishing. Optimize
losslessly, update intrinsic dimensions in both pages, and retain descriptive
alt text and lazy loading. Never export authentication storage for captures.

## Application theme and mobile UI

### Home dashboard and schedule

`/dashboard` is the protected Home screen and the default after ordinary sign-in
or installed-app launch. `/bookings` remains the operational record list.
Selected-plan/payment redirects and the normal browser's public landing route
remain unchanged. Home and Schedule are in desktop/mobile navigation; the mobile
More disclosure keeps Vehicles, Services and owner-only Team reachable.

The desktop and mobile Home layouts follow the approved Fieldserve Figma
reference: navy desktop navigation, blue greeting/KPI header, wide chart beside
the calendar on desktop, and vertically stacked sections with bottom navigation
on mobile. DtailBase branding, cream/ink record surfaces, Manrope and a matching
dark theme are retained. Account/theme controls share the Home greeting area;
installation remains available in its account menu rather than a second toolbar.
[HomeDashboard.css](src/styles/HomeDashboard.css) scopes its cards, charts and
calendar. [Dashboard.jsx](src/pages/Dashboard.jsx) and
[Schedule.jsx](src/pages/Schedule.jsx) consume the company-scoped dashboard API.
No mock totals, maps, routing, demand heatmaps or staff-assignment controls ship.

The chart switches between booking counts and **estimated booking value**.
Estimates use current service base prices, exclude cancelled bookings and are
not collected payments or historical charges. Editing a service price changes
past estimates. Comparisons use full Monday-Sunday scheduled totals, including
future bookings, not partial-week actual revenue. A zero previous value has no
percentage comparison. The SVG has a text alternative, daily keyboard/touch
controls and an expandable data table.

Calendar fields remain local date/time strings, not UTC-converted timestamps.
Today uses the browser's local calendar and refreshes across midnight; no
company-timezone setting is implied. `/schedule?date=YYYY-MM-DD` supports date,
status and page deep links, day navigation and a 50-record paginated agenda.
The month calendar supports arrow keys, Home/End, Today and full-date labels.
Requests are cancelled when filters change; failures have explicit retry UI.
New booking links prefill valid non-past dates without bypassing availability,
plan limits or existing signing/status rules.

### Compact records and job actions

[CompactRecords.jsx](src/components/CompactRecords.jsx) replaces mobile
field-by-field cards on Services, Customers and Vehicles with short clickable
summaries on both desktop and mobile. Activating a summary opens all fields and
existing edit/destructive actions in a native modal dialog. Destructive actions
retain confirmation. Normal fixture summaries are approximately 90px tall;
long text and enlarged text grow naturally rather than being clipped.

[JobRecord.jsx](src/components/JobRecord.jsx) is shared by Home, Schedule and
Bookings. Its detail link and status buttons are separate semantic controls.
[JobActions.jsx](src/components/JobActions.jsx) owns the same guarded workflow
in both these records and the full [job report](src/pages/BookingDetails.jsx).
The report groups appointment/work logs, customer/vehicle details, notes,
Before/After photos and indemnity documents, with a labelled progress indicator
and aligned actions. Detail readiness is provided by the server, not inferred
from whether a PDF has finished generating.
Pending jobs can be confirmed inline; confirmed jobs can be started only when
server-verified signature/BEFORE-photo prerequisites hold. Otherwise Sign & start
opens the existing indemnity form in a dialog, retaining required signature,
BEFORE photos, location consent and plan limits. The standalone signing route
continues to work. Completion opens an AFTER-photo dialog and uses the same
backend storage/plan limits. `Started` is the display label for `IN_PROGRESS`,
not a new database status. Normal phone job records are approximately 120-160px.

Mutations submit `expected_status` to detect stale records and disable duplicate
requests while pending. Errors remain visible without changing the displayed
state. Successful changes reload authoritative records/KPIs/calendar data while
preserving filters, selected dates and chart selection. Mobile targets are at
least 44px; desktop fine-pointer calendar dates use compact 32px cells. Native
dialogs provide focus containment/Escape, return focus on close and block dismissal
while a signing/upload request is active. Animation respects reduced motion.

Focused frontend checks:
`node --test src/utils/calendar.test.js src/utils/jobStatus.test.js src/utils/bookingFilters.test.js`.

### Upgrade surfaces and calendar filtering

Upgrade cards, premium gates and pricing share the landing page's lime brand
token (`--brand-lime`, #c9f45b). In-app upgrade panels and buttons use neutral
charcoal backgrounds with lime headings, prices and action text in both themes;
supporting text stays off-white. There are no large lime fills in these prompts.
Professional is the lime-highlighted middle pricing tier; Starter and Enterprise
stay neutral. Professional upgrade cards use a restrained lime border by plan ID.
The featured pricing card retains dark ink text and a dark button on lime.
These are separate from warning/error tokens; normal operational buttons and
job status colours retain their meaning. Mobile upgrade cards show key benefits
and an expandable full feature list. Existing plan permissions, prices and billing
flows are unchanged.

Bookings groups appointment dates, job status and sort order separately.
From/To endpoints are inclusive, use local calendar dates, and validate reversed
or invalid ranges explicitly. Today, This week (Sunday-Saturday), and All dates
are date-only presets; Clear filters also resets search, status and sort.
The result summary and collapsed filter count show active filtering. Schedule
retains its single-day URL-based agenda and pagination, with matching labelled
date/status groups.

[AppTheme.css](src/styles/AppTheme.css) owns semantic light/dark application
tokens. Existing operational styles consume these tokens rather than literal
white/dark surfaces. Manrope is used for UI text; italic serif remains an
editorial accent. The dashboard header theme control persists `dtailbase-theme`
in local storage. Light is the default; the preference is applied before paint.
Marketing/auth pages retain their cream presentation independently of that
dashboard preference.

The shared public header keeps Sign in / Start for free visible beside the
mobile menu button, or Dashboard when authenticated. Narrow phones use the logo
mark without its wordmark. The expanded menu does not duplicate these links;
authenticated Sign out remains inside the menu. Header links close the menu and
release its scroll lock; Escape returns focus to the menu button. The dropdown's
available height follows the measured header height, including enlarged text.

Landing's workflow section and Products share the read-only
[AppDemo](src/components/public/AppDemo.jsx). Desktop/Mobile buttons preserve the
selected screen; the preview navigation switches Home, Schedule, Bookings,
Customers, Vehicles and Services. Screens use lossless, cropped app captures
with fictional demo data (`public/landing/images/demo-*.webp`), never live
authenticated routes or embedded forms. Only device selection, screen selection
and failed-image retry are interactive. The compact phone mock keeps Home,
Schedule and Bookings visible; More contains Customers, Vehicles and Services.
Regenerate both device captures when
these screens change; omit account menus and real customer data.

Mobile navigation reserves bottom safe-area space. Tables use existing responsive
cards or contained scrolling, while fields, actions, dialogs, and status colors
remain usable in both themes. New animation respects reduced-motion settings.
Record tables become two-column cards on phones. Upgrade comparisons are
expandable rather than displacing the records; all existing upgrade links remain
available. Appointment filters can be collapsed on desktop as well as mobile,
without losing their values or search access.

For local development, use `VITE_API_URL=/api` and the Vite proxy to
`127.0.0.1:8000`; this works for both localhost and 127.0.0.1 frontend URLs without
cross-origin authentication requests.

Sign-in/sign-up navigation preserves selected-plan context. Password visibility
controls do not submit forms. Recovery uses `/forgot-password` and
`/reset-password`; backend SMTP/worker setup is documented in
[backend/README.md](../backend/README.md). Never include reset tokens in analytics.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
