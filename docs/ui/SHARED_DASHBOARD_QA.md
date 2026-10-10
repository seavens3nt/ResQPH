# Shared dashboard visual verification

Date: 2026-10-08. Local preview: http://127.0.0.1:5192/.

## Scope

The Home and My Requests references define the common surface, shell and control
language. Existing role-specific data and actions remain unchanged. The latest
approved Fredoka font and medium emphasis remain in use rather than introducing
SF Pro assets. Home and My Requests keep their screenshot compositions.

The shared header is now a component. Shared CSS is imported once after page
styles. Cards, nested panels, tables, inputs, filters, dialog surfaces, sidebar
outlines and light/dark colors are centrally styled. Sidebar geometry is not
derived from individual page content scales.

## Browser coverage

| Role | Views reviewed | Sizes exercised |
| --- | --- | --- |
| Citizen | Home, My Requests, Map, Account; rescue form and selected request details | 1728 x 1080 desktop, 390 x 844 narrow; Home at 965 x 620 and My Requests at 635 x 412 |
| Dispatcher | Overview, Requests, Missions, Teams, Map; selected request and assignment dialog | 1280 x 720 desktop and 390 x 844 narrow |
| Rescuer | My Mission, Mission History, Account; completed-mission details and mission route | 1440 x 900 desktop and 390 x 844 narrow |

All three role shells were inspected in dark mode. The shared header's role
identity and destination are covered by four new component tests. Sidebar
navigation retains automatic collapse and keyboard toggle support.

Browser checks confirmed 11px vertical cell padding with middle alignment on
desktop, 10px on narrow screens, including accessible map data tables. The
635px My Requests composition uses reduced horizontal padding so headings do
not split into individual letters. Large role tables scroll inside their own
panel. The Dispatcher request grid's child minimum width was corrected after
an initial narrow-screen overflow failure.

The requested RQ-001 Pending / two people and RQ-002 Assigned / one person rows
already exist as synthetic API-backed records for citizen@example.test. They
were preserved; no static records were substituted for API data. Full addresses
remain available through the existing request-detail view when truncated.

Assignment dialog focus enters the close button and returns to Assign team on
close. The dialog close icon, blue surface and rounded team selector were
visually verified. Rescuer route evaluation displayed a 98m controlled route
with explicit rule-based fallback rather than an invented ML risk score.

## Corrections found during review

- Shared CSS was loading before older role styles through the auth layout.
  Its single App import now comes after page imports.
- Collapsed non-citizen logos had oversized lockup dimensions; corrected.
- Long expanded navigation labels can wrap rather than being clipped.
- Headers and tables no longer retain old role-specific color/padding rules.
- Dark-mode headings and selected rows retain readable contrast.
- Request form controls and dialog styling use the same shared tokens.

## Verification boundaries

Final checks: `npm test` passed 301 tests across 40 files; `npm run build`
passed TypeScript and the production build. `npx oxlint src` passed with four
existing warnings (three Fast Refresh export warnings and LandingPage's
set-state-in-effect warning). The existing production chunk-size warning remains
(895.41 kB main JavaScript chunk before gzip). `git diff --check` passed.

This is local visual and frontend regression verification, not hosted acceptance
or a full fresh rescue lifecycle audit. Browser review used isolated synthetic
data and did not submit, cancel, assign or complete requests/missions. Actual
disconnected/offline reload, synchronization-conflict, unavailable-server and
all validation-error states were not visually re-exercised in this pass.
Automated tests cover existing behavior but do not establish pixel identity.
Fredoka, longer API-backed addresses and actual status values intentionally
differ from the SF Pro reference artwork. No claim of a pixel-perfect copy.

Reference-size evidence: `qa/citizen-home-reference-final.png` and
`qa/citizen-requests-reference-final.png`. These are local preview artifacts.
