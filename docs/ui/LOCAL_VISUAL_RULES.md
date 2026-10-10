# Local frontend visual baseline

All future UI additions and edits must match this existing design and its theme.
Reuse the shared typography, density, surface, border, radius and semantic-color
tokens. This includes loading, empty, error, disabled, hover and focus states.
Do not introduce a separate visual style for utility states. Loading placeholders
sit directly inside existing cards; only actual inset panels and standalone stat
cards receive their matching surface and border.

Loading states use the shared `components/ui/LoadingState` placeholders for cards,
tables, details, weather, forecasts, maps and route results across all active roles.
Show these during initial fetches only; keep loaded records visible during refresh.
Loading is distinct from a successful empty result, an offline pause, or a failed
request. Preserve retry and stale-data messages. Placeholders use shared colors,
rounded corners, live status text, decorative hidden shapes, and reduced-motion
support. Synchronous pages such as Account and authentication need no artificial delay.

The user-approved Citizen Home styling is the baseline for subsequent page work.
Dispatcher and Rescuer reuse its icon-led section headings, blue outer surfaces,
light padded table/list insets, restrained 550-weight headings and pill actions.
Record cards are rounded rectangles, not pill buttons. Role tables keep 11px
vertical cell padding and stack their inspectors below the table at laptop widths
up to 1400px. Preserve each role's operational content and actions; the Citizen
reference defines presentation, not which mission/team features other roles have.
Desktop screens use `desktopDensity.css` to bound the original proportional
units by viewport height and width. All desktop dashboard page canvases fill the
available content width inside the shared page gutters, including account/editor
pages. Keep nested cards and dialogs at their existing proportions. Preserve the original
card placement, sidebar/header geometry, and role-specific layouts; do not add
a clipped fixed shell, internal scroll panels, or new grid arrangements just
to force a fit. Longer content remains naturally scrollable. Mobile is unchanged.
Use `frontend/src/features/workspace/sharedVisualSystem.css` for shared tokens
and rules, rather than copying the Home layout into every route.

- Use Inter with system sans-serif fallbacks. Keep emphasis medium/semibold,
  not extra-bold. This supersedes the earlier My Requests font override.
- Use pale blue-gray dashboard surfaces, navy text, and red rescue actions.
  Preserve semantic warning, success, error, and dark-theme colors.
- Keep card corners consistently rounded and nested surfaces nearly flat.
  Avoid adding strong shadows inside cards.
- Give tables and forms comfortable padding; leave long content readable through
  responsive wrapping, scrolling, or an existing full-text disclosure.
  Dashboard table headers and cells use 11px vertical padding on desktop and
  10px on mobile, with middle vertical alignment. Narrow tables scroll inside
  their own panel, never widen the entire dashboard.
- Reuse `WorkspaceHeader` for all three roles. Keep caller-provided titles,
  identity, profile destination and connection status; do not introduce a role
  switch. Home and My Requests retain the screenshot's Home header title.
- Import `sharedVisualSystem.css` once, at the end of App's page imports, so
  older role styles cannot override shared surfaces and controls by load order.
- Keep the sidebar outlined in both expanded and collapsed states. Preserve
  the existing click-to-collapse behavior and reduced-motion support.
  `frontend/src/features/workspace/sidebar.css` owns the shared default geometry.
  `figmaWorkspace.css` applies the Figma-derived shell measurements consistently
  across Citizen, Dispatcher and Rescuer routes; no role uses the older shell. All
  routes share the 559px mobile breakpoint.
- Preserve each page's content, navigation, validation, API behavior, and
  accessibility. Do not copy demonstration rows over actual request data.
- Login/signup retain their existing photographic background and dark surface;
  apply shared typography, corner treatment, and restrained shadows there.

Home and My Requests keep their screenshot-specific desktop compositions.
Other pages share the visual language, not identical dimensions or content.

All native dropdowns share `frontend/src/components/ui/Select.css`, loaded after
page styles: Inter, pill borders, inset surfaces, consistent chevrons, reserved
arrow spacing, and visible focus/error/disabled states. Preserve each selector's
options, handlers, and page-specific width. Authentication keeps its dark surface.
Expanded native option menus retain browser/operating-system rendering.

