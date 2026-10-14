# Dtailbase

## Dashboard read API

`GET /api/dashboard/?today=YYYY-MM-DD&date=YYYY-MM-DD&month=YYYY-MM`
requires authentication and a company. All queries are scoped to that company,
including platform users. Dates must be valid ISO calendar values in 1900-2100.
`today` is required because calendar-local dates follow the browser, not an
unstored company timezone. `date` and `month` default to today/selected date.

The response contains `currency`, `kpis`, current/previous Monday-Sunday daily
`week` series, `month_counts`, and a selected-day `agenda`. Each series always
contains seven days, with explicit zero values. Monetary values are decimal
strings. Counts/value totals exclude cancelled records. Values sum the
**current service base price**, not historical charges, income or collected
payments; service-price changes alter historical estimates. `change_percent`
compares full scheduled weeks and is null when the previous total is zero.

Agenda accepts `status=ACTIVE` (default: excludes cancelled), `ALL`, or a booking
status, plus `page=1..10000`. It includes `count`, `status_counts`, `page`,
`next_page` and at most 50 ordered items. Items expose only card fields: no
signatures, photos, addresses, email or telephone data. Database aggregations
and date-bounded queries avoid downloading the complete booking history.
Invalid inputs return field-level 400 responses, not empty success results.

Card records also include `started_at`, `completed_at` and boolean `can_start`.
Readiness is an annotated existence query for a signed agreement and BEFORE
photo on a confirmed booking, not a signature/photo payload or permission to
bypass server validation.

## Inline job status

`GET /api/bookings/<id>/` includes boolean `can_start`, using the same readiness
annotation as list/dashboard records. It is true only for a confirmed booking
with a customer signature and at least one BEFORE photo. Detail actions use the
same status endpoint and prerequisites; PDF generation does not determine start
readiness.

`PATCH /api/bookings/<id>/update_status/` accepts multipart `status`, optional
`expected_status`, and `uploaded_images` when completing a job. The request locks
the booking during validation/update; an outdated `expected_status` receives a
field-level 400 error rather than advancing a stale record.

Allowed progression is Pending -> Confirmed -> IN_PROGRESS -> Completed,
with cancellation allowed only from Pending/Confirmed. Completed/Cancelled are
terminal. IN_PROGRESS requires a signature and at least one BEFORE photo.
Completing requires at least one AFTER photo and a signed agreement, and retains
plan photo/resolution/storage limits. Direct general booking updates cannot skip
these transitions or bypass completion's photo action. Same-state no-op requests
do not reset timestamps. Existing permission/tenant checks remain in place.

Focused tests:
`python manage.py test core.tests_dashboard core.tests_job_status core.tests_password_reset`.

## Password recovery

The public API accepts password-reset requests at `POST /api/auth/password-reset/`
(`email`) and confirms them at `POST /api/auth/password-reset/confirm/`
(`uid`, `token`, `password`, `password_confirm`).

Requests for syntactically valid addresses receive the same **202 request
acknowledgement**, whether or not the account exists. This means a request was
queued, not that an email was delivered. A durable database outbox separates the
public response from SMTP delivery and lets failed messages be retried without
exposing account eligibility. Only active accounts with usable passwords receive
mail. SMTP failures are logged without recipient addresses or reset links.

Deployment steps:

1. Apply migrations with `python manage.py migrate`.
2. Configure the existing SMTP provider using the server environment:
   `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, `EMAIL_HOST`,
   `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`,
   and `EMAIL_TIMEOUT` (default 10 seconds). Set **either** `EMAIL_USE_TLS=True`
   for STARTTLS, usually port 587, **or** `EMAIL_USE_SSL=True` for implicit TLS,
   usually port 465. Do not enable both.
3. Set `FRONTEND_URL` to the trusted deployed HTTPS origin, without a path.
   Set `PASSWORD_RESET_TIMEOUT=3600` for one-hour links.
4. Configure a shared cache for rate limiting across API workers. A no-extra-
   dependency option is `CACHE_BACKEND=django.core.cache.backends.db.DatabaseCache`
   with `CACHE_LOCATION=dtailbase_cache`, then `python manage.py createcachetable`.
   A correctly configured shared Redis cache is also supported by Django.
5. Run `python manage.py send_password_resets --watch` as a **single supervised
   worker** alongside the API, with the same environment and database. Alternatively,
   run `python manage.py send_password_resets` every minute using the existing
   scheduler. Monitor worker errors; failed SMTP sends remain queued with bounded
   retries. Requests older than the reset timeout are discarded; outbox addresses
   are deleted after one day.
6. Request a link for an approved test account, confirm mailbox delivery and open
   the link. Change a live account password only with separate explicit approval.
   Automated test accounts verify successful reset, expiry and token reuse.

Development can use the console email backend with `DEBUG=True`; automated tests
use Django's in-memory backend. Neither proves actual SMTP/mailbox delivery.
Never put SMTP credentials in frontend `VITE_` variables or commit real values.

Reset emails use a URL **fragment**, which the frontend removes after reading it.
The fragment is never part of the HTTP request. Recovery pages do not push SPA
page views, and the initial reset page does not load GTM. New passwords are
validated with Django's configured password validators and saved with
`set_password`. A successful reset invalidates the token. Existing JWTs retain
their current lifetimes: this change does **not** implement global JWT revocation.

Focused verification: `python manage.py test core.tests_password_reset`.

## Local database connections

When using PostgreSQL locally, `DEBUG=True` disables persistent database
connections. Django's threaded development server can otherwise exhaust the
database connection limit during normal browser navigation or responsive tests.
Production retains the existing 600-second connection lifetime. Restart the
development API after changing settings to release already-retained connections.
