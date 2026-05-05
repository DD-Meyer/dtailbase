# Staging Feature Plan (v1.0.1+)

Branch: staging
Base: main
Goal: Deliver polished features safely in 4 tracked phases before production merge.

## Phase 1 - UX Polish Pass
Status: IN PROGRESS
Scope:
- Booking form clarity and layout consistency
- Loading, empty, success, and error states
- Helpful validation messages and field hints
- Mobile-first spacing and responsiveness cleanup
Exit criteria:
- No confusing dead-end UI states
- Core user flows complete without guesswork
Commit tag suggestion:
- feat(ux): polish booking and feedback states

## Phase 2 - Reliability Pass
Status: TODO
Scope:
- Normalize backend/API error responses
- Tighten form and payload validation
- Add defensive handling for edge cases
- Ensure permission checks fail safely
Exit criteria:
- Error handling is deterministic and user-friendly
- No uncaught errors in core flows
Commit tag suggestion:
- feat(reliability): harden validations and errors

## Phase 3 - Performance Pass
Status: TODO
Scope:
- Optimize expensive DB queries
- Add pagination where lists can grow
- Reduce frontend bundle and render overhead
- Remove obviously wasteful re-renders
Exit criteria:
- Noticeable responsiveness improvement in common workflows
- Large lists remain usable
Commit tag suggestion:
- perf(core): optimize list/query/render paths

## Phase 4 - Product Pass
Status: TODO
Scope:
- Role/permission refinements
- Reporting/dashboard improvements
- Booking lifecycle automation opportunities
- Final UX consistency and copy polish
Exit criteria:
- User-facing product is feature-complete for release target
- Admin/operator workflows are efficient
Commit tag suggestion:
- feat(product): finalize workflows and reporting

## Working Rules
- Work only from staging (or short-lived branches off staging)
- Keep commits small and phase-specific
- Run checks before each push:
  - backend: manage.py check, migrate, tests
  - frontend: npm run build
- Merge to main only after all 4 phases complete and pass QA

## Progress Log
- [x] Phase 1 started
- [ ] Phase 1 complete
- [ ] Phase 2 started
- [ ] Phase 2 complete
- [ ] Phase 3 started
- [ ] Phase 3 complete
- [ ] Phase 4 started
- [ ] Phase 4 complete
