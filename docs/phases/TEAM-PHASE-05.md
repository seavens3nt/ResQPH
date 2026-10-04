# Team Phase 5 — Integration, Testing, and Presentation

**Status:** Ready to start after the Phase 4 gate merge and green main checks.
**Gate owner:** Ranee
**Deadline:** To be set by Ranee; no date assumed.

## Locked inputs

Accepted main, Phase 4 gate/evidence, MVP_SCOPE, API/lifecycle/routing/offline contracts, sanitized fixtures and the accepted external ML evidence. No new feature scope is opened.

## Independent packages

| Owner | Complete package | Owned paths |
|---|---|---|
| Ranee | Reproducible setup, CI/dependency quality and final release gate | README.md; docs/SETUP.md; docs/STATUS.md; docs/DASHBOARD.md; docs/phases/TEAM-PHASE-05-GATE.md; .github/workflows/ci.yml; frontend/package.json; frontend/package-lock.json; .agents/skills/resqph-project-context/references/ |
| Elle | All-role browser regression, offline recovery, keyboard/mobile QA | frontend/src/test/phase5RoleFlows.test.tsx; frontend/src/test/phase5OfflineShell.test.ts; docs/testing/TEAM-PHASE-05-FRONTEND.md |
| Clarence | Repeatable demo, slide/script outline and limitation/source alignment | docs/presentation/DEMO_SCRIPT.md; docs/presentation/PRESENTATION_OUTLINE.md; docs/presentation/REHEARSAL_CHECKLIST.md |
| Jared | API/database negative regression and safe local operational checks | backend/tests/test_phase5_acceptance.py; docs/testing/TEAM-PHASE-05-BACKEND.md |
| Matthew | Deterministic routing/fallback and external ML evidence reconciliation | tests/integration/test_phase5_routing_acceptance.py; docs/testing/TEAM-PHASE-05-ROUTING-ML.md |

Each issue uses the eight-section work-package format with exact commands, expected outputs and prohibited layers. All members can start from accepted main independently; no personal handoffs. Elle resumes her permanent role. QA/presentation packages do not silently change product code: report a named defect in the assigned issue; Ranee owns scoped corrections and acceptance.

## Required outputs

- Citizen request -> coordinator assignment -> route/no-route -> rescuer progress -> offline reload/replay -> completion/history.
- Invalid requests/roles, stale versions, unavailable API/storage, no-route and disabled/incompatible ML evidence.
- Keyboard, narrow-screen, source/age labels and measured performance observations, without invented thresholds.
- Safe clone/install/run/reset steps, development dependency warning resolved or explicitly accepted with rationale, repeatable local demo and rollback.
- Evidence-aligned presentation and rehearsal checklist. Backup recording remains an actual capture task, never claimed from a script alone.

## Final gate

Ranee checks all five merged packages, green main CI, repeatable controlled demo, source/privacy limitations, tests, academic requirements and actual presentation artifacts. Record Approve/Approve with conditions/Do not approve. Do not mark final submission, deployment or Google Maps migration complete from this phase opening.
