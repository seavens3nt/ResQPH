# Citizen UI and Advisory — local manual-testing candidate

Date: 2026-10-11. Branch: `feature/citizen-ui-advisory-refinement`.
Baseline: `4ffa7171e15aff0342fb864fe4c920b6239d2566`, latest `origin/temporary-main`
when fetched. Navigation UX is included through merged PR #90. Working tree was
clean before branching. This implementation remains uncommitted and unpushed.
No PR, merge or deployment was performed for this task. No environment values,
private credential files, accounts, missions, station catalog or database were changed.

## Implemented and tested

- Login role cards retain native radios and selected red surfaces. Radios are visually
  hidden with a separate visible keyboard-focus outline. Top auth tabs are removed;
  login and every signup step have an alternative account-access link. Station selection
  still uses the existing catalog/authentication implementation.
- Auth background/overlay image is removed in CSS; its shared image asset is preserved.
  Auth surfaces follow browser light/dark preferences. Fields have one wrapper border
  and focus outline, with matching autofill backgrounds and readable errors/links.
- Road conditions hides all green/yellow/red road overlays and controlled flood shading.
  Basemap, study boundary, incident/HQ/response markers and mission route remain.
  Legend visibility matches the display toggle. No routing/dispatch constraints change.
- Recenter is an accessible, titled target icon with a 44px touch target. Existing follow
  behavior remains. Repetitive general map explanation moves to Help; operational
  feedback and Google/OpenStreetMap attribution remain.
- One InfoWindow per mounted map replaces previous road/marker popups. Empty clicks
  dismiss while retaining incident selection. Layer removal closes its popup and removes
  its listeners; marker deletion and map teardown remove marker/drag/click listeners.
- Shared theme control uses fixed equal icon slots and a correctly sized thumb.
  Dark surfaces use near-black/charcoal tokens with separate insets and borders.
  Home removes excess fill height and reduces gaps/padding without scaling or clipping.
- Help & Limitations has a real `?view=help` page for both active roles. Advisory is
  citizen-only at `?view=advisory`. Direct entry, remount/reload and back/forward are tested.
  Help explains pin confirmation, assignment, pending requests, tracking, supported
  polygon, weather, account access and offline limits. Cancellation was checked in
  `backend/app/services/rescue_requests.py`: citizen cancellation is pending and unassigned
  only, ownership/version checked, and reflects server acceptance.

## Root causes

1. Input overlap: `.auth-pill-field:focus-within` drew the outer treatment while a
   later `.auth-mobile-page :focus-visible` drew an inner outline on the input.
   The nested input now has no independent border/ring; the wrapper preserves focus.
   Native autofill is explicitly styled to match the field surface. This is source-level
   diagnosis; actual browser autofill appearance remains to be checked.
2. Toggle: roads were constructed unconditionally; only flood polygons checked
   `floodVisible`. Road and shading creation now share the same display condition.
3. Popups: each road/flood/route click constructed a new InfoWindow, while retained
   marker listeners captured effect-local windows. There was no single popup owner,
   and detached overlay listeners were not explicitly removed. A map-owned window
   and explicit listener cleanup now handle every supported click target.

## Advisory source, rules and cost

- Uses the existing authenticated `/api/v1/weather/ubelt` adapter; only the backend
  communicates with Google Weather using its server key. Location is the adapter's
  fixed U-Belt point (14.6042 N, 120.9946 E), not the citizen's GPS/request pin.
- The backend returns structured `kind` (`clear`, `cloud`, `rain`) and metric values.
  The frontend retains unrounded `temperatureC` alongside existing rounded Home values.
- `kind=rain`: umbrella/raincoat and protect belongings. Otherwise rain probability
  at least 60%: rain is possible, consider an umbrella. Temperature at least 32 °C:
  drinking water and reduced prolonged exposure. Thresholds are practical app choices,
  not official alert levels or a medical heat-index calculation. No LLM or string matching.
- Thunderstorm-specific provider codes are not exposed by the current adapter; no
  thunderstorm-specific advice is inferred. Suggestions do not determine flood depth,
  passability, evacuation orders, mission urgency or routing.
- Missing optional measurements show Unavailable; missing core/malformed weather is
  unavailable. No fabricated rain/clear weather or fallback demonstration measurements.
- Provider times older than 15 minutes, failed refreshes, and offline cached weather are
  labeled stale; suggestions pause. Times are displayed in PHT. Advisory displays current
  conditions only; Home's hourly and daily ranges retain their forecast distinction.
- Home/Advisory share `['weather','ubelt']`, with 15-minute freshness and 30-minute inactive
  memory-cache retention. No polling, focus or reconnect refetch. The previous `gcTime:0`
  discarded weather on navigation; retaining cache avoids repeated paid calls per view.
- Advisory manual refresh is bounded to at most one attempt per minute using shared query
  success/error timestamps; a longer server Retry-After takes precedence. No automatic
  retries. Local clocks update stale/countdown labels only and make no weather requests.