Citizen Home now follows Figma `mxh4jCIQFEX80EzMRsRgBW`, frame `1:2`
(1728 × 1117): 325px visible sidebar, 132px header, 215px status cards,
and 420px weather cards, scaled down with the viewport. The red CTA uses the
provided red gradient. Exported assets are local under `frontend/public/figma-home/`.
SVG native root dimensions remain unchanged, with scaling applied to their
layout slots. The former hourly image is replaced by Google Weather forecast
data, as documented below. Preserve
Inter at medium/semibold weight and restrained inner shadows despite the
frame's SF Pro Rounded typography and stronger nested shadows. Current request
ID, location, people and status stay API-backed; never substitute Figma sample
records or remove loading/error/empty/draft states for screenshot matching.

My Requests rows are selectable across every cell; selection opens the shared
status popup, never an inspector below the table. Keep the request-number button
as the keyboard-accessible action and preserve stored IDs for API lookup.
The Requests card uses a content-driven height and follows its visible rows,
loading and empty states. Figma My Requests frame `19:594` supplies the single
full-width list panel; `36:682` supplies its selected-request popup. Active/All/
History stay above the inset table; Refresh Request and New Request are below
it, right-aligned, as in the frame. Rows remain real API records and retain
10–12px vertical cell padding instead of fixed screenshot row heights. Long
addresses are ellipsized in the list with full text in the title and selected
details. The earlier 635 × 412 composition is superseded for My Requests.
Citizen request tracking hides internal assigned-team identifiers and simulated
team-contact details. Assignment status and backend team links remain intact.
Home's Request rescue and My Requests' New Request/Resume controls open the same
existing RequestForm in a dashboard modal without changing the current route.
The backdrop does not dismiss it. Cancel, Close, and Escape preserve the
memory-only draft; review precedes the unchanged API submission. The modal uses
two columns on desktop, one on small screens, and a scrollable body. The old
request URL remains available for existing deep links, not new dashboard actions.

The shared flood map keeps the road network and pilot boundary enabled whenever
their data are available. Neither layer has a visibility toggle. Flood Hazard
and Recenter retain their existing controls and behavior.

Figma frame `36:682` now supersedes the inline selected request details rule.
Citizen request selections open the shared status popup over the current list;
Home's View Details uses the same popup. The Map uses its inline inspector below. The popup
uses real API status and details, keeps Refresh and pending-only cancellation,
and shows server-confirmed lifecycle progress through a red line, reached icons,
and reached labels. The bottom location/history disclosure is removed. Escape closes only the topmost
dialog, and focus returns to the trigger. Inter and lighter heading weights
remain the approved local font choices; no screenshot records are fabricated.

On desktop, collapsed navigation centers the request-status popup across the
whole viewport with symmetric gutters and a wider 1440px cap. Expanded
navigation retains the Figma-aligned 1260px cap and sidebar-aware placement.
Small screens retain the existing 16px gutters and scrollable modal body.

Rescue location coordinates come from the selected map/GPS/demo source only;
the manual longitude/latitude editor and its explanatory text are removed.
Boundary and coordinate validation remain active, with a visible focusable
location error directing the citizen to choose a valid map or demo location.

Rescue popup follows Figma frame `41:98`: a pale blue rounded dialog, white
map/address card, overlaid source choices, paired flood/people fields, fixed
responder and conditions sections, and bottom-right pill actions. Optional
responder, medical-detail, and immediate-condition inputs remain visible rather
than being hidden behind disclosures. Preserve Inter, lighter heading weights,
the interactive map, all vulnerability choices, draft state, and API contracts.

Unfinished draft notice follows Figma frame `48:12`: caption before the heading,
generous card padding, and left-aligned white Resume draft / red Discard draft
pill actions. Use the shared notice on citizen Home and request-list views.
Show it only when an unsent draft exists and the rescue dialog is closed;
never show it during editing or after closing an untouched form. Resume retains
the existing draft; Discard draft clears it directly without extra confirmation. Keep the approved
Inter font and responsive stacking rather than introducing a new font.

Rescue review follows Figma frame `41:116`: retain the map/address card at left,
five-row blue summary at right, and Back / Submit Request pill actions below.
Render actual draft values rather than Figma sample values. The address and
source are read-only during review; Back restores editing without losing input.
Keep the working Leaflet map and rounded bottom-left zoom controls rather than
substituting the Figma map screenshot. The existing final validation and API
payload remain unchanged; review alone must not submit a request.

