# Team Phase 5 — Integration, Testing, and Presentation

**Status:** In progress; local revised candidate requires delivery and renewed end-to-end acceptance.
**Gate owner:** Ranee
**Deadline:** To be set by Ranee; no date assumed.

## Locked inputs

Accepted main, historical Phase 4 gate/evidence, current MVP_SCOPE, API/lifecycle/routing/offline contracts, sanitized fixtures and accepted external ML evidence. Ranee's approved local amendments retire Volunteer/hazard reporting, rescuer hotline and alternative-route UI; retain three separate roles and one calculated route. Shared Figma/modal/Inter presentation is defined in [visual rules](../ui/LOCAL_VISUAL_RULES.md). Do not expand backend scope from a visual reference.

Ranee confirmed closure of superseded repair packages #76/#77/#78/#82/#83 as not planned; #84 is also retired. Jared's original #73 package is completed through merged PR #80; Matthew's #74 remains completed. Only #70 candidate integration/final gate, #71 remaining positive browser/offline acceptance and #72 remaining presentation/rehearsal remain active. Reuse merged PR #79 tests and PR #81 documents rather than assigning them as unstarted work. Main does not contain the local candidate merely because this document describes it. Repeat the same fresh request/mission across three tabs and production offline reload/replay before final acceptance.

## Independent packages

| Owner | Complete package | Owned paths |
|---|---|---|
| Ranee | Reproducible setup, CI/dependency quality and final release gate | README.md; docs/SETUP.md; docs/STATUS.md; docs/DASHBOARD.md; docs/phases/TEAM-PHASE-05-GATE.md; .github/workflows/ci.yml; frontend/package.json; frontend/package-lock.json; .agents/skills/resqph-project-context/references/ |
| Elle | All-role browser regression, offline recovery, keyboard/mobile QA | frontend/src/test/phase5RoleFlows.test.tsx; frontend/src/test/phase5OfflineShell.test.ts; docs/testing/TEAM-PHASE-05-FRONTEND.md |
| Clarence | Repeatable demo, slide/script outline and limitation/source alignment | docs/presentation/DEMO_SCRIPT.md; docs/presentation/PRESENTATION_OUTLINE.md; docs/presentation/REHEARSAL_CHECKLIST.md |
| Jared | API/database negative regression and safe local operational checks | backend/tests/test_phase5_acceptance.py; docs/testing/TEAM-PHASE-05-BACKEND.md |
| Matthew | Deterministic routing/fallback and external ML evidence reconciliation | tests/integration/test_phase5_routing_acceptance.py; docs/testing/TEAM-PHASE-05-ROUTING-ML.md |

The table records original Phase 5 ownership, not five unstarted assignments. Active issues use the eight-section format; #71/#72 distinguish already delivered packages from remaining evidence and are blocked for final browser/rehearsal execution until the candidate is ready. Elle remains the frontend owner. No personal handoffs. QA/presentation do not silently change product code; Ranee owns scoped corrections and final acceptance under #70.

## Required outputs

- Citizen request -> coordinator assignment -> route/no-route -> rescuer progress -> offline reload/replay -> completion/history.
- Invalid requests/roles, stale versions, unavailable API/storage, no-route and disabled/incompatible ML evidence.
- Keyboard, narrow-screen, source/age labels and measured performance observations, without invented thresholds.
- Safe clone/install/run/reset steps, development dependency warning resolved or explicitly accepted with rationale, repeatable local demo and rollback.
- Evidence-aligned presentation and rehearsal checklist. Backup recording remains an actual capture task, never claimed from a script alone.

## Final gate

Ranee checks all five merged packages, green main CI, repeatable controlled demo, source/privacy limitations, tests, academic requirements and actual presentation artifacts. Record Approve/Approve with conditions/Do not approve. Do not mark final submission, deployment or Google Maps migration complete from this phase opening.
