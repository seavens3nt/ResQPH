# Rescuer-only responsive sizing

## Scope

Citizen is the presentation reference, not a source of replacement content.
Only Rescuer selectors change. Inter, navy text, blue/pale blue-gray surfaces,
semantic colors, thin borders, rounded corners, pill actions and subtle shadows
retain their existing owners. No API, authentication, role permissions, mission
transitions, offline persistence, records, wording or features change.

## Causes

- `rescuerDesign.css`, mission-card CSS, Figma geometry and shared visual rules
  supplied overlapping measurements with different specificity. In particular,
  large/extra-bold section titles, 104–106px mission headers, 74px sync badges,
  28px card padding and forced five-column facts accumulated unnecessary height.
- Fixed-column facts squeezed long locations and stretched neighboring fields.
- Global image/SVG maximum widths squeezed collapsed navigation SVG width
  without reducing height. This appeared at larger desktop/tablet scales.
- Mobile header wrapping differed with the length of each page title.
- The narrow collapsed rail retained a 44px desktop inner menu width, producing
  a vertical list inside a wide, mostly empty panel. The role-scoped narrow menu
  now fills the available width and wraps horizontally.
- The History table could squeeze its View action into stacked letters. Its
  legacy overflow rule and narrow side-by-side inspector needed an explicit
  table-local scrolling and responsive stacking policy.
- Dialogs and account forms inherited unrelated size rules from the same cascade.

## Shared rules changed

- `frontend/src/features/workspace/rescuerSizing.css`: role-scoped tokens for
  readable typography, card/inset padding, gaps, gutters, controls and map height.
  Consistent header geometry, compact content-driven cards, flexible mission
  facts, square navigation SVGs, laptop/mobile table and form layout, viewport-
  bounded dialogs with scrollable bodies and sticky final actions. Decorative
  exported section icons fit their slots without scaling the page.
- `frontend/src/App.tsx`: imports that final sizing layer after existing shared
  navigation. Every selector in the new file requires `data-role=rescuer`.
- `frontend/e2e/rescuer-sizing.spec.ts`: synthetic built-browser presentation
  checks; no real account, credential or database writes. Existing APIs remain
  unchanged in application code. POSTs are rejected and counted by the fixture.
- `frontend/e2e/navigation-parity.spec.ts`: retains cross-role appearance checks;
  narrow-screen layout density may differ intentionally for this Rescuer-only
  adjustment. Rescuer per-page chrome dimensions have separate matrix assertions.
- `docs/ui/LOCAL_VISUAL_RULES.md`: records ownership and scope of the new layer.

## Browser verification matrix

CSS viewports, device scale factor 1 and visual viewport scale 1 (100% zoom):

| Viewport | Sidebar states | Theme |
| --- | --- | --- |
| 1280 x 720 | Expanded and collapsed | Light |
| 1366 x 768 | Expanded and collapsed | Light |
| 1440 x 900 | Expanded and collapsed | Light and dark |
| 1920 x 1080 | Expanded and collapsed | Light |
| 768 x 1024 | Expanded and collapsed | Light |
| 390 x 844 | Expanded and collapsed | Light and dark |

Each configuration renders My Mission, Routes, Mission History with twelve
completed/cancelled synthetic records and selected details, Account and Help.
Additional states: assigned/en-route/arrived mission controls, offline cached
mission, empty overview, empty/loading/error History, account validation,
completion dialog, end-simulation dialog and a resized completion textarea.
Checks cover document overflow, offscreen controls, square chrome SVGs, stable
sidebar/header/gutters across pages, 10–12px table vertical padding, readable
table actions, centered/bounded dialogs, primary-action reachability, focus
containment/restoration and Escape. Compact empty overview fits laptop heights;
long records/forms/details are deliberately not constrained to one screen.

Screenshots are generated under ignored `frontend/test-results/` for visual
inspection, using synthetic data only. These are presentation fixtures, not
evidence of a real hosted rescue operation or database acceptance.

## Checks and limits

- Relevant Rescuer, offline store/controller, Account and Modal tests: 85 passed.
- Frontend lint: no errors, six pre-existing warnings.
- Production build: passed; existing large-bundle warning remains.
- Browser matrix: 16 configurations passed; the final narrow-menu correction
  also has a targeted six-configuration rerun and the full matrix in CI.
- Visual screenshot inspection supplements the automated layout assertions;
  it is not a pixel-by-pixel review of every generated screenshot.
  Reviewed examples include laptop empty overview and Routes, desktop populated
  overview and History, tablet Account, phone overview/error states and completion
  dialogs, including a dark resized textarea. Expanded/collapsed examples were
  inspected; automated checks cover both sidebar states at every listed size.
- Live Google Maps tiles/provider-rendered labels and controls are not accepted
  by these fixtures; rendered map containers/loading UI are covered. Maps may
  require hosted credentials/network access. No real accounts were changed.
- Offline cached presentation is exercised; queued/retry failure presentation
  is covered by existing component tests, not every visual matrix case.
- Chromium/Chrome only. Safari/Firefox, OS high-contrast, screen readers, actual
  200% browser zoom and production signed-in end-to-end operations are not verified.
- Citizen pages, authentication screens and retired roles are intentionally outside
  this Rescuer-only change; existing cross-role navigation tests remain in CI.