Submission success follows Figma `52:42`: green rounded banner with the exact
message "Your request has successfully been submitted!" using Inter. Show only
after API success, then hide after eight idle seconds; hover or keyboard focus
pauses expiry. Hiding the banner never clears or cancels the saved request.
Do not automatically open request tracking over the success banner; tracking
remains available from the request list.

Citizen Map follows Figma `54:77` (empty) and `39:227` (cancelled): Map View
heading, blue outer panel, and a white two-column inset with the map at left
and a request selector and content panel at right. Empty selection shows
"Select request details to view here."; selected requests show their API-backed
status and five summary rows inline. Refresh / Cancel Request sit below the inspector.
actions. Keep Inter, restrained inner shadows, interactive U-Belt Leaflet tiles,
real request markers, permanent roads/boundary, flood toggle, and recenter.
Location source affects only the map camera, never stored request coordinates;
GPS requires the browser's permission and retains demo view on failure.
Map selection does not open a popup; My Requests and Home still do. Cancellation uses its existing
pending-only cancellation, version check, error handling, and API.

Cancel Request submits directly without an additional confirmation dialog,
from both the status popup and map. Disable the action while cancellation is
pending, show failures inline, refresh on a stale-version conflict, and wait for
the server response before reflecting cancellation. Backend team linkage and
historical records remain intact.

Desktop dashboards share a moderately compact header (62 navigation units,
minimum 64 px), a 28-unit gap below it, and 44-unit bottom clearance. Apply these
tokens across Citizen, Dispatcher and Rescuer pages with either sidebar state.
Map panels fill the remaining vertical area; tables/forms remain content-driven
and may grow beyond the viewport rather than clipping records or controls.
Successful cancellation closes request tracking and shows an amber "Request
cancelled" notice using the same rounded, eight-idle-second banner as submission.
Cancellation errors keep tracking open; never show success before API confirmation.

Home weather uses a compact Google Weather summary inside a light padded card:
temperature, conditions, feels-like, high/low, wind and precipitation, matching
illustration, attribution and PHT timestamp. The controlled warning was removed.
The adjacent card uses a live six-hour Google forecast, not the static Figma chart
or controlled values. Label future intervals as forecast, not historical data.
Keep metric units, attribution and unavailable/stale states. No refresh button,
interval, focus or reconnect refresh. Missing measurements are em dashes, never
demo fallback values. Do not imply live flood prediction or change routing;
see GOOGLE_WEATHER_SETUP.md for server-only key setup.

Account follows Figma frame 39:484: Personal details and Medical & assistance
information on the left, Emergency contact on the right, and Sign out / Save
profile underneath. Retain Inter, shared sidebar/header sizing, restrained
shadows, accessible labels/focus states, and stacked sections on narrow screens.
Desktop Account uses compact 34px pill inputs, 36px rounded medical textareas,
16px inner padding and shorter gaps to fit the normal form within a laptop
viewport. Do not hide overflow: validation feedback, resized textareas, zoom
and small screens must remain accessible through natural scrolling.
At large desktop sizes (at least 1600px wide and 850px tall), use 15px field
text, 42px inputs, 44px textareas and larger padding/headings so the same form
does not look miniaturized inside its full-width cards. Shorter windows retain
the compact laptop sizing.
Use the supplied profile, avatar and photo-add assets without stretching them.
First/last name inputs join into the existing profile name; email identity remains
read-only. Emergency contact address is optional and saved through the existing
tab-scoped profile update, not a new backend endpoint. Existing phone/image
validation, medical fields and separate sign-out behavior remain intact.

Cross-role consistency repair (2026-10-10): all roles use the same Figma-derived
shell scale, logo, theme control, outlined expanded/collapsed sidebar, header,
page gutters and Account destination. Dispatcher now exposes the existing
Account workspace rather than sending its profile link to Overview. Sign-out
is available in Account for every role; Help remains at the bottom of the rail.
Expanded labels wrap rather than clipping. Shared tables use readable text,
11px vertical padding and panel-local horizontal scrolling when needed.
Cards follow their content instead of forcing empty full-height surfaces.
Citizen no longer retains a fallback renderer for the retired inline inspector
and static weather card, or the old map heading/caption. Keep request/review/
tracking modals, unfinished-draft and cancellation feedback in their current
approved places. Dispatcher assignment/team/history controls and Rescuer
mission/route/offline controls remain role-specific; do not remove operational
team information merely because it is hidden in Citizen tracking.
