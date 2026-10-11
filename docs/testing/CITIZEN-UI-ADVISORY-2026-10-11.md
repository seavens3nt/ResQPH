# Citizen UI and Advisory — local manual-testing candidate

Date: 2026-10-11. Branch: `feature/citizen-ui-advisory-refinement`.
Original baseline: `4ffa7171e15aff0342fb864fe4c920b6239d2566` (navigation PR #90).
Follow-up baseline: `e6623bc` ("Changes with the interactive map and advisory").
The follow-up started with a clean tree on the existing feature branch; the preceding
implementation was already committed locally when inspected. Follow-up changes are
uncommitted and unpushed. No fetch/pull/commit/push/PR/merge/deployment was performed
in this follow-up; `temporary-main` and `main` were not modified. Environment values,
credential files, accounts, missions, station catalog and database are unchanged.

## Selected logo and Practical Tips — latest acceptance, 2026-10-12

This section supersedes the earlier logo-blocker/fallback entries below. The user
explicitly selected the 2170×725 PNG in their latest message. The matching local
image was copied unchanged to `frontend/public/brand/resqph-wordmark.png`; source
and destination SHA-256 both equal
`cc63cc06bc2484f7c0b366b2e1dd6189db7158ae4849a6e10dfd284a4da18a22`.
It is RGBA with alpha range 0–255. No new image generation or cleanup was performed.
The previous incorrect logo persisted because shared BrandLogo still pointed at
`/resQPHlogo_temporary.jpg`; this was a source selection issue.

- Shared BrandLogo now points to the selected PNG for login, all signup steps,
  expanded citizen/rescuer sidebars, SiteHeader and SiteFooter. CSS preserves its
  proportions with automatic height, no filter, and no added image background.
  Compact branding remains the approved emblem.
- Checksums for index.html, all three approved favicon PNGs and existing compact
  source images match the pre-task snapshot. No favicon, manifest or icon-reference
  changes were made in this continuation; earlier working-tree edits are preserved.
- Practical Tips had empty space because the grid stretched it to the neighboring
  weather card. Grid start alignment and natural card height remove that stretch.
  The existing two-column desktop / one-column narrow layout remains responsive.
- Suggestions use one shared deterministic rule source, preserving rainy-kind,
  60% probability and 32 °C thresholds and the existing string API. Each current
  suggestion explains its actual condition or measurement and threshold.
  “Before heading out” is explicitly general preparation, independent of weather;
  hydration is omitted there when the current heat tip already covers it.
- Weather cache sharing, timestamps, stale/offline/error pausing, loading, missing
  measurements, manual refresh and 429 cooldown remain unchanged. No new network
  requests, polling, services, environment variables or backend changes.

Verification: `npm run lint` passed (six existing warnings), `npm test -- --run`
passed **400 tests / 58 files**, `npm run build` passed (existing large-chunk warning),
and `git diff --check` passed. Tests cover selected logo source, matching condition
and threshold explanations, multiple/no tips, unavailable/stale preparation and
no duplicated hydration. Existing offline and rate-limit checks also pass.

Browser runtime returned `No browser is available`. No before/after screenshots or
real browser visual acceptance are claimed. Pending manual checks: desktop/mobile,
light/dark auth and both role sidebars; selected PNG proportions/transparency and
readability; one/multiple/no-tip Advisory cards, long conditions, and offline/error
states. Use the existing manual checklist below. All prior uncommitted work remains
on `feature/citizen-ui-advisory-refinement`; no commit, push, PR or remote actions.

## Earlier continuation checkpoint — 2026-10-12


Same branch, baseline `e6623bc`, all earlier uncommitted work preserved. Removed the
remaining legacy navy dark-table declarations in shared CSS in favor of the existing
neutral raised/hover tokens, added shared BrandLogo source/compact-emblem tests, removed
forced square auth-logo aspect ratio, and recorded favicon provenance under
`frontend/public/brand/README.md`.

Latest verification: lint passed with six existing warnings; **398 tests / 58 files
passed**; TypeScript/Vite build passed with the existing chunk warning; production
favicon PNG sizes/alpha and `git diff --check` passed. Browser again unavailable.
The supplied reference is visible and was inspected, but the original file still is
not present locally and generated edits remain rejected. Full-logo replacement is
still blocked pending the original source/file path or exact transparent PNG. Shared
BrandLogo continues to use the documented opaque fallback. No commits, pushes, PR,
branch switching, backend/environment/database changes or real mission mutations.

## Focused branding/styling correction (latest follow-up)

Same branch and baseline `e6623bcd20e4d57d75fb4e6065160b674774d6ea`; all prior
uncommitted changes preserved. No remote or Git history actions.

### Logo source and exact-asset blocker

The user subsequently supplied the 400×118 wordmark in chat: white “ResQ,” blue “P,”
red “H” on charcoal. **That reference was inspected.** No original image file is
present in the attachment folder and no matching transparent repository source exists.
The image tool's background-removal attempts produced noisy edges/changed details;
those outputs were rejected and are **not bundled or used**. Lossless original-file
background removal or a supplied transparent PNG is pending the user's reply/file.
Do not claim the requested wordmark is implemented or that its transparency passed.

`BrandLogo.tsx` now owns all active logo placements (auth including final signup step,
sidebar, SiteHeader, SiteFooter). Its full-logo source temporarily remains the existing
`/resQPHlogo_temporary.jpg`; it is opaque and does not match the new reference. Compact
sidebar uses the existing-emblem favicon variant. The former approximated SVG is
preserved as a file but no longer used in these placements. Final transparent wordmark
sizing/readability in both themes remains part of the blocker and manual acceptance.

### Favicon

`public/brand/favicon-{16,32,48}.png`: white/red edit of existing `/logo.png` rescue
emblem using imagegen, then size exports from that one master using macOS `sips`.
No wordmark or blue background. All three inspected at native dimensions; PNG RGBA,
exact sizes, alpha extrema 0–255 and fully transparent four corners verified.
`index.html` references only these PNG favicon sizes; previous JPG/Apple icon references
removed. No manifest/maskable/PWA icon configuration found; offline service worker
untouched. Production asset paths checked. Actual browser tab readability and favicon
cache eviction remain pending: hard reload/new tab or clear cached site favicon.

### Winning CSS declarations corrected

- Home outer cards: `figmaWorkspace.css` uses the more specific
  `.workspace-shell[data-role][data-view] .screenshot-home .workspace-card` rule, which
  paints `--home-surface`, not `--shared-surface`. Weather cards now also scope
  `--home-surface` to neutral. The old blue card shadow now uses `--surface-shadow`;
  the separate semantic red rescue CTA gradient/shadow is preserved.
- Nested current/hourly weather: `weatherSummary.css` and `hourlyWeather.css` dark
  backgrounds `#20364b`/borders `#476780` now read shared surface/border tokens.
  `screenshotHome.css` dark metric/row background `#172a40` now reads shared inset.
  Loading shapes inherit a neutral Home-selected token within weather cards.
- My Requests: `screenshotRequests.css` role/view/theme selectors beat generic dark
  table rules. `#3d6889` header and `#355976` hover now use neutral raised/hover tokens.
  Filters now read scoped tokens instead of fixed `#7fa5c2`; selected filters retain
  an accent border and distinct charcoal fill. Refresh action now reads theme tokens.
  The page scopes inset/surface/selected/foreground/border tokens; headers, rows,
  loading, empty and selected states retain tonal separation. Light-mode behavior
  and operational status/route colors remain.
- Role text: the dark selector with `[data-theme=dark]` explicitly set navy
  `#052354`, beating the prior generic role-badge override. That declaration now reads
  neutral near-white ink/charcoal surface; light mode still uses dark readable ink.
- Theme images: Figma's `auto !important` img dimensions plus inherited scale transform,
  and a 61.5×32 moon artwork containing a slash, made nominal size increases misleading.
  Header now uses existing shared Icon family with small original sun/moon paths and
  currentColor, independent of image/scale constraints. No broad filter/important fix.

### Dimensions and headings

| Property | Before this correction | After (source values) |
|---|---|---|
| Theme switch | 88×44 px | 100×48 px |
| Theme icons | nominal 24×24 px, inherited Figma scale | actual SVG 30×30 px |
| Theme slots / thumb | 38×32 / 36×34 px | 44×38 / 44×38 px |
| Thumb movement | 42 px | 46 px |
| Desktop Home gap | 20 px | 18 px |
| Desktop status min-height / padding | 124 / 18 px | 116 / 16 px |
| Desktop weather outer padding | 16 px | 14 px |
| Section heading bottom gap | 16 px | 14 px |
| Weather section top gap | 34 × home-unit | 18 px |
| Rescue button padding / gap | 38 / 55 × figma-unit | 30 / 44 × figma-unit |

Only native decorative asset geometry is fitted to smaller Home icon slots; no page,
card or text is scaled, zoomed or clipped. Same-viewport rendered comparison is pending,
so these dimensions are source changes, not measured screenshot acceptance.

Sidebar “Advisory” and topbar h1 “Advisory” stay. The second displayed heading is now
one h2 “Weather advisory”; the separate repeated section heading is removed. Current
weather, Practical tips and Data status retain their structured cards and state logic.
The exact Account paragraph is removed from the shared page for both roles; identity
remains read-only, membership unavailable for editing, save/error/logout retained.

### Latest checks and remaining manual verification

- `npm run lint`: passed with the same six existing warnings.
- `npm test -- --run`: **396 passed / 57 files**; account copy/identity checks for both
  roles, single Advisory heading, shared theme SVG dimensions and previous auth/request/
  map/lifecycle/offline tests pass. An initial test-fixture initialization error was fixed
  before this successful run.
- `npm run build`: passed (existing large-chunk warning); packaged favicon PNG paths.
- `git diff --check`: passed.
- Browser again returned `No browser is available`: no before/after screenshots,
  computed CSS, autofill, tab favicon or actual viewport acceptance claimed.
- Manual: matching desktop/mobile viewports; dark/light Citizen/Rescuer role badge,
  My Requests filters/headers/hover/selection/loading, Home weather layers and spacing,
  theme focus/alignment with both sidebar states, long content; request submission and
  rescuer Routes/lifecycle with disposable records. Preserve normal database.
- Exact full-logo asset remains blocked as described above. Backend, environment,
  database, station catalog, weather rules, sessions and mission behavior untouched.

### Exact cumulative changed files on this branch

- `.agents/skills/resqph-project-context/references/current-status.md`
- `.agents/skills/resqph-project-context/references/sync-history.md`
- `docs/STATUS.md`
- `docs/testing/CITIZEN-UI-ADVISORY-2026-10-11.md`
- `docs/ui/LOCAL_VISUAL_RULES.md`
- `frontend/index.html`
- `frontend/public/assets/rescue-station.svg`
- `frontend/public/brand/README.md`
- `frontend/public/brand/favicon-16.png`
- `frontend/public/brand/favicon-32.png`
- `frontend/public/brand/favicon-48.png`
- `frontend/src/components/art/Icon.tsx`
- `frontend/src/components/brand/BrandLogo.test.tsx`
- `frontend/src/components/brand/BrandLogo.tsx`
- `frontend/src/components/layout/SiteFooter.css`
- `frontend/src/components/layout/SiteFooter.tsx`
- `frontend/src/components/layout/SiteHeader.css`
- `frontend/src/components/layout/SiteHeader.tsx`
- `frontend/src/features/map/InteractiveFloodMap.tsx`
- `frontend/src/features/map/LocationOptions.test.tsx`
- `frontend/src/features/map/LocationOptions.tsx`
- `frontend/src/features/map/NavigationCamera.test.tsx`
- `frontend/src/features/workspace/AccountWorkspace.test.tsx`
- `frontend/src/features/workspace/AccountWorkspace.tsx`
- `frontend/src/features/workspace/CitizenAdvisory.test.tsx`
- `frontend/src/features/workspace/CitizenAdvisory.tsx`
- `frontend/src/features/workspace/CitizenMap.test.tsx`
- `frontend/src/features/workspace/CitizenMap.tsx`
- `frontend/src/features/workspace/WorkspaceHeader.test.tsx`
- `frontend/src/features/workspace/WorkspaceHeader.tsx`
- `frontend/src/features/workspace/figmaWorkspace.css`
- `frontend/src/features/workspace/hourlyWeather.css`
- `frontend/src/features/workspace/screenshotHome.css`
- `frontend/src/features/workspace/screenshotRequests.css`
- `frontend/src/features/workspace/sharedVisualSystem.css`
- `frontend/src/features/workspace/weatherSummary.css`
- `frontend/src/pages/auth/AuthAccessibility.test.tsx`
- `frontend/src/pages/auth/AuthLayout.tsx`
- `frontend/src/pages/auth/SignupPage.tsx`
- `frontend/src/pages/auth/auth.css`
- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/pages/dashboard/views/citizen/CitizenRequestFlow.test.tsx`
- `frontend/src/pages/dashboard/views/citizen/RequestLocationMap.tsx`
- `frontend/src/test/phase5RoleFlows.test.tsx`

Previous follow-up details below are historical; latest correction above supersedes
older logo/favicon/heading/dimension claims.

## Follow-up presentation and usability

- Auth: `AuthLayout.tsx`, `SignupPage.tsx`, `auth.css`, `AuthAccessibility.test.tsx`.
  Center the existing `/resQPHlogo_temporary.jpg` blue-and-red logo at all auth steps;
  remove the registration explanatory block and station-login link only. Ordinary
  login link, citizen-only registration endpoint, role/station selector, password
  controls and redirects remain. Shared neutral tokens follow browser light/dark.
- Branding: `DashboardPage.tsx`, `index.html`. Same existing colored logo in expanded
  and collapsed navigation, with proportional dimensions and no recoloring filter.
  Favicon and Apple icon use existing `/logo-ref.jpg`; it includes the recognizable
  rescue mark and colored wordmark on navy. No manifest/PWA icon configuration was
  found; custom service-worker/offline-shell behavior is unchanged. Both assets are
  copied locally by Vite. Browser favicon legibility/caching is pending.
- Shared visual rules: `sharedVisualSystem.css`, `AccountWorkspace.tsx`. Semantic
  `--neutral-*` page/surface/inset/ink/muted/line tokens scope light gray and dark
  charcoal to weather, Advisory, Account and the top-right role badge. Account uses
  the existing currentColor Icon family for profile/avatar/photo decoration; original
  Figma assets are retained. Shared header/sidebar/Account affects citizen and rescuer
  (and existing coordinator consumers); operational route/status/branding colors stay.
  Theme icons grow from 20px to 24px within the existing 88×44 control. Home card
  padding/gaps/minimum heights tighten modestly, plus shared rescuer mission padding.
- Advisory: `CitizenAdvisory.tsx`, its tests. “Weather advisory” introduces a responsive
  current-weather/tips grid and compact data-status card. Tips receive short headings
  and icons. Rules, source, query keys, refresh bounds and backend behavior stay intact;
  stale/offline/error/partial/429 feedback and PHT provider timestamp remain visible.
- Maps: `InteractiveFloodMap.tsx`, `NavigationCamera.test.tsx`,
  `public/assets/rescue-station.svg`. Small original building with a rescue cross,
  drawn locally for this task; no external image/license dependency. Five catalog IDs,
  names, addresses, coordinates, assigned outline and single-active-popup remain.
- Location: shared `LocationOptions.tsx` and tests, `RequestLocationMap.tsx`,
  `CitizenMap.tsx`, citizen request/Map/phase-five flow tests. Closed by default;
  source summary stays outside hidden fieldset. Toggle exposes native radios without
  requesting GPS; toggle, Escape and outside pointer dismiss. Escape returns trigger
  focus; outside dismissal restores focus when it was inside. Nonmodal, no trap,
  aria-expanded/controls, stable fieldset ID. The panel anchors inside the existing map
  wrapper and stops pointer/click bubbling; opening/closing never recreates the map.
  GPS loading/errors, selected summary, keyboard pin buttons and green confirmation
  stay visible. Existing source/pin changes invalidate confirmation.

All screenshot references remain unavailable: attachment contains only written text.
Logo assets were inspected directly; this does not establish rendered browser acceptance.

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
- Tests: 57 files, 394 passed. Includes native auth role/focus semantics and links,
  road classes/shading removal and repeat restoration, preserved route/markers,
  single popup replacement/dismissal/listener cleanup, accessible icon-only Recenter,
  direct Help/Advisory navigation and history, deterministic rules, metric precision,
  missing core/optional weather, provider timestamps/stale/offline/error/429 states,
  shared weather cache across mounts and bounded refresh. Existing citizen and rescuer
  request/lifecycle/offline suites passed.
- Follow-up tests additionally cover notice removal, structured Advisory headings,
  collapsed location options, selection, Escape/focus/outside dismissal, interaction
  containment, disabled GPS options, stable map instance and headquarters asset identity.
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

## Follow-up manual acceptance still pending

1. Desktop and narrow mobile: login/signup, keyboard and native autofill, both OS themes;
   centered logo and no top tabs/registration notice. Signup still creates only citizens.
2. Both roles and sidebar states: brand readability/proportions, theme icons, long station
   names, badge wrapping and focus. Favicon may require a hard reload or clearing the
   site’s cached favicon; confirm it on the production preview as well.
3. Citizen Home, Requests, Map, Advisory, Help, Account; rescuer My Mission, Routes,
   History, Help, Account: neutral weather/profile surfaces in both themes, readable
   account icons/text, compact Home without clipping loading/error/long-content states.
4. All five HQ markers: building icon versus moving vehicle, assigned outline, catalog
   address popup, single popup at a time and fixed HQ positions during tracking.
5. Location options: default closed, no GPS on opening, toggle/Escape/outside dismiss,
   keyboard focus return, mobile containment, no map pin beneath panel interaction.
   GPS loading/permission failures remain visible with panel closed; keyboard/map pin
   changes and GPS/demo selection reset confirmation. Green action stays available.
6. Disposable citizen request submission and separate rescuer browser-profile lifecycle/
   Routes controls. Preserve the normal developer database. DOM/SDK tests do not replace
   this real-browser/API acceptance.
