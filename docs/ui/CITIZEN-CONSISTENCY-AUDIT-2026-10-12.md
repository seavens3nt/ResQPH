# Citizen consistency audit — local candidate

Branch: `temp-main-UI`. No branch switch, pull, commit, push, or merge during this audit.
Existing setup, dropdown, Account inset, and Home changes were preserved.

## Inspected scope

- `App.tsx` and `DashboardPage.tsx`: Citizen overview, inquiries, map, advisory,
  account, help, and bookmarked request view. History is a request-list filter,
  not a separate Citizen route. The current active shell exposes Citizen and
  Rescuer; legacy coordinator components are not a current selectable role.
- `CitizenWorkspace`, `CitizenHome`, `CitizenRequests`, `CitizenMap`,
  `CitizenAdvisory`, `AccountWorkspace`, `HelpLimitations`, `WorkspaceHeader`.
- Request edit/review/status styles, unfinished draft, query/loading feedback,
  shared selectors, native dropdowns, table styles, desktop density and theme rules.

## Causes and changes

- Home had several competing fixed/proportional card-height declarations.
  Removed superseded status-height declarations; retain content-driven heights
  and stretched adjacent desktop status cards.
- Weather cards had a late fixed 414px height and a 360px minimum on stacked
  screens. They now follow content, including unavailable/loading messages.
- A more-specific metric rule imposed a fixed height despite a later auto-height
  declaration. Removed it; metrics keep a comfortable minimum and may wrap/grow.
- Forecast mobile columns exceeded their panel while `overflow:hidden` prevented
  access. The panel now scrolls horizontally, with readable minimum column widths.
- The late Home visual pass reintroduced 700/800 emphasis for labels and headings.
  Changed active card headings/metrics/captions to medium/semibold tokens. Added
  Home control-height and card-padding tokens without replacing role layouts.
- Home's navigation border was transparent while other Citizen views retained
  their outline. Restored the light-theme outline.
- Successful empty request results were plain paragraphs. They now use a full-width,
  rounded, blue-tinted dashed panel with centered text. Pagination is a separate
  caption so it is not styled as an empty result. Added an accessible status role.
- Expanded status overlays combined 116px of vertical padding with a 90vh card.
  Card max-height now subtracts that padding; collapsed/mobile variants subtract
  their own gutters. Actions wrap; modal headers/close controls do not shrink.
- Map inspector columns now stack through 850px, instead of remaining cramped
  side-by-side at tablet widths.

API calls, request records, permissions, validation, lifecycle/cancellation policy,
drafts, navigation, focus-management logic and submission handlers were not changed.

## Automated verification

- Workspace, Modal and DesktopWorkspace tests: 19 files / 95 tests passed.
- Added request empty-state regression: CitizenRequests suite 10 tests passed.
- Lint: no errors, five warnings in existing AuthContext, MissionContext and
  dashboard shared code.
- Production build passed; existing large-bundle warning remains.
- `git diff --check` passed.

## Browser verification — partial, not accepted

The user supplied a signed-in Citizen session. Home was visually inspected in dark
theme with expanded navigation, and My Requests with collapsed navigation and an
empty result. No request was submitted/cancelled and no profile was saved.

The first Home check measured 1280x720 CSS pixels with a compensated viewport, but
the preview capture did not cover that full viewport. On continuation, requesting
1280x720 measured only 346x194 with devicePixelRatio 3.7. Resetting the override
returned 415x233. Therefore these checks do not establish the requested 100%-zoom
viewport matrix. The temporary viewport override was reset.

Browser inspection found generic status styling incorrectly gave weather fallback
messages a mint success surface in dark theme. Scoped neutral theme tokens now
render those messages with rgb(241,245,249) on rgb(16,27,48). The request empty
selector was strengthened against the same cascade: computed dashed border,
16px radius and 24px padding were confirmed. The narrow dark empty view had no
document horizontal overflow. Weather data remains unavailable because this
server's weather key is not configured; no mock data was substituted.

After these CSS fixes, the 10 CitizenRequests tests and production build passed
again. The first sandboxed test attempt hit a Windows temporary-cache EPERM;
the authorized rerun passed. Tests/build do not establish visual acceptance.

Still required: all six requested viewports (1280x720, 1366x768, 1440x900,
1920x1080, 768x1024, 390x844), both themes, both applicable sidebar states,
all Citizen routes and representative populated/empty/loading/error/offline/stale
and popup states. Rescuer shared-modal regressions are test-covered only, not
browser-verified. Google map/provider rendering is also unverified.

## Not changed

Help currently describes cancellation as pending-only, while the newly pulled
policy permits some assigned requests before travel. This preexisting content
mismatch is recorded for review; lifecycle behavior was not altered by this UI pass.
