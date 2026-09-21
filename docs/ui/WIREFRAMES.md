# ResQPH low-fidelity wireframes

**Status:** Completed and approved Phase 1 foundation

**Decision owner:** Ranee

**Last updated:** 2026-09-22

These wireframes lock information hierarchy and required states, not final colors, spacing, branding, or visual polish. Elle and Clarence may improve presentation without changing the approved workflow, terminology, contracts, or safety messages.

## Global shell

```text
┌──────────────────────────────────────────────────────────────┐
│ ResQPH | U-Belt controlled prototype | Role: [selector]     │
├────────────────┬─────────────────────────────────────────────┤
│ Role navigation│ Page title                                  │
│                │ Scenario/source timestamp + disclaimer       │
│ - Main action  ├─────────────────────────────────────────────┤
│ - Status       │ Main content                                 │
│ - History      │                                             │
│                │                                             │
├────────────────┴─────────────────────────────────────────────┤
│ Cached/stale/pending-sync banner or connection status        │
└──────────────────────────────────────────────────────────────┘
```

Global requirements:

- The role selector is visibly labeled **Simulation only**.
- Every hazard/route view displays scenario type and timestamp.
- Essential map information has a text/list alternative.
- Status never relies on color alone.
- Mobile layout moves navigation into a labeled menu and keeps the primary action visible.

## Citizen — submit rescue request

```text
┌──────────────── Citizen rescue request ─────────────────────┐
│ Academic prototype — do not use for a real emergency        │
│                                                            │
│ Location                                                    │
│ [Search/address____________________] [Use map point]         │
│ Selected coordinates: longitude, latitude                  │
│ Boundary: U-Belt pilot area                                │
│                                                            │
│ People needing assistance [  ]                             │
│ Vulnerabilities [infant] [senior] [mobility] [other]       │
│ Medical needs [yes/no]  Details [____________________]      │
│ Reported flood level [none/low/moderate/high/unknown]       │
│ Situation [__________________________________________]      │
│                                                            │
│ [Submit request]                                            │
│ Validation/error/success message region                     │
└────────────────────────────────────────────────────────────┘
```

Required states:

- Initial, validating, submitting, validation error, outside-boundary error, system error, and success.
- Preserve safe input after validation/system failure.
- Confirmation shows an opaque request ID and `pending` state; it does not promise response time.

## Citizen — track request

```text
┌──────────────── Request RQ-… ───────────────────────────────┐
│ Current status: [pending / assigned / en-route / arrived…]  │
│ Last updated: timestamp                                     │
│                                                            │
│ Status history                                              │
│ • timestamp — pending                                       │
│ • timestamp — assigned                                      │
│                                                            │
│ Controlled/historical information only                      │
│ [Refresh]                                                   │
└────────────────────────────────────────────────────────────┘
```

## Coordinator — request queue and assignment

```text
┌────────────── Coordinator request queue ────────────────────┐
│ Filters [status] [priority] [time]  [Refresh]               │
│                                                            │
│ Requests list                 Selected request              │
│ ┌─────────────────────────┐  ┌───────────────────────────┐  │
│ │ RQ-… pending            │  │ Sanitized request detail  │  │
│ │ people / age / location │  │ Location + text fallback  │  │
│ └─────────────────────────┘  │ Status history             │  │
│                              │ Available team [selector]  │  │
│ Empty/loading/error states   │ [Assign mission]           │  │
│                              └───────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

Assignment requirements:

- Disable submission until one pending request and one available team are selected.
- A `409` conflict refreshes authoritative request/team state and does not show false success.
- Success displays the created mission ID, assigned team, request state, and history entry.

## Coordinator — map and route review

```text
┌──────────────── Controlled scenario map ────────────────────┐
│ Scenario: [selector]  Time: timestamp  Source: controlled   │
│ ┌─────────────────────────────┐ ┌────────────────────────┐  │
│ │                             │ │ Layer legend           │  │
│ │ Map: requests, teams,       │ │ Route explanation      │  │
│ │ hazards, selected route     │ │ Cost breakdown         │  │
│ │                             │ │ Warnings/no-route      │  │
│ └─────────────────────────────┘ │ Text edge/turn summary │  │
│                                 └────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