- Inspection found **no existing backend weather response cache**: adapter responses use
  `Cache-Control: no-store`. This task reuses that adapter and reduces requests through
  shared frontend caching; server caching across users is an existing limitation. No
  backend change, new provider/service, billing change or secret exposure.

## Verification

From `frontend/`:

```sh
npm run lint
npm test -- --run
npm run build
```

- Lint: passed with six pre-existing warnings in LandingPage, shared.tsx, AuthContext
  and MissionContext; no new warnings in this refinement.
- Tests: 56 files, 390 passed. Includes native auth role/focus semantics and links,
  road classes/shading removal and repeat restoration, preserved route/markers,
  single popup replacement/dismissal/listener cleanup, accessible icon-only Recenter,
  direct Help/Advisory navigation and history, deterministic rules, metric precision,
  missing core/optional weather, provider timestamps/stale/offline/error/429 states,
  shared weather cache across mounts and bounded refresh. Existing citizen and rescuer
  request/lifecycle/offline suites passed.
- Build: TypeScript/Vite passed, existing large-chunk warning remains.
- `git diff --check`: passed.
- Backend untouched; backend tests/lint were not rerun.

Browser connection returned `No browser is available`. No screenshots were inspected
or captured. Actual visual/keyboard/autofill/Google-map acceptance and disposable-record
citizen/rescuer browser smoke tests are pending, rather than established by SDK mocks.

## Manual testing

The working checkout is already on the branch. Run from the repository root:

```sh
bash ./dev.sh
```

If ports 8000/5173 are occupied by other local projects, stop their development servers
first. No new environment placeholders or services are required. Existing keys stay local.

- Open `http://localhost:5173/login` and `/signup` on desktop/mobile. Verify one clear
  alternative account link, visible labels, password toggle, station selection, native
  role keyboard arrows, separate selection/focus, autofill, validation and disabled states.
  Test light/dark OS preference; auth follows that preference. Image is absent.
- Dashboard: test theme toggle alignment and neutral dark cards/insets, readable text,
  placeholders/errors/focus. Check Home natural compact height at narrow/short/large sizes.
- Open `/dashboard?view=help` and `/dashboard?view=advisory` directly and from the sidebar.
  Reload, then use browser Back/Forward. Verify active navigation and distinct content.
- Map: toggle conditions repeatedly; all green/yellow/red roads and flood shading hide
  and restore exactly once. Incident, five headquarters, route and moving responder remain.
  Click several roads/stations, then blank map space: one popup at a time, dismissal and
  click-to-pin still work. Recenter remains accessible and restores following.
- Advisory: check real provider data, PHT time, units, missing precipitation, fresh/no-tip,
  error/rate-limit cooldown and offline/stale states. Navigate Home/Advisory repeatedly;
  verify cached weather is shared and no frequent automatic requests occur.
- With separate citizen/station profiles and **disposable synthetic records**, submit a
  confirmed request, observe automatic assignment and station receipt, Accept & Start,
  follow/recenter, Arrived and explicit completion. Check existing offline queue/replay.
  Keep developer and historical records intact. Record sanitized screenshots if possible.

## Changed files grouped by feature

### Authentication

- `frontend/src/pages/auth/AuthAccessibility.test.tsx`
- `frontend/src/pages/auth/AuthLayout.tsx`
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/auth/RoleChooser.tsx`
- `frontend/src/pages/auth/SignupPage.tsx`
- `frontend/src/pages/auth/auth.css`

### Maps

- `frontend/src/components/art/Icon.tsx`
- `frontend/src/features/map/InteractiveFloodMap.test.tsx`
- `frontend/src/features/map/InteractiveFloodMap.tsx`
- `frontend/src/features/map/NavigationCamera.test.tsx`
- `frontend/src/features/map/map.css`

### Weather and Advisory

- `frontend/src/api/weather.ts`
- `frontend/src/features/workspace/CitizenAdvisory.test.tsx`
- `frontend/src/features/workspace/CitizenAdvisory.tsx`
- `frontend/src/features/workspace/useUbeltWeather.ts`
- `frontend/src/features/workspace/weatherAdvisories.test.ts`
- `frontend/src/features/workspace/weatherAdvisories.ts`

### Navigation, Help, Home and theme

- `frontend/src/features/workspace/CitizenHome.test.tsx`
- `frontend/src/features/workspace/CitizenHome.tsx`
- `frontend/src/features/workspace/HelpLimitations.tsx`
- `frontend/src/features/workspace/RequestRescueModal.test.tsx`
- `frontend/src/features/workspace/sharedVisualSystem.css`
- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/pages/dashboard/DesktopWorkspace.test.tsx`

### Documentation and context

- `.agents/skills/resqph-project-context/references/current-status.md`
- `.agents/skills/resqph-project-context/references/sync-history.md`
- `docs/STATUS.md`
- `docs/testing/CITIZEN-UI-ADVISORY-2026-10-11.md`
- `docs/ui/LOCAL_VISUAL_RULES.md`