The UI says **recommended route under the selected controlled scenario**, never “safe route.” A no-route response does not draw a straight line or ordinary shortest path.

## Rescuer — assigned mission and route

```text
┌──────────────── Assigned mission MS-… ─────────────────────┐
│ Connection: online/cached/stale | Last synced: timestamp    │
│ Mission status: assigned                                    │
│ Request summary + sanitized contact/location                │
│                                                            │
│ ┌──────────────────────────┐ ┌───────────────────────────┐  │
│ │ Map and selected route   │ │ Route summary             │  │
│ │                          │ │ warnings + explanation    │  │
│ └──────────────────────────┘ │ accessible step/list view │  │
│                              └───────────────────────────┘  │
│ Next valid action: [Start en-route]                         │
│ [Queue while offline — one action maximum]                  │
└────────────────────────────────────────────────────────────┘
```

Required states:

- No assignment, loading, route loading, route failure, no route, ML fallback, and success.
- Cached/stale data show age and disable unsupported network actions.
- One queued valid transition displays `Pending Sync`; a second queue attempt is rejected visibly.
- Reconnection shows accepted, rejected, or conflict outcome and current server state.

## Volunteer — controlled hazard report

```text
┌──────────────── Hazard observation ─────────────────────────┐
│ Location [map point + text coordinates]                     │
│ Observed time [timestamp]                                   │
│ Flood level [none/low/moderate/high/unknown]                │
│ Road condition [passable/restricted/impassable/unknown]     │
│ Notes [_______________________________________________]     │
│ [Submit unverified observation]                             │
│ Notice: observation does not change routing until accepted │
└────────────────────────────────────────────────────────────┘
```

The volunteer role has no assignment, dispatch, verification, or administrative control.

## Approved reusable component inventory

| Component | Required responsibility |
|---|---|
| `AppShell` | Role navigation, responsive shell, simulation label |
| `PrototypeNotice` | Academic/non-emergency disclaimer |
| `ConnectionBanner` | Online, offline, cached, stale, Pending Sync, sync failure |
| `StatusBadge` | Text plus icon/shape; never color-only |
| `FormField` and `FieldError` | Label, description, validation association |
| `RequestSummaryCard` | Consistent sanitized request summary |
| `MissionSummaryCard` | Mission/team/status/last-update summary |
| `ScenarioBanner` | Controlled/historical type, version, and timestamp |
| `MapPanel` | Leaflet view with keyboard-reachable controls |
| `MapLegend` | Flood/passability/source legend |
| `LocationTextAlternative` | Coordinates, landmark, and relevant nearby description |
| `RouteSummary` | Distance, time, cost breakdown, fallback, warnings |
| `RouteExplanation` | Avoided edges and selected-route reasons |
| `EmptyState`, `ErrorState`, `LoadingState` | Shared observable system states |
| `ConfirmationDialog` | Destructive or state-changing confirmation |

## Frontend file boundary for implementation

```text
frontend/src/
├── app/                    application shell and routing
├── components/
│   ├── feedback/           loading, empty, error, connection states
│   ├── forms/              shared fields and validation messages
│   ├── map/                map, legend, markers, text alternative
│   ├── mission/            mission summary and transition controls
│   ├── request/            request summary and status history
│   └── route/              route summary and explanation
├── features/
│   ├── citizen/
│   ├── coordinator/
│   ├── rescuer/
│   └── volunteer/
├── lib/                    API client, validation, query/cache setup
├── pages/                  role pages composed from feature/components
└── types/                  types generated from or aligned with contracts
```

Frontend contributors must not invent alternate request/mission states or silently change API fields. Contract changes return to Ranee for approval.

## Phase 1 UI acceptance

The wireframes cover the complete rescue lifecycle, role boundaries, map/text alternatives, validation, loading, empty, error, conflict, no-route, fallback, cached/stale, Pending Sync, and success states. They are accepted as the implementation baseline; visual refinements remain frontend work.
